const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/workflow.controller');
const auth    = require('../middleware/auth.middleware');
const { isCompanyAdmin, isStaff } = require('../middleware/role.middleware');

router.use(auth);

// ── Templates CRUD (company_admin uniquement) ──────────────────────────────
router.get('/',          isCompanyAdmin, ctrl.getAllTemplates);
router.get('/:id',       isCompanyAdmin, ctrl.getTemplateById);
router.post('/',         isCompanyAdmin, ctrl.createTemplate);
router.put('/:id',       isCompanyAdmin, ctrl.updateTemplate);
router.delete('/:id',    isCompanyAdmin, ctrl.deleteTemplate);

module.exports = router;
