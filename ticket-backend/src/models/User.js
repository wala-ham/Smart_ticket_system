const { DataTypes } = require('sequelize');
const sequelize = require('./index');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  full_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('super_admin', 'company_admin', 'employee', 'client'),
    allowNull: false,
    defaultValue: 'client'
    },
  organization_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'organizations',
      key: 'id'
    },
    comment: 'NULL pour super_admin, obligatoire pour les autres'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'ID de l\'utilisateur qui a créé ce compte'
  },
  team: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Équipe pour les employees (technique, facturation, support, etc.)'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Compte actif ou désactivé'
  },
 
  is_available: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Disponibilité pour les employees'
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  password_reset_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Force le changement de mot de passe au premier login'
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // --- NOUVEAUX CHAMPS À AJOUTER ---
  performance_score: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  tickets_resolved: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  tickets_assigned: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  avg_resolution_time: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  score_updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Méthode pour comparer les mots de passe
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Exclure le mot de passe lors de la sérialisation JSON
User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  return values;
};

module.exports = User;
