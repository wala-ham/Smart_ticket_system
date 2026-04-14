// src/models/TicketBilling.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TicketBilling = sequelize.define('TicketBilling', {
    id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ticket_id:       { type: DataTypes.INTEGER, allowNull: false, unique: true },
    organization_id: { type: DataTypes.INTEGER, allowNull: false },
    created_by:      { type: DataTypes.INTEGER, allowNull: true },
    amount:          { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    currency:        { type: DataTypes.STRING(10), defaultValue: 'TND' },
    status: {
      type: DataTypes.STRING(20), defaultValue: 'pending',
      validate: { isIn: [['pending', 'sent', 'paid', 'cancelled']] },
    },
    description:        { type: DataTypes.TEXT, allowNull: true },
    duration_minutes:   { type: DataTypes.INTEGER, allowNull: true },
    hourly_rate:        { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    billing_date:       { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    paid_at:            { type: DataTypes.DATE, allowNull: true },
  }, {
    tableName: 'ticket_billing',
    timestamps: true,
    underscored: true,
  });
  return TicketBilling;
};