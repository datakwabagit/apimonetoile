import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Rubrique, RubriqueSchema } from './rubrique.schema';
import { RubriqueService } from './rubrique.service';
import { RubriqueController } from './rubrique.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Rubrique.name, schema: RubriqueSchema }])],
  providers: [RubriqueService],
  controllers: [RubriqueController],
  exports: [RubriqueService],
})
export class RubriqueModule {}
