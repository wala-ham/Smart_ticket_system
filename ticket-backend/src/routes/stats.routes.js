const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { isStaff } = require('../middleware/role.middleware');

// Toutes les routes nécessitent authentification
router.use(authMiddleware);

// Stats du dashboard (accessible par tous)
router.get('/dashboard', statsController.getDashboardStats);

// Stats globales (staff seulement)
router.get('/global', isStaff, statsController.getGlobalStats);

// Stats par période (staff seulement)
router.get('/period', isStaff, statsController.getStatsByPeriod);

// Stats d'un employé spécifique (staff seulement)
router.get('/employee/:id', isStaff, statsController.getEmployeeStats);

module.exports = router;
