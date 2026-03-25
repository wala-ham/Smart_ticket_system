const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplier.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { isCompanyAdmin } = require('../middleware/role.middleware');
const { body } = require('express-validator');

// Toutes les routes nécessitent authentification
router.use(authMiddleware);
router.use(isCompanyAdmin);

// CRUD Fournisseurs
router.post('/', [
  body('name').trim().notEmpty().withMessage('Nom du fournisseur requis'),
  body('contact_email').optional().isEmail().withMessage('Email invalide')
], supplierController.createSupplier);

router.get('/', supplierController.getOrganizationSuppliers);
router.get('/:id', supplierController.getSupplierById);
router.put('/:id', supplierController.updateSupplier);
router.delete('/:id', supplierController.deleteSupplier);

module.exports = router;
