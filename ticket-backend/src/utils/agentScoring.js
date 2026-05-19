// src/utils/agentScoring.js
'use strict';

const { User, Ticket } = require('../models/associations');
const { Op }           = require('sequelize');
const { sequelize }    = require('../models');

const MIN_TICKETS_TO_BE_ELIGIBLE = 1;
const WEIGHTS = { performance: 0.5, availability: 0.3, load: 0.2 };

// ─── Score composite ──────────────────────────────────────────────────────────
function computeScore(agent, activeTickets = 0) {
  const perfScore  = agent.tickets_assigned > 0
    ? (agent.tickets_resolved / agent.tickets_assigned) * 100 : 0;
  const availScore = agent.is_available ? 100 : 0;
  const loadScore  = Math.max(0, 100 - (activeTickets * 20));
  return Math.round(
    (perfScore  * WEIGHTS.performance) +
    (availScore * WEIGHTS.availability) +
    (loadScore  * WEIGHTS.load)
  );
}

// ─── Filtre WHERE selon l'étape ───────────────────────────────────────────────
function buildStepWhere(step, organizationId) {
  const where = { organization_id: organizationId, is_active: true };

  // role_label = poste métier : 'Directeur Technique', 'Développeur', etc.
  if (step.role_label)   where.job_title    = step.role_label;

  // department_id = filtrer par département si précisé
  if (step.department_id) where.department_id = step.department_id;

  // role système (fallback si pas de role_label)
  if (!step.role_label && step.role) where.role = step.role;

  return where;
}

/**
 * OR — Trouve le MEILLEUR agent disponible
 * Règle : score composite max, éligible en priorité
 */
async function findBestAgent(step = {}, organizationId) {
  try {
    const where = { ...buildStepWhere(step, organizationId), is_available: true };

    const agents = await User.findAll({
      where,
      attributes: ['id','full_name','email','role','job_title',
        'is_available','performance_score','tickets_resolved',
        'tickets_assigned','avg_resolution_time','department_id'],
      include: [{
        model: Ticket, as: 'assignedTickets', required: false,
        where: { status: { [Op.in]: ['open','in_progress','suspended'] } },
        attributes: ['id'],
      }],
    });

    if (!agents.length) {
      console.warn(`[AgentScoring] No available agent for step role_label="${step.role_label}"`);
      return null;
    }

    const scored = agents.map(agent => ({
      agent,
      score:      computeScore(agent, agent.assignedTickets?.length ?? 0),
      active:     agent.assignedTickets?.length ?? 0,
      isEligible: (agent.tickets_resolved ?? 0) >= MIN_TICKETS_TO_BE_ELIGIBLE,
    }));

    const eligible    = scored.filter(s => s.isEligible);
    const pool        = eligible.length > 0 ? eligible : scored; // fallback nouveaux agents

    pool.sort((a, b) => b.score !== a.score ? b.score - a.score : a.active - b.active);

    const winner = pool[0].agent;
    console.log(`[AgentScoring][OR] → ${winner.full_name} (${winner.job_title}) score=${pool[0].score} eligible=${pool[0].isEligible}`);
    return winner;
  } catch (err) {
    console.error('[AgentScoring] findBestAgent error:', err.message);
    return null;
  }
}

/**
 * AND — Trouve TOUS les agents éligibles pour cette étape
 * Retourne la liste complète → tous seront notifiés
 * Le premier qui clique "Traiter" fait avancer le workflow
 */
async function findAllAgentsForStep(step = {}, organizationId) {
  try {
    const where = buildStepWhere(step, organizationId);

    const agents = await User.findAll({
      where,
      attributes: ['id','full_name','email','role','job_title',
        'is_available','performance_score','tickets_resolved','tickets_assigned'],
      include: [{
        model: Ticket, as: 'assignedTickets', required: false,
        where: { status: { [Op.in]: ['open','in_progress','suspended'] } },
        attributes: ['id'],
      }],
      order: [['performance_score', 'DESC']],
    });

    // Pour AND : on prend tous (disponibles ou non), score pour info
    const result = agents.map(a => ({
      ...a.toJSON(),
      composite_score: computeScore(a, a.assignedTickets?.length ?? 0),
      active_tickets:  a.assignedTickets?.length ?? 0,
    }));

    console.log(`[AgentScoring][AND] → ${result.length} agents notifiés pour role_label="${step.role_label}"`);
    return result;
  } catch (err) {
    console.error('[AgentScoring] findAllAgentsForStep error:', err.message);
    return [];
  }
}

