'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const WorkflowHistory = sequelize.define('WorkflowHistory', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    ticket_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    template_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    step_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    step_label: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    action: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { isIn: [['started', 'forward', 'backward', 'completed', 'cancelled']] },
    },

    acted_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User qui a effectué l\'action',
    },

    assigned_to: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User assigné à cette étape',
    },

    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Obligatoire pour action backward',
    },

    acted_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'workflow_history',
    timestamps: false,
  });

  return WorkflowHistory;
};
