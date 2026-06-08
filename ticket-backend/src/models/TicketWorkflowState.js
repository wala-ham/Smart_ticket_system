'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TicketWorkflowState = sequelize.define('TicketWorkflowState', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    ticket_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      // ⚠️ SUPPRIME unique: true pour permettre supplier + client
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
      defaultValue: 'supplier',  // 🔄 Changé de 'client' à 'supplier' (plus logique)
      validate: { isIn: [['client', 'supplier']] },
    },

    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'active',
      // ✅ Ajout des status manquants
      validate: { 
        isIn: [['active', 'completed', 'cancelled', 'escalated', 'suspended']] 
      },
    },

    started_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },

    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // 🆕 NOUVEAUX CHAMPS POUR L'ESCALADE
    escalated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    escalated_from_state_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'ticket_workflow_states',
        key: 'id',
      },
    },

    parent_state_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'ticket_workflow_states',
        key: 'id',
      },
    },

    // 🆕 Pour suspension/reprise
    suspended_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    resumed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // 🆕 Pour tracker le motif
    escalation_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'ticket_workflow_states',
    timestamps: true,  // 🔄 Ajoute createdAt/updatedAt automatiquement
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  // Définir les associations ICI (optionnel, ou dans associations.js)
  TicketWorkflowState.associate = (models) => {
    TicketWorkflowState.belongsTo(models.Ticket, { foreignKey: 'ticket_id', as: 'ticket' });
    TicketWorkflowState.belongsTo(models.WorkflowTemplate, { foreignKey: 'template_id', as: 'template' });
    
    // Self-reference pour l'escalade
    TicketWorkflowState.belongsTo(models.TicketWorkflowState, { 
      foreignKey: 'escalated_from_state_id', 
      as: 'escalatedFrom' 
    });
    TicketWorkflowState.hasMany(models.TicketWorkflowState, { 
      foreignKey: 'escalated_from_state_id', 
      as: 'escalatedTo' 
    });
    
    // Self-reference pour le chaînage
    TicketWorkflowState.belongsTo(models.TicketWorkflowState, { 
      foreignKey: 'parent_state_id', 
      as: 'parentState' 
    });
    TicketWorkflowState.hasMany(models.TicketWorkflowState, { 
      foreignKey: 'parent_state_id', 
      as: 'childStates' 
    });
  };

  return TicketWorkflowState;
};