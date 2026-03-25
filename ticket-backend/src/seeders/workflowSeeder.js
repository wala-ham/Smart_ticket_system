'use strict';

require('dotenv').config();
const sequelize = require('../models/index');

// 1. Pour ces deux-là, on doit passer l'instance sequelize car ce sont des fonctions
const WorkflowTemplate = require('../models/WorkflowTemplate')(sequelize);
const WorkflowTemplateStep = require('../models/WorkflowTemplateStep')(sequelize);

// 2. Pour ces deux-là, ils sont déjà instanciés dans leurs fichiers respectifs
const Category = require('../models/Category');
const Organization = require('../models/Organization');

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to Database.');

        // Récupère la première organisation
        const org = await Organization.findOne({ order: [['id', 'ASC']] });
        if (!org) {
            console.error('❌ No organization found. Please create one in the DB first.');
            return;
        }

        // Récupère les catégories et crée un mapping
        const categories = await Category.findAll();
        const catMap = {};
        categories.forEach(c => { 
            catMap[c.name.toLowerCase()] = c.id; 
        });

        console.log(`Using Org: ${org.name}`);

        // --- Template 1 : Bug / Technique ---
        // On adapte les clés pour correspondre à tes logs ('technique')
        const [bugTemplate] = await WorkflowTemplate.findOrCreate({
            where: { name: 'Bug Fix Circuit', organization_id: org.id },
            defaults: {
                category_id: catMap['technique'] ?? catMap['technical issue'] ?? null,
                organization_id: org.id,
                context: 'supplier',
                is_active: true,
            },
        });

        await WorkflowTemplateStep.destroy({ where: { template_id: bugTemplate.id } });
        await WorkflowTemplateStep.bulkCreate([
            { template_id: bugTemplate.id, step_order: 1, label: 'Analyse Technique', role: 'company_admin', assignment_type: 'OR' },
            { template_id: bugTemplate.id, step_order: 2, label: 'Correction Developer', role: 'employee', assignment_type: 'OR' },
            { template_id: bugTemplate.id, step_order: 3, label: 'Validation Finale', role: 'company_admin', assignment_type: 'OR' },
        ]);
        console.log('✅ Created: Bug Fix Circuit');

        // --- Template 2 : Facturation ---
        const [billingTemplate] = await WorkflowTemplate.findOrCreate({
            where: { name: 'Circuit Facturation', organization_id: org.id },
            defaults: {
                category_id: catMap['facturation'] ?? null,
                organization_id: org.id,
                context: 'client',
                is_active: true,
            },
        });

        await WorkflowTemplateStep.destroy({ where: { template_id: billingTemplate.id } });
        await WorkflowTemplateStep.bulkCreate([
            { template_id: billingTemplate.id, step_order: 1, label: 'Vérification Comptable', role: 'employee', assignment_type: 'OR' },
            { template_id: billingTemplate.id, step_order: 2, label: 'Approbation Admin', role: 'company_admin', assignment_type: 'OR' },
        ]);
        console.log('✅ Created: Billing Circuit');

        console.log('🚀 Seed completed successfully!');
    } catch (error) {
        console.error('❌ Seed error:', error);
    } finally {
        await sequelize.close();
    }
}

seed();