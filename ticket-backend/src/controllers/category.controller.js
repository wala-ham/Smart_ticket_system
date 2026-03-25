const { Category } = require('../models/associations');

// Obtenir toutes les catégories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

// Obtenir une catégorie par ID
exports.getCategoryById = async (req, res) => {
  try {
    const categoryId = req.params.id;

    const category = await Category.findByPk(categoryId);

    if (!category) {
      return res.status(404).json({ 
        success: false,
        message: 'Catégorie non trouvée' 
      });
    }

    res.json({
      success: true,
      data: { category }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la catégorie:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

// Créer une catégorie (Admin seulement)
exports.createCategory = async (req, res) => {
  try {
    const { name, description, default_team, color } = req.body;

    if (!name) {
      return res.status(400).json({ 
        success: false,
        message: 'Le nom de la catégorie est requis' 
      });
    }

    const category = await Category.create({
      name,
      description,
      default_team,
      color
    });

    res.status(201).json({
      success: true,
      message: 'Catégorie créée avec succès',
      data: { category }
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        success: false,
        message: 'Cette catégorie existe déjà' 
      });
    }
    console.error('Erreur lors de la création de la catégorie:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

// Mettre à jour une catégorie (Admin seulement)
exports.updateCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { name, description, default_team, color } = req.body;

    const category = await Category.findByPk(categoryId);

    if (!category) {
      return res.status(404).json({ 
        success: false,
        message: 'Catégorie non trouvée' 
      });
    }

    await category.update({
      name: name || category.name,
      description: description !== undefined ? description : category.description,
      default_team: default_team !== undefined ? default_team : category.default_team,
      color: color || category.color
    });

    res.json({
      success: true,
      message: 'Catégorie mise à jour avec succès',
      data: { category }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la catégorie:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

// Supprimer une catégorie (Admin seulement)
exports.deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;

    const category = await Category.findByPk(categoryId);

    if (!category) {
      return res.status(404).json({ 
        success: false,
        message: 'Catégorie non trouvée' 
      });
    }

    await category.destroy();

    res.json({
      success: true,
      message: 'Catégorie supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la catégorie:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};
