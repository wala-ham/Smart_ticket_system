'use strict';

const sequelize = require('../models');
const { Ticket, User, Category, Department } = require('../models/associations');
const { Op } = require('sequelize');

// ─── Helper : where clause selon le rôle ─────────────────────────────────────
function orgWhere(req) {
  return req.user.role === 'super_admin' ? {} : { organization_id: req.user.organization_id };
}

/**
 * GET /api/dashboard/stats
 */
exports.getStats = async (req, res) => {
  try {
    const where = orgWhere(req);
    const orgId = req.user.organization_id;

    // ── Totaux directs ────────────────────────────────────────────────────────
    const total         = await Ticket.count({ where });
    const totalOpen     = await Ticket.count({ where: { ...where, status: 'open' } });
    const totalInProg   = await Ticket.count({ where: { ...where, status: 'in_progress' } });
    const totalSusp     = await Ticket.count({ where: { ...where, status: 'suspended' } });
    const totalResolved = await Ticket.count({ where: { ...where, status: { [Op.in]: ['resolved', 'closed'] } } });
    const totalCritical = await Ticket.count({ where: { ...where, priority: 'critical', status: { [Op.notIn]: ['resolved', 'closed'] } } });

    // ── Par statut — raw SQL pour éviter les problèmes Sequelize GROUP BY ─────
    const byStatus = await sequelize.query(`
      SELECT status, COUNT(*) as count
      FROM tickets
      ${orgId ? 'WHERE organization_id = :orgId' : ''}
      GROUP BY status
      ORDER BY count DESC
    `, { replacements: { orgId }, type: sequelize.QueryTypes.SELECT });

    // ── Par priorité ──────────────────────────────────────────────────────────
    const byPriority = await sequelize.query(`
      SELECT priority, COUNT(*) as count
      FROM tickets
      ${orgId ? 'WHERE organization_id = :orgId' : ''}
      GROUP BY priority
      ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END
    `, { replacements: { orgId }, type: sequelize.QueryTypes.SELECT });

    // ── Par catégorie ──────────────────────────────────────────────────────────
    const byCategory = await sequelize.query(`
      SELECT 
        c.name, c.color, COUNT(t.id) as count
      FROM tickets t
      JOIN categories c ON t.category_id = c.id
      ${orgId ? 'WHERE t.organization_id = :orgId' : ''}
      GROUP BY c.id, c.name, c.color
      ORDER BY count DESC
      LIMIT 8
    `, { replacements: { orgId }, type: sequelize.QueryTypes.SELECT });

    // ── Temps moyen résolution ────────────────────────────────────────────────
    const [avgRow] = await sequelize.query(`
      SELECT ROUND(AVG(duration_minutes)) as avg_duration
      FROM tickets
      WHERE status IN ('resolved','closed')
        AND duration_minutes IS NOT NULL
        ${orgId ? 'AND organization_id = :orgId' : ''}
    `, { replacements: { orgId }, type: sequelize.QueryTypes.SELECT });

    // ── Évolution 30 jours ────────────────────────────────────────────────────
    const last30Days = await sequelize.query(`
      SELECT 
        TO_CHAR(created_at, 'MM-DD') as date,
        COUNT(*) as count,
        SUM(CASE WHEN status IN ('resolved','closed') THEN 1 ELSE 0 END) as resolved
      FROM tickets
      WHERE created_at >= NOW() - INTERVAL '30 days'
        ${orgId ? 'AND organization_id = :orgId' : ''}
      GROUP BY TO_CHAR(created_at, 'MM-DD')
      ORDER BY MIN(created_at) ASC
    `, { replacements: { orgId }, type: sequelize.QueryTypes.SELECT });

    const resolutionRate = total > 0 ? Math.round((totalResolved / total) * 100) : 0;

    return res.json({
      success: true,
      data: {
        totals: {
          total, open: totalOpen, in_progress: totalInProg,
          suspended: totalSusp, resolved: totalResolved, critical: totalCritical
        },
        resolution_rate:      resolutionRate,
        avg_duration_minutes: parseInt(avgRow?.avg_duration ?? 0),
        by_status:   byStatus,
        by_priority: byPriority,
        by_category: byCategory,
        last_30_days: last30Days,
      }
    });
  } catch (err) {
    console.error('getStats error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/dashboard/agents
 */
exports.getAgentPerformance = async (req, res) => {
  try {
    const orgId = req.user.organization_id;

    // Raw SQL pour tout — plus fiable que les associations Sequelize pour les agrégats
    const agents = await sequelize.query(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.is_available,
        u.department_id,
        COUNT(t.id)                                                    AS total_assigned,
        SUM(CASE WHEN t.status IN ('open','in_progress','suspended') THEN 1 ELSE 0 END) AS active_tickets,
        SUM(CASE WHEN t.status IN ('resolved','closed') THEN 1 ELSE 0 END)             AS resolved_tickets,
        ROUND(AVG(CASE WHEN t.status IN ('resolved','closed') AND t.duration_minutes IS NOT NULL 
                       THEN t.duration_minutes END))                   AS avg_duration_minutes,
        SUM(CASE WHEN t.priority = 'critical' AND t.status IN ('resolved','closed') THEN 1 ELSE 0 END) AS critical_resolved
      FROM users u
      LEFT JOIN tickets t ON t.assigned_to = u.id
      WHERE u.organization_id = :orgId
        AND u.role IN ('employee', 'company_admin')
        AND u.is_active = true
      GROUP BY u.id, u.full_name, u.email, u.role, u.is_available, u.department_id
      ORDER BY resolved_tickets DESC, active_tickets ASC
    `, { replacements: { orgId }, type: sequelize.QueryTypes.SELECT });

    const result = agents.map(a => ({
      ...a,
      total_assigned:    parseInt(a.total_assigned   ?? 0),
      active_tickets:    parseInt(a.active_tickets   ?? 0),
      resolved_tickets:  parseInt(a.resolved_tickets ?? 0),
      critical_resolved: parseInt(a.critical_resolved ?? 0),
      avg_duration_minutes: a.avg_duration_minutes ? parseInt(a.avg_duration_minutes) : null,
      resolution_rate: parseInt(a.total_assigned ?? 0) > 0
        ? Math.round((parseInt(a.resolved_tickets ?? 0) / parseInt(a.total_assigned)) * 100)
        : 0,
    }));

    return res.json({ success: true, data: { agents: result, total: result.length } });
  } catch (err) {
    console.error('getAgentPerformance error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/dashboard/recent
 */
exports.getRecentActivity = async (req, res) => {
  try {
    const orgId = req.user.organization_id;
    const where = { organization_id: orgId };

    const recent = await Ticket.findAll({
      where,
      include: [
        { model: User,     as: 'creator',  attributes: ['id', 'full_name'] },
        { model: User,     as: 'assignee', attributes: ['id', 'full_name'] },
        { model: Category, as: 'category', attributes: ['id', 'name', 'color'] },
      ],
      order:  [['created_at', 'DESC']],
      limit:  10,
    });

    const critical = await Ticket.findAll({
      where: { ...where, priority: 'critical', status: { [Op.notIn]: ['resolved', 'closed'] } },
      include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
      order: [['created_at', 'ASC']],
      limit: 5,
    });

    return res.json({ success: true, data: { recent, critical } });
  } catch (err) {
    console.error('getRecentActivity error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/dashboard/ml-insights
 */
exports.getMLInsights = async (req, res) => {
  try {
    const orgId = req.user.organization_id;

    const slowCategories = await sequelize.query(`
      SELECT 
        c.name AS category_name, c.color,
        COUNT(t.id) AS total,
        ROUND(AVG(t.duration_minutes)) AS avg_duration,
        ROUND(AVG(t.ai_category_confidence)) AS avg_confidence
      FROM tickets t
      JOIN categories c ON t.category_id = c.id
      WHERE t.organization_id = :orgId
        AND t.status IN ('resolved','closed')
        AND t.duration_minutes IS NOT NULL
      GROUP BY c.id, c.name, c.color
      ORDER BY avg_duration DESC
      LIMIT 5
    `, { replacements: { orgId }, type: sequelize.QueryTypes.SELECT });

    const priorityAccuracy = await sequelize.query(`
      SELECT 
        priority,
        COUNT(*) AS total,
        ROUND(AVG(duration_minutes)) AS avg_duration,
        ROUND(AVG(ai_priority_confidence)) AS avg_confidence
      FROM tickets
      WHERE organization_id = :orgId
        AND status IN ('resolved','closed')
        AND duration_minutes IS NOT NULL
      GROUP BY priority
      ORDER BY avg_duration ASC
    `, { replacements: { orgId }, type: sequelize.QueryTypes.SELECT });

    const sentimentAnalysis = await sequelize.query(`
      SELECT 
        ai_sentiment AS sentiment,
        COUNT(*) AS total,
        ROUND(AVG(duration_minutes)) AS avg_duration
      FROM tickets
      WHERE organization_id = :orgId
        AND ai_sentiment IS NOT NULL
        AND duration_minutes IS NOT NULL
      GROUP BY ai_sentiment
      ORDER BY avg_duration DESC
    `, { replacements: { orgId }, type: sequelize.QueryTypes.SELECT });

    const weeklyComparison = await sequelize.query(`
      SELECT 'cette_semaine' AS period, COUNT(*) AS count
      FROM tickets WHERE organization_id = :orgId AND created_at >= NOW() - INTERVAL '7 days'
      UNION ALL
      SELECT 'semaine_precedente', COUNT(*)
      FROM tickets WHERE organization_id = :orgId
        AND created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'
    `, { replacements: { orgId }, type: sequelize.QueryTypes.SELECT });

    const [aiAccuracy] = await sequelize.query(`
      SELECT 
        ROUND(AVG(ai_category_confidence)) AS avg_category_confidence,
        ROUND(AVG(ai_priority_confidence))  AS avg_priority_confidence,
        COUNT(*) AS total_analyzed
      FROM tickets
      WHERE organization_id = :orgId
        AND ai_category_confidence IS NOT NULL
    `, { replacements: { orgId }, type: sequelize.QueryTypes.SELECT });

    const recommendations = generateRecommendations({ slowCategories, weeklyComparison, aiAccuracy });

    return res.json({
      success: true,
      data: {
        slow_categories:   slowCategories,
        priority_accuracy: priorityAccuracy,
        sentiment_impact:  sentimentAnalysis,
        weekly_comparison: weeklyComparison,
        ai_accuracy:       aiAccuracy ?? {},
        recommendations,
      }
    });
  } catch (err) {
    console.error('getMLInsights error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

function generateRecommendations({ slowCategories, weeklyComparison, aiAccuracy }) {
  const recs = [];

  if (slowCategories?.length) {
    const s = slowCategories[0];
    recs.push({ type: 'performance', icon: '⏱️', title: `Catégorie "${s.category_name}" lente`, message: `Temps moyen: ${s.avg_duration} min — envisagez d'ajouter des agents spécialisés.`, impact: 'high' });
  }

  if (aiAccuracy?.avg_category_confidence && parseInt(aiAccuracy.avg_category_confidence) < 75) {
    recs.push({ type: 'ai', icon: '🤖', title: 'Confiance IA à améliorer', message: `Confiance moyenne: ${aiAccuracy.avg_category_confidence}%. Enrichissez les descriptions de catégories.`, impact: 'medium' });
  }

  const thisWeek = parseInt(weeklyComparison?.find(w => w.period === 'cette_semaine')?.count ?? 0);
  const lastWeek = parseInt(weeklyComparison?.find(w => w.period === 'semaine_precedente')?.count ?? 0);
  if (lastWeek > 0 && thisWeek > lastWeek * 1.2) {
    recs.push({ type: 'workload', icon: '📈', title: 'Augmentation de la charge', message: `+${Math.round(((thisWeek - lastWeek) / lastWeek) * 100)}% de tickets cette semaine. Prévoyez des ressources supplémentaires.`, impact: 'high' });
  }

  if (recs.length === 0) {
    recs.push({ type: 'success', icon: '✅', title: 'Performance optimale', message: 'Vos indicateurs sont dans les normes. Continuez !', impact: 'low' });
  }
  return recs;
}