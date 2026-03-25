const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Attachment = sequelize.define('Attachment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ticket_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tickets',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  filename: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  original_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  file_path: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  mime_type: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  uploaded_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'attachments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Attachment;
