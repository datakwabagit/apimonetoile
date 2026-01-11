import { IsObject, IsEnum, IsOptional } from 'class-validator';

export enum AnalysisStatus {
  COMPLETED = 'completed',
  ERROR = 'error',
}

export class SaveAnalysisDto {
  @IsObject()
  analyse: any;

  @IsEnum(AnalysisStatus)
  statut: AnalysisStatus;

  @IsOptional()
  @IsObject()
  metadata?: any;
}