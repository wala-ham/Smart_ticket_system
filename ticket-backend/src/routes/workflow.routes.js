'use strict';
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/workflow.controller');
const auth    = require('../middleware/auth.middleware');
const { isStaff, isCompanyAdmin } = require('../middleware/role.middleware');
const { filterByOrganization }    = require('../middleware/organization.middleware');

router.use(auth);
router.use(filterByOrganization);

// ─── Templates CRUD ───────────────────────────────────────────────────────────
router.get('/',                            isStaff,        ctrl.getAllTemplates);
router.post('/',                           isCompanyAdmin, ctrl.createTemplate);
router.get('/by-category/:categoryId',     isStaff,        ctrl.getTemplatesByCategory);
router.get('/:id',                         isStaff,        ctrl.getTemplateById);
router.put('/:id',                         isCompanyAdmin, ctrl.updateTemplate);
router.delete('/:id',                      isCompanyAdmin, ctrl.deleteTemplate);

// ─── Facturation globale ──────────────────────────────────────────────────────
router.get('/billings',                    isCompanyAdmin, ctrl.getAllBillings);

module.exports = router;

// Export séparé pour les routes ticket-workflow et billing
const ticketRouter  = express.Router();
ticketRouter.use(auth);
ticketRouter.post('/:id/workflow/started',          isStaff,         ctrl.startWorkflow);
ticketRouter.put('/:id/workflow/forward',         isStaff,         ctrl.forwardWorkflow);
ticketRouter.put('/:id/workflow/backward',        isStaff,         ctrl.backwardWorkflow);
ticketRouter.put('/:id/workflow/suspended',         isStaff,         ctrl.suspendWorkflow);
ticketRouter.put('/:id/workflow/resumed',          isStaff,         ctrl.resumeWorkflow);
ticketRouter.put('/:id/workflow/stopped',            isStaff,         ctrl.stopWorkflow);
ticketRouter.get('/:id/workflow/state',           isStaff,         ctrl.getWorkflowState);
ticketRouter.post('/:id/billing',                 isCompanyAdmin,  ctrl.createBilling);
ticketRouter.get('/:id/billing',                  isStaff,         ctrl.getBilling);
ticketRouter.put('/:id/billing/status',           isCompanyAdmin,  ctrl.updateBillingStatus);
module.exports.ticketRouter = ticketRouter;

const billingRouter = express.Router();
billingRouter.use(auth);
billingRouter.get('/', isCompanyAdmin, ctrl.getAllBillings);
module.exports.billingRouter = billingRouter;