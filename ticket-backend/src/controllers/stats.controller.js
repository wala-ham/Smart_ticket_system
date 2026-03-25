const { Ticket, User, Category, Comment } = require('../models/associations');
const { Op } = require('sequelize');
const sequelize = require('../models/index');

// Statistiques globales du système
exports.getGlobalStats = async (req, res) => {
  try {
    // Total des tickets
    const totalTickets = await Ticket.count();

    // Tickets par statut
    const ticketsByStatus = await Ticket.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Tickets par priorité
    const ticketsByPriority = await Ticket.findAll({
      attributes: [
        'priority',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['priority'],
      raw: true
    });

    // Tickets par catégorie
    const ticketsByCategory = await Ticket.findAll({
      attributes: [
        'category_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      include: [
        { model: Category, as: 'category', attributes: ['name', 'color'] }
      ],
      group: ['category_id', 'category.id'],
      raw: true
    });

    // Temps moyen de résolution (en heures)
    const resolvedTickets = await Ticket.findAll({
      where: { 
        status: 'resolved',
        resolved_at: { [Op.ne]: null }
      },
      attributes: [
        [
          sequelize.fn(
            'AVG',
            sequelize.literal('EXTRACT(EPOCH FROM (resolved_at - created_at))/3600')
          ),
          'avg_resolution_time'
        ]
      ],
      raw: true
    });

    const avgResolutionTime = resolvedTickets[0]?.avg_resolution_time 
      ? parseFloat(resolvedTickets[0].avg_resolution_time).toFixed(2)
      : 0;

    // Total utilisateurs par rôle
    const usersByRole = await User.findAll({
      attributes: [
        'role',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['role'],
      raw: true
    });

    // Tickets créés cette semaine
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const ticketsThisWeek = await Ticket.count({
      where: {
        created_at: { [Op.gte]: oneWeekAgo }
      }
    });

    // Tickets créés aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ticketsToday = await Ticket.count({
      where: {
        created_at: { [Op.gte]: today }
      }
    });

    res.json({
      success: true,
      data: {
        overview: {
          total_tickets: totalTickets,
          tickets_today: ticketsToday,
          tickets_this_week: ticketsThisWeek,
          avg_resolution_time_hours: avgResolutionTime
        },
        by_status: ticketsByStatus,
        by_priority: ticketsByPriority,
        by_category: ticketsByCategory,
        users_by_role: usersByRole
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

// Statistiques pour un employé spécifique
exports.getEmployeeStats = async (req, res) => {
  try {
    const employeeId = req.params.id || req.user.id;

    // Vérifier que c'est un employé
    const employee = await User.findByPk(employeeId);
    if (!employee || (employee.role !== 'employee' && employee.role !== 'admin')) {
      return res.status(404).json({ 
        success: false,
        message: 'Employé non trouvé' 
      });
    }

    // Total tickets assignés
    const totalAssigned = await Ticket.count({
      where: { assigned_to: employeeId }
    });

    // Tickets par statut
    const ticketsByStatus = await Ticket.findAll({
      where: { assigned_to: employeeId },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Tickets résolus ce mois
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const resolvedThisMonth = await Ticket.count({
      where: {
        assigned_to: employeeId,
        status: 'resolved',
        resolved_at: { [Op.gte]: firstDayOfMonth }
      }
    });

    // Temps moyen de résolution
    const resolvedTickets = await Ticket.findAll({
      where: { 
        assigned_to: employeeId,
        status: 'resolved',
        resolved_at: { [Op.ne]: null }
      },
      attributes: [
        [
          sequelize.fn(
            'AVG',
            sequelize.literal('EXTRACT(EPOCH FROM (resolved_at - created_at))/3600')
          ),
          'avg_resolution_time'
        ]
      ],
      raw: true
    });

    const avgResolutionTime = resolvedTickets[0]?.avg_resolution_time 
      ? parseFloat(resolvedTickets[0].avg_resolution_time).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        employee: {
          id: employee.id,
          full_name: employee.full_name,
          team: employee.team
        },
        stats: {
          total_assigned: totalAssigned,
          resolved_this_month: resolvedThisMonth,
          avg_resolution_time_hours: avgResolutionTime,
          by_status: ticketsByStatus
        }
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

// Statistiques pour le dashboard
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let stats = {};

    if (userRole === 'client') {
      // Statistiques pour customer
      const myTickets = await Ticket.count({
        where: { created_by: userId }
      });

      const myTicketsByStatus = await Ticket.findAll({
        where: { created_by: userId },
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      stats = {
        total_my_tickets: myTickets,
        my_tickets_by_status: myTicketsByStatus
      };
    } else {
      // Statistiques pour employee/admin
      const assignedToMe = await Ticket.count({
        where: { assigned_to: userId }
      });

      const myTicketsByStatus = await Ticket.findAll({
        where: { assigned_to: userId },
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      const unassignedTickets = await Ticket.count({
        where: { 
          assigned_to: null,
          status: 'open'
        }
      });

      stats = {
        assigned_to_me: assignedToMe,
        my_tickets_by_status: myTicketsByStatus,
        unassigned_tickets: unassignedTickets
      };
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

// Statistiques par période
exports.getStatsByPeriod = async (req, res) => {
  try {
    const { period } = req.query; // 'day', 'week', 'month', 'year'

    let dateFormat;
    let groupBy;

    switch (period) {
      case 'day':
        dateFormat = 'YYYY-MM-DD HH24:00:00';
        groupBy = 'hour';
        break;
      case 'week':
        dateFormat = 'YYYY-MM-DD';
        groupBy = 'day';
        break;
      case 'month':
        dateFormat = 'YYYY-MM-DD';
        groupBy = 'day';
        break;
      case 'year':
        dateFormat = 'YYYY-MM';
        groupBy = 'month';
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
        groupBy = 'day';
    }

    const ticketsByPeriod = await Ticket.findAll({
      attributes: [
        [sequelize.fn('to_char', sequelize.col('created_at'), dateFormat), 'period'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['period'],
      order: [[sequelize.literal('period'), 'ASC']],
      raw: true
    });

    res.json({
      success: true,
      data: {
        period: period || 'week',
        tickets_by_period: ticketsByPeriod
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};
