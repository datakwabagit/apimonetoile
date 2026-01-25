import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    rawBody: true,
  });

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: [
      'https://www.monetoile.org',
      'https://monetoile.org',
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Augmenter le timeout global pour les requêtes longues (génération AI)
  const server = await app.listen(process.env.PORT || 3000);
  server.setTimeout(180000); // 3 minutes

  // Log mémoire toutes les 60s pour diagnostic Render
  // setInterval(() => {
  //   const used = process.memoryUsage();
  //   console.log('[MEMORY]', {
  //     rss: Math.round(used.rss / 1024 / 1024) + 'MB',
  //     heapTotal: Math.round(used.heapTotal / 1024 / 1024) + 'MB',
  //     heapUsed: Math.round(used.heapUsed / 1024 / 1024) + 'MB',
  //     external: Math.round(used.external / 1024 / 1024) + 'MB',
  //   });
  // }, 60000);

  console.log(`🚀 Application démarrée sur le port ${process.env.PORT || 3000}`);
}
bootstrap();
