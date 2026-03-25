const jwt = require('jsonwebtoken');
const { User } = require('../models/associations');
const { checkContractStatus } = require('../utils/contractHelper');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Token manquant ou format invalide' 
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }

    // Vérifier si le compte est actif
    if (!user.is_active) {
      return res.status(403).json({ 
        success: false,
        message: 'Votre compte est désactivé' 
      });
    }

    req.user = user;
    if (user.role !== 'super_admin' && user.organization_id) {
      const { checkContractStatus } = require('../utils/contractHelper');
      const isValid = await checkContractStatus(user.organization_id);
      if (!isValid) {
        return res.status(403).json({ 
          success: false, 
          message: 'Votre contrat a expiré. Veuillez contacter le support.' 
        });
      }
    }
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token invalide' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expiré' 
      });
    }
    return res.status(500).json({ 
      success: false,
      message: 'Erreur serveur lors de l\'authentification' 
    });
  }
};

module.exports = authMiddleware;
