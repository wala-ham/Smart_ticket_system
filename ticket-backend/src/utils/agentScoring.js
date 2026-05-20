// src/utils/agentScoring.js
'use strict';

const { User, Ticket } = require('../models/associations');
const { Op }           = require('sequelize');
const { sequelize }    = require('../models');

const MIN_RESOLVED_TO_ELIGIBLE = 1;
const WEIGHTS = { performance: 0.5, availability: 0.3, load: 0.2 };

// ─── Score composite ──────────────────────────────────────────────────────────
function computeScore(agent, activeTickets = 0) {
  const perf  = agent.tickets_assigned > 0
    ? (agent.tickets_resolved / agent.tickets_assigned) * 100 : 0;
  const avail = agent.is_available ? 100 : 0;
  const load  = Math.max(0, 100 - (activeTickets * 20));
  return Math.round((perf * WEIGHTS.performance) + (avail * WEIGHTS.availability) + (load * WEIGHTS.load));
}

// ─── Charger un agent avec ses tickets actifs ─────────────────────────────────
async function loadAgentWithLoad(userId) {
  return User.findByPk(userId, {
    attributes: ['id','full_name','email','role','job_title',
      'is_available','performance_score','tickets_resolved','tickets_assigned','department_id'],
    include: [{
      model: Ticket, as: 'assignedTickets', required: false,
      where: { status: { [Op.in]: ['open','in_progress','suspended'] } },
      attributes: ['id'],
    }],
  });
}

/**
 * OR — Résolution de l'assignation selon priorité :
 *
 * 1. Si step.user_id → essaie d'assigner cet employé directement
 *    → Si disponible → assigné
 *    → Si indisponible → fallback sur role_label/département
 * 2. Si pas de user_id → cherche le meilleur agent par role_label/département
 * 3. Exclut les agents avec 0 résolution sauf si aucun autre disponible
 */
async function findBestAgent(step = {}, organizationId) {
  try {
    // ── CAS 1 : user_id explicite dans le step ────────────────────────────────
    if (step.user_id) {
      const directUser = await loadAgentWithLoad(step.user_id);
      if (directUser) {
        const active = directUser.assignedTickets?.length ?? 0;
        const score  = computeScore(directUser, active);

        if (directUser.is_available) {
          console.log(`[AgentScoring][OR][DIRECT] → ${directUser.full_name} (dispo, score=${score})`);
          return directUser;
        } else {
          console.warn(`[AgentScoring][OR][DIRECT] ${directUser.full_name} indisponible — fallback`);
          // Fallback sur role_label ou département
        }
      }
    }

    // ── CAS 2 : Fallback — cherche par role_label / department_id ─────────────
    const where = {
      organization_id: organizationId,
      is_active:       true,
      is_available:    true,
    };
    if (step.role_label)    where.job_title    = step.role_label;
    if (step.department_id) where.department_id = step.department_id;
    // Exclure l'utilisateur direct s'il était indisponible
    if (step.user_id)       where.id = { [Op.ne]: step.user_id };

    const agents = await User.findAll({
      where,
      attributes: ['id','full_name','email','role','job_title',
        'is_available','performance_score','tickets_resolved','tickets_assigned','department_id'],
      include: [{
        model: Ticket, as: 'assignedTickets', required: false,
        where: { status: { [Op.in]: ['open','in_progress','suspended'] } },
        attributes: ['id'],
      }],
    });

    if (!agents.length) {
      console.warn(`[AgentScoring][OR] No available agent for step`, step);
      return null;
    }

    const scored = agents.map(a => ({
      agent:      a,
      score:      computeScore(a, a.assignedTickets?.length ?? 0),
      active:     a.assignedTickets?.length ?? 0,
      isEligible: (a.tickets_resolved ?? 0) >= MIN_RESOLVED_TO_ELIGIBLE,
    }));

    const eligible = scored.filter(s => s.isEligible);
    const pool     = eligible.length > 0 ? eligible : scored;
    pool.sort((a, b) => b.score !== a.score ? b.score - a.score : a.active - b.active);

    const winner = pool[0].agent;
    console.log(`[AgentScoring][OR][FALLBACK] → ${winner.full_name} score=${pool[0].score}`);
    return winner;
  } catch (err) {
    console.error('[AgentScoring] findBestAgent error:', err.message);
    return null;
  }
}

/**
 * AND — Retourne TOUS les agents concernés par cette étape
 * Si step.user_id → seulement cet agent (+ les autres du même role si AND)
 * Sinon → tous les agents avec ce role_label/département
 */
async function findAllAgentsForStep(step = {}, organizationId) {
  try {
    // Si user_id unique en AND → juste cet agent
    if (step.user_id) {
      const u = await loadAgentWithLoad(step.user_id);
      return u ? [{ ...u.toJSON(), composite_score: computeScore(u, u.assignedTickets?.length ?? 0) }] : [];
    }

    // Sinon → tous avec ce role_label/département
    const where = { organization_id: organizationId, is_active: true };
    if (step.role_label)    where.job_title    = step.role_label;
    if (step.department_id) where.department_id = step.department_id;

    const agents = await User.findAll({
      where,
      attributes: ['id','full_name','email','role','job_title',
        'is_available','performance_score','tickets_resolved','tickets_assigned'],
      include: [{
        model: Ticket, as: 'assignedTickets', required: false,
        where: { status: { [Op.in]: ['open','in_progress','suspended'] } },
        attributes: ['id'],
      }],
      order: [['performance_score','DESC']],
    });

    return agents.map(a => ({
      ...a.toJSON(),
      composite_score: computeScore(a, a.assignedTickets?.length ?? 0),
      active_tickets:  a.assignedTickets?.length ?? 0,
    }));
  } catch (err) {
    console.error('[AgentScoring] findAllAgentsForStep error:', err.message);
    return [];
  }
}

/**
 * Met à jour le score d'un agent après résolution
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
  } catch (err) {
    console.error('[AgentScoring] updateAgentScore error:', err.message);
  }
}

async function recalculateAllScores(organizationId) {
  const agents = await User.findAll({
    where: { organization_id: organizationId, role: { [Op.in]: ['employee','company_admin'] }, is_active: true },
    attributes: ['id'],
  });
  await Promise.all(agents.map(a => updateAgentScore(a.id)));
  return agents.length;
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

  return agents.map((a, i) => {
    const active = a.assignedTickets?.length ?? 0;
    return {
      rank: i + 1, id: a.id, full_name: a.full_name, email: a.email,
      role: a.role, job_title: a.job_title ?? '—',
      is_available: a.is_available,
      is_eligible:  (a.tickets_resolved ?? 0) >= MIN_RESOLVED_TO_ELIGIBLE,
      performance_score:   parseFloat(a.performance_score ?? 0),
      composite_score:     computeScore(a, active),
      tickets_resolved:    a.tickets_resolved ?? 0,
      tickets_assigned:    a.tickets_assigned ?? 0,
      active_tickets:      active,
      avg_resolution_time: a.avg_resolution_time,
    };
  });
}

module.exports = { findBestAgent, findAllAgentsForStep, updateAgentScore, recalculateAllScores, getAgentScoreboard, computeScore };