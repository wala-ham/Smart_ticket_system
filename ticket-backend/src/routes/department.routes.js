// routes/department.routes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/department.controller');
const auth    = require('../middleware/auth.middleware');
const { isCompanyAdmin, isStaff } = require('../middleware/role.middleware');

router.use(auth);

router.get('/',                           ctrl.getAllDepartments);
router.get('/:id',                       ctrl.getDepartmentById);
router.post('/',                   ctrl.createDepartment);
router.put('/:id',                 isCompanyAdmin, ctrl.updateDepartment);
router.delete('/:id',              isCompanyAdmin, ctrl.deleteDepartment);
router.put('/:id/members',         isCompanyAdmin, ctrl.updateMembers);

// router.get('/',                    isCompanyAdmin,        ctrl.getAllDepartments);
// router.get('/:id',                 isCompanyAdmin,        ctrl.getDepartmentById);
// router.post('/',                   isCompanyAdmin, ctrl.createDepartment);
// router.put('/:id',                 isCompanyAdmin, ctrl.updateDepartment);
// router.delete('/:id',              isCompanyAdmin, ctrl.deleteDepartment);
// router.put('/:id/members',         isCompanyAdmin, ctrl.updateMembers);
module.exports = router;
