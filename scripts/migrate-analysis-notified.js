/**
 * Script de migration pour initialiser le champ analysisNotified
 * dans les consultations existantes
 * 
 * Usage: node scripts/migrate-analysis-notified.js
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/monetoile';

async function migrateAnalysisNotified() {
  const client = new MongoClient(MONGO_URI);

  try {
    console.log('🔌 Connexion à MongoDB...');
    await client.connect();
    console.log('✅ Connecté\n');

    const db = client.db();
    const consultations = db.collection('consultations');

    // 1. Compter les consultations sans le champ analysisNotified
    const withoutField = await consultations.countDocuments({
      analysisNotified: { $exists: false }
    });

    console.log(`📊 Consultations sans analysisNotified: ${withoutField}`);

    if (withoutField === 0) {
      console.log('✅ Toutes les consultations ont déjà le champ analysisNotified');
      return;
    }

    // 2. Initialiser à false pour toutes les consultations sans le champ
    console.log('\n🔄 Initialisation du champ analysisNotified à false...');
    const initResult = await consultations.updateMany(
      { analysisNotified: { $exists: false } },
      { $set: { analysisNotified: false } }
    );
    console.log(`✅ ${initResult.modifiedCount} consultations initialisées`);

    // 3. Mettre à true pour celles qui ont déjà un résultat
    console.log('\n🔄 Mise à jour des consultations avec résultat existant...');
    const updateResult = await consultations.updateMany(
      {
        result: { $exists: true, $ne: null, $ne: '' },
        analysisNotified: false
      },
      { $set: { analysisNotified: true } }
    );
    console.log(`✅ ${updateResult.modifiedCount} consultations marquées comme notifiées`);

    // 4. Statistiques finales
    console.log('\n📊 Statistiques finales:');
    const notNotified = await consultations.countDocuments({
      analysisNotified: false
    });
    const notified = await consultations.countDocuments({
      analysisNotified: true
    });
    const total = await consultations.countDocuments({});

    console.log(`   Total consultations: ${total}`);
    console.log(`   ❌ Non notifiées: ${notNotified}`);
    console.log(`   ✅ Notifiées: ${notified}`);

    console.log('\n✅ Migration terminée avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Connexion fermée');
  }
}

// Exécuter la migration
migrateAnalysisNotified();
