'use strict';

const { sequelize } = require('../models');
const {
  WorkflowTemplate, WorkflowTemplateStep,
  TicketWorkflowState, WorkflowHistory,
  Ticket, User, Category, Department,
} = require('../models/associations');
const { sendEmail } = require('../utils/email');

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Exporté pour être utilisé dans ticket.controller.js
async function findBestEmployeeInternal(step, organizationId) {
  const where = { organization_id: organizationId, is_active: true, is_available: true };
  if (step.role)          where.role          = step.role;
  if (step.department_id) where.department_id = step.department_id;
  const employees = await User.findAll({
    where,
    attributes: ['id', 'full_name', 'email', 'role'],
    include: [{ model: Ticket, as: 'assignedTickets', attributes: ['id'], where: { status: ['open', 'in_progress'] }, required: false }],
  });
  if (!employees.length) return null;
  employees.sort((a, b) => (a.assignedTickets?.length ?? 0) - (b.assignedTickets?.length ?? 0));
  return employees[0];
}
exports.findBestEmployeeInternal = findBestEmployeeInternal;

async function findAllEmployeesForStep(step, organizationId) {
  const where = { organization_id: organizationId, is_active: true };
  if (step.role)          where.role          = step.role;
  if (step.department_id) where.department_id = step.department_id;
  return User.findAll({ where, attributes: ['id', 'full_name', 'email'] });
}

// ─── CRUD Templates ───────────────────────────────────────────────────────────

