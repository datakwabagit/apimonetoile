import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SpiritualiteController } from './spiritualite.controller';
import { SpiritualiteService } from './spiritualite.service';
import { SpiritualPractice, SpiritualPracticeSchema } from './schemas/spiritual-practice.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: SpiritualPractice.name,
        schema: SpiritualPracticeSchema,
      },
    ]),
  ],
  controllers: [SpiritualiteController],
  providers: [SpiritualiteService],
  exports: [SpiritualiteService],
})
export class SpiritualiteModule {}
