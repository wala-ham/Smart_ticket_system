// Middleware pour filtrer automatiquement par organization_id
// Ceci garantit l'isolation des données entre organisations

const filterByOrganization = (req, res, next) => {
  // Super admin peut voir toutes les organisations
  if (req.user.role === 'super_admin') {
    // Ne pas forcer le filtre, laisser passer tel quel
    return next();
  }

  // Pour tous les autres, forcer le filtre par leur organization
  if (!req.user.organization_id) {
    return res.status(403).json({ 
      success: false,
      message: 'Utilisateur non rattaché à une organisation' 
    });
  }

  // Ajouter automatiquement organization_id aux filtres
  req.organizationFilter = {
    organization_id: req.user.organization_id
  };

  // Si c'est une requête GET avec des query params, ajouter le filtre
  if (req.method === 'GET') {
    req.query.organization_id = req.user.organization_id;
  }

  // Si c'est une création (POST), ajouter organization_id au body
  if (req.method === 'POST' && req.body) {
    req.body.organization_id = req.user.organization_id;
  }

  next();
};

// Middleware pour vérifier que la ressource appartient à l'organisation de l'utilisateur
const checkOrganizationOwnership = (Model) => {
  return async (req, res, next) => {
    // Super admin bypass
    if (req.user.role === 'super_admin') {
      return next();
    }

    const resourceId = req.params.id;

    try {
      const resource = await Model.findByPk(resourceId);

      if (!resource) {
        return res.status(404).json({ 
          success: false,
          message: 'Ressource non trouvée' 
        });
      }

      // Vérifier que la ressource appartient à la même organisation
      if (resource.organization_id !== req.user.organization_id) {
        return res.status(403).json({ 
          success: false,
          message: 'Cette ressource n\'appartient pas à votre organisation' 
        });
      }

      // Attacher la ressource à req pour éviter une double requête
      req.resource = resource;
      next();
    } catch (error) {
      console.error('Erreur vérification organisation:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Erreur serveur' 
      });
    }
  };
};

module.exports = {
  filterByOrganization,
  checkOrganizationOwnership
};
