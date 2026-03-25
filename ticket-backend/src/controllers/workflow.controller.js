'use strict';

const sequelize = require('../models/index');
const {
  WorkflowTemplate,
  WorkflowTemplateStep,
  TicketWorkflowState,
  WorkflowHistory,
  Ticket,
  User,
  Category,
  Department,
} = require('../models/associations');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Trouve l'employé le moins chargé dans un département ou une org,
 * en filtrant par rôle si précisé, et en tenant compte de la disponibilité.
 */
async function findBestEmployee(step, organizationId) {
  const where = {
    organization_id: organizationId,
    is_active: true,
    is_available: true,
  };

  if (step.role)          where.role          = step.role;
  if (step.department_id) where.department_id = step.department_id;

  const employees = await User.findAll({
    where,
    attributes: ['id', 'full_name', 'email', 'role', 'is_available'],
    include: [{
      model: Ticket,
      as: 'assignedTickets',
      attributes: ['id'],
      where: { status: ['open', 'in_progress'] },
      required: false,
    }],
  });

  if (!employees.length) return null;

  // Trier par charge (nombre de tickets actifs)
  employees.sort((a, b) =>
    (a.assignedTickets?.length ?? 0) - (b.assignedTickets?.length ?? 0)
  );
  return employees[0];
}

/**
 * Trouve TOUS les employés d'une étape AND.
 */
async function findAllEmployeesForStep(step, organizationId) {
  const where = {
    organization_id: organizationId,
    is_active: true,
  };
  if (step.role)          where.role          = step.role;
  if (step.department_id) where.department_id = step.department_id;

  return User.findAll({ where, attributes: ['id', 'full_name', 'email'] });
}

// ─── CRUD Templates ───────────────────────────────────────────────────────────

/**
 * GET /api/workflow-templates
 * Liste tous les templates de l'org avec leurs étapes
 */
