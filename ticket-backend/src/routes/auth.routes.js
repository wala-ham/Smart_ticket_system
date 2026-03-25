const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { body } = require('express-validator');

// ❌ PLUS DE SIGNUP PUBLIC - Supprimé volontairement

// Login (PUBLIC)
router.post('/login', [
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('password').notEmpty().withMessage('Mot de passe requis')
], authController.login);

// Routes protégées (nécessitent authentification)
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);

// Changement de mot de passe
router.put('/change-password', authMiddleware, [
  body('new_password').isLength({ min: 6 }).withMessage('Mot de passe minimum 6 caractères')
], authController.changePassword);

// Réinitialiser le mot de passe d'un utilisateur (Admin)
router.put('/reset-password/:id', authMiddleware, [
  body('new_password').isLength({ min: 6 }).withMessage('Mot de passe minimum 6 caractères')
], authController.resetUserPassword);

module.exports = router;
