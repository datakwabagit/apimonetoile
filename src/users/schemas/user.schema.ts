import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';

export type UserDocument = User & Document;

/**
 * Schéma MongoDB pour les utilisateurs
 */
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ type: String, enum: Role, default: Role.USER })
  role: Role;

  @Prop({ type: [String], enum: Permission, default: [] })
  customPermissions: Permission[];

  @Prop({ default: '0758385387' })
  phoneNumber: string;

  @Prop({ default: () => new Date() })
  dateOfBirth: Date;

  @Prop({ default: null })
  address: string;

  @Prop({ default: null })
  city: string;

  @Prop({ default: null })
  country: string;

  @Prop({ default: null })
  profilePicture: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ default: null })
  emailVerificationToken: string;

  @Prop({ default: null })
  resetPasswordToken: string;

  @Prop({ default: null })
  resetPasswordExpires: Date;

  @Prop({ default: null })
  lastLogin: Date;

  @Prop({ type: Object, default: {} })
  preferences: {
    language?: string;
    notifications?: boolean;
    newsletter?: boolean;
  };

  // Métadonnées pour les consultants
  @Prop({ default: null })
  specialties: string[]; // Spécialités du consultant

  @Prop({ default: null })
  bio: string; // Biographie du consultant

  @Prop({ default: 0 })
  rating: number; // Note moyenne (0-5)

  @Prop({ default: 0 })
  totalConsultations: number; // Nombre total de consultations effectuées
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes pour optimiser les recherches
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });
