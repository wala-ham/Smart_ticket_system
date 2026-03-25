const { Organization, User } = require('../models/associations');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { sendEmail } = require('../utils/email');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// ─── Multer config (stockage local dans /uploads/contracts/) ─────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'contracts');
    fs.mkdirSync(dir, { recursive: true }); // crée le dossier si absent
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Contract_<orgId>_<timestamp>.pdf
    const orgId = req.params.id ?? 'unknown';
    const timestamp = Date.now();
    cb(null, `Contract_org${orgId}_${timestamp}.pdf`);
  }
});

const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  }
});

// Export the multer middleware so the router can use it
exports.uploadMiddleware = uploadMiddleware;

// ─── Upload contract PDF (appelé juste après createOrganization) ──────────────
exports.uploadContractPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier PDF reçu' });
    }

    const orgId = req.params.id;

    // Construire l'URL publique
    const baseUrl = process.env.API_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const pdfUrl  = `${baseUrl}/uploads/contracts/${req.file.filename}`;

    // Sauvegarder l'URL dans la DB
    await Organization.update(
      { contract_pdf_url: pdfUrl },
      { where: { id: orgId } }
    );

    return res.status(200).json({
      success: true,
      message: 'Contrat PDF uploadé avec succès',
      data: {
        contract_pdf_url: pdfUrl,
        filename: req.file.filename,
        size: req.file.size,
      },
    });

  } catch (error) {
    console.error('Erreur upload contrat PDF:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du upload du contrat',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// ─── Créer une nouvelle organisation (Super Admin uniquement) ─────────────────
exports.createOrganization = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      name, type, email, phone, address,
      admin_email, admin_password, admin_name,
      contract_end_date, contract_plan
    } = req.body;

    const existingAdmin = await User.findOne({ where: { email: admin_email } });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Cet email est déjà utilisé par un autre utilisateur'
      });
    }

    const existingOrg = await Organization.findOne({ where: { name } });
    if (existingOrg) {
      return res.status(400).json({
        success: false,
        message: 'Une organisation avec ce nom existe déjà'
      });
    }

    const organization = await Organization.create({
      name, type, email, phone, address,
      is_active: true,
      admin_user_id: null,
      contract_start_date: new Date(),
      contract_end_date: contract_end_date || null,
      contract_status: 'active',
      contract_plan: contract_plan || 'basic',
      contract_pdf_url: null, // sera mis à jour via POST /:id/contract-pdf
    });

    const admin = await User.create({
      email: admin_email,
      password: admin_password,
      full_name: admin_name,
      role: 'company_admin',
      organization_id: organization.id,
      created_by: req.user.id,
      is_active: true,
      password_reset_required: false
    });

    await organization.update({ admin_user_id: admin.id });

    await organization.reload({
      include: [{
        model: User,
        as: 'admin',
        attributes: ['id', 'full_name', 'email', 'role', 'organization_id']
      }]
    });

    try {
      const subject = 'Votre compte Company Admin est créé';
      const text = `Bonjour ${admin_name},\n\nVotre compte administrateur a été créé.\n\nIdentifiants:\nEmail: ${admin_email}\nMot de passe: ${admin_password}\n\nMerci de vous connecter et de changer votre mot de passe.`;
      await sendEmail(admin_email, subject, text, null);
    } catch (emailErr) {
      console.error('Email non envoyé:', emailErr);
    }

    res.status(201).json({
      success: true,
      message: "Organisation créée avec succès. Un email a été envoyé à l'administrateur avec ses identifiants.",
      data: {
        organization,
        admin_credentials: {
          email: admin_email,
          note: "L'administrateur doit changer son mot de passe à la première connexion"
        }
      }
    });
  } catch (error) {
    console.error('Erreur création organisation:', error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la création de l'organisation",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ─── Liste des organisations (Super Admin) ────────────────────────────────────
exports.getAllOrganizations = async (req, res) => {
  try {
    const { search, is_active } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const where = {};
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: organizations } = await Organization.findAndCountAll({
      where,
      include: [{ model: User, as: 'admin', attributes: ['id', 'full_name', 'email'] }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    res.json({
      success: true,
      data: {
        organizations,
        pagination: { total: count, page, limit, total_pages: Math.ceil(count / limit) }
      }
    });
  } catch (error) {
    console.error('Erreur récupération organisations:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─── Détails d'une organisation ───────────────────────────────────────────────
exports.getOrganizationById = async (req, res) => {
  try {
    const orgId = req.params.id;

    const organization = await Organization.findByPk(orgId, {
      include: [
        { model: User, as: 'admin', attributes: ['id', 'full_name', 'email', 'phone'] },
        {
          model: User,
          as: 'users',
          attributes: ['id', 'full_name', 'email', 'role', 'is_active'],
          separate: true,
          order: [['role', 'ASC'], ['full_name', 'ASC']]
        }
      ]
    });

    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organisation non trouvée' });
    }

    res.json({ success: true, data: { organization } });
  } catch (error) {
    console.error('Erreur récupération organisation:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─── Mettre à jour une organisation ──────────────────────────────────────────
exports.updateOrganization = async (req, res) => {
  try {
    const orgId = req.params.id;
    const { name, type, email, phone, address, is_active, contract_end_date, contract_plan, contract_status } = req.body;

    const organization = await Organization.findByPk(orgId);
    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organisation non trouvée' });
    }

    await organization.update({
      name: name || organization.name,
      type: type || organization.type,
      email: email || organization.email,
      phone: phone !== undefined ? phone : organization.phone,
      address: address !== undefined ? address : organization.address,
      is_active: is_active !== undefined ? is_active : organization.is_active,
      contract_end_date: contract_end_date !== undefined ? contract_end_date : organization.contract_end_date,
      contract_plan: contract_plan || organization.contract_plan,
      contract_status: contract_status || organization.contract_status,
    });

    await organization.reload({
      include: [{ model: User, as: 'admin', attributes: ['id', 'full_name', 'email'] }]
    });

    res.json({ success: true, message: 'Organisation mise à jour', data: { organization } });
  } catch (error) {
    console.error('Erreur mise à jour organisation:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─── Supprimer une organisation ───────────────────────────────────────────────
exports.deleteOrganization = async (req, res) => {
  try {
    const orgId = req.params.id;

    const organization = await Organization.findByPk(orgId);
    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organisation non trouvée' });
    }

    const { Ticket } = require('../models/associations');
    const ticketCount = await Ticket.count({ where: { organization_id: orgId } });
    if (ticketCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer : ${ticketCount} tickets existent pour cette organisation`
      });
    }

    // Supprimer le PDF du disque si existant
    if (organization.contract_pdf_url) {
      const oldFilename = path.basename(organization.contract_pdf_url);
      const oldPath = path.join(__dirname, '..', 'uploads', 'contracts', oldFilename);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await organization.destroy();
    res.json({ success: true, message: 'Organisation supprimée' });
  } catch (error) {
    console.error('Erreur suppression organisation:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─── Statistiques d'une organisation ─────────────────────────────────────────
exports.getOrganizationStats = async (req, res) => {
  try {
    const orgId = req.params.id;
    const { Ticket } = require('../models/associations');

    const organization = await Organization.findByPk(orgId);
    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organisation non trouvée' });
    }

    const userStats = await User.findAll({
      where: { organization_id: orgId },
      attributes: ['role', [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'count']],
      group: ['role'],
      raw: true
    });

    const ticketStats = await Ticket.findAll({
      where: { organization_id: orgId },
      attributes: ['status', [Ticket.sequelize.fn('COUNT', Ticket.sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true
    });

    const totalTickets = await Ticket.count({ where: { organization_id: orgId } });

    res.json({
      success: true,
      data: {
        organization: { id: organization.id, name: organization.name, type: organization.type },
        stats: { users_by_role: userStats, tickets_by_status: ticketStats, total_tickets: totalTickets }
      }
    });
  } catch (error) {
    console.error('Erreur stats organisation:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
