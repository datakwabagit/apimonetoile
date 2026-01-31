import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConsultationsModule } from '../consultations/consultations.module';
import { DeepseekService } from '../consultations/deepseek.service';
import { GradeController } from './grade.controller';
import { GradeService } from './grade.service';
import { User, UserSchema } from './schemas/user.schema';
import { UserAccessController } from './user-access.controller';
import { UserAccessService } from './user-access.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ConsultationsModule,
    HttpModule,
  ],
  controllers: [UsersController, GradeController, UserAccessController],
  providers: [UsersService, DeepseekService, GradeService, UserAccessService],
  exports: [UsersService, GradeService, UserAccessService],
})
export class UsersModule {}
