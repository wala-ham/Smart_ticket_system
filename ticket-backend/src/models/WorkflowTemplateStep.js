'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const WorkflowTemplateStep = sequelize.define('WorkflowTemplateStep', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    template_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    step_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Position dans le circuit : 1, 2, 3...',
    },

    label: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Libellé de l\'étape ex: "Analyse DT", "Correction Dev"',
    },

    role: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Rôle cible des utilisateurs pour cette étape',
    },

    assignment_type: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'OR',
      validate: { isIn: [['OR', 'AND']] },
      comment: 'OR = 1 user auto-sélectionné | AND = tous notifiés',
    },

    department_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Si NULL, cherche dans toute l\'organisation',
    },
  }, {
    tableName: 'workflow_template_steps',
    timestamps: true,
    underscored: true,
    updatedAt: false,
  });

  return WorkflowTemplateStep;
};
