import { Module } from '@nestjs/common';
import { ConsultationsModule } from '../consultations/consultations.module';
import { HttpModule } from '@nestjs/axios';
import { AnalysisModule } from '../analysis/analysis.module';
import { DeepseekService } from '../consultations/deepseek.service';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ConsultationsModule,
    HttpModule,
    AnalysisModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, DeepseekService],
  exports: [UsersService],
})
export class UsersModule {}
