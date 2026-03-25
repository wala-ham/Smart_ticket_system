require('dotenv').config();
const sequelize = require('../models/index');
const { User, Organization, Category, Ticket, Supplier } = require('../models/associations');

const seedDatabase = async () => {
  try {
    console.log('🔄 Démarrage du seed...');
    
    // ⭐ NOUVEAU : Supprimer les anciens ENUMs PostgreSQL
    console.log('🗑️  Nettoyage des anciens types ENUM...');
    await sequelize.query('DROP TYPE IF EXISTS "enum_users_role" CASCADE;');
    await sequelize.query('DROP TYPE IF EXISTS "enum_tickets_status" CASCADE;');
    await sequelize.query('DROP TYPE IF EXISTS "enum_tickets_priority" CASCADE;');
    await sequelize.query('DROP TYPE IF EXISTS "enum_organizations_type" CASCADE;');
    
    // Synchroniser avec force (supprime et recrée toutes les tables)
    await sequelize.sync({ force: true });
    await sequelize.query(`
  COMMENT ON COLUMN "users"."role"
  IS 'super_admin: plateforme, company_admin: patron entreprise, employee: employé, client: client final';
`);
await sequelize.query(`
  COMMENT ON COLUMN "organizations"."type"
  IS 'Personne physique ou morale';
`);
   
    console.log('✅ Base de données réinitialisée');

    // ============================================
    // 1. CRÉER LE SUPER ADMIN
    // ============================================
    console.log('👑 Création du Super Admin...');
    const superAdmin = await User.create({
      email: 'superadmin@platform.com',
      password: 'superadmin123',
      full_name: 'Super Administrateur',
      role: 'super_admin',
      organization_id: null,
      is_active: true,
      password_reset_required: false
    });
    console.log('✅ Super Admin créé: superadmin@platform.com / superadmin123');

    // ============================================
    // 2. CRÉER LES CATÉGORIES GLOBALES
    // ============================================
    console.log('📂 Création des catégories globales...');
    const categories = await Category.bulkCreate([
      { 
        name: 'Technique', 
        description: 'Problèmes techniques, bugs et erreurs système', 
        default_team: 'technique',
        color: '#E74C3C',
        organization_id: null
      },
      { 
        name: 'Facturation', 
        description: 'Questions de facturation, paiement et abonnement', 
        default_team: 'facturation',
        color: '#3498DB',
        organization_id: null
      },
      { 
        name: 'Compte', 
        description: 'Gestion du compte utilisateur, profil et paramètres', 
        default_team: 'support',
        color: '#2ECC71',
        organization_id: null
      },
      { 
        name: 'Autre', 
        description: 'Autres demandes et questions générales', 
        default_team: 'support',
        color: '#95A5A6',
        organization_id: null
      }
    ]);
    console.log('✅ 4 catégories globales créées');

    // ============================================
    // 3. ORGANISATION 1: MOHAMED AUTO
    // ============================================
    console.log('\n🏢 Création de l\'organisation "Mohamed Auto"...');
    const org1 = await Organization.create({
      name: 'Mohamed Auto',
      type: 'physique',
      email: 'contact@mohamedauto.com',
      phone: '+216 71 123 456',
      address: 'Avenue Habib Bourguiba, Tunis',
      is_active: true
    });

    const adminMohamed = await User.create({
      email: 'mohamed@mohamedauto.com',
      password: 'mohamed123',
      full_name: 'Mohamed Ben Ali',
      role: 'company_admin',
      organization_id: org1.id,
      created_by: superAdmin.id,
      phone: '+216 20 111 222',
      is_active: true,
      password_reset_required: false
    });

    await org1.update({ admin_user_id: adminMohamed.id });

    const employeesOrg1 = await User.bulkCreate(
  [
    {
      email: 'ali@mohamedauto.com',
      password: 'ali123',
      full_name: 'Ali Mécanicien',
      role: 'employee',
      organization_id: org1.id,
      created_by: adminMohamed.id,
      team: 'technique',
      phone: '+216 20 222 333',
      is_active: true,
      is_available: true,
      password_reset_required: true
    },
    {
      email: 'karim@mohamedauto.com',
      password: 'karim123',
      full_name: 'Karim Électricien',
      role: 'employee',
      organization_id: org1.id,
      created_by: adminMohamed.id,
      team: 'technique',
      phone: '+216 20 333 444',
      is_active: true,
      is_available: true,
      password_reset_required: true
    }
  ],
  {
    individualHooks: true
  }
);


    const clientsOrg1 = await User.bulkCreate([
      {
        email: 'ahmed.client@gmail.com',
        password: 'client123',
        full_name: 'Ahmed Client',
        role: 'client',
        organization_id: org1.id,
        created_by: adminMohamed.id,
        phone: '+216 20 555 666',
        is_active: true,
        password_reset_required: true
      }
    ]
    ,{ individualHooks: true });

    const suppliersOrg1 = await Supplier.bulkCreate([
      {
        name: 'Pièces Auto Plus',
        organization_id: org1.id,
        contact_name: 'Youssef Fournisseur',
        contact_email: 'youssef@piecesauto.tn',
        contact_phone: '+216 71 234 567',
        is_active: true
      }
    ]);

    await Ticket.bulkCreate([
      {
        subject: 'Problème de freins urgent',
        description: 'Les freins de ma voiture ne fonctionnent plus correctement.',
        status: 'open',
        priority: 'critical',
        organization_id: org1.id,
        category_id: categories[0].id,
        created_by: clientsOrg1[0].id,
        assigned_to: employeesOrg1[0].id,
        supplier_id: suppliersOrg1[0].id
      }
    ],{ individualHooks: true }
  );

    console.log('✅ Mohamed Auto créé');

    // ============================================
    // 4. ORGANISATION 2: TECHSERVICE
    // ============================================
    console.log('\n🏢 Création de l\'organisation "TechService SARL"...');
    const org2 = await Organization.create({
      name: 'TechService SARL',
      type: 'morale',
      email: 'info@techservice.tn',
      phone: '+216 71 987 654',
      is_active: true
    });

    const adminSarah = await User.create({
      email: 'sarah@techservice.tn',
      password: 'sarah123',
      full_name: 'Sarah Directrice',
      role: 'company_admin',
      organization_id: org2.id,
      created_by: superAdmin.id,
      is_active: true,
      password_reset_required: false
    });

    await org2.update({ admin_user_id: adminSarah.id });

    console.log('✅ TechService SARL créé');

    // ============================================
    // RÉSUMÉ
    // ============================================
    console.log('\n═══════════════════════════════════════════════════');
    console.log('✨ Base de données peuplée avec succès !');
    console.log('═══════════════════════════════════════════════════');
    console.log('\n📋 COMPTES CRÉÉS :');
    console.log('\n🌟 SUPER ADMIN:');
    console.log('   Email: superadmin@platform.com');
    console.log('   Password: superadmin123');
    console.log('\n🏢 ORGANISATION 1: Mohamed Auto');
    console.log('   👑 Admin: mohamed@mohamedauto.com / mohamed123');
    console.log('   👨‍💼 Employés: ali@mohamedauto.com / ali123');
    console.log('   👥 Client: ahmed.client@gmail.com / client123');
    console.log('\n🏢 ORGANISATION 2: TechService SARL');
    console.log('   👑 Admin: sarah@techservice.tn / sarah123');
    console.log('\n═══════════════════════════════════════════════════');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    console.error('Message:', error.message);
    process.exit(1);
  }
};

seedDatabase();