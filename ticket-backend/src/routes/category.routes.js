const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { isCompanyAdmin } = require('../middleware/role.middleware');
const { body } = require('express-validator');

// Lecture des catégories (tous les utilisateurs authentifiés)
router.get('/', authMiddleware, categoryController.getAllCategories);
router.get('/:id', authMiddleware, categoryController.getCategoryById);

// CRUD catégories (Company Admin uniquement)
router.post('/', authMiddleware, [
  body('name').trim().notEmpty().isLength({ min: 2, max: 100 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/)
], categoryController.createCategory);

router.put('/:id', authMiddleware, categoryController.updateCategory);
router.delete('/:id', authMiddleware, categoryController.deleteCategory);

module.exports = router;
