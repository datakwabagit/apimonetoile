import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WalletTransactionDocument = WalletTransaction & Document;

@Schema({ timestamps: true })
export class OfferingItem {
  @Prop({ required: true, type: 'objectId', ref: 'Offering' })
  offeringId: string; // _id de l'offrande

  @Prop({ required: true })
  quantity: number;
}

export const OfferingItemSchema = SchemaFactory.createForClass(OfferingItem);

@Schema({ timestamps: true })
export class WalletTransaction {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, unique: true })
  transactionId: string;

  @Prop({ required: true })
  paymentToken: string;

  @Prop({ required: true, enum: ['pending', 'completed', 'failed', 'cancelled'] })
  status: string;

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ type: [OfferingItemSchema], default: [] })
  items: OfferingItem[];

  @Prop({ required: true })
  paymentMethod: string;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop()
  completedAt?: Date;
}

export const WalletTransactionSchema = SchemaFactory.createForClass(WalletTransaction);
