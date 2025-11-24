import { Module } from '@nestjs/common';
import { MoneyfusionController } from './moneyfusion.controller';
import { MoneyfusionService } from './moneyfusion.service';

@Module({
  controllers: [MoneyfusionController],
  providers: [MoneyfusionService],
})
export class MoneyfusionModule {}