exports.getAllTemplates = async (req, res) => {
  try {
    const where = { organization_id: req.user.organization_id };
    if (req.query.context)     where.context     = req.query.context;
    if (req.query.category_id) where.category_id = Number(req.query.category_id);
    const templates = await WorkflowTemplate.findAll({
      where,
      include: [
        { model: WorkflowTemplateStep, as: 'steps', include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }], order: [['step_order', 'ASC']] },
        { model: Category, as: 'category', attributes: ['id', 'name', 'color'] },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.json({ success: true, data: { templates } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTemplateById = async (req, res) => {
  try {
    const template = await WorkflowTemplate.findByPk(req.params.id, {
      include: [
        { model: WorkflowTemplateStep, as: 'steps', include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }], order: [['step_order', 'ASC']] },
        { model: Category, as: 'category', attributes: ['id', 'name', 'color'] },
      ],
    });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    return res.json({ success: true, data: { template } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createTemplate = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, category_id, context = 'supplier', is_active = true, steps = [] } = req.body;
    if (!name?.trim()) throw new Error('name is required');
    if (!steps.length) throw new Error('At least one step is required');
    const template = await WorkflowTemplate.create(
      { name: name.trim(), category_id, organization_id: req.user.organization_id, context, is_active },
      { transaction: t }
    );
    await WorkflowTemplateStep.bulkCreate(
      steps.map((s, i) => ({ template_id: template.id, step_order: s.step_order ?? i + 1, label: s.label, role: s.role, assignment_type: s.assignment_type ?? 'OR', department_id: s.department_id ?? null })),
      { transaction: t }
    );
    await t.commit();
    const created = await WorkflowTemplate.findByPk(template.id, { include: [{ model: WorkflowTemplateStep, as: 'steps', order: [['step_order', 'ASC']] }] });
    return res.status(201).json({ success: true, data: { template: created } });
  } catch (err) {
    await t.rollback();
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateTemplate = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, category_id, context, is_active, steps } = req.body;
    const template = await WorkflowTemplate.findByPk(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    await template.update({ name: name?.trim() ?? template.name, category_id, context, is_active }, { transaction: t });
    if (Array.isArray(steps)) {
      await WorkflowTemplateStep.destroy({ where: { template_id: template.id }, transaction: t });
      await WorkflowTemplateStep.bulkCreate(
        steps.map((s, i) => ({ template_id: template.id, step_order: s.step_order ?? i + 1, label: s.label, role: s.role, assignment_type: s.assignment_type ?? 'OR', department_id: s.department_id ?? null })),
        { transaction: t }
      );
    }
    await t.commit();
    const updated = await WorkflowTemplate.findByPk(template.id, {
      include: [{ model: WorkflowTemplateStep, as: 'steps', order: [['step_order', 'ASC']] }, { model: Category, as: 'category', attributes: ['id', 'name'] }],
    });
    return res.json({ success: true, data: { template: updated } });
  } catch (err) {
    await t.rollback();
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const template = await WorkflowTemplate.findByPk(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    const activeCount = await TicketWorkflowState.count({ where: { template_id: template.id, status: 'active' } });
    if (activeCount > 0) return res.status(400).json({ success: false, message: `Cannot delete: ${activeCount} ticket(s) using this workflow` });
    await template.destroy();
    return res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Workflow Execution ───────────────────────────────────────────────────────

exports.startWorkflow = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const ticketId              = req.params.id;
    const { template_id, context = 'client' } = req.body;
    const ticket                = await Ticket.findByPk(ticketId);
    if (!ticket) throw new Error('Ticket not found');
    const existing = await TicketWorkflowState.findOne({ where: { ticket_id: ticketId, status: 'active' } });
    if (existing) throw new Error('A workflow is already active on this ticket');

    let template;
    if (template_id) {
      template = await WorkflowTemplate.findByPk(template_id, { include: [{ model: WorkflowTemplateStep, as: 'steps', order: [['step_order', 'ASC']] }] });
    } else if (ticket.category_id) {
      template = await WorkflowTemplate.findOne({
        where: { category_id: ticket.category_id, organization_id: ticket.organization_id ?? req.user.organization_id, context, is_active: true },
        include: [{ model: WorkflowTemplateStep, as: 'steps', order: [['step_order', 'ASC']] }],
      });
    }
    if (!template) throw new Error('No active workflow template found');
    if (!template.steps?.length) throw new Error('Workflow template has no steps');

    const firstStep = template.steps[0];
    const state = await TicketWorkflowState.create({ ticket_id: ticketId, template_id: template.id, current_step: firstStep.step_order, context, status: 'active' }, { transaction: t });

    let assignedUser = null;
    if (firstStep.assignment_type === 'OR') {
      assignedUser = await findBestEmployeeInternal(firstStep, req.user.organization_id);
      if (assignedUser) await ticket.update({ assigned_to: assignedUser.id, status: 'in_progress' }, { transaction: t });
    } else {
      await ticket.update({ status: 'in_progress' }, { transaction: t });
    }

    await WorkflowHistory.create({ ticket_id: ticketId, template_id: template.id, step_number: firstStep.step_order, step_label: firstStep.label, action: 'started', acted_by: req.user.id, assigned_to: assignedUser?.id ?? null, comment: `Workflow "${template.name}" démarré` }, { transaction: t });
    await t.commit();

    // ── POINT 3 : Email démarrage manuel ─────────────────────────────────────
    if (assignedUser) {
      try {
        await sendEmail(
          assignedUser.email,
          `[${ticket.ticket_number || 'TKT-' + ticket.id}] Workflow démarré — ${firstStep.label ?? 'Étape 1'}`,
          `Bonjour ${assignedUser.full_name},\n\nLe workflow "${template.name}" a démarré sur le ticket "${ticket.subject}".\n\nVous êtes assigné à l'étape : ${firstStep.label ?? 'Étape 1'}\n\nConnectez-vous pour traiter ce ticket.\n\nMerci.`,
          null
        );
      } catch (e) { console.error('Email startWorkflow:', e.message); }
    }

    return res.status(201).json({ success: true, data: { state, current_step: firstStep, assigned_to: assignedUser } });
  } catch (err) {
    await t.rollback();
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.forwardWorkflow = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const ticketId    = req.params.id;
    const { comment } = req.body;

    const state = await TicketWorkflowState.findOne({
      where: { ticket_id: ticketId, status: 'active' },
      include: [{ model: WorkflowTemplate, as: 'template', include: [{ model: WorkflowTemplateStep, as: 'steps', order: [['step_order', 'ASC']] }] }],
    });
    if (!state) throw new Error('No active workflow found');

    const steps      = state.template.steps;
    const currentIdx = steps.findIndex(s => s.step_order === state.current_step);
    const nextStep   = steps[currentIdx + 1];
    const ticket     = await Ticket.findByPk(ticketId);

    await WorkflowHistory.create({ ticket_id: ticketId, template_id: state.template_id, step_number: state.current_step, step_label: steps[currentIdx]?.label, action: 'forward', acted_by: req.user.id, comment: comment ?? null }, { transaction: t });

    if (!nextStep) {
      // Workflow terminé
      await state.update({ status: 'completed', completed_at: new Date() }, { transaction: t });
      await ticket.update({ status: 'resolved' }, { transaction: t });
      await WorkflowHistory.create({ ticket_id: ticketId, template_id: state.template_id, step_number: state.current_step, step_label: 'Fin du circuit', action: 'completed', acted_by: req.user.id, comment: 'Workflow terminé — ticket résolu' }, { transaction: t });
      await t.commit();

      // ── POINT 3 : Email créateur — ticket résolu ──────────────────────────
      try {
        const creator = await User.findByPk(ticket.created_by, { attributes: ['email', 'full_name'] });
        if (creator) {
          await sendEmail(
            creator.email,
            `[${ticket.ticket_number || 'TKT-' + ticket.id}] Votre ticket a été résolu`,
            `Bonjour ${creator.full_name},\n\nVotre ticket "${ticket.subject}" a été traité et résolu avec succès.\n\nMerci pour votre confiance.`,
            null
          );
        }
      } catch (e) { console.error('Email résolution:', e.message); }

      return res.json({ success: true, data: { completed: true, message: 'Workflow completed, ticket resolved' } });
    }

    await state.update({ current_step: nextStep.step_order }, { transaction: t });

    let assignedUser = null;
    let andUsers     = [];
    if (nextStep.assignment_type === 'OR') {
      assignedUser = await findBestEmployeeInternal(nextStep, req.user.organization_id);
      if (assignedUser) await ticket.update({ assigned_to: assignedUser.id }, { transaction: t });
    } else {
      andUsers = await findAllEmployeesForStep(nextStep, req.user.organization_id);
    }

    await WorkflowHistory.create({ ticket_id: ticketId, template_id: state.template_id, step_number: nextStep.step_order, step_label: nextStep.label, action: 'started', acted_by: req.user.id, assigned_to: assignedUser?.id ?? null, comment: `Étape ${nextStep.step_order}: ${nextStep.label ?? ''}` }, { transaction: t });
    await t.commit();

    // ── POINT 3 : Email(s) étape suivante ────────────────────────────────────
    const emailTargets = assignedUser ? [assignedUser] : andUsers;
    for (const u of emailTargets) {
      try {
        await sendEmail(
          u.email,
          `[${ticket.ticket_number || 'TKT-' + ticket.id}] Action requise — ${nextStep.label ?? 'Étape ' + nextStep.step_order}`,
          `Bonjour ${u.full_name},\n\nLe ticket "${ticket.subject}" avance dans le circuit "${state.template.name}".\n\nÉtape actuelle : ${nextStep.label ?? 'Étape ' + nextStep.step_order}${nextStep.assignment_type === 'AND' ? '\n(Vous faites partie des intervenants requis à cette étape)' : ''}\n\nConnectez-vous pour le traiter.\n\nMerci.`,
          null
        );
      } catch (e) { console.error('Email forward step:', e.message); }
    }

    return res.json({ success: true, data: { completed: false, current_step: nextStep, assigned_to: assignedUser ?? andUsers } });
  } catch (err) {
    await t.rollback();
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.backwardWorkflow = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const ticketId    = req.params.id;
    const { comment } = req.body;
    if (!comment?.trim()) throw new Error('Comment is required when going backward');

    const state = await TicketWorkflowState.findOne({
      where: { ticket_id: ticketId, status: 'active' },
      include: [{ model: WorkflowTemplate, as: 'template', include: [{ model: WorkflowTemplateStep, as: 'steps', order: [['step_order', 'ASC']] }] }],
    });
    if (!state) throw new Error('No active workflow found');

    const steps      = state.template.steps;
    const currentIdx = steps.findIndex(s => s.step_order === state.current_step);
    if (currentIdx === 0) throw new Error('Already at the first step');

    const prevStep = steps[currentIdx - 1];
    const ticket   = await Ticket.findByPk(ticketId);

    await WorkflowHistory.create({ ticket_id: ticketId, template_id: state.template_id, step_number: state.current_step, step_label: steps[currentIdx]?.label, action: 'backward', acted_by: req.user.id, comment: comment.trim() }, { transaction: t });
    await state.update({ current_step: prevStep.step_order }, { transaction: t });

    let assignedUser = null;
    if (prevStep.assignment_type === 'OR') {
      assignedUser = await findBestEmployeeInternal(prevStep, req.user.organization_id);
      if (assignedUser) await ticket.update({ assigned_to: assignedUser.id }, { transaction: t });
    }

    await t.commit();

    // ── POINT 3 : Email retour étape précédente ───────────────────────────────
    if (assignedUser) {
      try {
        await sendEmail(
          assignedUser.email,
          `[${ticket.ticket_number || 'TKT-' + ticket.id}] Ticket renvoyé — ${prevStep.label ?? 'Étape ' + prevStep.step_order}`,
          `Bonjour ${assignedUser.full_name},\n\nLe ticket "${ticket.subject}" a été renvoyé à l'étape précédente.\n\nÉtape : ${prevStep.label ?? 'Étape ' + prevStep.step_order}\nRaison : ${comment.trim()}\n\nConnectez-vous pour le traiter.\n\nMerci.`,
          null
        );
      } catch (e) { console.error('Email backward:', e.message); }
    }

    return res.json({ success: true, data: { current_step: prevStep, assigned_to: assignedUser, message: `Renvoyé à l'étape ${prevStep.step_order}` } });
  } catch (err) {
    await t.rollback();
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.getWorkflowState = async (req, res) => {
  try {
    const state = await TicketWorkflowState.findOne({
      where: { ticket_id: req.params.id },
      include: [{ model: WorkflowTemplate, as: 'template', include: [{ model: WorkflowTemplateStep, as: 'steps', order: [['step_order', 'ASC']] }] }],
    });
    const history = await WorkflowHistory.findAll({
      where: { ticket_id: req.params.id },
      include: [{ model: User, as: 'actor', attributes: ['id', 'full_name', 'email'] }, { model: User, as: 'assignee', attributes: ['id', 'full_name', 'email'] }],
      order: [['acted_at', 'ASC']],
    });
    return res.json({ success: true, data: { state, history } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};