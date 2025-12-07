import { IsObject, IsEnum, IsOptional } from 'class-validator';

export enum AnalysisStatus {
  COMPLETED = 'completed',
  ERROR = 'error',
}

export class SaveAnalysisDto {
  @IsObject()
  analyse: any; // Objet AnalyseAstrologique complet

  @IsEnum(AnalysisStatus)
  statut: AnalysisStatus;

  @IsOptional()
  @IsObject()
  metadata?: any; // Métadonnées additionnelles si nécessaire
}
