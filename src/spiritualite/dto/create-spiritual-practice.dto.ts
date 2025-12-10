import { IsString, IsBoolean, IsNumber, IsArray, IsOptional } from 'class-validator';

export class CreateSpiritualPracticeDto {
  @IsString()
  id: string;

  @IsString()
  slug: string;

  @IsString()
  title: string;

  @IsString()
  iconName: string;

  @IsString()
  category: string;

  @IsBoolean()
  @IsOptional()
  published?: boolean;

  @IsNumber()
  order: number;

  @IsString()
  description: string;

  @IsString()
  introduction: string;

  @IsArray()
  @IsString({ each: true })
  keyElements: string[];

  @IsString()
  detailedGuide: string;

  @IsArray()
  @IsString({ each: true })
  benefits: string[];

  @IsArray()
  @IsString({ each: true })
  practicalSteps: string[];

  @IsArray()
  @IsString({ each: true })
  warnings: string[];

  @IsString()
  affirmation: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  materials?: string[];

  @IsString()
  @IsOptional()
  bestTiming?: string;
}
