import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { JWT_EXPIRES_IN, JWT_SECRET } from './auth.constants';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<{ token: string; user: { id: string; email: string } }> {
    const user = await this.prisma.adminUser.findUnique({ where: { email } });
    const invalid = new UnauthorizedException({ message: 'Неверная почта или пароль' });
    if (!user) throw invalid;
    const ok = await argon2.verify(user.passwordHash, password).catch(() => false);
    if (!ok) throw invalid;
    const token = this.jwt.sign({ sub: user.id, email: user.email }, { secret: JWT_SECRET, expiresIn: JWT_EXPIRES_IN });
    return { token, user: { id: user.id, email: user.email } };
  }

  async me(userId: string): Promise<{ id: string; email: string }> {
    const user = await this.prisma.adminUser.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException({ message: 'Требуется вход в систему' });
    return { id: user.id, email: user.email };
  }
}
