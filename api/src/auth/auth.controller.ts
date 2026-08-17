import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { LoginSchema, LoginInput } from '@uma/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AdminGuard, AdminJwtPayload } from './admin.guard';
import { AuthService } from './auth.service';
import { AUTH_COOKIE } from './auth.constants';

const isProd = () => process.env.NODE_ENV === 'production';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: { id: string; email: string } }> {
    const { token, user } = await this.auth.login(body.email, body.password);
    res.cookie(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd(),
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    return { user };
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(AUTH_COOKIE, { httpOnly: true, sameSite: 'lax', secure: isProd(), path: '/' });
  }

  @Get('me')
  @UseGuards(AdminGuard)
  async me(@Req() req: Request & { admin: AdminJwtPayload }): Promise<{ user: { id: string; email: string } }> {
    return { user: await this.auth.me(req.admin.sub) };
  }
}
