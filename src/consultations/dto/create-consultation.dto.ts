
import { Type } from 'class-transformer';
import {
  IsString,
  IsEnum,
  IsObject,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  MaxLength,
  IsArray,
} from 'class-validator';
import { ConsultationType } from '../../common/enums/consultation-status.enum';


export class OfferingAlternativeDto {
  @IsString()
  offeringId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class RequiredOfferingDto {
  @IsString()
  type: 'animal' | 'vegetal' | 'boisson';

  @IsArray()
  alternatives: OfferingAlternativeDto[];

  @IsString()
  selectedAlternative: 'animal' | 'vegetal' | 'boisson';
}

export class RequiredOfferingDetailDto {
  @IsString()
  _id: string;

  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  icon: string;

  @IsString()
  category: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateConsultationDto {
  /**
   * AVERTISSEMENT : L'analyse spirituelle, astrologique et numérologique sera réalisée uniquement à partir des informations que vous fournissez dans ce formulaire. Vous pouvez demander une consultation pour un tiers.
   */
  @IsString()
  serviceId: string;

    @IsOptional()
  visible?: boolean;

  @IsEnum(ConsultationType)
  type: ConsultationType;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(2000)
  description: string;

  @IsObject()
  @IsOptional()
  formData?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: Date;
    question?: string;
    [key: string]: any;
  };

  @IsDateString()
  @IsOptional()
  scheduledDate?: Date;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;



  @IsObject()
  @IsOptional()
  requiredOffering?: RequiredOfferingDto;

  @IsArray()
  @Type(() => OfferingAlternativeDto)
  @IsOptional()
  alternatives?: OfferingAlternativeDto[];

  @IsArray()
  @IsOptional()
  requiredOfferingsDetails?: RequiredOfferingDetailDto[];
}