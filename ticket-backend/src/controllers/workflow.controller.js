'use strict';
const db = require('../models/associations');
const sequelize = db.sequelize;

const {
  WorkflowTemplate, WorkflowTemplateStep,
  TicketWorkflowState, WorkflowHistory, TicketBilling,
  Ticket, User, Category, Department,
} = require('../models/associations');
const { sendEmail }       = require('../utils/email');
const { updateAgentScore } = require('../utils/agentScoring');

exports.findBestEmployeeInternal = () => { throw new Error('Not used in fixed-user mode'); };

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

// ─── Résoudre l'assignation : user_id obligatoire ─────────────────────────────
async function resolveStepAssignment(step) {
  if (!step.user_id) {
    throw new Error(`Aucun utilisateur assigné à l'étape "${step.label}". Veuillez en configurer un dans le template.`);
  }
  const assignedUser = await User.findByPk(step.user_id);
  return { assignedUser, andUsers: [], assigned_to: assignedUser?.id ?? null };
}

// ─── Trouver le template actif pour une catégorie + contexte ─────────────────
async function findTemplate(templateId, categoryId, organizationId, context) {
  if (templateId) {
    return WorkflowTemplate.findByPk(templateId, {
      include: [{ model: WorkflowTemplateStep, as: 'steps', order: [['step_order', 'ASC']] }],
    });
  }
  if (categoryId) {
    return WorkflowTemplate.findOne({
      where: { category_id: categoryId, organization_id: organizationId, context, is_active: true },
      include: [{ model: WorkflowTemplateStep, as: 'steps', order: [['step_order', 'ASC']] }],
    });
  }
  return null;
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
        {
          model: WorkflowTemplateStep, as: 'steps',
          include: [
            { model: Department, as: 'department', attributes: ['id', 'name'] },
            { model: User,       as: 'assignedUser', attributes: ['id', 'full_name', 'email', 'job_title'] },
          ],
          order: [['step_order', 'ASC']],
        },
        { model: Category, as: 'category', attributes: ['id', 'name', 'color'] },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.json({ success: true, data: { templates } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

exports.getTemplateById = async (req, res) => {
  try {
    const template = await WorkflowTemplate.findByPk(req.params.id, {
      include: [
        {
          model: WorkflowTemplateStep, as: 'steps',
          include: [
            { model: Department, as: 'department', attributes: ['id', 'name'] },
            { model: User,       as: 'assignedUser', attributes: ['id', 'full_name', 'email', 'job_title'] },
          ],
          order: [['step_order', 'ASC']],
        },
        { model: Category, as: 'category', attributes: ['id', 'name', 'color'] },
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
    if (!['supplier', 'client'].includes(context)) throw new Error("context must be 'supplier' or 'client'");

    const template = await WorkflowTemplate.create(
      { name: name.trim(), category_id, organization_id: req.user.organization_id, context, is_active },
      { transaction: t }
    );
    await WorkflowTemplateStep.bulkCreate(
      steps.map((s, i) => ({
        template_id:     template.id,
        step_order:      s.step_order ?? i + 1,
        label:           s.label,
        role_label:      s.role_label ?? s.label,
        role:            s.role ?? null,
        assignment_type: s.assignment_type ?? 'OR',
        department_id:   s.department_id ?? null,
        user_id:         s.user_id ?? null,
      })),
      { transaction: t }
    );
    await t.commit();
    const created = await WorkflowTemplate.findByPk(template.id, {
      include: [{
        model: WorkflowTemplateStep, as: 'steps',
        include: [{ model: User, as: 'assignedUser', attributes: ['id', 'full_name', 'email'] }],
        order: [['step_order', 'ASC']],
      }],
    });
    return res.status(201).json({ success: true, data: { template: created } });
  } catch (err) { await t.rollback(); return res.status(400).json({ success: false, message: err.message }); }
};

exports.updateTemplate = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, category_id, context, is_active, steps } = req.body;
    if (context && !['supplier', 'client'].includes(context)) throw new Error("context must be 'supplier' or 'client'");
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
          user_id:         s.user_id ?? null,
        })),
        { transaction: t }
      );
    }
    await t.commit();
    const updated = await WorkflowTemplate.findByPk(template.id, {
      include: [
        { model: WorkflowTemplateStep, as: 'steps', order: [['step_order', 'ASC']] },
        { model: Category, as: 'category', attributes: ['id', 'name'] },
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

// ─── GET /api/workflow-templates/by-category/:categoryId ─────────────────────
// Retourne les deux templates (supplier + client) pour une catégorie donnée
exports.getTemplatesByCategory = async (req, res) => {
  try {
    const templates = await WorkflowTemplate.findAll({
      where: {
        category_id:     req.params.categoryId,
        organization_id: req.user.organization_id,
        is_active:       true,
      },
      include: [
        {
          model: WorkflowTemplateStep, as: 'steps',
          include: [{ model: User, as: 'assignedUser', attributes: ['id', 'full_name', 'email'] }],
          order: [['step_order', 'ASC']],
        },
        { model: Category, as: 'category', attributes: ['id', 'name', 'color'] },
      ],
    });
    const supplier = templates.find(t => t.context === 'supplier') ?? null;
    const client   = templates.find(t => t.context === 'client')   ?? null;
    return res.json({ success: true, data: { supplier, client } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};

// ─── Workflow Execution ───────────────────────────────────────────────────────

/**
 * POST /api/tickets/:id/workflow/start
 * Body: { template_id?, context? }
 * context par défaut = 'supplier' (le fournisseur commence toujours)
 */
exports.startWorkflow = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { template_id, context = 'supplier' } = req.body;
    if (!['supplier', 'client'].includes(context)) throw new Error("context must be 'supplier' or 'client'");

    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) throw new Error('Ticket not found');

    const existing = await TicketWorkflowState.findOne({ where: { ticket_id: ticket.id, status: 'active' } });
    if (existing) throw new Error('A workflow is already active on this ticket');

    const template = await findTemplate(template_id, ticket.category_id, ticket.organization_id ?? req.user.organization_id, context);
    if (!template)       throw new Error(`No active ${context} workflow template found for category ${ticket.category_id}`);
    if (!template.steps?.length) throw new Error('Workflow template has no steps');

    const firstStep = template.steps[0];
    const now       = new Date();

    await TicketWorkflowState.create({
      ticket_id: ticket.id, template_id: template.id,
      current_step: firstStep.step_order, context, status: 'active',
    }, { transaction: t });

    await ticket.update({ status: 'in_progress', started_at: now }, { transaction: t });

    const { assignedUser, assigned_to } = await resolveStepAssignment(firstStep);
    if (assigned_to) await ticket.update({ assigned_to }, { transaction: t });

    await WorkflowHistory.create({
      ticket_id: ticket.id, template_id: template.id,
      step_number: firstStep.step_order, step_label: firstStep.label,
      action: 'started', acted_by: req.user.id, assigned_to,
      step_started_at: now,
      comment: `Workflow "${template.name}" [${context}] démarré — Étape 1: ${firstStep.role_label ?? firstStep.label}`,
    }, { transaction: t });

    await t.commit();

    const ticketRef = ticket.ticket_number || `TKT-${ticket.id}`;
    if (assignedUser) {
      notifyUser(assignedUser,
        `[${ticketRef}] Ticket assigné — ${firstStep.role_label ?? firstStep.label}`,
        `Bonjour ${assignedUser.full_name},\n\nVous avez été sélectionné pour traiter ce ticket (circuit ${context}).\n\nTicket  : ${ticket.subject}\nCircuit : ${template.name}\nÉtape   : ${firstStep.role_label ?? firstStep.label}\n\nConnectez-vous pour le traiter.`
      );
    }

    return res.status(201).json({
      success: true,
      data: { template_name: template.name, context, current_step: firstStep, assigned_to: assignedUser },
    });
  } catch (err) {
    await t.rollback();
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/tickets/:id/workflow/forward
 */
exports.forwardWorkflow = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { comment } = req.body;
    const now         = new Date();

    const state = await TicketWorkflowState.findOne({
      where: { ticket_id: req.params.id, status: 'active' },
      include: [{ model: WorkflowTemplate, as: 'template',
        include: [{ model: WorkflowTemplateStep, as: 'steps', order: [['step_order', 'ASC']] }] }],
    });
    if (!state) throw new Error('No active workflow found for this ticket');

    const steps      = state.template.steps;
    const currentIdx = steps.findIndex(s => s.step_order === state.current_step);
    const curStep    = steps[currentIdx];
    const nextStep   = steps[currentIdx + 1];
    const ticket     = await Ticket.findByPk(req.params.id);

    const lastStarted = await WorkflowHistory.findOne({
      where: { ticket_id: ticket.id, step_number: state.current_step, action: 'started' },
      order: [['step_started_at', 'DESC']],
    });
    const stepDuration = calcMinutes(lastStarted?.step_started_at, now);

    await WorkflowHistory.create({
      ticket_id: ticket.id, template_id: state.template_id,
      step_number: state.current_step, step_label: curStep?.label,
      action: 'forward', acted_by: req.user.id, comment: comment ?? null,
      step_started_at: lastStarted?.step_started_at, step_ended_at: now,
      step_duration_minutes: stepDuration,
    }, { transaction: t });

    // Dernière étape → workflow terminé
    if (!nextStep) {
      const totalDuration = calcMinutes(ticket.started_at, now);
      await state.update({ status: 'completed', completed_at: now }, { transaction: t });
      await ticket.update({ status: 'resolved', ended_at: now, duration_minutes: totalDuration }, { transaction: t });
      
      await WorkflowHistory.create({
        ticket_id: ticket.id, template_id: state.template_id,
        step_number: state.current_step, step_label: 'Fin du circuit',
        action: 'completed', acted_by: req.user.id, step_ended_at: now,
        comment: `Workflow [${state.context}] terminé — durée totale: ${totalDuration ?? '?'} min`,
      }, { transaction: t });
      await t.commit();
      if (ticket.assigned_to) updateAgentScore(ticket.assigned_to).catch(() => {});
      const creator = await User.findByPk(ticket.created_by, { attributes: ['email', 'full_name'] });
      notifyUser(creator,
        `[${ticket.ticket_number || 'TKT-' + ticket.id}] Votre ticket a été résolu`,
        `Bonjour ${creator?.full_name},\n\nVotre ticket "${ticket.subject}" a été traité et résolu.\nDurée : ${totalDuration ?? '?'} min.`
      );
      return res.json({ success: true, data: { completed: true, context: state.context, duration_minutes: totalDuration } });
    }

    // Passer à l'étape suivante
    await state.update({ current_step: nextStep.step_order }, { transaction: t });
    const { assignedUser, assigned_to } = await resolveStepAssignment(nextStep);
    if (assigned_to) await ticket.update({ assigned_to }, { transaction: t });

    await WorkflowHistory.create({
      ticket_id: ticket.id, template_id: state.template_id,
      step_number: nextStep.step_order, step_label: nextStep.label,
      action: 'started', acted_by: req.user.id, assigned_to,
      step_started_at: now,
      comment: `Étape ${nextStep.step_order}: ${nextStep.role_label ?? nextStep.label}`,
    }, { transaction: t });
    await t.commit();

    const ticketRef = ticket.ticket_number || `TKT-${ticket.id}`;
    if (assignedUser) {
      notifyUser(assignedUser,
        `[${ticketRef}] Action requise — ${nextStep.role_label ?? nextStep.label}`,
        `Bonjour ${assignedUser.full_name},\n\nLe ticket "${ticket.subject}" avance dans le circuit "${state.template.name}" [${state.context}].\n\nVotre rôle : ${nextStep.role_label ?? nextStep.label}\nÉtape ${nextStep.step_order} / ${steps.length}`
      );
    }

    return res.json({
      success: true,
      data: {
        completed: false, context: state.context,
        current_step: nextStep, step_duration_minutes: stepDuration,
        assigned_to: assignedUser, role_label: nextStep.role_label,
      },
    });
  } catch (err) {
    await t.rollback();
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/tickets/:id/workflow/backward
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
        include: [{ model: WorkflowTemplateStep, as: 'steps', order: [['step_order', 'ASC']] }] }],
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
    const { assignedUser, assigned_to } = await resolveStepAssignment(prevStep);
    if (assigned_to) await ticket.update({ assigned_to }, { transaction: t });

    await WorkflowHistory.create({
      ticket_id: ticket.id, template_id: state.template_id,
      step_number: prevStep.step_order, step_label: prevStep.label,
      action: 'started', acted_by: req.user.id, assigned_to,
      step_started_at: now, comment: `Renvoyé — ${comment.trim()}`,
    }, { transaction: t });
    await t.commit();

    const ticketRef = ticket.ticket_number || `TKT-${ticket.id}`;
    if (assignedUser) {
      notifyUser(assignedUser,
        `[${ticketRef}] Ticket renvoyé — ${prevStep.role_label ?? prevStep.label}`,
        `Bonjour ${assignedUser.full_name},\n\nLe ticket "${ticket.subject}" a été renvoyé à l'étape précédente.\n\nRôle : ${prevStep.role_label ?? prevStep.label}\nRaison : ${comment.trim()}`
      );
    }

    return res.json({ success: true, data: { context: state.context, current_step: prevStep, role_label: prevStep.role_label, assigned_to: assignedUser } });
  } catch (err) {
    await t.rollback();
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/tickets/:id/workflow/escalate-to-client
 * Le fournisseur n'a pas pu résoudre → on démarre le workflow client
 */
exports.escalateToClientWorkflow = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { comment, template_id } = req.body;
    const now = new Date();

    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) throw new Error('Ticket not found');

    // Trouver le workflow fournisseur actif
    const supplierState = await TicketWorkflowState.findOne({
      where: { ticket_id: ticket.id, status: 'active', context: 'supplier' },
    });
    if (!supplierState) throw new Error('No active supplier workflow to escalate from');

    // Fermer le workflow fournisseur
    const supplierDuration = calcMinutes(ticket.started_at, now);
    await supplierState.update({ status: 'escalated', completed_at: now }, { transaction: t });

    await WorkflowHistory.create({
      ticket_id: ticket.id, template_id: supplierState.template_id,
      step_number: supplierState.current_step, step_label: 'Escalade vers client',
      action: 'escalated', acted_by: req.user.id, step_ended_at: now,
      comment: comment?.trim() ?? 'Escalade vers le circuit client',
    }, { transaction: t });

    // Trouver le template client
    const clientTemplate = await findTemplate(
      template_id,
      ticket.category_id,
      ticket.organization_id ?? req.user.organization_id,
      'client'
    );
    if (!clientTemplate)       throw new Error('No active client workflow template found for this category');
    if (!clientTemplate.steps?.length) throw new Error('Client workflow template has no steps');

    const firstStep = clientTemplate.steps[0];

    // Créer le nouveau state client
    const clientState = await TicketWorkflowState.create({
      ticket_id:               ticket.id,
      template_id:             clientTemplate.id,
      current_step:            firstStep.step_order,
      context:                 'client',
      status:                  'active',
      escalated_from_state_id: supplierState.id,
      escalated_at:            now,
    }, { transaction: t });

    // Mettre à jour le ticket
    const { assignedUser, assigned_to } = await resolveStepAssignment(firstStep);
    await ticket.update({
      status:            'in_progress',
      escalated_context: 'client',
      escalated_at:      now,
      assigned_to:       assigned_to ?? ticket.assigned_to,
    }, { transaction: t });

    await WorkflowHistory.create({
      ticket_id: ticket.id, template_id: clientTemplate.id,
      step_number: firstStep.step_order, step_label: firstStep.label,
      action: 'started', acted_by: req.user.id, assigned_to,
      step_started_at: now,
      comment: `Workflow client "${clientTemplate.name}" démarré après escalade — Étape 1: ${firstStep.role_label ?? firstStep.label}`,
    }, { transaction: t });

    await t.commit();

    // Notification à l'assigné de l'étape 1 client
    const ticketRef = ticket.ticket_number || `TKT-${ticket.id}`;
    if (assignedUser) {
      notifyUser(assignedUser,
        `[${ticketRef}] Ticket escaladé — Action requise — ${firstStep.role_label ?? firstStep.label}`,
        `Bonjour ${assignedUser.full_name},\n\nCe ticket a été escaladé depuis le circuit fournisseur vers votre circuit.\n\nTicket  : ${ticket.subject}\nCircuit : ${clientTemplate.name}\nÉtape   : ${firstStep.role_label ?? firstStep.label}\nRaison  : ${comment?.trim() ?? '-'}\n\nConnectez-vous pour le traiter.`
      );
    }

    return res.status(201).json({
      success: true,
      data: {
        escalated: true,
        supplier_duration_minutes: supplierDuration,
        client_template_name: clientTemplate.name,
        current_step: firstStep,
        assigned_to: assignedUser,
      },
    });
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
    await WorkflowHistory.create({ ticket_id: ticket.id, template_id: state.template_id, step_number: state.current_step, action: 'stopped', acted_by: req.user.id, step_ended_at: now, comment: `Arrêté [${state.context}] — durée: ${totalDuration ?? '?'} min` }, { transaction: t });
    await t.commit();
    if (ticket.assigned_to) updateAgentScore(ticket.assigned_to).catch(() => {});
    return res.json({ success: true, message: 'Workflow arrêté', data: { duration_minutes: totalDuration, status: 'resolved' } });
  } catch (err) { await t.rollback(); return res.status(400).json({ success: false, message: err.message }); }
};

