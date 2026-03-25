// Middleware pour vérifier les rôles
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentification requise' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: 'Accès refusé : permissions insuffisantes',
        required_roles: allowedRoles,
        your_role: req.user.role
      });
    }

    next();
  };
};

// Middleware pour vérifier si l'utilisateur est Super Admin
const isSuperAdmin = checkRole('super_admin');

// Middleware pour vérifier si l'utilisateur est Company Admin
const isCompanyAdmin = checkRole('company_admin');

// Middleware pour vérifier si l'utilisateur est staff (employee, company_admin ou super_admin)
const isStaff = checkRole('employee', 'company_admin', 'super_admin');

// Middleware pour vérifier si l'utilisateur peut voir le ticket
const canViewTicket = async (req, res, next) => {
  const { Ticket } = require('../models/associations');
  const ticketId = req.params.id;

  try {
    const ticket = await Ticket.findByPk(ticketId);

    if (!ticket) {
      return res.status(404).json({ 
        success: false,
        message: 'Ticket non trouvé' 
      });
    }

    // Super admin peut tout voir
    if (req.user.role === 'super_admin') {
      req.ticket = ticket;
      return next();
    }

    // Vérifier que le ticket appartient à la même organisation
    if (ticket.organization_id !== req.user.organization_id) {
      return res.status(403).json({ 
        success: false,
        message: 'Ce ticket n\'appartient pas à votre organisation' 
      });
    }

    // Company admin et employee peuvent voir tous les tickets de leur org
    if (req.user.role === 'company_admin' || req.user.role === 'employee') {
      req.ticket = ticket;
      return next();
    }

    // Client ne peut voir que ses propres tickets
    if (req.user.role === 'client' && ticket.created_by === req.user.id) {
      req.ticket = ticket;
      return next();
    }

    return res.status(403).json({ 
      success: false,
      message: 'Vous n\'avez pas accès à ce ticket' 
    });
  } catch (error) {
    return res.status(500).json({ 
      success: false,
      message: 'Erreur lors de la vérification des permissions' 
    });
  }
};

module.exports = {
  checkRole,
  isSuperAdmin,
  isCompanyAdmin,
  isStaff,
  canViewTicket
};
