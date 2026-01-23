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

class ConsultationOfferingWrapperDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsultationOfferingDto)
  alternatives: ConsultationOfferingDto[];
}

class ConsultationChoiceDto {
  @IsOptional()
  order?: number;
  @IsOptional()
  @IsString()
  promptId?: string;

  @IsOptional()
  @IsString()
  choiceId?: string;

  @IsOptional()
  @IsString()
  choiceTitle?: string;

  @IsOptional()
  @IsString()
  buttonStatus?: string;

  @IsOptional()
  hasActiveConsultation?: boolean;

  @IsOptional()
  @IsString()
  consultationId?: string | null;

  @IsOptional()
  consultationCount?: number;

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

  @ValidateNested()
  @Type(() => ConsultationOfferingWrapperDto)
  offering: ConsultationOfferingWrapperDto;
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
  consultationChoices: ConsultationChoiceDto[];
}
