import { IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class ConsultationOfferingDto {
  @IsString()
  category: 'animal' | 'vegetal' | 'beverage';

  @IsString()
  offeringId: string;

  @IsOptional()
  quantity?: number = 1;
}

class ConsultationChoiceDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  frequence?: 'UNE_FOIS_VIE' | 'ANNUELLE' | 'MENSUELLE' | 'QUOTIDIENNE' | 'LIBRE';

  @IsString()
  @IsOptional()
  participants?: 'SOLO' | 'AVEC_TIERS' | 'GROUPE' | 'POUR_TIERS';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsultationOfferingDto)
  offering: {
    alternatives: ConsultationOfferingDto[];
  };
}

export class RubriqueDto {
  @IsString()
  titre: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  typeconsultation?: string;

  @IsOptional()
  @IsString()
  categorie?: string = 'GENERAL';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsultationChoiceDto)
  consultationChoices: ConsultationChoiceDto[];
}
