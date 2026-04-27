// src/routes/ai.routes.js
const express    = require('express');
const router     = express.Router();
const auth       = require('../middleware/auth.middleware');
const { analyzeTicket } = require('../utils/aiAnalysis');
// Importe aussi le modèle Department
const { Category, Department } = require('../models/associations'); 

router.use(auth);

/**
 * POST /api/ai/analyze-ticket
 * Analyse un ticket en temps réel (utilisé par le frontend pendant la saisie)
 */
router.post('/analyze-ticket', async (req, res) => {
  try {
    const { subject, description } = req.body;
    if (!subject?.trim() || !description?.trim()) {
      return res.status(400).json({ success: false, message: 'subject and description required' });
    }

    // 1. Charger les catégories ET les départements de la base de données
    const [categories, departments] = await Promise.all([
      Category.findAll({ attributes: ['id', 'name'] }),
      Department.findAll({ 
        attributes: ['id', 'name'],
        where: { is_active: true } // Optionnel : ne donner que les départements actifs
      })
    ]);

    // 2. Passer les deux listes à la fonction d'analyse
    // Note: Tu devras probablement aussi mettre à jour la signature de analyzeTicket
    const result = await analyzeTicket(subject, description, categories, departments);

    if (!result) {
      return res.status(503).json({ success: false, message: 'AI service unavailable' });
    }

    // Le résultat contiendra maintenant : 
    // { category_id, category_name, department_id, department_name, confidence, ... }
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('AI analyze-ticket error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;