/**
 * Met à jour le score d'un agent après résolution d'un ticket
 */
async function updateAgentScore(userId) {
  if (!userId) return;
  try {
    const [result] = await sequelize.query(`
      SELECT
        COUNT(*)                                                           AS tickets_assigned,
        SUM(CASE WHEN status IN ('resolved','closed') THEN 1 ELSE 0 END) AS tickets_resolved,
        ROUND(AVG(CASE WHEN status IN ('resolved','closed')
          AND duration_minutes IS NOT NULL THEN duration_minutes END))     AS avg_resolution_time
      FROM tickets WHERE assigned_to = :userId
    `, { replacements: { userId }, type: sequelize.QueryTypes.SELECT });

    const assigned  = parseInt(result.tickets_assigned ?? 0);
    const resolved  = parseInt(result.tickets_resolved ?? 0);
    const avgTime   = result.avg_resolution_time ? parseInt(result.avg_resolution_time) : null;
    const perfScore = assigned > 0 ? Math.round((resolved / assigned) * 100) : 0;

    await User.update({
      tickets_assigned:    assigned,
      tickets_resolved:    resolved,
      avg_resolution_time: avgTime,
      performance_score:   perfScore,
      score_updated_at:    new Date(),
    }, { where: { id: userId } });

    console.log(`[AgentScoring] Score updated user ${userId}: ${perfScore}% (${resolved}/${assigned})`);
  } catch (err) {
    console.error('[AgentScoring] updateAgentScore error:', err.message);
  }
}

async function recalculateAllScores(organizationId) {
  try {
    const agents = await User.findAll({
      where: { organization_id: organizationId, role: { [Op.in]: ['employee','company_admin'] }, is_active: true },
      attributes: ['id'],
    });
    await Promise.all(agents.map(a => updateAgentScore(a.id)));
    console.log(`[AgentScoring] Recalculated ${agents.length} agents`);
    return agents.length;
  } catch (err) {
    console.error('[AgentScoring] recalculateAllScores error:', err.message);
    return 0;
  }
}

async function getAgentScoreboard(organizationId) {
  const agents = await User.findAll({
    where: { organization_id: organizationId, role: { [Op.in]: ['employee','company_admin'] }, is_active: true },
    attributes: ['id','full_name','email','role','job_title','is_available',
      'performance_score','tickets_resolved','tickets_assigned','avg_resolution_time','department_id'],
    include: [{
      model: Ticket, as: 'assignedTickets', required: false,
      where: { status: { [Op.in]: ['open','in_progress','suspended'] } },
      attributes: ['id'],
    }],
    order: [['performance_score','DESC']],
  });

  return agents.map((agent, i) => {
    const active = agent.assignedTickets?.length ?? 0;
    return {
      rank:                i + 1,
      id:                  agent.id,
      full_name:           agent.full_name,
      email:               agent.email,
      role:                agent.role,
      job_title:           agent.job_title ?? '—',
      is_available:        agent.is_available,
      is_eligible:         (agent.tickets_resolved ?? 0) >= MIN_TICKETS_TO_BE_ELIGIBLE,
      performance_score:   parseFloat(agent.performance_score ?? 0),
      composite_score:     computeScore(agent, active),
      tickets_resolved:    agent.tickets_resolved ?? 0,
      tickets_assigned:    agent.tickets_assigned ?? 0,
      active_tickets:      active,
      avg_resolution_time: agent.avg_resolution_time,
    };
  });
}

module.exports = {
  findBestAgent,
  findAllAgentsForStep,
  updateAgentScore,
  recalculateAllScores,
  getAgentScoreboard,
  computeScore,
};