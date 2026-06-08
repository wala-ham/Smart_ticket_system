'use strict';
const express    = require('express');
const router     = express.Router();
const ticketController = require('../controllers/ticket.controller');
const authMiddleware   = require('../middleware/auth.middleware');
const { isCompanyAdmin, isStaff } = require('../middleware/role.middleware');
const { filterByOrganization }    = require('../middleware/organization.middleware');
const upload     = require('../utils/upload.config');
const {
  createTicketValidator,
  updateTicketValidator,
  addCommentValidator,
  idParamValidator,
  paginationValidator
} = require('../utils/validators');

const ctrl = require('../controllers/workflow.controller');
const auth = require('../middleware/auth.middleware');

router.use(authMiddleware);
router.use(filterByOrganization);

// ─── Worklist ─────────────────────────────────────────────────────────────────
router.get('/worklist', isStaff, ticketController.getWorklist);

// ─── Tickets CRUD ─────────────────────────────────────────────────────────────
router.get('/',    paginationValidator,                                ticketController.getAllTickets);
router.post('/',   upload.array('attachments', 5), createTicketValidator, ticketController.createTicket);
router.get('/:id', idParamValidator,                                   ticketController.getTicketById);
router.put('/:id', idParamValidator, updateTicketValidator,            ticketController.updateTicket);
router.delete('/:id', idParamValidator,                                ticketController.deleteTicket);

// ─── Commentaires ─────────────────────────────────────────────────────────────
router.post('/:id/comments', idParamValidator, addCommentValidator, ticketController.addComment);

// ─── Assignation ──────────────────────────────────────────────────────────────
router.put('/:id/assign', isCompanyAdmin, idParamValidator, ticketController.assignTicket);

// ─── Escalade worklist (existant) ─────────────────────────────────────────────
router.put('/:id/escalate',        isStaff,        idParamValidator, ticketController.escalateToWorklist);
router.put('/:id/worklist-assign', isCompanyAdmin, idParamValidator, ticketController.worklistAssign);

// ─── Attachments ──────────────────────────────────────────────────────────────
router.get('/uploads/:filename',          ticketController.serveAttachment);
router.get('/uploads/:filename/download', ticketController.downloadAttachment);
router.post('/:ticketId/attachments', upload.array('attachments', 5), ticketController.addAttachments);
router.delete('/attachments/:attachmentId', ticketController.deleteAttachment);

// ─── Workflow ─────────────────────────────────────────────────────────────────
router.use(auth);

// Démarrer le workflow (context: 'supplier' par défaut, ou 'client')
router.post('/:id/workflow/start',    isStaff, ctrl.startWorkflow);

// Navigation dans le workflow
router.put('/:id/workflow/forward',   isStaff, ctrl.forwardWorkflow);
router.put('/:id/workflow/backward',  isStaff, ctrl.backwardWorkflow);

// *** NOUVELLE ROUTE : escalade fournisseur → client ***
router.post('/:id/workflow/escalate-to-client', isStaff, ctrl.escalateToClientWorkflow);

// Suspension / reprise / arrêt
router.put('/:id/workflow/suspend',   isStaff, ctrl.suspendWorkflow);
router.put('/:id/workflow/resume',    isStaff, ctrl.resumeWorkflow);
router.put('/:id/workflow/stop',      isStaff, ctrl.stopWorkflow);

// Lecture de l'état
router.get('/:id/workflow/state',     isStaff, ctrl.getWorkflowState);

// Facturation
router.post('/:id/billing',           isCompanyAdmin, ctrl.createBilling);
router.get('/:id/billing',            isStaff,        ctrl.getBilling);
router.put('/:id/billing/status',     isCompanyAdmin, ctrl.updateBillingStatus);

module.exports = router;