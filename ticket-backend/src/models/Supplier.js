const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Supplier = sequelize.define('Supplier', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  organization_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'organizations',
      key: 'id'
    },
    comment: 'Fournisseur appartient à une organisation'
  },
  contact_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  contact_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  contact_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'suppliers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Supplier;
