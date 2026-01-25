import { PartialType } from '@nestjs/mapped-types';
import { CreateConsultationDto, RequiredOfferingDto } from './create-consultation.dto';
import { IsEnum, IsOptional, IsString, IsObject, IsNumber, Max, Min } from 'class-validator';
import { ConsultationStatus, ConsultationType } from '../../common/enums/consultation-status.enum';

export class UpdateConsultationDto extends PartialType(CreateConsultationDto) {
  @IsString()
  @IsOptional()
  rubriqueId?: string; // Permet de modifier la rubrique liée

  @IsOptional()
  analysisNotified?: boolean;

  @IsOptional()
  @IsString()
  result?: string;

  @IsOptional()
  @IsObject()
  resultData?: {
    horoscope?: any;
    numerology?: any;
    astrology?: any;
    [key: string]: any;
  };
}