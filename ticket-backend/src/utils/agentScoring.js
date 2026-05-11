// src/utils/agentScoring.js
// Système de score agent — assignation intelligente
'use strict';

const { User, Ticket } = require('../models/associations');
const { Op }           = require('sequelize');
const { sequelize }    = require('../models');

// ─── Seuils ───────────────────────────────────────────────────────────────────
const MIN_TICKETS_TO_ASSIGN = 1;  // Minimum de tickets résolus pour être éligible
const WEIGHTS = { performance: 0.5, availability: 0.3, load: 0.2 };

/**
 * Calcule le score composite d'un agent
 * @param {Object} agent - User avec tickets_resolved, tickets_assigned, is_available
 * @param {number} activeTickets - Nombre de tickets actifs actuellement
 * @returns {number} score 0-100
 */
function computeScore(agent, activeTickets = 0) {
  // Performance : taux de résolution
  const perfScore = agent.tickets_assigned > 0
    ? (agent.tickets_resolved / agent.tickets_assigned) * 100
    : 0;

  // Disponibilité
  const availScore = agent.is_available ? 100 : 0;

  // Charge : moins il a de tickets actifs, meilleur score (max 5 tickets actifs)
  const loadScore = Math.max(0, 100 - (activeTickets * 20));

  return Math.round(
    (perfScore  * WEIGHTS.performance) +
    (availScore * WEIGHTS.availability) +
    (loadScore  * WEIGHTS.load)
  );
}

/**
 * Trouve le meilleur agent disponible pour un ticket
 * Règles :
 *  1. Doit être is_available = true
 *  2. Doit avoir au moins MIN_TICKETS_TO_ASSIGN ticket résolu (sauf si aucun autre dispo)
 *  3. Score composite le plus élevé
 *  4. En cas d'égalité : moins de tickets actifs
 *
 * @param {Object} step - Étape workflow { role, department_id }
 * @param {number} organizationId
 * @returns {Object|null} Meilleur agent ou null
 */
async function findBestAgent(step = {}, organizationId) {
  try {
    // Construire le filtre de base
    const where = {
      organization_id: organizationId,
      is_active:       true,
      is_available:    true,
    };
    if (step.role)          where.role          = step.role;
    if (step.department_id) where.department_id = step.department_id;

    // Charger les agents avec leurs tickets actifs
    const agents = await User.findAll({
      where,
      attributes: [
        'id', 'full_name', 'email', 'role',
        'is_available', 'performance_score',
        'tickets_resolved', 'tickets_assigned',
        'avg_resolution_time', 'department_id',
      ],
      include: [{
        model:    Ticket,
        as:       'assignedTickets',
        required: false,
        where:    { status: { [Op.in]: ['open', 'in_progress', 'suspended'] } },
        attributes: ['id'],
      }],
    });

    if (!agents.length) return null;

    // Calculer score composite pour chaque agent
    const scored = agents.map(agent => {
      const activeCount  = agent.assignedTickets?.length ?? 0;
      const score        = computeScore(agent, activeCount);
      const isEligible   = agent.tickets_resolved >= MIN_TICKETS_TO_ASSIGN;

      return {
        agent,
        score,
        activeCount,
        isEligible,
      };
    });

    // Séparer éligibles et non-éligibles
    const eligible    = scored.filter(s => s.isEligible);
    const notEligible = scored.filter(s => !s.isEligible);

    // Choisir parmi les éligibles en priorité
    const pool = eligible.length > 0 ? eligible : notEligible;

    if (!pool.length) return null;

    // Trier : score DESC, puis activeCount ASC
    pool.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.activeCount - b.activeCount;
    });

    const winner = pool[0];

    console.log(`[AgentScoring] Assigned to: ${winner.agent.full_name} | score=${winner.score} | eligible=${winner.isEligible} | active=${winner.activeCount}`);

    return winner.agent;
  } catch (err) {
    console.error('[AgentScoring] findBestAgent error:', err.message);
    return null;
  }
}

