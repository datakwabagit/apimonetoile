import { PartialType } from '@nestjs/mapped-types';
import { CreateConsultationDto, RequiredOfferingDto } from './create-consultation.dto';
import { IsEnum, IsOptional, IsString, IsObject, IsNumber, Max, Min } from 'class-validator';
import { ConsultationStatus, ConsultationType } from '../../common/enums/consultation-status.enum';

export class UpdateConsultationDto extends PartialType(CreateConsultationDto) {
  @IsEnum(ConsultationStatus)
  @IsOptional()
  status?: ConsultationStatus;

  @IsString()
  @IsOptional()
  consultantId?: string;

  @IsObject()
  @IsOptional()
  requiredOffering?: RequiredOfferingDto;

  @IsString()
  @IsOptional()
  result?: string;

  @IsObject()
  @IsOptional()
  resultData?: any;

  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsString()
  @IsOptional()
  review?: string;

  @IsString()
  @IsOptional()
  type?: ConsultationType;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  analysisNotified?: boolean;
  
  @IsObject()
  @IsOptional()
  tierce?: any;
}