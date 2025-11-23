import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Configuration CORS
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:3000');
  app.enableCors({
    origin: corsOrigins.split(','),
    credentials: true,
  });

  // Sécurité avec Helmet
  app.use(helmet());

  // Validation globale des DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Retire les propriétés non définies dans les DTOs
      forbidNonWhitelisted: true, // Lance une erreur si propriété inconnue
      transform: true, // Transforme les objets en instances de classe
      transformOptions: {
        enableImplicitConversion: true, // Conversion automatique des types
      },
    }),
  );

  // Préfixe global de l'API
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // Swagger configuration
  if (process.env.NODE_ENV !== 'production') {
    const { SwaggerModule, DocumentBuilder } = await import('@nestjs/swagger');
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Mon Étoile API')
      .setDescription('Documentation de l’API Mon Étoile')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api-docs', app, document);
    console.log(`📖 Swagger docs: http://localhost:${configService.get<number>('PORT', 3001)}/api-docs`);
  }

  // Port d'écoute
  const port = configService.get<number>('PORT', 3001);

  await app.listen(port);

  const swaggerUrl = `http://localhost:${port}/api-docs`;

  console.log('');
  console.log('========================================');
  console.log('🌟 MON ÉTOILE - BACKEND API');
  console.log('========================================');
  console.log(`✅ Server running on: http://localhost:${port}`);
  console.log(`📡 API Base URL: http://localhost:${port}/${apiPrefix}`);
  console.log(`📖 Swagger docs: ${swaggerUrl}`);
  console.log(`🌍 Environment: ${configService.get<string>('NODE_ENV', 'development')}`);
  console.log(`🔒 CORS Origins: ${corsOrigins}`);
  console.log('========================================');
  console.log('');
}

bootstrap();
