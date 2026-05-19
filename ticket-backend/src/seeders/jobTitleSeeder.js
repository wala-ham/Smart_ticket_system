'use strict';

require('dotenv').config();

const db = require('../models/associations');
const { sequelize, User, Organization } = db;

// Mapping métier (à adapter à ton org)
const JOB_TITLES = [
  'Directeur Technique',
  'Développeur',
  'Designer',
  'Architecte'
];

// Helpers
function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  await sequelize.authenticate();
  console.log('✅ Connected to DB');

  const org = await Organization.findOne({ order: [['id', 'ASC']] });
  if (!org) return console.error('❌ No organization found');

  const users = await User.findAll({
    where: {
      organization_id: org.id,
      is_active: true
    }
  });

  if (!users.length) {
    return console.error('❌ No users found');
  }

  console.log(`👥 Found ${users.length} users`);

  // ─────────────────────────────────────────────
  // LOGIQUE DE DISTRIBUTION
  // ─────────────────────────────────────────────

  for (const user of users) {
    let jobTitle;

    // 🎯 Règles intelligentes
    if (user.role === 'company_admin') {
      jobTitle = 'Directeur Technique';
    } 
    else if (user.role === 'employee') {
      // Distribution aléatoire réaliste
      const rand = Math.random();

      if (rand < 0.5) jobTitle = 'Développeur';
      else if (rand < 0.75) jobTitle = 'Designer';
      else jobTitle = 'Architecte';
    } 
    else {
      // client ou autres → pas de job_title
      jobTitle = null;
    }

    await user.update({ job_title: jobTitle });

    console.log(`✔ ${user.email} → ${jobTitle}`);
  }

  console.log('\n✅ Job titles assigned successfully!');

  // Vérification
  const stats = await sequelize.query(`
    SELECT job_title, COUNT(*) as count
    FROM users
    WHERE organization_id = ${org.id}
    GROUP BY job_title
  `, { type: sequelize.QueryTypes.SELECT });

  console.log('\n📊 Distribution des job titles:');
  stats.forEach(s => console.log(`   ${s.job_title}: ${s.count}`));

  await sequelize.close();
}

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});