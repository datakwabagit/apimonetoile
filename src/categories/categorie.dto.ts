import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateCategorieDto {
  @IsString()
  nom: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  rubriques?: string[]; // Array of Rubrique IDs
}

export class UpdateCategorieDto {
  @IsString()
  @IsOptional()
  nom?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  rubriques?: string[];
}