/**
 * Met à jour le score d'un agent après résolution/clôture d'un ticket
 * Appelé dans : forwardWorkflow (completed), stopWorkflow, ticket résolu
 *
 * @param {number} userId - ID de l'agent
 */
async function updateAgentScore(userId) {
  if (!userId) return;
  try {
    const [result] = await sequelize.query(`
      SELECT
        COUNT(*)                                                               AS tickets_assigned,
        SUM(CASE WHEN status IN ('resolved','closed') THEN 1 ELSE 0 END)     AS tickets_resolved,
        ROUND(AVG(CASE WHEN status IN ('resolved','closed') AND duration_minutes IS NOT NULL
                       THEN duration_minutes END))                            AS avg_resolution_time
      FROM tickets
      WHERE assigned_to = :userId
    `, { replacements: { userId }, type: sequelize.QueryTypes.SELECT });

    const assigned = parseInt(result.tickets_assigned ?? 0);
    const resolved = parseInt(result.tickets_resolved ?? 0);
    const avgTime  = result.avg_resolution_time ? parseInt(result.avg_resolution_time) : null;
    const perfScore = assigned > 0 ? Math.round((resolved / assigned) * 100) : 0;

    await User.update({
      tickets_assigned:    assigned,
      tickets_resolved:    resolved,
      avg_resolution_time: avgTime,
      performance_score:   perfScore,
      score_updated_at:    new Date(),
    }, { where: { id: userId } });

    console.log(`[AgentScoring] Score updated for user ${userId}: ${perfScore}% (${resolved}/${assigned})`);
  } catch (err) {
    console.error('[AgentScoring] updateAgentScore error:', err.message);
  }
}

/**
 * Recalcule les scores de tous les agents d'une organisation
 * Appelé au démarrage ou manuellement
 */
async function recalculateAllScores(organizationId) {
  try {
    const agents = await User.findAll({
      where: { organization_id: organizationId, role: { [Op.in]: ['employee', 'company_admin'] }, is_active: true },
      attributes: ['id'],
    });

    await Promise.all(agents.map(a => updateAgentScore(a.id)));
    console.log(`[AgentScoring] Recalculated scores for ${agents.length} agents`);
    return agents.length;
  } catch (err) {
    console.error('[AgentScoring] recalculateAllScores error:', err.message);
    return 0;
  }
}

/**
 * Retourne le classement des agents avec leur score détaillé
 */
async function getAgentScoreboard(organizationId) {
  const agents = await User.findAll({
    where: {
      organization_id: organizationId,
      role: { [Op.in]: ['employee', 'company_admin'] },
      is_active: true,
    },
    attributes: ['id', 'full_name', 'email', 'role', 'is_available', 'performance_score', 'tickets_resolved', 'tickets_assigned', 'avg_resolution_time', 'department_id'],
    include: [{
      model: Ticket, as: 'assignedTickets', required: false,
      where: { status: { [Op.in]: ['open', 'in_progress', 'suspended'] } },
      attributes: ['id'],
    }],
    order: [['performance_score', 'DESC']],
  });

  return agents.map((agent, i) => {
    const activeCount = agent.assignedTickets?.length ?? 0;
    const score       = computeScore(agent, activeCount);
    const isEligible  = agent.tickets_resolved >= MIN_TICKETS_TO_ASSIGN;

    return {
      rank:                i + 1,
      id:                  agent.id,
      full_name:           agent.full_name,
      email:               agent.email,
      role:                agent.role,
      is_available:        agent.is_available,
      is_eligible:         isEligible,       // ← false si nouveau sans résolution
      performance_score:   parseFloat(agent.performance_score ?? 0),
      composite_score:     score,
      tickets_resolved:    agent.tickets_resolved ?? 0,
      tickets_assigned:    agent.tickets_assigned ?? 0,
      active_tickets:      activeCount,
      avg_resolution_time: agent.avg_resolution_time,
      department_id:       agent.department_id,
    };
  });
}

module.exports = { findBestAgent, updateAgentScore, recalculateAllScores, getAgentScoreboard, computeScore };