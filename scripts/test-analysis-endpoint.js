/**
 * Script de test pour l'endpoint d'analyse
 * Usage: node scripts/test-analysis-endpoint.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function testAnalysisEndpoint() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.DATABASE_URL || process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Accès direct à la collection
    const db = mongoose.connection.db;
    const consultationsCollection = db.collection('consultations');

    // Chercher une consultation existante
    const consultations = await consultationsCollection.find({}).limit(10).sort({ createdAt: -1 }).toArray();

    if (!consultations || consultations.length === 0) {
      console.log('❌ Aucune consultation trouvée dans la base de données');
      console.log('💡 Créez d\'abord une consultation via l\'interface');
      process.exit(0);
    }

    console.log(`\n📋 ${consultations.length} consultation(s) trouvée(s):\n`);
    
    consultations.forEach((consultation, index) => {
      console.log(`${index + 1}. ID: ${consultation._id}`);
      console.log(`   Title: ${consultation.title || 'N/A'}`);
      console.log(`   Type: ${consultation.type || 'N/A'}`);
      console.log(`   Status: ${consultation.status || 'N/A'}`);
      console.log(`   Has Analysis: ${consultation.resultData?.analyse || consultation.resultData?.horoscope || consultation.resultData?.numerology ? '✅ OUI' : '❌ NON'}`);
      console.log('');
    });

    const consultation = consultations[0];

    if (!consultation) {
      console.log('❌ Aucune consultation trouvée dans la base de données');
      console.log('💡 Créez d\'abord une consultation via l\'interface');
      process.exit(0);
    }

    console.log('\n📋 Consultation trouvée:');
    console.log(`   ID: ${consultation._id}`);
    console.log(`   Title: ${consultation.title}`);
    console.log(`   Type: ${consultation.type}`);
    console.log(`   Status: ${consultation.status}`);
    console.log(`   Has resultData: ${!!consultation.resultData}`);

    if (consultation.resultData) {
      console.log(`   Has analyse: ${!!consultation.resultData.analyse}`);
      console.log(`   Has horoscope: ${!!consultation.resultData.horoscope}`);
      console.log(`   Has numerology: ${!!consultation.resultData.numerology}`);
    }

    console.log('\n🔗 Testez l\'endpoint avec:');
    console.log(`   GET http://localhost:3001/api/v1/consultations/analysis/${consultation._id}`);
    console.log('\n📝 Ou avec curl:');
    console.log(`   curl http://localhost:3001/api/v1/consultations/analysis/${consultation._id}`);

    // Si la consultation n'a pas d'analyse, proposer de générer
    if (!consultation.resultData?.analyse && !consultation.resultData?.horoscope) {
      console.log('\n⚠️  Cette consultation n\'a pas encore d\'analyse générée');
      console.log('💡 Générez-la d\'abord avec:');
      console.log(`   POST http://localhost:3001/api/v1/consultations/${consultation._id}/generate-analysis`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Test terminé');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

testAnalysisEndpoint();