exports.getAllTemplates = async (req, res) => {
  try {
    const organizationId = req.user.organization_id;
    const { context, category_id } = req.query;

    const where = { organization_id: organizationId };
    if (context)     where.context     = context;
    if (category_id) where.category_id = Number(category_id);

    const templates = await WorkflowTemplate.findAll({
      where,
      include: [
        {
          model: WorkflowTemplateStep,
          as: 'steps',
          include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
          order: [['step_order', 'ASC']],
        },
        { model: Category, as: 'category', attributes: ['id', 'name', 'color'] },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.json({ success: true, data: { templates } });
  } catch (err) {
    console.error('getAllTemplates:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/workflow-templates/:id
 */
exports.getTemplateById = async (req, res) => {
  try {
    const template = await WorkflowTemplate.findByPk(req.params.id, {
      include: [
        {
          model: WorkflowTemplateStep,
          as: 'steps',
          include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
          order: [['step_order', 'ASC']],
        },
        { model: Category, as: 'category', attributes: ['id', 'name', 'color'] },
      ],
    });
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
    return res.json({ success: true, data: { template } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/workflow-templates
 * Crée un template avec ses étapes en une seule requête
 * Body: { name, category_id, context, is_active, steps: [{step_order, label, role, assignment_type, department_id}] }
 */
exports.createTemplate = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, category_id, context = 'supplier', is_active = true, steps = [] } = req.body;
    const organization_id = req.user.organization_id;

    if (!name?.trim())    throw new Error('name is required');
    if (!steps.length)    throw new Error('At least one step is required');

    // Créer le template
    const template = await WorkflowTemplate.create({
      name: name.trim(), category_id, organization_id, context, is_active,
    }, { transaction: t });

    // Créer les étapes
    const stepRecords = steps.map((s, i) => ({
      template_id:     template.id,
      step_order:      s.step_order ?? i + 1,
      label:           s.label,
      role:            s.role,
      assignment_type: s.assignment_type ?? 'OR',
      department_id:   s.department_id ?? null,
    }));
    await WorkflowTemplateStep.bulkCreate(stepRecords, { transaction: t });

    await t.commit();

    const created = await WorkflowTemplate.findByPk(template.id, {
      include: [{ model: WorkflowTemplateStep, as: 'steps', order: [['step_order', 'ASC']] }],
    });
    return res.status(201).json({ success: true, data: { template: created } });
  } catch (err) {
    await t.rollback();
    console.error('createTemplate:', err);
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/workflow-templates/:id
 * Met à jour le template et remplace toutes ses étapes
 */
exports.updateTemplate = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { name, category_id, context, is_active, steps } = req.body;

    const template = await WorkflowTemplate.findByPk(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    await template.update(
      { name: name?.trim() ?? template.name, category_id, context, is_active },
      { transaction: t }
    );

    if (Array.isArray(steps)) {
      // Supprimer les anciennes étapes et recréer
      await WorkflowTemplateStep.destroy({ where: { template_id: template.id }, transaction: t });
      const stepRecords = steps.map((s, i) => ({
        template_id:     template.id,
        step_order:      s.step_order ?? i + 1,
        label:           s.label,
        role:            s.role,
        assignment_type: s.assignment_type ?? 'OR',
        department_id:   s.department_id ?? null,
      }));
      await WorkflowTemplateStep.bulkCreate(stepRecords, { transaction: t });
    }

    await t.commit();

    const updated = await WorkflowTemplate.findByPk(template.id, {
      include: [
        { model: WorkflowTemplateStep, as: 'steps', order: [['step_order', 'ASC']] },
        { model: Category, as: 'category', attributes: ['id', 'name'] },
      ],
    });
    return res.json({ success: true, data: { template: updated } });
  } catch (err) {
    await t.rollback();
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/workflow-templates/:id
 */
exports.deleteTemplate = async (req, res) => {
  try {
    const template = await WorkflowTemplate.findByPk(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

    // Vérifier qu'aucun ticket n'est en cours sur ce template
    const activeCount = await TicketWorkflowState.count({
      where: { template_id: template.id, status: 'active' },
    });
    if (activeCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${activeCount} ticket(s) are currently using this workflow`,
      });
    }

    await template.destroy();
    return res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Workflow Execution ───────────────────────────────────────────────────────

/**
 * POST /api/tickets/:id/workflow/start
 * Démarre un workflow sur un ticket (choisit automatiquement le template par catégorie)
 * Body: { template_id?, context } — template_id optionnel, sinon cherche par category_id du ticket
 */
exports.startWorkflow = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const ticketId = req.params.id;
    const { template_id, context = 'client' } = req.body;

    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) throw new Error('Ticket not found');

    // Vérifier qu'il n'y a pas déjà un workflow actif
    const existing = await TicketWorkflowState.findOne({
      where: { ticket_id: ticketId, status: 'active' },
    });
    if (existing) throw new Error('A workflow is already active on this ticket');

    // Trouver le template : explicite ou par catégorie du ticket
    let template;
    if (template_id) {
      template = await WorkflowTemplate.findByPk(template_id, {
        include: [{ model: WorkflowTemplateStep, as: 'steps', order: [['step_order', 'ASC']] }],
      });
    } else if (ticket.category_id) {
      template = await WorkflowTemplate.findOne({
        where: {
          category_id:     ticket.category_id,
          organization_id: ticket.organization_id ?? req.user.organization_id,
          context,
          is_active:       true,
        },
        include: [{ model: WorkflowTemplateStep, as: 'steps', order: [['step_order', 'ASC']] }],
      });
    }
    if (!template) throw new Error('No active workflow template found for this ticket category');
    if (!template.steps?.length) throw new Error('Workflow template has no steps');

    const firstStep = template.steps[0];

    // Créer l'état workflow
    const state = await TicketWorkflowState.create({
      ticket_id:    ticketId,
      template_id:  template.id,
      current_step: firstStep.step_order,
      context,
      status:       'active',
    }, { transaction: t });

    // Assigner le ticket à la première étape
    let assignedUser = null;
    if (firstStep.assignment_type === 'OR') {
      assignedUser = await findBestEmployee(firstStep, req.user.organization_id);
      if (assignedUser) {
        await ticket.update({ assigned_to: assignedUser.id, status: 'in_progress' }, { transaction: t });
      }
    } else {
      // AND — juste mettre in_progress, la notification se fait à tous
      await ticket.update({ status: 'in_progress' }, { transaction: t });
    }

    // Historique
    await WorkflowHistory.create({
      ticket_id:   ticketId,
      template_id: template.id,
      step_number: firstStep.step_order,
      step_label:  firstStep.label,
      action:      'started',
      acted_by:    req.user.id,
      assigned_to: assignedUser?.id ?? null,
      comment:     `Workflow "${template.name}" démarré`,
    }, { transaction: t });

    await t.commit();

    return res.status(201).json({
      success: true,
      data: {
        state,
        current_step: firstStep,
        assigned_to:  assignedUser,
      },
    });
  } catch (err) {
    await t.rollback();
    console.error('startWorkflow:', err);
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/tickets/:id/workflow/forward
 * Avance le ticket à l'étape suivante ("Traiter")
 * Body: { comment? }
 */
exports.forwardWorkflow = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const ticketId = req.params.id;
    const { comment } = req.body;

    const state = await TicketWorkflowState.findOne({
      where: { ticket_id: ticketId, status: 'active' },
      include: [{
        model: WorkflowTemplate,
        as: 'template',
        include: [{ model: WorkflowTemplateStep, as: 'steps', order: [['step_order', 'ASC']] }],
      }],
    });
    if (!state) throw new Error('No active workflow found for this ticket');

    const steps      = state.template.steps;
    const currentIdx = steps.findIndex(s => s.step_order === state.current_step);
    const nextStep   = steps[currentIdx + 1];
    const ticket     = await Ticket.findByPk(ticketId);

    // Historique — action forward sur l'étape actuelle
    await WorkflowHistory.create({
      ticket_id:   ticketId,
      template_id: state.template_id,
      step_number: state.current_step,
      step_label:  steps[currentIdx]?.label,
      action:      'forward',
      acted_by:    req.user.id,
      comment:     comment ?? null,
    }, { transaction: t });

    if (!nextStep) {
      // Dernière étape → workflow terminé
      await state.update({ status: 'completed', completed_at: new Date() }, { transaction: t });
      await ticket.update({ status: 'resolved' }, { transaction: t });

      await WorkflowHistory.create({
        ticket_id:   ticketId,
        template_id: state.template_id,
        step_number: state.current_step,
        step_label:  'Fin du circuit',
        action:      'completed',
        acted_by:    req.user.id,
        comment:     'Workflow terminé — ticket résolu',
      }, { transaction: t });

      await t.commit();
      return res.json({ success: true, data: { completed: true, message: 'Workflow completed, ticket resolved' } });
    }

    // Passer à l'étape suivante
    await state.update({ current_step: nextStep.step_order }, { transaction: t });

    // Assigner
    let assignedUser = null;
    if (nextStep.assignment_type === 'OR') {
      assignedUser = await findBestEmployee(nextStep, req.user.organization_id);
      if (assignedUser) {
        await ticket.update({ assigned_to: assignedUser.id }, { transaction: t });
      }
    } else {
      // AND — lister tous pour notification
      const allUsers = await findAllEmployeesForStep(nextStep, req.user.organization_id);
      assignedUser = allUsers; // tableau
    }

    // Historique de la nouvelle étape
    await WorkflowHistory.create({
      ticket_id:   ticketId,
      template_id: state.template_id,
      step_number: nextStep.step_order,
      step_label:  nextStep.label,
      action:      'started',
      acted_by:    req.user.id,
      assigned_to: Array.isArray(assignedUser) ? null : (assignedUser?.id ?? null),
      comment:     `Étape ${nextStep.step_order}: ${nextStep.label ?? ''}`,
    }, { transaction: t });

    await t.commit();

    return res.json({
      success: true,
      data: {
        completed:    false,
        current_step: nextStep,
        assigned_to:  assignedUser,
      },
    });
  } catch (err) {
    await t.rollback();
    console.error('forwardWorkflow:', err);
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/tickets/:id/workflow/backward
 * Recule à l'étape précédente ("Reculer") — commentaire OBLIGATOIRE
 * Body: { comment }
 */
exports.backwardWorkflow = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const ticketId      = req.params.id;
    const { comment }   = req.body;

    if (!comment?.trim()) throw new Error('Comment is required when going backward');

    const state = await TicketWorkflowState.findOne({
      where: { ticket_id: ticketId, status: 'active' },
      include: [{
        model: WorkflowTemplate,
        as: 'template',
        include: [{ model: WorkflowTemplateStep, as: 'steps', order: [['step_order', 'ASC']] }],
      }],
    });
    if (!state) throw new Error('No active workflow found for this ticket');

    const steps      = state.template.steps;
    const currentIdx = steps.findIndex(s => s.step_order === state.current_step);

    if (currentIdx === 0) throw new Error('Already at the first step, cannot go backward');

    const prevStep = steps[currentIdx - 1];
    const ticket   = await Ticket.findByPk(ticketId);

    // Historique
    await WorkflowHistory.create({
      ticket_id:   ticketId,
      template_id: state.template_id,
      step_number: state.current_step,
      step_label:  steps[currentIdx]?.label,
      action:      'backward',
      acted_by:    req.user.id,
      comment:     comment.trim(),
    }, { transaction: t });

    await state.update({ current_step: prevStep.step_order }, { transaction: t });

    // Re-assigner à l'étape précédente
    let assignedUser = null;
    if (prevStep.assignment_type === 'OR') {
      assignedUser = await findBestEmployee(prevStep, req.user.organization_id);
      if (assignedUser) await ticket.update({ assigned_to: assignedUser.id }, { transaction: t });
    }

    await t.commit();

    return res.json({
      success: true,
      data: {
        current_step: prevStep,
        assigned_to:  assignedUser,
        message:      `Ticket renvoyé à l'étape ${prevStep.step_order}: ${prevStep.label ?? ''}`,
      },
    });
  } catch (err) {
    await t.rollback();
    console.error('backwardWorkflow:', err);
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/tickets/:id/workflow/state
 * Retourne l'état courant du workflow d'un ticket + historique
 */
exports.getWorkflowState = async (req, res) => {
  try {
    const ticketId = req.params.id;

    const state = await TicketWorkflowState.findOne({
      where: { ticket_id: ticketId },
      include: [{
        model: WorkflowTemplate,
        as: 'template',
        include: [{ model: WorkflowTemplateStep, as: 'steps', order: [['step_order', 'ASC']] }],
      }],
    });

    const history = await WorkflowHistory.findAll({
      where: { ticket_id: ticketId },
      include: [
        { model: User, as: 'actor',   attributes: ['id', 'full_name', 'email'] },
        { model: User, as: 'assignee', attributes: ['id', 'full_name', 'email'] },
      ],
      order: [['acted_at', 'ASC']],
    });

    return res.json({ success: true, data: { state, history } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};