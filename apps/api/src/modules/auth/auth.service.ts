import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, type RoleName } from '../../common/reference-data';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from './auth-user';
import { LoginRateLimiter } from './login-rate-limiter';
import { verifyPassword } from './password';

const INVALID_LOGIN = 'Invalid email or password';

@Injectable()
export class AuthService {
  private readonly limiter = new LoginRateLimiter();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    this.limiter.assertAllowed(email);
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    const passwordMatches = user
      ? verifyPassword(password, user.passwordHash)
      : false;
    if (!user?.isActive || !passwordMatches) {
      this.limiter.recordFailure(email);
      throw new UnauthorizedException(INVALID_LOGIN);
    }

    this.limiter.clear(email);
    const role = user.role as RoleName;
    if (!Object.values(Role).includes(role)) {
      this.limiter.recordFailure(email);
      throw new UnauthorizedException(INVALID_LOGIN);
    }

    const payload: AuthUser = { userId: user.id, email: user.email, role };
    return {
      accessToken: await this.jwt.signAsync(payload),
      tokenType: 'Bearer' as const,
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN') ?? '15m',
      role,
      email: user.email,
    };
  }
}
