import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OfferingItemDto {
  @IsString()
  offeringId: string; // _id de l'offrande

  @IsNumber()
  quantity: number;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  unitPrice?: number;

  @IsNumber()
  @IsOptional()
  totalPrice?: number;
}

export class CreateWalletTransactionDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @IsString()
  @IsNotEmpty()
  paymentToken: string;

  @IsEnum(['pending', 'completed', 'failed', 'cancelled'])
  status: 'pending' | 'completed' | 'failed' | 'cancelled';

  @IsNumber()
  totalAmount: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfferingItemDto)
  items: OfferingItemDto[];

  @IsString()
  paymentMethod: string;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsOptional()
  completedAt?: Date;
}
