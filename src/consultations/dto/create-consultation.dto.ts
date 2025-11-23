import {
  IsString,
  IsEnum,
  IsObject,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  MaxLength,
} from 'class-validator';
import { ConsultationType } from '../../common/enums/consultation-status.enum';

export class CreateConsultationDto {
  @IsString()
  serviceId: string;

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
}
