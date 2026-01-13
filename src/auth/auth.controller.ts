import { Controller, Post, Body, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserDocument } from '../users/schemas/user.schema';

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/register
   * Inscription d'un nouvel utilisateur
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Inscription', description: 'Inscription d’un nouvel utilisateur.' })
  @ApiResponse({ status: 201, description: 'Utilisateur inscrit.' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * POST /auth/login
   * Connexion d'un utilisateur
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion', description: 'Connexion d’un utilisateur.' })
  @ApiResponse({ status: 200, description: 'Connexion réussie.' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

 


  /**
   * POST /auth/refresh
   * Rafraîchir le token d'accès
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rafraîchir le token', description: 'Rafraîchit le token d’accès JWT.' })
  @ApiResponse({ status: 200, description: 'Token rafraîchi.' })
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  /**
   * GET /auth/me
   * Récupérer le profil de l'utilisateur connecté
   */
  @ApiOperation({
    summary: 'Profil utilisateur',
    description: 'Retourne le profil de l’utilisateur connecté.',
  })
  @ApiResponse({ status: 200, description: 'Profil utilisateur.' })
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: UserDocument) {
    return this.authService.getProfile(user._id.toString());
  }
}
