import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    rawBody: true,
  });

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: ['https://www.monetoile.org', 'https://monetoile.org', 'http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Augmenter le timeout global pour les requêtes longues (génération AI)
  const server = await app.listen(process.env.PORT || 3000);
  server.setTimeout(180000); // 3 minutes

  console.log(`🚀 Application démarrée sur le port ${process.env.PORT || 3000}`);
  console.log(`⏱️  Timeout serveur: 180 secondes`);
}
bootstrap();
