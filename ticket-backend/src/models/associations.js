// models/associations.js
'use strict';

const sequelize = require('./index'); // Instance Sequelize

// 1. Modèles "Statiques" (Style Category)
const User         = require('./User');
const Organization = require('./Organization');
const Ticket       = require('./Ticket');
const Comment      = require('./Comment');
const Attachment   = require('./Attachment');
const Category     = require('./Category');
const Supplier     = require('./Supplier');
const Department   = require('./Department');

// 2. Modèles "Fonctions" (On les initialise ICI avec l'instance sequelize)
const WorkflowTemplate     = require('./WorkflowTemplate')(sequelize);
const WorkflowTemplateStep = require('./WorkflowTemplateStep')(sequelize);
const TicketWorkflowState  = require('./TicketWorkflowState')(sequelize);
const WorkflowHistory      = require('./WorkflowHistory')(sequelize);
const TicketBilling      = require('./TicketBilling')(sequelize);

// ============================================
// ORGANIZATION ASSOCIATIONS
// ============================================
Organization.hasMany(User, { foreignKey: 'organization_id', as: 'users' });
User.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

Organization.belongsTo(User, { foreignKey: 'admin_user_id', as: 'admin' });

Organization.hasMany(Ticket, { foreignKey: 'organization_id', as: 'tickets' });
Ticket.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

Organization.hasMany(Supplier, { foreignKey: 'organization_id', as: 'suppliers' });
Supplier.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

Organization.hasMany(Category, { foreignKey: 'organization_id', as: 'categories' });
Category.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

Organization.hasMany(Department, { foreignKey: 'organization_id', as: 'departments' });
Department.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

// ============================================
// DEPARTMENT ASSOCIATIONS
// ============================================
Department.belongsTo(User, { foreignKey: 'manager_id', as: 'manager' });
User.hasMany(Department, { foreignKey: 'manager_id', as: 'managedDepartments' });

Department.hasMany(User, { foreignKey: 'department_id', as: 'members' });
User.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

Department.hasMany(Ticket, { foreignKey: 'department_id', as: 'tickets' });
Ticket.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

// ============================================
// USER ASSOCIATIONS
// ============================================
User.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(User, { foreignKey: 'created_by', as: 'createdUsers' });

User.hasMany(Ticket, { foreignKey: 'created_by', as: 'createdTickets' });
Ticket.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

User.hasMany(Ticket, { foreignKey: 'assigned_to', as: 'assignedTickets' });
Ticket.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });

User.hasMany(Comment, { foreignKey: 'user_id', as: 'comments' });
Comment.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

User.hasMany(Attachment, { foreignKey: 'uploaded_by', as: 'uploadedFiles' });
Attachment.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

// ============================================
// TICKET ASSOCIATIONS
// ============================================
Category.hasMany(Ticket, { foreignKey: 'category_id', as: 'tickets' });
Ticket.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

Supplier.hasMany(Ticket, { foreignKey: 'supplier_id', as: 'tickets' });
Ticket.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });

Ticket.hasMany(Comment, { foreignKey: 'ticket_id', as: 'comments', onDelete: 'CASCADE' });
Comment.belongsTo(Ticket, { foreignKey: 'ticket_id', as: 'ticket' });

Ticket.hasMany(Attachment, { foreignKey: 'ticket_id', as: 'attachments', onDelete: 'CASCADE' });
Attachment.belongsTo(Ticket, { foreignKey: 'ticket_id', as: 'ticket' });

Ticket.hasOne(TicketBilling, { foreignKey: 'ticket_id', as: 'billing' });
TicketBilling.belongsTo(Ticket, { foreignKey: 'ticket_id', as: 'ticket' });
TicketBilling.belongsTo(User,   { foreignKey: 'created_by', as: 'creator' });
// ============================================
// WORKFLOW ASSOCIATIONS (Logique métier)
// ============================================

// WorkflowTemplate <-> Steps
WorkflowTemplate.hasMany(WorkflowTemplateStep, { foreignKey: 'template_id', as: 'steps', onDelete: 'CASCADE' });
WorkflowTemplateStep.belongsTo(WorkflowTemplate, { foreignKey: 'template_id', as: 'template' });

// WorkflowTemplate <-> Organization & Category
Organization.hasMany(WorkflowTemplate, { foreignKey: 'organization_id', as: 'workflowTemplates' });
WorkflowTemplate.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });

Category.hasMany(WorkflowTemplate, { foreignKey: 'category_id', as: 'workflowTemplates' });
WorkflowTemplate.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// WorkflowStep <-> Department
Department.hasMany(WorkflowTemplateStep, { foreignKey: 'department_id', as: 'workflowSteps' });
WorkflowTemplateStep.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

// Ticket <-> WorkflowState (L'état actuel du ticket dans le circuit)
Ticket.hasOne(TicketWorkflowState, { foreignKey: 'ticket_id', as: 'workflowState' });
TicketWorkflowState.belongsTo(Ticket, { foreignKey: 'ticket_id', as: 'ticket' });

WorkflowTemplate.hasMany(TicketWorkflowState, { foreignKey: 'template_id', as: 'activeTickets' });
TicketWorkflowState.belongsTo(WorkflowTemplate, { foreignKey: 'template_id', as: 'template' });

// WorkflowHistory (L'audit trail)
Ticket.hasMany(WorkflowHistory, { foreignKey: 'ticket_id', as: 'workflowHistory' });
WorkflowHistory.belongsTo(Ticket, { foreignKey: 'ticket_id', as: 'ticket' });

User.hasMany(WorkflowHistory, { foreignKey: 'acted_by', as: 'workflowActions' });
WorkflowHistory.belongsTo(User, { foreignKey: 'acted_by', as: 'actor' });

User.hasMany(WorkflowHistory, { foreignKey: 'assigned_to', as: 'workflowAssignments' });
WorkflowHistory.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });

// ============================================
// EXPORTATION GLOBALE
// ============================================
module.exports = {
  User,
  Organization,
  sequelize,
  Ticket,
  Comment,
  Attachment,
  Category,
  Supplier,
  Department,
  TicketBilling,
  WorkflowTemplate,
  WorkflowTemplateStep,
  TicketWorkflowState,
  WorkflowHistory
};