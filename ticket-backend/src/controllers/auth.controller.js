const jwt = require('jsonwebtoken');
const { User, Organization } = require('../models/associations');
const { validationResult } = require('express-validator');

// Générer un token JWT
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};


// Connexion
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Trouver l'utilisateur avec son organisation
    const user = await User.findOne({ 
      where: { email },
      include: [
        { 
          model: Organization, 
          as: 'organization',
          attributes: ['id', 'name', 'type', 'is_active']
        }
      ]
    });
    console.log('User found:', user ? user.toJSON() : null);
    console.log('Password from request:', password);
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Email ou mot de passe incorrect' 
      });
    }

    // Vérifier si le compte est actif
    if (!user.is_active) {
      return res.status(403).json({ 
        success: false,
        message: 'Votre compte est désactivé. Contactez votre administrateur.' 
      });
    }

    // Vérifier si l'organisation est active (sauf pour super_admin)
    if (user.role !== 'super_admin' && user.organization) {
      if (!user.organization.is_active) {
        return res.status(403).json({ 
          success: false,
          message: 'Votre organisation est suspendue. Contactez le support.' 
        });
      }
    }
    // Vérifier le mot de passe
console.log('Password from request:', password);
console.log('Password hash in DB:', user.password);
console.log('Hash length:', user.password?.length);
    // Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: 'Email ou mot de passe incorrect' 
      });
    }
    console.log('isPasswordValid:', isPasswordValid);

    // Mettre à jour last_login
    await user.update({ last_login: new Date() });

    // Générer le token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: user.toJSON(),
        token,
        password_reset_required: user.password_reset_required
      }
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Obtenir le profil de l'utilisateur connecté
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        { 
          model: Organization, 
          as: 'organization',
          attributes: ['id', 'name', 'type']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'full_name', 'email']
        }
      ]
    });

    res.json({ success: true, data: { user: user.toJSON() } });
  } catch (error) {
    console.error('Erreur récupération profil:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Mettre à jour le profil
exports.updateProfile = async (req, res) => {
  try {
    const { full_name, phone } = req.body;
    
    await req.user.update({
      full_name: full_name || req.user.full_name,
      phone: phone !== undefined ? phone : req.user.phone
    });

    res.json({
      success: true,
      message: 'Profil mis à jour',
      data: { user: req.user.toJSON() }
    });
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Changer le mot de passe
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ 
        success: false,
        message: 'Mot de passe actuel et nouveau mot de passe requis' 
      });
    }

    // Vérifier le mot de passe actuel (sauf si premier login)
    if (!req.user.password_reset_required) {
      const isPasswordValid = await req.user.comparePassword(current_password);
      if (!isPasswordValid) {
        return res.status(401).json({ 
          success: false,
          message: 'Mot de passe actuel incorrect' 
        });
      }
    }

    // Mettre à jour le mot de passe
    req.user.password = new_password;
    req.user.password_reset_required = false;
    await req.user.save();

    res.json({
      success: true,
      message: 'Mot de passe changé avec succès'
    });
  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Réinitialiser le mot de passe d'un utilisateur (Admin)
exports.resetUserPassword = async (req, res) => {
  try {
    const userId = req.params.id;
    const { new_password } = req.body;

    // Vérifier les permissions
    if (req.user.role === 'employee' || req.user.role === 'client') {
      return res.status(403).json({ 
        success: false,
        message: 'Accès refusé' 
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // Company admin ne peut réinitialiser que dans son organisation
    if (req.user.role === 'company_admin' && user.organization_id !== req.user.organization_id) {
      return res.status(403).json({ success: false, message: 'Accès refusé' });
    }

    // Mettre à jour le mot de passe
    user.password = new_password;
    user.password_reset_required = true;
    await user.save();

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé. L\'utilisateur devra le changer à la prochaine connexion.'
    });
  } catch (error) {
    console.error('Erreur réinitialisation mot de passe:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
