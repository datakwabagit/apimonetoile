import { Controller, Get, Post, Patch, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationType } from './schemas/notification.schema';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Récupérer mes notifications
   */
  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isRead') isRead?: string,
    @Query('type') type?: NotificationType,
  ) {
    const query: any = {
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
    };

    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    if (type) {
      query.type = type;
    }

    return this.notificationsService.findAllByUser(user.sub, query);
  }

  /**
   * Récupérer le nombre de notifications non lues
   */
  @Get('unread/count')
  getUnreadCount(@CurrentUser() user: any) {
    return this.notificationsService.getUnreadCount(user.sub);
  }

  /**
   * Marquer une notification comme lue
   */
  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.markAsRead(id, user.sub);
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  @Post('mark-all-read')
  markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(user.sub);
  }

  /**
   * Supprimer une notification
   */
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationsService.remove(id, user.sub);
  }

  /**
   * Supprimer toutes les notifications lues
   */
  @Delete('read/all')
  removeAllRead(@CurrentUser() user: any) {
    return this.notificationsService.removeAllRead(user.sub);
  }
}
