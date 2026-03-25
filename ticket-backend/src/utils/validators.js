const { body, param, query } = require('express-validator');

// Validateurs pour l'authentification
exports.loginValidator = [
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('password').notEmpty().withMessage('Le mot de passe est requis')
];

// Validateurs pour la création d'organisation
exports.createOrganizationValidator = [
  body('name').trim().notEmpty().withMessage('Nom de l\'organisation requis').isLength({ min: 2, max: 255 }),
  body('type').isIn(['physique', 'morale']).withMessage('Type doit être physique ou morale'),
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('admin_email').isEmail().withMessage('Email admin invalide').normalizeEmail(),
  body('admin_password').isLength({ min: 6 }).withMessage('Mot de passe admin minimum 6 caractères'),
  body('admin_name').trim().notEmpty().withMessage('Nom de l\'admin requis')
];

// Validateurs pour la création d'employé
exports.createEmployeeValidator = [
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Mot de passe minimum 6 caractères'),
  body('full_name').trim().notEmpty().withMessage('Nom complet requis').isLength({ min: 2 }),
  body('team').notEmpty().withMessage('Équipe requise pour un employé'),
  body('phone').optional().isMobilePhone().withMessage('Numéro de téléphone invalide')
];

// Validateurs pour la création de client
exports.createClientValidator = [
  body('email').isEmail().withMessage('Email invalide').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Mot de passe minimum 6 caractères'),
  body('full_name').trim().notEmpty().withMessage('Nom complet requis').isLength({ min: 2 }),
  body('phone').optional().isMobilePhone().withMessage('Numéro de téléphone invalide')
];

// Validateurs pour les tickets
exports.createTicketValidator = [
  body('subject').trim().notEmpty().withMessage('Le sujet est requis').isLength({ min: 5, max: 255 }),
  body('description').trim().notEmpty().withMessage('La description est requise').isLength({ min: 10 }),
  body('category_id').optional().isInt().withMessage('ID de catégorie invalide'),
  body('supplier_id').optional().isInt().withMessage('ID de fournisseur invalide')
];

exports.updateTicketValidator = [
  body('subject').optional().trim().isLength({ min: 5, max: 255 }),
  body('description').optional().trim().isLength({ min: 10 }),
  body('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('category_id').optional().isInt(),
  body('assigned_to').optional().isInt(),
  body('supplier_id').optional().isInt()
];

// Validateurs pour les commentaires
exports.addCommentValidator = [
  body('content').trim().notEmpty().withMessage('Le contenu du commentaire est requis').isLength({ min: 1, max: 2000 }),
  body('is_internal').optional().isBoolean().withMessage('is_internal doit être un booléen')
];

// Validateurs pour les fournisseurs
exports.createSupplierValidator = [
  body('name').trim().notEmpty().withMessage('Nom du fournisseur requis').isLength({ min: 2, max: 255 }),
  body('contact_email').optional().isEmail().withMessage('Email de contact invalide'),
  body('contact_phone').optional().isMobilePhone().withMessage('Téléphone invalide')
];

// Validateurs pour les catégories
exports.createCategoryValidator = [
  body('name').trim().notEmpty().withMessage('Le nom de la catégorie est requis').isLength({ min: 2, max: 100 }),
  body('description').optional().trim(),
  body('default_team').optional().isString(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Couleur invalide (format hex requis: #RRGGBB)')
];

// Validateur pour les paramètres d'ID
exports.idParamValidator = [
  param('id').isInt().withMessage('ID invalide')
];

// Validateurs pour les query params
exports.paginationValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page invalide'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite invalide (1-100)')
];

// Validateurs pour mise à jour utilisateur
exports.updateUserValidator = [
  body('full_name').optional().trim().notEmpty(),
  body('team').optional().isString(),
  body('phone').optional().isMobilePhone(),
  body('is_available').optional().isBoolean(),
  body('is_active').optional().isBoolean()
];
