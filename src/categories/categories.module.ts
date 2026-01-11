import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { Categorie, CategorieSchema } from './categorie.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Categorie.name, schema: CategorieSchema }])],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}