/**
 * GET /api/tickets/:id/workflow/state
 * Retourne l'état actif ET tout l'historique (supplier + client si escalade)
 */
exports.getWorkflowState = async (req, res) => {
  try {
    // Récupérer TOUS les états (actif + historiques supplier/client)
    const allStates = await TicketWorkflowState.findAll({
      where: { ticket_id: req.params.id },
      include: [{ 
        model: WorkflowTemplate, as: 'template',
        include: [{ model: WorkflowTemplateStep, as: 'steps', order: [['step_order', 'ASC']] }] 
      }],
      order: [['created_at', 'ASC']]
    });

    // Récupérer l'état actif (si existant)
    const activeState = allStates.find(s => s.status === 'active') || null;

    // Récupérer TOUT l'historique pour TOUS les états
    const history = await WorkflowHistory.findAll({
      where: { ticket_id: req.params.id },
      include: [
        { model: User, as: 'actor', attributes: ['id', 'full_name', 'email'] },
        { model: User, as: 'assignee', attributes: ['id', 'full_name', 'email'] },
      ],
      order: [['acted_at', 'ASC']]
    });

    // Calculer les stats PAR CONTEXTE et PAR ÉTAT
    let supplierDuration = 0;
    let clientDuration = 0;
    
    for (const state of allStates) {
      const stateHistory = history.filter(h => h.template_id === state.template_id);
      const stateDuration = stateHistory
        .filter(h => h.step_duration_minutes)
        .reduce((sum, h) => sum + (h.step_duration_minutes || 0), 0);
      
      if (state.context === 'supplier') {
        supplierDuration += stateDuration;
      } else if (state.context === 'client') {
        clientDuration += stateDuration;
      }
    }

    // Trouver si escalade a eu lieu
    const hasEscalation = allStates.some(s => s.context === 'client' && s.escalated_from_state_id);

    return res.json({
      success: true,
      data: {
        state: activeState,
        states: allStates,
        history: history,
        stats: {
          supplier_duration_minutes: supplierDuration,
          client_duration_minutes: clientDuration,
          total_duration_minutes: supplierDuration + clientDuration,
          escalated: hasEscalation,
          contexts: [...new Set(allStates.map(s => s.context))]
        }
      }
    });
  } catch (err) { 
    console.error('getWorkflowState error:', err);
    return res.status(500).json({ success: false, message: err.message }); 
  }
};

// ─── Facturation ──────────────────────────────────────────────────────────────

exports.createBilling = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (!['resolved', 'closed'].includes(ticket.status))
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
      include: [{ model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] }],
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
        { model: Ticket, as: 'ticket', attributes: ['id', 'ticket_number', 'subject', 'duration_minutes'] },
        { model: User,   as: 'creator', attributes: ['id', 'full_name'] },
      ],
      order: [['billing_date', 'DESC']],
    });
    const total = billings.reduce((s, b) => s + parseFloat(b.amount), 0);
    return res.json({ success: true, data: { billings, total: total.toFixed(2) } });
  } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
};