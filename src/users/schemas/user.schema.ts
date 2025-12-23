
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Role } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';

export type UserDocument = User & Document;

/**
 * Schéma MongoDB optimisé pour les utilisateurs
 */
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, trim: true, index: true })
  username: string;

  @Prop({ required: true, enum: ['male', 'female', 'other'] })
  gender: string;

  @Prop({ required: true })
  country: string;

  @Prop({ required: true })
  phone: string;
  
  @Prop({ type: Object })
  carteDuCiel?: any;

  @Prop({ trim: true })
  nom?: string; // Nom de famille

  @Prop({ trim: true })
  prenoms?: string; // Prénoms

  @Prop({ trim: true })
  genre?: string; // Genre (Homme/Femme/Autre)

  @Prop({ type: Date })
  dateNaissance?: Date;

  @Prop({ trim: true })
  paysNaissance?: string;

  @Prop({ trim: true })
  villeNaissance?: string;

  @Prop({ trim: true })
  heureNaissance?: string;

  @Prop({
    required: true,
    unique: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({
    type: String,
    enum: Role,
    default: Role.USER,
  })
  role?: Role;

  @Prop({
    type: [String],
    enum: Permission,
    default: [],
  })
  customPermissions?: Permission[];

  @Prop()
  dateOfBirth?: Date;

  @Prop()
  address?: string;

  @Prop()
  city?: string;

  @Prop()
  profilePicture?: string;

  @Prop({ default: true })
  isActive?: boolean;

    @Prop({ default: false })
  premium?: boolean;

  @Prop({ default: false })
  emailVerified?: boolean;

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  resetPasswordToken?: string;

  @Prop()
  resetPasswordExpires?: Date;

  @Prop()
  lastLogin?: Date;

  @Prop({
    type: {
      language: { type: String, default: 'fr' },
      notifications: { type: Boolean, default: true },
      newsletter: { type: Boolean, default: false },
    },
    default: {},
  })
  preferences?: {
    language?: string;
    notifications?: boolean;
    newsletter?: boolean;
  };

  // Métadonnées consultant
  @Prop({ type: [String], default: [] })
  specialties?: string[];

  @Prop()
  bio?: string;

  @Prop({ default: 0, min: 0, max: 5 })
  rating?: number;

  @Prop({ default: 0, min: 0 })
  totalConsultations?: number;

  @Prop({ default: 0, min: 0 })
  credits?: number;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes supplémentaires pour optimiser les requêtes fréquentes
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ emailVerified: 1 });
UserSchema.index({ specialties: 1 });
UserSchema.index({ rating: -1 });
