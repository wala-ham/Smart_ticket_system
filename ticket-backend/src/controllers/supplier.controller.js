const { Supplier } = require('../models/associations');
const { validationResult } = require('express-validator');

// Créer un fournisseur
exports.createSupplier = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, contact_name, contact_email, contact_phone, address } = req.body;
    const orgId = req.user.organization_id;

    const supplier = await Supplier.create({
      name,
      contact_name,
      contact_email,
      contact_phone,
      address,
      organization_id: orgId,
      is_active: true
    });

    res.status(201).json({
      success: true,
      message: 'Fournisseur créé avec succès',
      data: { supplier }
    });
  } catch (error) {
    console.error('Erreur création fournisseur:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Liste des fournisseurs de l'organisation
exports.getOrganizationSuppliers = async (req, res) => {
  try {
    const { is_active, search } = req.query;
    const orgId = req.user.organization_id;

    const where = { organization_id: orgId };
    if (is_active !== undefined) where.is_active = is_active === 'true';
    if (search) where.name = { [require('sequelize').Op.iLike]: `%${search}%` };

    const suppliers = await Supplier.findAll({
      where,
      order: [['name', 'ASC']]
    });

    res.json({ success: true, data: { suppliers } });
  } catch (error) {
    console.error('Erreur récupération fournisseurs:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Détails d'un fournisseur
exports.getSupplierById = async (req, res) => {
  try {
    const supplierId = req.params.id;
    const supplier = await Supplier.findByPk(supplierId);

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Fournisseur non trouvé' });
    }

    // Vérifier que le fournisseur appartient à l'organisation
    if (supplier.organization_id !== req.user.organization_id) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    res.json({ success: true, data: { supplier } });
  } catch (error) {
    console.error('Erreur récupération fournisseur:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Mettre à jour un fournisseur
exports.updateSupplier = async (req, res) => {
  try {
    const supplierId = req.params.id;
    const { name, contact_name, contact_email, contact_phone, address, is_active } = req.body;

    const supplier = await Supplier.findByPk(supplierId);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Fournisseur non trouvé' });
    }

    if (supplier.organization_id !== req.user.organization_id) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    await supplier.update({
      name: name || supplier.name,
      contact_name: contact_name !== undefined ? contact_name : supplier.contact_name,
      contact_email: contact_email !== undefined ? contact_email : supplier.contact_email,
      contact_phone: contact_phone !== undefined ? contact_phone : supplier.contact_phone,
      address: address !== undefined ? address : supplier.address,
      is_active: is_active !== undefined ? is_active : supplier.is_active
    });

    res.json({
      success: true,
      message: 'Fournisseur mis à jour',
      data: { supplier }
    });
  } catch (error) {
    console.error('Erreur mise à jour fournisseur:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Supprimer un fournisseur
exports.deleteSupplier = async (req, res) => {
  try {
    const supplierId = req.params.id;

    const supplier = await Supplier.findByPk(supplierId);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Fournisseur non trouvé' });
    }

    if (supplier.organization_id !== req.user.organization_id) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    await supplier.destroy();
    res.json({ success: true, message: 'Fournisseur supprimé' });
  } catch (error) {
    console.error('Erreur suppression fournisseur:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = exports;
