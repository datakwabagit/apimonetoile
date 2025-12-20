import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ConsumeOfferingDto {
  @IsString()
  offeringId: string;

  @IsNotEmpty()
  quantity: number;
}

export class ConsumeOfferingsDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsNotEmpty()
  consultationId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsumeOfferingDto)
  offerings: ConsumeOfferingDto[];
}
