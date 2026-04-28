// src/seeders/ticketSeeder.js
// Génère 250 tickets réalistes avec statuts variés, durées, IA
// Exécuter : node src/seeders/ticketSeeder.js
'use strict';

require('dotenv').config();

// Change these two lines:
const db = require('../models/associations'); 
// Check if 'db' itself or 'db.sequelize' is what holds the connection
const { sequelize, Ticket, User, Category, Organization, Department } = db;

// ─── Données réalistes ────────────────────────────────────────────────────────
const TICKET_TEMPLATES = [
  // Technical Issue
  { subject: "Application mobile crash au démarrage", description: "Depuis la mise à jour 2.1.3, l'application se ferme immédiatement après l'écran de chargement. Testé sur iPhone 14 et Samsung S23.", category: "Technical Issue", priority: "high", sentiment: "negative", keywords: "crash,mobile,démarrage,mise à jour" },
  { subject: "Impossible de se connecter au VPN", description: "Erreur 'Authentication failed' lors de la connexion au VPN d'entreprise. Le mot de passe est correct, j'ai vérifié plusieurs fois.", category: "Technical Issue", priority: "high", sentiment: "negative", keywords: "VPN,connexion,authentification,erreur" },
  { subject: "Base de données lente depuis hier", description: "Les requêtes SQL prennent plus de 30 secondes alors qu'elles prenaient moins de 1 seconde avant. La production est impactée.", category: "Technical Issue", priority: "critical", sentiment: "urgent", keywords: "base de données,performance,lenteur,production" },
  { subject: "Erreur 500 sur l'API de paiement", description: "L'endpoint /api/payment retourne une erreur 500 depuis 14h. Environ 200 transactions échouées. Besoin urgent de résolution.", category: "Technical Issue", priority: "critical", sentiment: "urgent", keywords: "API,paiement,erreur 500,transactions" },
  { subject: "Interface admin inaccessible", description: "Le panneau d'administration retourne une page blanche. Aucune erreur dans la console.", category: "Technical Issue", priority: "high", sentiment: "negative", keywords: "admin,interface,page blanche" },
  { subject: "Synchronisation des données échoue", description: "La synchronisation entre le serveur principal et le serveur de backup échoue toutes les nuits depuis 3 jours.", category: "Technical Issue", priority: "medium", sentiment: "negative", keywords: "synchronisation,backup,données" },
  { subject: "Certificat SSL expiré", description: "Le certificat SSL de notre domaine principal expire dans 2 jours. Besoin de renouvellement urgent.", category: "Technical Issue", priority: "high", sentiment: "urgent", keywords: "SSL,certificat,expiration,sécurité" },
  { subject: "Emails ne partent plus", description: "Depuis ce matin aucun email de notification n'est envoyé. Les logs montrent une erreur SMTP.", category: "Technical Issue", priority: "high", sentiment: "negative", keywords: "email,SMTP,notification,erreur" },
  { subject: "Problème d'impression réseau", description: "L'imprimante du bureau 3ème étage n'est plus accessible depuis le réseau. Elle était fonctionnelle vendredi.", category: "Technical Issue", priority: "low", sentiment: "neutral", keywords: "imprimante,réseau,bureau" },
  { subject: "Micro ne fonctionne pas en réunion", description: "Durant les réunions Teams/Zoom, mon microphone est détecté mais le son est inaudible pour les participants.", category: "Technical Issue", priority: "medium", sentiment: "negative", keywords: "microphone,réunion,Teams,Zoom" },

  // Billing
  { subject: "Facture incorrecte pour le mois de mars", description: "La facture de mars inclut des services que nous n'avons pas commandés. Montant erroné de 450 DT en plus.", category: "Billing", priority: "high", sentiment: "negative", keywords: "facture,erreur,mars,montant" },
  { subject: "Demande de remboursement doublon", description: "J'ai été facturé deux fois pour l'abonnement mensuel. Veuillez procéder au remboursement du doublon.", category: "Billing", priority: "medium", sentiment: "negative", keywords: "remboursement,doublon,abonnement" },
  { subject: "Mise à jour des coordonnées bancaires", description: "Suite au changement de banque, veuillez mettre à jour nos informations de prélèvement automatique.", category: "Billing", priority: "medium", sentiment: "neutral", keywords: "banque,coordonnées,prélèvement" },
  { subject: "Délai de paiement exceptionnel", description: "En raison de difficultés temporaires, nous sollicitons un délai de paiement de 30 jours supplémentaires.", category: "Billing", priority: "low", sentiment: "neutral", keywords: "délai,paiement,exceptionnel" },
  { subject: "Erreur TVA sur la dernière facture", description: "La TVA appliquée est de 20% alors que notre entreprise bénéficie d'une exonération. Veuillez corriger.", category: "Billing", priority: "medium", sentiment: "negative", keywords: "TVA,exonération,facture,correction" },

  // Account
  { subject: "Réinitialisation du mot de passe impossible", description: "Le lien de réinitialisation du mot de passe reçu par email est expiré immédiatement après réception.", category: "Account", priority: "high", sentiment: "negative", keywords: "mot de passe,réinitialisation,lien expiré" },
  { subject: "Création de compte utilisateur", description: "Nous avons besoin de créer 5 nouveaux comptes pour nos employés qui rejoignent l'équipe le 1er du mois.", category: "Account", priority: "low", sentiment: "positive", keywords: "compte,création,utilisateur,employé" },
  { subject: "Accès refusé aux modules achetés", description: "Après le renouvellement de notre licence, plusieurs modules restent inaccessibles malgré le paiement.", category: "Account", priority: "high", sentiment: "negative", keywords: "accès,module,licence,renouvellement" },
  { subject: "Désactivation d'un compte ancien employé", description: "L'employé Jean Dupont a quitté l'entreprise. Son compte doit être désactivé immédiatement pour sécurité.", category: "Account", priority: "high", sentiment: "neutral", keywords: "désactivation,compte,sécurité,employé" },
  { subject: "Changement d'administrateur principal", description: "Suite à une réorganisation interne, nous souhaitons transférer les droits d'administration à Mme. Fatima Ben Ali.", category: "Account", priority: "medium", sentiment: "neutral", keywords: "administrateur,transfert,droits" },

  // Feature Request
  { subject: "Ajout d'un export Excel des rapports", description: "Il serait très utile de pouvoir exporter les rapports de tickets en format Excel pour nos analyses internes.", category: "Feature Request", priority: "low", sentiment: "positive", keywords: "export,Excel,rapport,analyse" },
  { subject: "Notification SMS en plus des emails", description: "Pour les tickets critiques, nous aimerions recevoir des SMS en plus des emails de notification.", category: "Feature Request", priority: "medium", sentiment: "positive", keywords: "SMS,notification,critique" },
  { subject: "Dashboard personnalisable", description: "Pouvoir personnaliser le tableau de bord avec les KPIs qui nous intéressent serait très apprécié.", category: "Feature Request", priority: "low", sentiment: "positive", keywords: "dashboard,personnalisation,KPI" },
  { subject: "Intégration avec Slack", description: "Nous utilisons Slack en interne. Une intégration pour recevoir les notifications de tickets directement dans Slack serait idéale.", category: "Feature Request", priority: "medium", sentiment: "positive", keywords: "Slack,intégration,notification" },
  { subject: "Mode sombre pour l'interface", description: "Beaucoup de nos employés travaillent tard le soir. Un mode sombre réduirait la fatigue visuelle.", category: "Feature Request", priority: "low", sentiment: "positive", keywords: "mode sombre,interface,ergonomie" },
];

