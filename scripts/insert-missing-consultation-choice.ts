import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ConsultationChoice, ConsultationChoiceSchema } from '../src/consultations/schemas/consultation-choice.schema';
import { Connection } from 'mongoose';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const connection = app.get(Connection);
  const ConsultationChoiceModel = connection.model('ConsultationChoice', ConsultationChoiceSchema);

  // Exemple d'insertion d'un choix manquant
  const missingChoiceId = '694d32075b9d9dfa00bed232';
  const exists = await ConsultationChoiceModel.findById(missingChoiceId);
  if (!exists) {
    await ConsultationChoiceModel.create({
      _id: missingChoiceId,
      title: 'ORIENTATION DE CARRIÈRE',
      description: 'Description à compléter',
      frequence: 'LIBRE',
      participants: 'SOLO',
      offering: {},
    });
    console.log('ConsultationChoice inséré avec _id', missingChoiceId);
  } else {
    console.log('ConsultationChoice déjà présent');
  }
  await app.close();
}

run().catch(console.error);
