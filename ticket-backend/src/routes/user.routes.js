const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { isCompanyAdmin, isStaff } = require('../middleware/role.middleware');
const { body } = require('express-validator');

// Toutes les routes nécessitent authentification
router.use(authMiddleware);

// Créer un employé (Company Admin uniquement)
router.post('/employees', isCompanyAdmin, [
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Mot de passe minimum 6 caractères'),
  body('full_name').trim().notEmpty().withMessage('Nom complet requis'),
  body('team').notEmpty().withMessage('Équipe requise pour un employé')
], userController.createEmployee);

// Créer un client (Company Admin uniquement)
router.post('/clients', isCompanyAdmin, [
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Mot de passe minimum 6 caractères'),
  body('full_name').trim().notEmpty().withMessage('Nom complet requis')
], userController.createClient);

// Liste des utilisateurs de l'organisation
router.get('/', isStaff, userController.getOrganizationUsers);

// Employés disponibles
router.get('/employees/available', isStaff, userController.getAvailableEmployees);

// Stats d'un employé
router.get('/employees/:id/stats', isStaff, userController.getEmployeeStats);

// CRUD utilisateur
router.get('/:id', isStaff, userController.getUserById);
router.put('/:id', isStaff, userController.updateUser);
router.delete('/:id', isCompanyAdmin, userController.deleteUser);

module.exports = router;
