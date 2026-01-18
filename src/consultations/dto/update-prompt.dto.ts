import { IsString, IsBoolean, IsOptional, IsObject, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PromptStructureDto } from './create-prompt.dto';

export class UpdatePromptDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  styleAndTone?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PromptStructureDto)
  structure?: PromptStructureDto;

  @IsOptional()
  @IsObject()
  variables?: { [key: string]: string };

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
