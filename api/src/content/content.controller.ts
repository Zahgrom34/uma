import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ContentService } from './content.service';

@Controller('api/public')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('content')
  async getContent(@Req() req: Request, @Res() res: Response): Promise<void> {
    const { body, etag } = await this.content.getCached();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'ETag');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).send(body);
  }
}
