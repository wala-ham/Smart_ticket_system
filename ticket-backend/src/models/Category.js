const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Category = sequelize.define('Category', {
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
    allowNull: true,
    references: {
      model: 'organizations',
      key: 'id'
    },
    comment: 'NULL = catégorie globale par défaut, sinon = catégorie spécifique à une organisation'
  },
  default_team: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  color: {
    type: DataTypes.STRING(7),
    allowNull: true,
    validate: {
      is: /^#[0-9A-F]{6}$/i
    }
  }
}, {
  tableName: 'categories',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Category;
