import { IsString, IsBoolean, IsOptional, IsObject, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PromptSectionDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  guidelines?: string[];
}

export class PromptStructureDto {
  @IsOptional()
  @IsString()
  introduction?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromptSectionDto)
  sections: PromptSectionDto[];

  get hasAtLeastOneSection(): boolean {
    return Array.isArray(this.sections) && this.sections.length > 0;
  }

  @IsOptional()
  @IsString()
  synthesis?: string;

  @IsOptional()
  @IsString()
  conclusion?: string;
}

export class CreatePromptDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  role: string;

  @IsString()
  objective: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  styleAndTone?: string[];

  @ValidateNested()
  @Type(() => PromptStructureDto)
  structure: PromptStructureDto;

  @IsOptional()
  @IsObject()
  variables?: { [key: string]: string };

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsString()
  choiceId: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
