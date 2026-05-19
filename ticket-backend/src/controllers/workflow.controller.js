'use strict';
const db = require('../models/associations');
const sequelize = db.sequelize;

const {
  WorkflowTemplate, WorkflowTemplateStep,
  TicketWorkflowState, WorkflowHistory, TicketBilling,
  Ticket, User, Category, Department,
} = require('../models/associations');
const { sendEmail }                                         = require('../utils/email');
const { findBestAgent, findAllAgentsForStep, updateAgentScore } = require('../utils/agentScoring');

exports.findBestEmployeeInternal = (step, orgId) => findBestAgent(step, orgId);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcMinutes(start, end) {
  if (!start || !end) return null;
  return Math.round((new Date(end) - new Date(start)) / 60000);
}

async function notifyUser(user, subject, text) {
  if (!user?.email) return;
  try { await sendEmail(user.email, subject, text, null); }
  catch (e) { console.error('Email error:', e.message); }
}

async function notifyAll(users, subject, text) {
  await Promise.all(users.map(u => notifyUser(u, subject, text)));
}

// ─── Résoudre l'assignation selon OR / AND ────────────────────────────────────
// Retourne { assignedUser, andUsers, assigned_to }
async function resolveStepAssignment(step, organizationId) {
  if (step.assignment_type === 'AND') {
    const andUsers = await findAllAgentsForStep(step, organizationId);
    return { assignedUser: null, andUsers, assigned_to: null };
  } else {
    const assignedUser = await findBestAgent(step, organizationId);
    return { assignedUser, andUsers: [], assigned_to: assignedUser?.id ?? null };
  }
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
        { model: WorkflowTemplateStep, as: 'steps',
          include: [{ model: Department, as: 'department', attributes: ['id','name'] }],
          order: [['step_order','ASC']] },
        { model: Category, as: 'category', attributes: ['id','name','color'] },
      ],
      order: [['created_at','DESC']],
    });
    return res.json({ success: true, data: { templates } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.getTemplateById = async (req, res) => {
  try {
    const template = await WorkflowTemplate.findByPk(req.params.id, {
      include: [
        { model: WorkflowTemplateStep, as: 'steps',
          include: [{ model: Department, as: 'department', attributes: ['id','name'] }],
          order: [['step_order','ASC']] },
        { model: Category, as: 'category', attributes: ['id','name','color'] },
      ],
    });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    return res.json({ success: true, data: { template } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
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
      steps.map((s, i) => ({
        template_id:     template.id,
        step_order:      s.step_order ?? i + 1,
        label:           s.label,
        role_label:      s.role_label ?? s.label,  // ← role métier ex: "Directeur Technique"
        role:            s.role ?? null,             // ← role système (optionnel)
        assignment_type: s.assignment_type ?? 'OR',
        department_id:   s.department_id ?? null,
      })),
      { transaction: t }
    );
    await t.commit();
    const created = await WorkflowTemplate.findByPk(template.id, {
      include: [{ model: WorkflowTemplateStep, as: 'steps', order: [['step_order','ASC']] }],
    });
    return res.status(201).json({ success: true, data: { template: created } });
  } catch (err) { await t.rollback(); return res.status(400).json({ success: false, message: err.message }); }
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
        steps.map((s, i) => ({
          template_id:     template.id,
          step_order:      s.step_order ?? i + 1,
          label:           s.label,
          role_label:      s.role_label ?? s.label,
          role:            s.role ?? null,
          assignment_type: s.assignment_type ?? 'OR',
          department_id:   s.department_id ?? null,
        })),
        { transaction: t }
      );
    }
    await t.commit();
    const updated = await WorkflowTemplate.findByPk(template.id, {
      include: [
        { model: WorkflowTemplateStep, as: 'steps', order: [['step_order','ASC']] },
        { model: Category, as: 'category', attributes: ['id','name'] },
      ],
    });
    return res.json({ success: true, data: { template: updated } });
  } catch (err) { await t.rollback(); return res.status(400).json({ success: false, message: err.message }); }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const template = await WorkflowTemplate.findByPk(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    const active = await TicketWorkflowState.count({ where: { template_id: template.id, status: 'active' } });
    if (active > 0) return res.status(400).json({ success: false, message: `Cannot delete: ${active} ticket(s) using this workflow` });
    await template.destroy();
    return res.json({ success: true, message: 'Template deleted' });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

// ─── Workflow Execution ───────────────────────────────────────────────────────

/**
 * POST /api/tickets/:id/workflow/start
 */
exports.startWorkflow = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { template_id, context = 'client' } = req.body;
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) throw new Error('Ticket not found');

    const existing = await TicketWorkflowState.findOne({ where: { ticket_id: ticket.id, status: 'active' } });
    if (existing) throw new Error('A workflow is already active on this ticket');

    // Trouver le template par catégorie ou ID explicite
    let template;
    if (template_id) {
      template = await WorkflowTemplate.findByPk(template_id, {
        include: [{ model: WorkflowTemplateStep, as: 'steps', order: [['step_order','ASC']] }],
      });
    } else if (ticket.category_id) {
      template = await WorkflowTemplate.findOne({
        where: { category_id: ticket.category_id, organization_id: ticket.organization_id ?? req.user.organization_id, context, is_active: true },
        include: [{ model: WorkflowTemplateStep, as: 'steps', order: [['step_order','ASC']] }],
      });
    }
    if (!template) throw new Error(`No active workflow template found for category ${ticket.category_id} / context ${context}`);
    if (!template.steps?.length) throw new Error('Workflow template has no steps');

    const firstStep = template.steps[0];
    const now       = new Date();

    await TicketWorkflowState.create({
      ticket_id: ticket.id, template_id: template.id,
      current_step: firstStep.step_order, context, status: 'active',
    }, { transaction: t });

    await ticket.update({ status: 'in_progress', started_at: now }, { transaction: t });

    // OR ou AND pour la première étape
    const { assignedUser, andUsers, assigned_to } = await resolveStepAssignment(firstStep, req.user.organization_id);
    if (assigned_to) await ticket.update({ assigned_to }, { transaction: t });

    await WorkflowHistory.create({
      ticket_id: ticket.id, template_id: template.id,
      step_number: firstStep.step_order, step_label: firstStep.label,
      action: 'started', acted_by: req.user.id, assigned_to,
      step_started_at: now,
      comment: `Workflow "${template.name}" démarré — Étape 1: ${firstStep.role_label ?? firstStep.label}`,
    }, { transaction: t });

    await t.commit();

    // Notifications
    const ticketRef = ticket.ticket_number || `TKT-${ticket.id}`;
    if (firstStep.assignment_type === 'OR' && assignedUser) {
      notifyUser(assignedUser,
        `[${ticketRef}] Ticket assigné — ${firstStep.role_label ?? firstStep.label}`,
        `Bonjour ${assignedUser.full_name},\n\nVous avez été sélectionné pour traiter ce ticket.\n\nTicket  : ${ticket.subject}\nCircuit : ${template.name}\nÉtape   : ${firstStep.role_label ?? firstStep.label}\n\nConnectez-vous pour le traiter.`
      );
    } else if (firstStep.assignment_type === 'AND' && andUsers.length) {
      notifyAll(andUsers,
        `[${ticketRef}] Action requise (AND) — ${firstStep.role_label ?? firstStep.label}`,
        `Bonjour,\n\nVous faites partie des intervenants requis pour cette étape.\n\nTicket  : ${ticket.subject}\nCircuit : ${template.name}\nÉtape   : ${firstStep.role_label ?? firstStep.label}\n\nLe premier à traiter fera avancer le workflow.`
      );
    }

    return res.status(201).json({ success: true, data: { template_name: template.name, current_step: firstStep, assignment_type: firstStep.assignment_type, assigned_to: assignedUser ?? andUsers } });
  } catch (err) {
    await t.rollback();
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/tickets/:id/workflow/forward  ("Traiter" / "Suivant")
 */
exports.forwardWorkflow = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { comment } = req.body;
    const now         = new Date();

    const state = await TicketWorkflowState.findOne({
      where: { ticket_id: req.params.id, status: 'active' },
      include: [{ model: WorkflowTemplate, as: 'template',
        include: [{ model: WorkflowTemplateStep, as: 'steps', order: [['step_order','ASC']] }] }],
    });
    if (!state) throw new Error('No active workflow found for this ticket');

    const steps      = state.template.steps;
    const currentIdx = steps.findIndex(s => s.step_order === state.current_step);
    const curStep    = steps[currentIdx];
    const nextStep   = steps[currentIdx + 1];
    const ticket     = await Ticket.findByPk(req.params.id);

    // Durée étape actuelle
    const lastStarted  = await WorkflowHistory.findOne({
      where: { ticket_id: ticket.id, step_number: state.current_step, action: 'started' },
      order: [['step_started_at','DESC']],
    });
    const stepDuration = calcMinutes(lastStarted?.step_started_at, now);

    // Enregistrer le forward
    await WorkflowHistory.create({
      ticket_id: ticket.id, template_id: state.template_id,
      step_number: state.current_step, step_label: curStep?.label,
      action: 'forward', acted_by: req.user.id, comment: comment ?? null,
      step_started_at: lastStarted?.step_started_at, step_ended_at: now,
      step_duration_minutes: stepDuration,
    }, { transaction: t });

    // ── Dernière étape → workflow terminé ────────────────────────────────────
    if (!nextStep) {
      const totalDuration = calcMinutes(ticket.started_at, now);
      await state.update({ status: 'completed', completed_at: now }, { transaction: t });
      await ticket.update({ status: 'resolved', ended_at: now, duration_minutes: totalDuration }, { transaction: t });
      await WorkflowHistory.create({
        ticket_id: ticket.id, template_id: state.template_id,
        step_number: state.current_step, step_label: 'Fin du circuit',
        action: 'completed', acted_by: req.user.id, step_ended_at: now,
        comment: `Workflow terminé — durée totale: ${totalDuration ?? '?'} min`,
      }, { transaction: t });
      await t.commit();

      // Score agent + notif créateur
      if (ticket.assigned_to) updateAgentScore(ticket.assigned_to).catch(() => {});
      const creator = await User.findByPk(ticket.created_by, { attributes: ['email','full_name'] });
      notifyUser(creator,
        `[${ticket.ticket_number || 'TKT-' + ticket.id}] Votre ticket a été résolu`,
        `Bonjour ${creator?.full_name},\n\nVotre ticket "${ticket.subject}" a été traité et résolu.\nDurée de traitement : ${totalDuration ?? '?'} minutes.\n\nMerci.`
      );
      return res.json({ success: true, data: { completed: true, duration_minutes: totalDuration } });
    }

    // ── Passer à l'étape suivante ─────────────────────────────────────────────
    await state.update({ current_step: nextStep.step_order }, { transaction: t });

    const { assignedUser, andUsers, assigned_to } = await resolveStepAssignment(nextStep, req.user.organization_id);
    if (assigned_to) await ticket.update({ assigned_to }, { transaction: t });

    await WorkflowHistory.create({
      ticket_id: ticket.id, template_id: state.template_id,
      step_number: nextStep.step_order, step_label: nextStep.label,
      action: 'started', acted_by: req.user.id, assigned_to,
      step_started_at: now,
      comment: `Étape ${nextStep.step_order}: ${nextStep.role_label ?? nextStep.label}`,
    }, { transaction: t });
    await t.commit();

    // Notifications selon OR ou AND
    const ticketRef = ticket.ticket_number || `TKT-${ticket.id}`;
    if (nextStep.assignment_type === 'OR' && assignedUser) {
      notifyUser(assignedUser,
        `[${ticketRef}] Action requise — ${nextStep.role_label ?? nextStep.label}`,
        `Bonjour ${assignedUser.full_name},\n\nLe ticket "${ticket.subject}" avance dans le circuit "${state.template.name}".\n\nVotre rôle : ${nextStep.role_label ?? nextStep.label}\nÉtape ${nextStep.step_order} / ${steps.length}\n\nConnectez-vous pour traiter ce ticket.`
      );
    } else if (nextStep.assignment_type === 'AND' && andUsers.length) {
      notifyAll(andUsers,
        `[${ticketRef}] Action requise (tous) — ${nextStep.role_label ?? nextStep.label}`,
        `Bonjour,\n\nLe ticket "${ticket.subject}" requiert votre intervention simultanée.\n\nRôle requis : ${nextStep.role_label ?? nextStep.label}\nÉtape ${nextStep.step_order} / ${steps.length}\n\nLe premier à traiter fera avancer le circuit.\n\nConnectez-vous pour traiter ce ticket.`
      );
    }

    return res.json({
      success: true,
      data: {
        completed: false,
        current_step: nextStep,
        step_duration_minutes: stepDuration,
        assignment_type: nextStep.assignment_type,
        assigned_to: assignedUser ?? andUsers,
        role_label: nextStep.role_label,
      },
    });
  } catch (err) {
    await t.rollback();
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/tickets/:id/workflow/backward  ("Reculer")
 * Commentaire OBLIGATOIRE
 */
exports.backwardWorkflow = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { comment } = req.body;
    if (!comment?.trim()) throw new Error('Comment is required when going backward');
    const now = new Date();

    const state = await TicketWorkflowState.findOne({
      where: { ticket_id: req.params.id, status: 'active' },
      include: [{ model: WorkflowTemplate, as: 'template',
        include: [{ model: WorkflowTemplateStep, as: 'steps', order: [['step_order','ASC']] }] }],
    });
    if (!state) throw new Error('No active workflow found');

    const steps      = state.template.steps;
    const currentIdx = steps.findIndex(s => s.step_order === state.current_step);
    if (currentIdx === 0) throw new Error('Already at the first step, cannot go backward');

    const prevStep = steps[currentIdx - 1];
    const ticket   = await Ticket.findByPk(req.params.id);

    await WorkflowHistory.create({
      ticket_id: ticket.id, template_id: state.template_id,
      step_number: state.current_step, step_label: steps[currentIdx]?.label,
      action: 'backward', acted_by: req.user.id, comment: comment.trim(), step_ended_at: now,
    }, { transaction: t });

    await state.update({ current_step: prevStep.step_order }, { transaction: t });

    const { assignedUser, andUsers, assigned_to } = await resolveStepAssignment(prevStep, req.user.organization_id);
    if (assigned_to) await ticket.update({ assigned_to }, { transaction: t });

    await WorkflowHistory.create({
      ticket_id: ticket.id, template_id: state.template_id,
      step_number: prevStep.step_order, step_label: prevStep.label,
      action: 'started', acted_by: req.user.id, assigned_to,
      step_started_at: now, comment: `Renvoyé — ${comment.trim()}`,
    }, { transaction: t });
    await t.commit();

    const ticketRef = ticket.ticket_number || `TKT-${ticket.id}`;
    if (prevStep.assignment_type === 'OR' && assignedUser) {
      notifyUser(assignedUser,
        `[${ticketRef}] Ticket renvoyé — ${prevStep.role_label ?? prevStep.label}`,
        `Bonjour ${assignedUser.full_name},\n\nLe ticket "${ticket.subject}" a été renvoyé à l'étape précédente.\n\nRôle : ${prevStep.role_label ?? prevStep.label}\nRaison : ${comment.trim()}\n\nConnectez-vous pour le retraiter.`
      );
    } else if (prevStep.assignment_type === 'AND' && andUsers.length) {
      notifyAll(andUsers,
        `[${ticketRef}] Ticket renvoyé (AND) — ${prevStep.role_label ?? prevStep.label}`,
        `Bonjour,\n\nLe ticket "${ticket.subject}" a été renvoyé à votre étape.\n\nRaison : ${comment.trim()}`
      );
    }

    return res.json({ success: true, data: { current_step: prevStep, role_label: prevStep.role_label, assignment_type: prevStep.assignment_type, assigned_to: assignedUser ?? andUsers } });
  } catch (err) {
    await t.rollback();
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/tickets/:id/workflow/suspend
 */
exports.suspendWorkflow = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) throw new Error('Ticket not found');
    if (ticket.status !== 'in_progress') throw new Error('Only in_progress tickets can be suspended');
    const state = await TicketWorkflowState.findOne({ where: { ticket_id: ticket.id, status: 'active' } });
    if (!state) throw new Error('No active workflow');
    const now = new Date();
    await ticket.update({ status: 'suspended', suspended_at: now }, { transaction: t });
    await WorkflowHistory.create({ ticket_id: ticket.id, template_id: state.template_id, step_number: state.current_step, action: 'suspended', acted_by: req.user.id, step_ended_at: now, comment: req.body.comment ?? 'Suspendu' }, { transaction: t });
    await t.commit();
    return res.json({ success: true, message: 'Ticket suspendu', data: { status: 'suspended' } });
  } catch (err) { await t.rollback(); return res.status(400).json({ success: false, message: err.message }); }
};

