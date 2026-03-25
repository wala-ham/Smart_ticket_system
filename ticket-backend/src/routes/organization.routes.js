const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organization.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { isSuperAdmin } = require('../middleware/role.middleware');

// Toutes les routes nécessitent super_admin
router.use(authMiddleware);
router.use(isSuperAdmin);

// CRUD Organizations
router.post('/',      organizationController.createOrganization);
router.get('/',       organizationController.getAllOrganizations);
router.get('/:id',    organizationController.getOrganizationById);
router.put('/:id',    organizationController.updateOrganization);
router.delete('/:id', organizationController.deleteOrganization);

// Stats
router.get('/:id/stats', organizationController.getOrganizationStats);

// ── Contract PDF upload ──────────────────────────────────────────────────────
// POST /organizations/:id/contract-pdf  (multipart/form-data, field: "contract")
router.post(
  '/:id/contract-pdf',
  organizationController.uploadMiddleware.single('contract'),
  organizationController.uploadContractPdf
);

module.exports = router;
