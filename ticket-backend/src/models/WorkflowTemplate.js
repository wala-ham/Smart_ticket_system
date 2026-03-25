'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const WorkflowTemplate = sequelize.define('WorkflowTemplate', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true },
    },

    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Catégorie qui déclenche ce workflow',
    },

    organization_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    context: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'supplier',
      validate: { isIn: [['client', 'supplier']] },
      comment: 'client = workflow interne client | supplier = workflow fournisseur',
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'workflow_templates',
    timestamps: true,
    underscored: true,
  });

  return WorkflowTemplate;
};
