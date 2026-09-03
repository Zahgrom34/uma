import { Controller, Get, Header, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import type { BillzShop, BillzSyncReport, BillzTestResult } from '@uma/shared';
import { AdminGuard } from '../auth/admin.guard';
import { BillzService } from './billz.service';

@Controller('api/admin/billz')
@UseGuards(AdminGuard)
export class BillzController {
  constructor(private readonly billz: BillzService) {}

  @Post('test')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  test(): Promise<BillzTestResult> {
    return this.billz.test();
  }

  @Post('sync')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  sync(): Promise<BillzSyncReport> {
    return this.billz.sync();
  }

  @Get('shops')
  @Header('Cache-Control', 'no-store')
  shops(): Promise<BillzShop[]> {
    return this.billz.shops();
  }

  /** Explicit res.json so `null` is sent as a JSON literal, not an empty body. */
  @Get('status')
  async status(@Res() res: Response): Promise<void> {
    const report: BillzSyncReport | null = await this.billz.status();
    res.set('Cache-Control', 'no-store').json(report);
  }
}
