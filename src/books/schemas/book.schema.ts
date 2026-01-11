import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BookDocument = Book & Document;

@Schema({ timestamps: true })
export class Book {
  @Prop({ required: true, unique: true })
  bookId: string; // ID unique du livre (ex: 'secrets-ancestraux')

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  subtitle: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  price: number; // Prix en FCFA

  @Prop({ required: true })
  pages: number;

  @Prop({ required: true })
  category: string;

  @Prop({ default: 0, min: 0, max: 5 })
  rating: number;

  @Prop({ required: true })
  coverImage: string; // URL de la couverture

  @Prop({ required: true })
  pdfFileName: string; // Nom du fichier PDF dans /public/books/pdf/

  @Prop({ default: true })
  isAvailable: boolean; // Disponible à la vente

  @Prop({ default: 0 })
  downloadCount: number; // Nombre de téléchargements

  @Prop({ default: 0 })
  purchaseCount: number; // Nombre d'achats
}

export const BookSchema = SchemaFactory.createForClass(Book);

// Index pour recherche rapide
BookSchema.index({ category: 1 });
BookSchema.index({ isAvailable: 1 });