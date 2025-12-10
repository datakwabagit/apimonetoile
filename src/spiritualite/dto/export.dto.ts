import { IsEnum } from 'class-validator';

export enum ExportFormat {
  JSON = 'json',
  SQL = 'sql',
  SCHEMA = 'schema',
}

export class ExportSpiritualityDto {
  @IsEnum(ExportFormat)
  format: ExportFormat;
}
