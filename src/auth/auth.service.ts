import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from '../users/schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '../common/enums/role.enum';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
 
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  /**
   * Inscription d'un nouvel utilisateur
   */
  async register(registerDto: RegisterDto) {
    const { username, gender, country, phone, password, ...optionals } = registerDto;
    const email = `${username}@monetoile.org`;

    // Vérifier si le username ou l'email existe déjà
    const existingUser = await this.userModel.findOne({ $or: [{ email }, { username }] }).exec();
    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    // Mapper le genre français vers anglais
    let mappedGender = gender;
    if (gender === 'Homme') mappedGender = 'male';
    else mappedGender = 'female';

    // Hasher le password
    const saltRounds = this.configService.get<number>('BCRYPT_ROUNDS', 10);
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Créer l'utilisateur avec tous les champs reçus
    const user = new this.userModel({
      ...optionals,
      username,
      gender: mappedGender,
      country,
      phone,
      email,
      password: hashedPassword,
      role: Role.USER, // Par défaut USER
      isActive: true,
    });

    await user.save();

    // Générer les tokens
    const tokens = await this.generateTokens(user);

    // Retourner l'utilisateur sans le password
    const userObject = user.toObject();
    delete userObject.password;

    return {
      user: userObject,
      ...tokens,
    };
  }

  /**
   * Connexion d'un utilisateur
   */
  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    // Valider les credentials
    const user = await this.validateUser(username, password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Mettre à jour lastLogin
    await this.userModel.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    // Générer les tokens
    const tokens = await this.generateTokens(user);

    // Retourner l'utilisateur sans le password
    const userObject = user.toObject();
    delete userObject.password;

    return {
      user: userObject,
      ...tokens,
    };
  }



  /**
   * Valider les credentials d'un utilisateur
   * Utilisé par LocalStrategy
   */
  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.userModel.findOne({ username }).exec();

    if (!user) {
      return null;
    }

    // Vérifier si le compte est actif
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Vérifier le password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  /**
   * Générer les tokens JWT (access + refresh)
   */
  async generateTokens(user: UserDocument) {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRATION', '7d'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '30d'),
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Rafraîchir le token d'accès avec un refresh token
   */
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.userModel.findById(payload.sub).exec();

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Récupérer le profil de l'utilisateur connecté
   */
  async getProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password -emailVerificationToken -resetPasswordToken')
      .exec();

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  /**
   * Déconnexion de l'utilisateur
   */
  async logout(userId: string) {
    // Dans une implémentation simple, on retourne juste un succès
    // Dans une implémentation plus complexe, on pourrait invalider les tokens
    // ou mettre à jour l'utilisateur pour déconnecter toutes les sessions
    return {
      message: 'Déconnexion réussie',
      success: true,
    };
  }
}
