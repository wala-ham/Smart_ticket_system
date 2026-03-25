// routes/ticket.routes.js
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

const ctrl    = require('../controllers/workflow.controller');
const auth    = require('../middleware/auth.middleware');

router.use(authMiddleware);
router.use(filterByOrganization);

// ─── Worklist (avant /:id pour éviter le conflit de route) ────────────────────
router.get('/worklist',               isStaff,        ticketController.getWorklist);

// ─── Tickets CRUD ─────────────────────────────────────────────────────────────
router.get('/',    paginationValidator,                ticketController.getAllTickets);
router.post('/',   upload.array('attachments', 5), createTicketValidator, ticketController.createTicket);
router.get('/:id', idParamValidator,                   ticketController.getTicketById);
router.put('/:id', idParamValidator, updateTicketValidator, ticketController.updateTicket);
router.delete('/:id', idParamValidator,                ticketController.deleteTicket);

// ─── Commentaires ─────────────────────────────────────────────────────────────
router.post('/:id/comments', idParamValidator, addCommentValidator, ticketController.addComment);

// ─── Assignation ──────────────────────────────────────────────────────────────
router.put('/:id/assign',          isCompanyAdmin, idParamValidator, ticketController.assignTicket);

// ─── NOUVEAU : Workflow ───────────────────────────────────────────────────────
router.put('/:id/escalate',        isStaff,        idParamValidator, ticketController.escalateToWorklist);
router.put('/:id/worklist-assign', isCompanyAdmin, idParamValidator, ticketController.worklistAssign);

// ─── Attachments ──────────────────────────────────────────────────────────────
router.get('/uploads/:filename',           ticketController.serveAttachment);
router.get('/uploads/:filename/download',  ticketController.downloadAttachment);
router.post('/:ticketId/attachments', upload.array('attachments', 5), ticketController.addAttachments);
router.delete('/attachments/:attachmentId', ticketController.deleteAttachment);



router.use(auth);

// Ces routes s'ajoutent sur /api/tickets/:id/workflow
router.post('/:id/workflow/start',    isStaff, ctrl.startWorkflow);
router.put('/:id/workflow/forward',   isStaff, ctrl.forwardWorkflow);
router.put('/:id/workflow/backward',  isStaff, ctrl.backwardWorkflow);
router.get('/:id/workflow/state',     isStaff, ctrl.getWorkflowState);


module.exports = router;
