// controllers/ticket.controller.js
const { Ticket, User, Category, Comment, Attachment, Department } = require('../models/associations');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const fs   = require('fs');
const path = require('path');

// ─── Helper : trouver l'employé le moins chargé dans un département ────────────
async function findAvailableEmployee(departmentId, organizationId) {
  const employees = await User.findAll({
    where: {
      organization_id: organizationId,
      department_id:   departmentId,
      role:            { [Op.in]: ['employee', 'company_admin'] },
      is_active:       true
    },
    include: [{
      model:    Ticket,
      as:       'assignedTickets',
      required: false,
      where:    { status: { [Op.in]: ['open', 'in_progress'] } },
      attributes: ['id']
    }]
  });
  if (!employees.length) return null;
  employees.sort((a, b) =>
    (a.assignedTickets?.length ?? 0) - (b.assignedTickets?.length ?? 0)
  );
  return employees[0];
}

// ─── Créer un ticket (avec département + auto-assign) ─────────────────────────
exports.createTicket = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      if (req.files?.length) req.files.forEach(f => fs.unlinkSync(f.path));
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { subject, description, category_id, department_id } = req.body;

    // Auto-assign au premier dispo du département si fourni
    let assigned_to = null;
    let status      = 'open';

    if (department_id) {
      const available = await findAvailableEmployee(department_id, req.user.organization_id);
      if (available) {
        assigned_to = available.id;
        status      = 'in_progress';
      }
    }

    const ticket = await Ticket.create({
      subject,
      description,
      category_id,
      department_id:   department_id || null,
      created_by:      req.user.id,
      organization_id: req.user.organization_id,
      status,
      priority:        'medium',
      assigned_to,
      workflow_step:   'department',
      in_worklist:     false
    });

    // Gérer les fichiers uploadés
    if (req.files?.length) {
      await Promise.all(req.files.map(file => Attachment.create({
        ticket_id:     ticket.id,
        filename:      file.filename,
        original_name: file.originalname,
        file_path:     file.path,
        file_size:     file.size,
        mime_type:     file.mimetype,
        uploaded_by:   req.user.id
      })));
    }

    await ticket.reload({
      include: [
        { model: User,       as: 'creator',    attributes: ['id', 'full_name', 'email'] },
        { model: User,       as: 'assignee',   attributes: ['id', 'full_name', 'email'] },
        { model: Category,   as: 'category' },
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        {
          model: Attachment, as: 'attachments',
          include: [{ model: User, as: 'uploader', attributes: ['id', 'full_name'] }]
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: assigned_to
        ? `Ticket créé et assigné automatiquement à ${ticket.assignee?.full_name}`
        : 'Ticket créé avec succès',
      data: { ticket }
    });
  } catch (error) {
    console.error('Erreur createTicket:', error);
    if (req.files?.length) req.files.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
    res.status(500).json({ success: false, message: 'Erreur serveur lors de la création du ticket', error: error.message });
  }
};