/**
 * PUT /api/tickets/:id/workflow/resume
 */
exports.resumeWorkflow = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) throw new Error('Ticket not found');
    if (ticket.status !== 'suspended') throw new Error('Only suspended tickets can be resumed');
    const state = await TicketWorkflowState.findOne({ where: { ticket_id: ticket.id, status: 'active' } });
    if (!state) throw new Error('No active workflow');
    const now = new Date();
    await ticket.update({ status: 'in_progress', resumed_at: now }, { transaction: t });
    await WorkflowHistory.create({ ticket_id: ticket.id, template_id: state.template_id, step_number: state.current_step, action: 'resumed', acted_by: req.user.id, step_started_at: now, comment: 'Traitement repris' }, { transaction: t });
    await t.commit();
    return res.json({ success: true, message: 'Ticket repris', data: { status: 'in_progress' } });
  } catch (err) { await t.rollback(); return res.status(400).json({ success: false, message: err.message }); }
};

/**
 * PUT /api/tickets/:id/workflow/stop
 */
exports.stopWorkflow = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) throw new Error('Ticket not found');
    const state = await TicketWorkflowState.findOne({ where: { ticket_id: ticket.id, status: 'active' } });
    if (!state) throw new Error('No active workflow');
    const now           = new Date();
    const totalDuration = calcMinutes(ticket.started_at, now);
    await state.update({ status: 'completed', completed_at: now }, { transaction: t });
    await ticket.update({ status: 'resolved', ended_at: now, duration_minutes: totalDuration }, { transaction: t });
    await WorkflowHistory.create({ ticket_id: ticket.id, template_id: state.template_id, step_number: state.current_step, action: 'stopped', acted_by: req.user.id, step_ended_at: now, comment: `Arrêté — durée: ${totalDuration ?? '?'} min` }, { transaction: t });
    await t.commit();
    if (ticket.assigned_to) updateAgentScore(ticket.assigned_to).catch(() => {});
    return res.json({ success: true, message: 'Workflow arrêté', data: { duration_minutes: totalDuration, status: 'resolved' } });
  } catch (err) { await t.rollback(); return res.status(400).json({ success: false, message: err.message }); }
};

