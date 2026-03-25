const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    dialectOptions: dbConfig.dialectOptions || {}
  }
);

// Test de connexion
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion PostgreSQL établie avec succès');
  } catch (error) {
    console.error('❌ Impossible de se connecter à PostgreSQL:', error.message);
  }
};

testConnection();

module.exports = sequelize;
