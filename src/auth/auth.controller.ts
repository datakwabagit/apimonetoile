import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UserDocument } from '../users/schemas/user.schema';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {} 

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Inscription', description: 'Inscription d’un nouvel utilisateur.' })
  @ApiResponse({ status: 201, description: 'Utilisateur inscrit.' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
 
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

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout' })
  @ApiResponse({ status: 200, description: 'Logout successful.' })
  async logout() {
    return this.authService.logout();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: UserDocument) {
    return this.authService.getProfile(user._id.toString());
  }
}