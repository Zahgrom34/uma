import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AUTH_COOKIE, JWT_SECRET } from './auth.constants';

export interface AdminJwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { admin?: AdminJwtPayload }>();
    const token = (request.cookies as Record<string, string> | undefined)?.[AUTH_COOKIE];
    if (!token) throw new UnauthorizedException({ message: 'Требуется вход в систему' });
    try {
      request.admin = this.jwt.verify<AdminJwtPayload>(token, { secret: JWT_SECRET });
      return true;
    } catch {
      throw new UnauthorizedException({ message: 'Сессия истекла — войдите заново' });
    }
  }
}
