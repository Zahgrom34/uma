import { Module } from '@nestjs/common';
import { BillzController } from './billz.controller';
import { BillzService } from './billz.service';
import { BillzClient } from './billz.client';

@Module({
  controllers: [BillzController],
  providers: [BillzService, BillzClient],
})
export class BillzModule {}
