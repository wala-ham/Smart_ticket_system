const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Organization = sequelize.define('Organization', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  type: {
    type: DataTypes.ENUM('physique', 'morale'),
    allowNull: false,
    defaultValue: 'morale'
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Organisation active ou suspendue'
  },
  admin_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID de l\'utilisateur Company Admin'
  },
  contract_start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Date de début du contrat'
  },
  contract_end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Date d\'expiration du contrat'
  },
  contract_status: {
  type: DataTypes.STRING(20),
  defaultValue: 'active',
  comment: 'Statut du contrat'
},
contract_plan: {
  type: DataTypes.STRING(20),
  defaultValue: 'basic',
  comment: 'Type de plan souscrit'
},
  contract_pdf_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL du contrat PDF stocké sur le serveur'
  },
  
}, {
  tableName: 'organizations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Organization;
