import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateBookDto {
  @IsString()
  bookId: string;

  @IsString()
  title: string;

  @IsString()
  subtitle: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(1)
  pages: number;

  @IsString()
  category: string;

  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsString()
  coverImage: string;

  @IsString()
  pdfFileName: string;
}