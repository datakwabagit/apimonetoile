import { IsString, IsOptional, IsArray, IsBoolean, IsObject } from 'class-validator';

export class CreateAnalysisTemplateDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: {
    requiredFields?: string[];
    estimatedReadTime?: number;
    difficulty?: 'easy' | 'medium' | 'advanced';
    [key: string]: any;
  };
}

export class UpdateAnalysisTemplateDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: {
    requiredFields?: string[];
    estimatedReadTime?: number;
    difficulty?: 'easy' | 'medium' | 'advanced';
    [key: string]: any;
  };
}

export class GenerateAnalysisDto {
  @IsString()
  templateId: string;

  @IsOptional()
  @IsObject()
  astrologicalData?: {
    birthDate?: string;
    birthTime?: string;
    birthPlace?: string;
    planets?: any;
    houses?: any;
    aspects?: any;
    asteroids?: any;
    [key: string]: any;
  };

  @IsOptional()
  @IsString()
  userName?: string;

  @IsOptional()
  @IsString()
  customPromptAddition?: string;
}
