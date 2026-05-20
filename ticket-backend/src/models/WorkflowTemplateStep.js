// src/models/WorkflowTemplateStep.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const WorkflowTemplateStep = sequelize.define('WorkflowTemplateStep', {
    id:          { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    template_id: { type: DataTypes.INTEGER, allowNull: false },
    step_order:  { type: DataTypes.INTEGER, allowNull: false },

    label: {
      type: DataTypes.STRING(100), allowNull: true,
      comment: 'Libellé affiché de l\'étape',
    },

    // ── Assignation directe ────────────────────────────────────────────────────
    user_id: {
      type: DataTypes.INTEGER, allowNull: true,
      comment: 'Employé spécifique assigné à cette étape (prioritaire sur role_label)',
    },

    // ── Fallback par rôle métier ───────────────────────────────────────────────
    role_label: {
      type: DataTypes.STRING(100), allowNull: true,
      comment: 'Poste métier : ex Directeur Technique, Développeur — utilisé si user_id indisponible',
    },

    // ── Rôle système Sequelize (optionnel, héritage) ──────────────────────────
    role: {
      type: DataTypes.STRING(50), allowNull: true,
      comment: 'Rôle système : employee, company_admin (optionnel)',
    },

    assignment_type: {
      type: DataTypes.STRING(10), allowNull: false, defaultValue: 'OR',
      validate: { isIn: [['OR','AND']] },
      comment: 'OR = meilleur agent auto | AND = tous notifiés',
    },

    department_id: {
      type: DataTypes.INTEGER, allowNull: true,
      comment: 'Filtre par département — null = toute l\'org',
    },
  }, {
    tableName:  'workflow_template_steps',
    timestamps: true,
    underscored: true,
    updatedAt:  false,
  });

  return WorkflowTemplateStep;
};