/**
 * GET /api/tickets/:id/workflow/state
 */
exports.getWorkflowState = async (req, res) => {
  try {
    const state = await TicketWorkflowState.findOne({
      where: { ticket_id: req.params.id },
      include: [{ model: WorkflowTemplate, as: 'template',
        include: [{ model: WorkflowTemplateStep, as: 'steps', order: [['step_order','ASC']] }] }],
    });
    const history = await WorkflowHistory.findAll({
      where: { ticket_id: req.params.id },
      include: [
        { model: User, as: 'actor',   attributes: ['id','full_name','email'] },
        { model: User, as: 'assignee', attributes: ['id','full_name','email'] },
      ],
      order: [['acted_at','ASC']],
    });
    return res.json({ success: true, data: { state, history } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

// ─── Facturation ──────────────────────────────────────────────────────────────

exports.createBilling = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (!['resolved','closed'].includes(ticket.status))
      return res.status(400).json({ success: false, message: 'Only resolved/closed tickets can be billed' });
    const existing = await TicketBilling.findOne({ where: { ticket_id: ticket.id } });
    if (existing) return res.status(400).json({ success: false, message: 'Billing already exists' });
    const { hourly_rate = 0, description, currency = 'TND' } = req.body;
    const duration = ticket.duration_minutes ?? 60;
    const amount   = parseFloat(((duration / 60) * parseFloat(hourly_rate)).toFixed(2));
    const billing  = await TicketBilling.create({
      ticket_id: ticket.id, organization_id: ticket.organization_id, created_by: req.user.id,
      amount, currency, hourly_rate, duration_minutes: duration,
      description: description ?? `Ticket #${ticket.ticket_number} — ${ticket.subject}`, status: 'pending',
    });
    return res.status(201).json({ success: true, data: { billing } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.getBilling = async (req, res) => {
  try {
    const billing = await TicketBilling.findOne({
      where: { ticket_id: req.params.id },
      include: [{ model: User, as: 'creator', attributes: ['id','full_name','email'] }],
    });
    if (!billing) return res.status(404).json({ success: false, message: 'No billing found' });
    return res.json({ success: true, data: { billing } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.updateBillingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const billing = await TicketBilling.findOne({ where: { ticket_id: req.params.id } });
    if (!billing) return res.status(404).json({ success: false, message: 'No billing found' });
    const updates = { status };
    if (status === 'paid') updates.paid_at = new Date();
    await billing.update(updates);
    return res.json({ success: true, data: { billing } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.getAllBillings = async (req, res) => {
  try {
    const where = { organization_id: req.user.organization_id };
    if (req.query.status) where.status = req.query.status;
    const billings = await TicketBilling.findAll({
      where,
      include: [
        { model: Ticket, as: 'ticket', attributes: ['id','ticket_number','subject','duration_minutes'] },
        { model: User,   as: 'creator', attributes: ['id','full_name'] },
      ],
      order: [['billing_date','DESC']],
    });
    const total = billings.reduce((s, b) => s + parseFloat(b.amount), 0);
    return res.json({ success: true, data: { billings, total: total.toFixed(2) } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};