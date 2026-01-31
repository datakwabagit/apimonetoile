import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { ServicesModule } from './services/services.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MoneyfusionModule } from './moneyfusion/moneyfusion.module';
import { SiteMetricsModule } from './common/site-metrics.module';
import { AdminModule } from './admin/admin.module';

import { BooksModule } from './books/books.module';
import { SpiritualiteModule } from './spiritualite/spiritualite.module';
import { ConfigModule as CustomConfigModule } from './config/config.module';

// import { AnalysisModule } from './analysis/analysis.module';
import { WalletModule } from './wallet/wallet.module';
import { OfferingsModule } from './offerings/offerings.module';
import { OfferingStockModule } from './offerings/offering-stock.module';

import { RubriqueModule } from './rubriques/rubrique.module';
import { CategoriesModule } from './categories/categories.module';

@Module({
  imports: [
    // Configuration globale
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        retryAttempts: 3,
        retryDelay: 1000,
      }),
      inject: [ConfigService],
    }),

    // Rate Limiting (protection contre les attaques)
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('THROTTLE_TTL', 60),
            limit: configService.get<number>('THROTTLE_LIMIT', 10),
          },
        ],
      }),
      inject: [ConfigService],
    }),

    // Modules de l'application
          AuthModule,
          UsersModule,
          ConsultationsModule,
          ServicesModule,
          PaymentsModule,
          NotificationsModule,
          KnowledgeModule,
          MoneyfusionModule,
          SiteMetricsModule,
          AdminModule,
          BooksModule,
          SpiritualiteModule,
          // AnalysisModule,
          WalletModule,
          OfferingsModule,
          OfferingStockModule,
          RubriqueModule,
            CategoriesModule,
            CustomConfigModule,
          ],
          providers: [
    AppService,
    // Appliquer le rate limiting globalement
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