// ─── NOUVEAU : Escalader vers le Worklist ─────────────────────────────────────
// PUT /api/tickets/:id/escalate
exports.escalateToWorklist = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket non trouvé' });

    if (req.user.role !== 'super_admin' && ticket.organization_id !== req.user.organization_id)
      return res.status(403).json({ success: false, message: 'Accès refusé' });

    if (ticket.workflow_step === 'worklist')
      return res.status(400).json({ success: false, message: 'Ticket déjà dans le worklist' });

    if (['resolved', 'closed'].includes(ticket.status))
      return res.status(400).json({ success: false, message: 'Impossible d\'escalader un ticket résolu/fermé' });

    // Trouver un employé dispo dans toute l'org (plus de restriction département)
    const candidates = await User.findAll({
      where: {
        organization_id: ticket.organization_id,
        role:            { [Op.in]: ['employee', 'company_admin'] },
        is_active:       true
      },
      include: [{
        model:    Ticket,
        as:       'assignedTickets',
        required: false,
        where:    { status: { [Op.in]: ['open', 'in_progress'] } },
        attributes: ['id']
      }]
    });

    let newAssignee = null;
    if (candidates.length) {
      candidates.sort((a, b) =>
        (a.assignedTickets?.length ?? 0) - (b.assignedTickets?.length ?? 0)
      );
      newAssignee = candidates[0];
    }

    await ticket.update({
      workflow_step: 'worklist',
      in_worklist:   true,
      worklist_at:   new Date(),
      assigned_to:   newAssignee?.id ?? null,
      status:        newAssignee ? 'in_progress' : 'open'
    });

    await ticket.reload({
      include: [
        { model: User,       as: 'creator',    attributes: ['id', 'full_name', 'email'] },
        { model: User,       as: 'assignee',   attributes: ['id', 'full_name', 'email'] },
        { model: Category,   as: 'category' },
        { model: Department, as: 'department', attributes: ['id', 'name'] }
      ]
    });

    res.json({
      success: true,
      message: newAssignee
        ? `Ticket escaladé au worklist et assigné à ${newAssignee.full_name}`
        : 'Ticket escaladé au worklist — aucun employé disponible',
      data: { ticket }
    });
  } catch (error) {
    console.error('Erreur escalateToWorklist:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─── NOUVEAU : Lire le Worklist ───────────────────────────────────────────────
// GET /api/tickets/worklist
exports.getWorklist = async (req, res) => {
  try {
    const where = {
      in_worklist:   true,
      workflow_step: 'worklist',
      status:        { [Op.notIn]: ['resolved', 'closed'] }
    };
    if (req.user.role !== 'super_admin') {
      where.organization_id = req.user.organization_id;
    }

    const tickets = await Ticket.findAll({
      where,
      include: [
        { model: User,       as: 'creator',    attributes: ['id', 'full_name', 'email'] },
        { model: User,       as: 'assignee',   attributes: ['id', 'full_name', 'email'] },
        { model: Category,   as: 'category' },
        { model: Department, as: 'department', attributes: ['id', 'name'] }
      ],
      order: [
        ['priority',    'DESC'], // critical en premier
        ['worklist_at', 'ASC']   // les plus anciens en premier
      ]
    });

    res.json({ success: true, data: { tickets, total: tickets.length } });
  } catch (error) {
    console.error('Erreur getWorklist:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─── NOUVEAU : Assigner manuellement depuis le worklist ───────────────────────
// PUT /api/tickets/:id/worklist-assign
exports.worklistAssign = async (req, res) => {
  try {
    const { employee_id } = req.body;
    const ticket = await Ticket.findByPk(req.params.id);

    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket non trouvé' });
    if (!ticket.in_worklist) return res.status(400).json({ success: false, message: 'Ticket pas dans le worklist' });
    if (req.user.role !== 'super_admin' && ticket.organization_id !== req.user.organization_id)
      return res.status(403).json({ success: false, message: 'Accès refusé' });

    const employee = await User.findByPk(employee_id);
    if (!employee || !['employee', 'company_admin'].includes(employee.role))
      return res.status(400).json({ success: false, message: 'Employé invalide' });

    await ticket.update({ assigned_to: employee_id, status: 'in_progress' });

    await ticket.reload({
      include: [
        { model: User,       as: 'creator',    attributes: ['id', 'full_name', 'email'] },
        { model: User,       as: 'assignee',   attributes: ['id', 'full_name', 'email'] },
        { model: Category,   as: 'category' },
        { model: Department, as: 'department', attributes: ['id', 'name'] }
      ]
    });

    res.json({ success: true, message: `Ticket assigné à ${employee.full_name}`, data: { ticket } });
  } catch (error) {
    console.error('Erreur worklistAssign:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ─── Fonctions existantes (inchangées sauf ajout de Department dans les includes) ─

exports.serveAttachment = async (req, res) => {
  try {
    const attachment = await Attachment.findOne({
      where: { filename: req.params.filename },
      include: [{ model: Ticket, as: 'ticket', attributes: ['id', 'created_by'] }]
    });
    if (!attachment) return res.status(404).json({ success: false, message: 'Fichier non trouvé' });
    if (req.user.role === 'client' && attachment.ticket.created_by !== req.user.id)
      return res.status(403).json({ success: false, message: "Vous n'avez pas accès à ce fichier" });
    if (!fs.existsSync(attachment.file_path))
      return res.status(404).json({ success: false, message: 'Fichier physique non trouvé sur le serveur' });
    res.sendFile(path.resolve(attachment.file_path));
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.downloadAttachment = async (req, res) => {
  try {
    const attachment = await Attachment.findOne({
      where: { filename: req.params.filename },
      include: [{ model: Ticket, as: 'ticket', attributes: ['id', 'created_by'] }]
    });
    if (!attachment) return res.status(404).json({ success: false, message: 'Fichier non trouvé' });
    if (req.user.role === 'client' && attachment.ticket.created_by !== req.user.id)
      return res.status(403).json({ success: false, message: "Vous n'avez pas accès à ce fichier" });
    if (!fs.existsSync(attachment.file_path))
      return res.status(404).json({ success: false, message: 'Fichier physique non trouvé sur le serveur' });
    res.download(attachment.file_path, attachment.original_name);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.addAttachments = async (req, res) => {
  try {
    const ticketId = req.params.ticketId;
    const files    = req.files;

    if (!files?.length)
      return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });

    const ticket = await Ticket.findByPk(ticketId, { attributes: ['id', 'created_by'] });
    if (!ticket) {
      files.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
      return res.status(404).json({ success: false, message: 'Ticket non trouvé' });
    }
    if (req.user.role === 'client' && ticket.created_by !== req.user.id) {
      files.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
      return res.status(403).json({ success: false, message: "Vous n'avez pas la permission d'ajouter des fichiers à ce ticket" });
    }

    const attachments = await Promise.all(files.map(file => Attachment.create({
      ticket_id:     ticketId,
      filename:      file.filename,
      original_name: file.originalname,
      file_path:     file.path,
      file_size:     file.size,
      mime_type:     file.mimetype,
      uploaded_by:   req.user.id
    })));

    await ticket.reload({
      include: [{
        model: Attachment, as: 'attachments',
        include: [{ model: User, as: 'uploader', attributes: ['id', 'full_name'] }]
      }]
    });

    res.status(201).json({
      success: true,
      message: `${attachments.length} fichier(s) ajouté(s) avec succès`,
      data: { ticket, attachments_added: attachments }
    });
  } catch (error) {
    if (req.files?.length) req.files.forEach(f => { if (fs.existsSync(f.path)) fs.unlinkSync(f.path); });
    res.status(500).json({ success: false, message: "Erreur serveur lors de l'ajout des fichiers", error: error.message });
  }
};

exports.deleteAttachment = async (req, res) => {
  try {
    const attachment = await Attachment.findByPk(req.params.attachmentId, {
      include: [{ model: Ticket, as: 'ticket', attributes: ['id', 'created_by'] }]
    });
    if (!attachment) return res.status(404).json({ success: false, message: 'Fichier non trouvé' });
    if (req.user.role === 'client' && attachment.ticket.created_by !== req.user.id)
      return res.status(403).json({ success: false, message: "Vous n'avez pas la permission de supprimer ce fichier" });
    if (fs.existsSync(attachment.file_path)) fs.unlinkSync(attachment.file_path);
    await attachment.destroy();
    res.json({ success: true, message: 'Fichier supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.getAllTickets = async (req, res) => {
  try {
    const { status, priority, category_id, department_id, in_worklist, search } = req.query;
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.user.role === 'client') where.created_by = req.user.id;
    if (status)        where.status        = status;
    if (priority)      where.priority      = priority;
    if (category_id)   where.category_id   = category_id;
    if (department_id) where.department_id = department_id;
    if (in_worklist !== undefined) where.in_worklist = in_worklist === 'true';
    if (search) {
      where[Op.or] = [
        { subject:       { [Op.iLike]: `%${search}%` } },
        { description:   { [Op.iLike]: `%${search}%` } },
        { ticket_number: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: tickets } = await Ticket.findAndCountAll({
      where,
      include: [
        { model: User,       as: 'creator',    attributes: ['id', 'full_name', 'email'] },
        { model: User,       as: 'assignee',   attributes: ['id', 'full_name', 'email', 'team'] },
        { model: Category,   as: 'category' },
        { model: Department, as: 'department', attributes: ['id', 'name'] }, // ← NOUVEAU
        {
          model: Attachment, as: 'attachments',
          attributes: ['id', 'filename', 'original_name', 'file_size', 'mime_type', 'created_at'],
          include: [{ model: User, as: 'uploader', attributes: ['id', 'full_name'] }]
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    res.json({
      success: true,
      data: {
        tickets,
        pagination: { total: count, page, limit, total_pages: Math.ceil(count / limit) }
      }
    });
  } catch (error) {
    console.error('Erreur getAllTickets:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id, {
      include: [
        { model: User,       as: 'creator',    attributes: ['id', 'full_name', 'email', 'phone'] },
        { model: User,       as: 'assignee',   attributes: ['id', 'full_name', 'email', 'team'] },
        { model: Category,   as: 'category' },
        { model: Department, as: 'department', attributes: ['id', 'name'] }, // ← NOUVEAU
        {
          model: Comment, as: 'comments',
          include: [{ model: User, as: 'author', attributes: ['id', 'full_name', 'role'] }],
          order: [['created_at', 'ASC']]
        },
        {
          model: Attachment, as: 'attachments',
          include: [{ model: User, as: 'uploader', attributes: ['id', 'full_name'] }]
        }
      ]
    });

    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket non trouvé' });
    if (req.user.role === 'client' && ticket.created_by !== req.user.id)
      return res.status(403).json({ success: false, message: "Vous n'avez pas accès à ce ticket" });

    res.json({ success: true, data: { ticket } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.updateTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket non trouvé' });

    const { subject, description, status, priority, category_id, department_id, assigned_to } = req.body;

    if (req.user.role === 'client') {
      if (ticket.created_by !== req.user.id)
        return res.status(403).json({ success: false, message: 'Vous ne pouvez pas modifier ce ticket' });
      await ticket.update({
        subject:     subject      || ticket.subject,
        description: description  || ticket.description
      });
    } else {
      await ticket.update({
        subject:       subject       || ticket.subject,
        description:   description   || ticket.description,
        status:        status        || ticket.status,
        priority:      priority      || ticket.priority,
        category_id:   category_id   || ticket.category_id,
        department_id: department_id !== undefined ? department_id : ticket.department_id, // ← NOUVEAU
        assigned_to:   assigned_to   !== undefined ? assigned_to   : ticket.assigned_to
      });
    }

    await ticket.reload({
      include: [
        { model: User,       as: 'creator',    attributes: ['id', 'full_name', 'email'] },
        { model: User,       as: 'assignee',   attributes: ['id', 'full_name', 'email', 'team'] },
        { model: Category,   as: 'category' },
        { model: Department, as: 'department', attributes: ['id', 'name'] } // ← NOUVEAU
      ]
    });

    res.json({ success: true, message: 'Ticket mis à jour avec succès', data: { ticket } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket non trouvé' });
    if (!['admin', 'company_admin', 'super_admin'].includes(req.user.role))
      return res.status(403).json({ success: false, message: 'Seuls les administrateurs peuvent supprimer des tickets' });
    await ticket.destroy();
    res.json({ success: true, message: 'Ticket supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { content, is_internal } = req.body;
    if (!content?.trim())
      return res.status(400).json({ success: false, message: 'Le contenu du commentaire est requis' });

    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket non trouvé' });
    if (req.user.role === 'client' && ticket.created_by !== req.user.id)
      return res.status(403).json({ success: false, message: 'Vous ne pouvez pas commenter ce ticket' });

    const comment = await Comment.create({
      ticket_id:   req.params.id,
      user_id:     req.user.id,
      content,
      is_internal: req.user.role !== 'client' && is_internal === true
    });

    await comment.reload({
      include: [{ model: User, as: 'author', attributes: ['id', 'full_name', 'role'] }]
    });

    res.status(201).json({ success: true, message: 'Commentaire ajouté avec succès', data: { comment } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.assignTicket = async (req, res) => {
  try {
    if (req.user.role === 'client')
      return res.status(403).json({ success: false, message: "Vous n'avez pas la permission d'assigner des tickets" });

    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket non trouvé' });

    const { employee_id } = req.body;
    if (employee_id) {
      const employee = await User.findByPk(employee_id);
      if (!employee || !['employee', 'company_admin'].includes(employee.role))
        return res.status(400).json({ success: false, message: 'Employé invalide' });
    }

    await ticket.update({
      assigned_to: employee_id,
      status:      employee_id ? 'in_progress' : 'open'
    });

    await ticket.reload({
      include: [
        { model: User,       as: 'creator',    attributes: ['id', 'full_name', 'email'] },
        { model: User,       as: 'assignee',   attributes: ['id', 'full_name', 'email', 'team'] },
        { model: Category,   as: 'category' },
        { model: Department, as: 'department', attributes: ['id', 'name'] }
      ]
    });

    res.json({
      success: true,
      message: employee_id ? 'Ticket assigné avec succès' : 'Assignment retiré',
      data: { ticket }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};