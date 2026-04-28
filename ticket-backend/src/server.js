require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./models/index');
const associations = require('./models/associations');

// Import des routes
const authRoutes = require('./routes/auth.routes');
const ticketRoutes = require('./routes/ticket.routes');
const userRoutes = require('./routes/user.routes');
const statsRoutes = require('./routes/stats.routes');
const categoryRoutes = require('./routes/category.routes');
const departmentRoutes = require('./routes/department.routes');
const organizationRoutes = require('./routes/organization.routes');
const workflowRoutes = require('./routes/workflow.routes');
const { ticketRouter, billingRouter } = require('./routes/workflow.routes');


const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const path = require('path');

// Servir les fichiers uploadés (contrats PDF)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Logger middleware pour le développement
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Route de base
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'Ticket System API', 
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      tickets: '/api/tickets',
      users: '/api/users',
      categories: '/api/categories',
      organizations: '/api/organizations',
      stats: '/api/stats'
    }
  });
});

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'OK', 
    timestamp: new Date(),
    database: 'connected'
  });
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/workflow-templates', workflowRoutes);
app.use('/api/tickets',  ticketRouter);   // les routes workflow/:action
app.use('/api/billing',  billingRouter);  // liste globale des factures
app.use('/api/ai', require('./routes/ai.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));



// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Route non trouvée',
    path: req.path
  });
});
// Gestion globale des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur globale:', err);
  res.status(err.status || 500).json({ 
    success: false,
    message: err.message || 'Erreur serveur interne',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Configuration du port
const PORT = process.env.PORT || 5000;

// Fonction de démarrage du serveur
const startServer = async () => {
  try {
    // Synchroniser les modèles avec la base de données
    // alter: true ajuste les tables existantes sans les supprimer
    await sequelize.sync({ alter: false });
    console.log('✅ Modèles synchronisés avec PostgreSQL');

    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════════════════');
      console.log('🚀 Serveur démarré avec succès !');
      console.log('═══════════════════════════════════════════════════');
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Database: ${process.env.DB_NAME}`);
      console.log('');
      console.log('📚 Endpoints disponibles:');
     
      console.log(`   POST   http://localhost:${PORT}/api/auth/login`);
      console.log(`   GET    http://localhost:${PORT}/api/tickets`);
      console.log(`   GET    http://localhost:${PORT}/api/categories`);
      console.log(`   GET    http://localhost:${PORT}/api/organizations`);
      console.log(`   GET    http://localhost:${PORT}/api/stats/dashboard`);
      console.log('');
      console.log('💡 Astuce: Utilisez Postman pour tester l\'API');
      console.log('═══════════════════════════════════════════════════');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

// Gestion de l'arrêt propre du serveur
process.on('SIGINT', async () => {
  console.log('\n🛑 Arrêt du serveur...');
  await sequelize.close();
  console.log('✅ Connexion à la base de données fermée');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Arrêt du serveur...');
  await sequelize.close();
  console.log('✅ Connexion à la base de données fermée');
  process.exit(0);
});

// Démarrer le serveur
startServer();

module.exports = app;
