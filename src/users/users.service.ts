import { GRADE_REQUIREMENTS, GRADE_LABELS } from './grade.constants';
import { UserGrade } from '../common/enums/user-grade.enum';
import { UserType } from '../common/enums/user-type.enum';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class UsersService {

    /**
     * Met à jour automatiquement le grade et le profil utilisateur selon les règles métier
     */
    async updateUserGradeAndProfile(userId: string): Promise<User> {
      const user = await this.userModel.findById(userId);
      if (!user) throw new NotFoundException('User not found');

      // 1. Gestion des abonnements (profil utilisateur)
      if (user.userType !== UserType.BASIQUE && user.subscriptionEndDate && user.subscriptionEndDate < new Date()) {
        user.userType = UserType.BASIQUE;
        user.premiumRubriqueId = undefined;
        user.subscriptionStartDate = undefined;
        user.subscriptionEndDate = undefined;
      }

      // 2. Progression de grade
      // On part du grade actuel (ou 0 si null)
      let currentGrade = 0;
      if (user.grade) {
        currentGrade = GRADE_LABELS.findIndex(label => label.toUpperCase() === user.grade);
      }
      let nextGrade = currentGrade;
      for (let i = currentGrade + 1; i < GRADE_REQUIREMENTS.length; i++) {
        const req = GRADE_REQUIREMENTS[i];
        if (
          user.consultationsCompleted >= req.consultations &&
          user.rituelsCompleted >= req.rituals &&
          user.booksRead >= req.books
        ) {
          nextGrade = i;
        } else {
          break;
        }
      }
      if (nextGrade !== currentGrade && nextGrade > 0) {
        user.grade = GRADE_LABELS[nextGrade].toUpperCase() as UserGrade;
        user.lastGradeUpdate = new Date();
        // TODO: envoyer notification et message de félicitations ici
      }

      await user.save();
      return user;
    }
  /**
   * Retourne le nombre total d'utilisateurs inscrits
   */
  async getSubscribersCount(): Promise<number> {
    return this.userModel.countDocuments().exec();
  }
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
  ) {}

  /**
   * Créer un nouvel utilisateur (admin only)
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    const { username, password, gender, phone, phoneNumber, ...rest } = createUserDto;

    // Générer l'email automatiquement
    const email = `${username}@monetoile.org`;

    // Vérifier si le username ou l'email existe déjà
    const existingUser = await this.userModel.findOne({ $or: [{ email }, { username }] }).exec();
    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    // Mapper le genre français vers anglais
    let mappedGender = gender;
    if (gender === 'Homme') mappedGender = 'male';
    else   mappedGender = 'female';
 

    // Prendre phone ou phoneNumber
    const finalPhone = phone || phoneNumber;

    // Hasher le password
    const saltRounds = this.configService.get<number>('BCRYPT_ROUNDS', 10);
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Créer l'utilisateur
    const user = new this.userModel({
      ...rest,
      username,
      gender: mappedGender,
      phoneNumber: finalPhone,
      email,
      password: hashedPassword,
    });

    await user.save();

    // Retourner sans le password
    const userObject = user.toObject();
    delete userObject.password;

    return userObject;
  }

  /**
   * Récupérer tous les utilisateurs avec pagination et filtres
   */
  async findAll(query: {
    page?: number;
    limit?: number;
    role?: Role;
    isActive?: boolean;
    search?: string;
  }) {
    const { page = 1, limit = 10, role, isActive, search } = query;
    const skip = (page - 1) * limit;

    // Construire le filtre
    const filter: any = {};

    if (role) {
      filter.role = role;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    // Récupérer les utilisateurs
    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password -emailVerificationToken -resetPasswordToken')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Récupérer un utilisateur par ID
   */
  async findOne(id: string): Promise<User> {
    const user = await this.userModel
      .findById(id)
      .select('-password -emailVerificationToken -resetPasswordToken')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Mettre à jour un utilisateur
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
     if (updateUserDto.email) {
      const existingUser = await this.userModel.findOne({ email: updateUserDto.email }).exec();
      if (existingUser && existingUser._id.toString() !== id) {
        throw new ConflictException('Email already exists');
      }
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .select('-password -emailVerificationToken -resetPasswordToken')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Changer le password d'un utilisateur
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    // Récupérer l'utilisateur avec le password
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Vérifier le password actuel
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new ForbiddenException('Current password is incorrect');
    }

    // Hasher le nouveau password
    const saltRounds = this.configService.get<number>('BCRYPT_ROUNDS', 10);
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Mettre à jour le password
    await this.userModel.findByIdAndUpdate(userId, { password: hashedPassword }).exec();
  }

  /**
   * Supprimer un utilisateur (soft delete)
   */
  async remove(id: string): Promise<void> {
    const user = await this.userModel.findByIdAndUpdate(id, { isActive: false }).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  /**
   * Supprimer définitivement un utilisateur (hard delete - super admin only)
   */
  async hardDelete(id: string): Promise<void> {
    const user = await this.userModel.findByIdAndDelete(id).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  /**
   * Assigner un rôle à un utilisateur
   */
  async assignRole(userId: string, role: Role): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { role }, { new: true })
      .select('-password -emailVerificationToken -resetPasswordToken')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Obtenir les statistiques des utilisateurs
   */
  async getStatistics() {
    const [totalUsers, activeUsers, inactiveUsers, usersByRole] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.userModel.countDocuments({ isActive: true }).exec(),
      this.userModel.countDocuments({ isActive: false }).exec(),
      this.userModel.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]).exec(),
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRole: usersByRole.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }
}
