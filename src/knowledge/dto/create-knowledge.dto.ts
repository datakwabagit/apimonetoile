import { IsString, IsEnum, IsOptional, IsArray, IsBoolean, MinLength, MaxLength } from 'class-validator';
import { KnowledgeCategory } from '../schemas/knowledge.schema';

export class CreateKnowledgeDto {
  @IsString()
  @MinLength(5, { message: 'Le titre doit contenir au moins 5 caractères' })
  @MaxLength(200, { message: 'Le titre ne peut pas dépasser 200 caractères' })
  title: string;

  @IsString()
  @MinLength(20, { message: 'Le contenu doit contenir au moins 20 caractères' })
  content: string;

  @IsEnum(KnowledgeCategory, { message: 'Catégorie invalide' })
  category: KnowledgeCategory;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
