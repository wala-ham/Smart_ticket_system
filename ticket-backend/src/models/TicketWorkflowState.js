'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TicketWorkflowState = sequelize.define('TicketWorkflowState', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    ticket_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true, // un ticket = un seul workflow actif
    },

    template_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    current_step: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

    context: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'client',
      validate: { isIn: [['client', 'supplier']] },
    },

    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'active',
      validate: { isIn: [['active', 'completed', 'cancelled']] },
    },

    started_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },

    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'ticket_workflow_states',
    timestamps: false,
  });

  return TicketWorkflowState;
};
