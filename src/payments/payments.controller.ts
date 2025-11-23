import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permission } from '../common/enums/permission.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { UserDocument } from '../users/schemas/user.schema';

@ApiTags('Paiements')
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.CREATE_PAYMENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un paiement', description: 'Crée un nouveau paiement.' })
  @ApiResponse({ status: 201, description: 'Paiement créé.' })
  create(@CurrentUser() user: UserDocument, @Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(user._id.toString(), createPaymentDto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_ANY_PAYMENT)
  @ApiOperation({ summary: 'Lister les paiements', description: 'Retourne la liste des paiements (admin/consultant).' })
  @ApiResponse({ status: 200, description: 'Liste des paiements.' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: PaymentStatus,
  ) {
    return this.paymentsService.findAll({ page, limit, status });
  }

  @Get('my')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_OWN_PAYMENT)
  findMyPayments(
    @CurrentUser() user: UserDocument,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.paymentsService.findAll({ page, limit, userId: user._id.toString() });
  }

  @Get('statistics')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.VIEW_STATISTICS)
  getStatistics() {
    return this.paymentsService.getStatistics();
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.READ_OWN_PAYMENT)
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.UPDATE_PAYMENT)
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentsService.update(id, updatePaymentDto);
  }
}
