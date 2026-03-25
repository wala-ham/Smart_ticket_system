// models/Ticket.js
const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ticket_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    defaultValue: () => {
      const year   = new Date().getFullYear();
      const random = Math.floor(1000 + Math.random() * 9000);
      return `TKT-${year}-${Date.now()}-${random}`;
    }
  },
  subject: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'open'
  },
  priority: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'medium'
  },
  organization_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'organizations', key: 'id' },
    comment: 'Ticket appartient à une organisation (isolation des données)'
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'categories', key: 'id' }
  },

  // ─── NOUVEAU : Département ────────────────────────────────────────────────────
  department_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'departments', key: 'id' },
    comment: 'Département responsable du traitement initial'
  },

  // ─── NOUVEAU : Workflow ───────────────────────────────────────────────────────
  workflow_step: {
    type: DataTypes.STRING(20), // VARCHAR — évite le conflit ALTER ENUM avec sequelize alter:true
    defaultValue: 'department',
    comment: 'Étape actuelle : traitement département ou escaladé au worklist'
  },
  in_worklist: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Ticket escaladé vers le worklist (non résolu par le département)'
  },
  worklist_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: "Date d'entrée dans le worklist"
  },
  // ─────────────────────────────────────────────────────────────────────────────

  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    comment: 'Client qui a créé le ticket'
  },
  assigned_to: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    comment: 'Employé assigné au ticket'
  },
  supplier_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'suppliers', key: 'id' },
    comment: 'Fournisseur rattaché au client pour ce ticket'
  },
  ai_category_confidence: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    validate: { min: 0, max: 100 }
  },
  ai_priority_confidence: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    validate: { min: 0, max: 100 }
  },
  last_reminder_sent: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date du dernier email de rappel envoyé'
  },
  reminder_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Nombre de rappels envoyés pour ce ticket'
  },
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  closed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'tickets',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (ticket) => {
      // réservé pour logique future
    },
    beforeUpdate: (ticket) => {
      if (ticket.changed('status') && ticket.status === 'resolved') {
        ticket.resolved_at = new Date();
      }
      if (ticket.changed('status') && ticket.status === 'closed') {
        ticket.closed_at = new Date();
      }
    }
  }
});

module.exports = Ticket;