import { IsString, IsNumber, IsOptional } from 'class-validator';

export class PurchaseBookDto {
  @IsString()
  bookId: string; // ID du livre (ex: 'secrets-ancestraux')

  @IsString()
  paymentId: string; // ID du paiement MongoDB

  @IsString()
  customerName: string;

  @IsString()
  customerPhone: string;

  @IsString()
  @IsOptional()
  customerEmail?: string;

  @IsNumber()
  price: number;
}