const AGENTS = ['Ahmed Ben Salah', 'Fatima Zahra', 'Mohamed Trabelsi', 'Sonia Mansouri', 'Karim Bouzidi'];

function randomBetween(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function daysAgo(days) { const d = new Date(); d.setDate(d.getDate() - days); return d; }

function generateTicket(template, users, categories, org, deptIds, index) {
  const createdDaysAgo = randomBetween(1, 120);
  const created_at     = daysAgo(createdDaysAgo);

  // Statut aléatoire pondéré
  const statusRoll = Math.random();
  let status, resolved_at = null, started_at = null, ended_at = null, duration_minutes = null;
  if      (statusRoll < 0.15) status = 'open';
  else if (statusRoll < 0.30) status = 'in_progress';
  else if (statusRoll < 0.35) status = 'suspended';
  else if (statusRoll < 0.85) status = 'resolved';
  else                         status = 'closed';

  if (['resolved', 'closed'].includes(status)) {
    const resolvedDaysAgo = randomBetween(0, createdDaysAgo - 1);
    resolved_at    = daysAgo(resolvedDaysAgo);
    duration_minutes = randomBetween(15, 480); // 15min à 8h
    started_at     = new Date(created_at.getTime() + randomBetween(5, 60) * 60000);
    ended_at       = resolved_at;
  } else if (status === 'in_progress') {
    started_at = new Date(created_at.getTime() + randomBetween(5, 120) * 60000);
  }

  const cat = categories.find(c => c.name === template.category) ?? categories[0];
  const creator = randomElement(users.filter(u => u.role === 'client'));
  const assignee = randomElement(users.filter(u => ['employee', 'company_admin'].includes(u.role)));

  const confidence_cat  = randomBetween(65, 99);
  const confidence_pri  = randomBetween(60, 97);

  return {
    ticket_number:           `TKT-${new Date().getFullYear()}-${Date.now()}-${index}`,
    subject:                 template.subject,
    description:             template.description,
    status,
    priority:                template.priority,
    organization_id:         org.id,
    category_id:             cat?.id ?? null,
    department_id:           deptIds.length ? randomElement(deptIds) : null,
    created_by:              creator?.id ?? users[0].id,
    assigned_to:             ['open'].includes(status) ? null : assignee?.id,
    workflow_step:           status === 'open' ? 'department' : 'worklist',
    in_worklist:             false,
    ai_category_confidence:  confidence_cat,
    ai_priority_confidence:  confidence_pri,
    ai_summary:              `Analyse IA: ${template.subject.toLowerCase()}`,
    ai_sentiment:            template.sentiment,
    ai_keywords:             template.keywords,
    resolved_at,
    started_at,
    ended_at,
    duration_minutes,
    created_at,
    updated_at:              status === 'resolved' ? resolved_at : new Date(),
  };
}

async function seed() {
  await sequelize.authenticate();
  console.log('✅ Connected to DB');

  const org        = await Organization.findOne({ order: [['id', 'ASC']] });
  if (!org) return console.error('❌ No organization found');

  const users      = await User.findAll({ where: { organization_id: org.id, is_active: true } });
  const categories = await Category.findAll();
  const departments = await Department.findAll({ where: { organization_id: org.id } });
  const deptIds    = departments.map(d => d.id);

  if (users.length < 2) return console.error('❌ Need at least 2 users (1 client + 1 employee)');
  if (!categories.length) return console.error('❌ No categories found — seed categories first');

  console.log(`Found: ${users.length} users, ${categories.length} categories, ${departments.length} departments`);

  // Supprimer les anciens tickets de seed (optionnel)
  const existingCount = await Ticket.count({ where: { organization_id: org.id } });
  console.log(`Existing tickets: ${existingCount}`);

  const toCreate = [];
  let index = 0;

  // Générer 250 tickets — chaque template utilisé ~10 fois avec variations
  for (let i = 0; i < 250; i++) {
    const template = TICKET_TEMPLATES[i % TICKET_TEMPLATES.length];
    // Variation légère du sujet pour éviter les doublons
    const varied = {
      ...template,
      subject: `${template.subject}${i > 24 ? ` (#${Math.floor(i / 25) + 1})` : ''}`,
    };
    toCreate.push(generateTicket(varied, users, categories, org, deptIds, ++index));
    // Petit délai pour ticket_number unique
    await new Promise(r => setTimeout(r, 1));
  }

  // Insérer par batch de 50
  for (let i = 0; i < toCreate.length; i += 50) {
    const batch = toCreate.slice(i, i + 50);
    await Ticket.bulkCreate(batch, { ignoreDuplicates: true });
    console.log(`✅ Inserted ${Math.min(i + 50, toCreate.length)}/${toCreate.length} tickets`);
  }

  // Stats finales
  const stats = await sequelize.query(`
    SELECT status, COUNT(*) as count
    FROM tickets WHERE organization_id = ${org.id}
    GROUP BY status ORDER BY count DESC
  `, { type: sequelize.QueryTypes.SELECT });

  console.log('\n📊 Tickets par statut:');
  stats.forEach(s => console.log(`   ${s.status}: ${s.count}`));
  console.log('\n✅ Seed terminé !');
  await sequelize.close();
}

seed().catch(err => { console.error('❌ Seed error:', err); process.exit(1); });
