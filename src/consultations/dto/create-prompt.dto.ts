import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreatePromptDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
