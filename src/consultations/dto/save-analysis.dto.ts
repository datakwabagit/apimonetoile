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
  consultationID?: string;

  @IsOptional()
  texte?: string;

  @IsOptional()
  clientId?: string;

  @IsOptional()
  type?: string;

  @IsOptional()
  status?: string;

  @IsOptional()
  title?: string;

  @IsOptional()
  completedDate?: Date;

  @IsOptional()
  metadata?: any;
}