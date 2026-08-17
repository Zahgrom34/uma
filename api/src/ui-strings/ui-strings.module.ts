import { Module } from '@nestjs/common';
import { UiStringsController } from './ui-strings.controller';

@Module({
  controllers: [UiStringsController],
})
export class UiStringsModule {}
