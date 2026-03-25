const { User, Organization, Ticket } = require('../models/associations');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { sendEmail } = require('../utils/email');

// Créer un employé (Company Admin uniquement)
exports.createEmployee = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password, full_name, team, phone } = req.body;
    const orgId = req.user.organization_id;

    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Cet email est déjà utilisé' });
    }

    // Créer l'employé
    const employee = await User.create({
      email,
      password,
      full_name,
      role: 'employee',
      organization_id: orgId,
      created_by: req.user.id,
      team,
      phone,
      is_active: true,
      is_available: true,
      password_reset_required: true
    });

     // ENVOI EMAIL
    const subject = "Votre compte Employé est créé";
    const text = `Bonjour ${full_name},\n\nVotre compte Employé a été créé.\n\nIdentifiants:\nEmail: ${email}\nMot de passe: ${password}\n\nMerci de vous connecter et de changer votre mot de passe.`;

    await sendEmail(email, subject, text, null);

    res.status(201).json({
      success: true,
      message: 'Employé créé avec succès. Un email avec les identifiants lui a été envoyé.',
      data: { employee: employee.toJSON() }
    });
  } catch (error) {
    console.error('Erreur création employé:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Créer un client (Company Admin uniquement)
exports.createClient = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password, full_name, phone } = req.body;
    const orgId = req.user.organization_id;

    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Cet email est déjà utilisé' });
    }

    // Créer le client
    const client = await User.create({
      email,
      password,
      full_name,
      role: 'client',
      organization_id: orgId,
      created_by: req.user.id,
      phone,
      is_active: true,
      password_reset_required: true
    });

     // ENVOI EMAIL
    const subject = "Votre compte Client est créé";
    const text = `Bonjour ${full_name},\n\nVotre compte Client a été créé.\n\nIdentifiants:\nEmail: ${email}\nMot de passe: ${password}\n\nMerci de vous connecter et de changer votre mot de passe.`;

    await sendEmail(email, subject, text, null);

    res.status(201).json({
      success: true,
      message: 'Client créé avec succès. Un email avec les identifiants lui a été envoyé.',
      data: { client: client.toJSON() }
    });
  } catch (error) {
    console.error('Erreur création client:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Liste des utilisateurs de l'organisation
exports.getOrganizationUsers = async (req, res) => {
  try {
    const { role, team, is_active, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Déterminer l'organisation à filtrer
    let orgId;
    if (req.user.role === 'super_admin') {
      // Super admin peut voir toutes les organisations
      orgId = req.query.organization_id ? parseInt(req.query.organization_id) : null;
    } else {
      // Les autres ne voient que leur organisation
      orgId = req.user.organization_id;
    }

    const where = {};
    if (orgId) where.organization_id = orgId;
    if (role) where.role = role;
    if (team) where.team = team;
    if (is_active !== undefined) where.is_active = is_active === 'true';
    
    if (search) {
      where[Op.or] = [
        { full_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      include: [
        { 
          model: Organization, 
          as: 'organization',
          attributes: ['id', 'name'] 
        }
      ],
      order: [['role', 'ASC'], ['full_name', 'ASC']],
      limit,
      offset
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total: count,
          page,
          limit,
          total_pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Erreur récupération utilisateurs:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Obtenir un utilisateur par ID
exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [
        { 
          model: Organization, 
          as: 'organization',
          attributes: ['id', 'name', 'type'] 
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'full_name', 'email']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // Vérifier les permissions
    if (req.user.role === 'company_admin' && user.organization_id !== req.user.organization_id) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    res.json({ success: true, data: { user } });
  } catch (error) {
    console.error('Erreur récupération utilisateur:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Mettre à jour un utilisateur
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { full_name, team, is_available, is_active, phone } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // Vérifier les permissions
    if (req.user.role === 'company_admin' && user.organization_id !== req.user.organization_id) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    // Company admin ne peut pas modifier le rôle
    await user.update({
      full_name: full_name || user.full_name,
      team: team !== undefined ? team : user.team,
      is_available: is_available !== undefined ? is_available : user.is_available,
      is_active: is_active !== undefined ? is_active : user.is_active,
      phone: phone !== undefined ? phone : user.phone
    });

    res.json({
      success: true,
      message: 'Utilisateur mis à jour',
      data: { user: user.toJSON() }
    });
  } catch (error) {
    console.error('Erreur mise à jour utilisateur:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Supprimer un utilisateur
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Empêcher la suppression de son propre compte
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ 
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte' 
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // Vérifier les permissions
    if (req.user.role === 'company_admin') {
      if (user.organization_id !== req.user.organization_id) {
        return res.status(403).json({ success: false, message: 'Accès refusé' });
      }
      if (user.role === 'company_admin') {
        return res.status(403).json({ 
          success: false,
          message: 'Vous ne pouvez pas supprimer un autre admin' 
        });
      }
    }

    await user.destroy();
    res.json({ success: true, message: 'Utilisateur supprimé' });
  } catch (error) {
    console.error('Erreur suppression utilisateur:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Obtenir les employés disponibles de l'organisation
exports.getAvailableEmployees = async (req, res) => {
  try {
    const { team } = req.query;
    const orgId = req.user.organization_id;

    const where = {
      organization_id: orgId,
      role: { [Op.in]: ['employee', 'company_admin'] },
      is_available: true,
      is_active: true
    };

    if (team) where.team = team;

    const employees = await User.findAll({
      where,
      attributes: ['id', 'full_name', 'email', 'team', 'role']
    });

    res.json({ success: true, data: { employees } });
  } catch (error) {
    console.error('Erreur récupération employés:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Statistiques d'un employé
exports.getEmployeeStats = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findByPk(userId);
    if (!user || (user.role !== 'employee' && user.role !== 'company_admin')) {
      return res.status(404).json({ success: false, message: 'Employé non trouvé' });
    }

    // Vérifier les permissions
    if (req.user.role === 'company_admin' && user.organization_id !== req.user.organization_id) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    // Tickets assignés
    const totalAssigned = await Ticket.count({ where: { assigned_to: userId } });

    // Tickets par statut
    const ticketsByStatus = await Ticket.findAll({
      where: { assigned_to: userId },
      attributes: [
        'status',
        [Ticket.sequelize.fn('COUNT', Ticket.sequelize.col('id')), 'count']
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
        assigned_to: userId,
        status: 'resolved',
        resolved_at: { [Op.gte]: firstDayOfMonth }
      }
    });

    res.json({
      success: true,
      data: {
        employee: {
          id: user.id,
          full_name: user.full_name,
          team: user.team
        },
        stats: {
          total_assigned: totalAssigned,
          resolved_this_month: resolvedThisMonth,
          by_status: ticketsByStatus
        }
      }
    });
  } catch (error) {
    console.error('Erreur stats employé:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
