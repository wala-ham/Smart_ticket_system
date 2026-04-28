// src/routes/dashboard.routes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/dashboard.controller');
const auth    = require('../middleware/auth.middleware');
const { isStaff } = require('../middleware/role.middleware');

router.use(auth);

router.get('/stats',       isStaff, ctrl.getStats);
router.get('/agents',      isStaff, ctrl.getAgentPerformance);
router.get('/recent',      isStaff, ctrl.getRecentActivity);
router.get('/ml-insights', isStaff, ctrl.getMLInsights);

module.exports = router;

// Dans app.js ajouter :
// app.use('/api/dashboard', require('./routes/dashboard.routes'));