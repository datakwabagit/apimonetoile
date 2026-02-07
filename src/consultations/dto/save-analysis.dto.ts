import { IsObject, IsEnum, IsOptional, IsString } from 'class-validator';

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
  @IsString()
  choiceId?: string;

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

  @IsOptional()
  prompt?: string;

  @IsOptional()
  dateGeneration?: Date;
}