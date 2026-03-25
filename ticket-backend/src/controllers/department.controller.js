// controllers/department.controller.js
const { Department, User, Organization } = require('../models/associations');

// GET /api/departments
exports.getAllDepartments = async (req, res) => {
  try {
    const where = {};
    if (req.user.role === 'super_admin') {
      if (req.query.organization_id) where.organization_id = req.query.organization_id;
    } else {
      where.organization_id = req.user.organization_id;
    }
    if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true';

    const departments = await Department.findAll({
      where,
      include: [
        { model: User, as: 'manager', attributes: ['id', 'full_name', 'email'] },
        { model: User, as: 'members', attributes: ['id', 'full_name', 'email', 'role'] }
      ],
      order: [['name', 'ASC']]
    });

    res.json({ success: true, data: { departments } });
  } catch (error) {
    console.error('Erreur getAllDepartments:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// GET /api/departments/:id
exports.getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id, {
      include: [
        { model: User,         as: 'manager',      attributes: ['id', 'full_name', 'email'] },
        { model: User,         as: 'members',      attributes: ['id', 'full_name', 'email', 'role'] },
        { model: Organization, as: 'organization', attributes: ['id', 'name'] }
      ]
    });

    if (!department)
      return res.status(404).json({ success: false, message: 'Département non trouvé' });

    if (req.user.role !== 'super_admin' && department.organization_id !== req.user.organization_id)
      return res.status(403).json({ success: false, message: 'Accès refusé' });

    res.json({ success: true, data: { department } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// POST /api/departments
exports.createDepartment = async (req, res) => {
  console.log('🔍 req.user:', JSON.stringify(req.user, null, 2));
  console.log('🔍 req.body:', req.body);
  try {
    const { name, description, manager_id } = req.body;

    if (!name?.trim())
      return res.status(400).json({ success: false, message: 'Le nom du département est requis' });

    const organization_id = req.user.role === 'super_admin'
      ? req.body.organization_id
      : req.user.organization_id;

    if (!organization_id)
      return res.status(400).json({ success: false, message: 'organization_id requis' });

    if (manager_id) {
      const manager = await User.findByPk(manager_id);
      if (!manager || manager.organization_id !== parseInt(organization_id))
        return res.status(400).json({ success: false, message: 'Manager invalide ou hors organisation' });
    }

    const department = await Department.create({ name: name.trim(), description, organization_id, manager_id });

    await department.reload({
      include: [{ model: User, as: 'manager', attributes: ['id', 'full_name', 'email'] }]
    });

    res.status(201).json({ success: true, message: 'Département créé avec succès', data: { department } });
  } catch (error) {
    console.error('Erreur createDepartment:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// PUT /api/departments/:id
exports.updateDepartment = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department)
      return res.status(404).json({ success: false, message: 'Département non trouvé' });

    if (req.user.role !== 'super_admin' && department.organization_id !== req.user.organization_id)
      return res.status(403).json({ success: false, message: 'Accès refusé' });

    const { name, description, manager_id, is_active } = req.body;
    await department.update({
      name:        name        ?? department.name,
      description: description ?? department.description,
      manager_id:  manager_id  !== undefined ? manager_id : department.manager_id,
      is_active:   is_active   !== undefined ? is_active  : department.is_active
    });

    await department.reload({
      include: [{ model: User, as: 'manager', attributes: ['id', 'full_name', 'email'] }]
    });

    res.json({ success: true, message: 'Département mis à jour', data: { department } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// DELETE /api/departments/:id
exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department)
      return res.status(404).json({ success: false, message: 'Département non trouvé' });

    if (req.user.role !== 'super_admin' && department.organization_id !== req.user.organization_id)
      return res.status(403).json({ success: false, message: 'Accès refusé' });

    await department.destroy();
    res.json({ success: true, message: 'Département supprimé' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// PUT /api/departments/:id/members — ajouter/retirer un membre
exports.updateMembers = async (req, res) => {
  try {
    const { user_id, action } = req.body; // action: 'add' | 'remove'

    const department = await Department.findByPk(req.params.id);
    if (!department)
      return res.status(404).json({ success: false, message: 'Département non trouvé' });

    const user = await User.findByPk(user_id);
    if (!user || user.organization_id !== department.organization_id)
      return res.status(400).json({ success: false, message: 'Utilisateur invalide ou hors organisation' });

    if (!['add', 'remove'].includes(action))
      return res.status(400).json({ success: false, message: 'action doit être "add" ou "remove"' });

    await user.update({ department_id: action === 'add' ? department.id : null });

    res.json({ success: true, message: `Membre ${action === 'add' ? 'ajouté' : 'retiré'} avec succès` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
