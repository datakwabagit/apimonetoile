import {
  IsString,
  IsEnum,
  MinLength,
  MaxLength,
  IsOptional,
  IsArray,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Role } from '../../common/enums/role.enum';
import { Permission } from '../../common/enums/permission.enum';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username: string;

  @IsString()
  gender: string;  

  @IsString()
  country: string;

  @IsString()
  phone?: string;
  @IsString()
  phoneNumber?: string;
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  @IsOptional()
  firstName?: string;

  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  @IsOptional()
  lastName?: string;

  // L'email sera généré automatiquement à partir du username côté service
  email?: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsEnum(Role, { message: 'Invalid role' })
  @IsOptional()
  role?: Role;

  @IsArray()
  @IsEnum(Permission, { each: true })
  @IsOptional()
  customPermissions?: Permission[];

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  profilePicture?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specialties?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(500)
  bio?: string;
}
