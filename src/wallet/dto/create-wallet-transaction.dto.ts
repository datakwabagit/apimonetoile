import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OfferingItemDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  icon: string;

  @IsString()
  category: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;

  @IsNumber()
  totalPrice: number;
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
