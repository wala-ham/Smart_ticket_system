// models/Department.js
const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Department = sequelize.define('Department', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  organization_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'organizations', key: 'id' },
    comment: 'Département appartient à une organisation'
  },
  manager_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    comment: 'Responsable du département'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'departments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Department;
