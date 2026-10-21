import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, type RoleName } from '../../common/reference-data';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from './auth-user';
import { LoginRateLimiter } from './login-rate-limiter';
import { hashPassword, verifyPassword } from './password';
import { imageType } from './profile-media';
import { type ThemeName, ThemeSync } from './theme-sync';

const INVALID_LOGIN = 'Invalid email or password';

@Injectable()
export class AuthService {
  private readonly limiter = new LoginRateLimiter();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly themes: ThemeSync,
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
      displayName: user.displayName,
      theme: this.themeOf(user.theme),
    };
  }

  async profile(userId: string) {
    return this.toProfile(await this.requireUser(userId));
  }

  async updateName(userId: string, displayName: string) {
    const name = displayName.trim();
    if (name.length === 0 || name.length > 80) {
      throw new BadRequestException(
        'Display name must be 80 characters or fewer',
      );
    }
    if (/^[=+\-@]/.test(name)) {
      throw new BadRequestException(
        'Display name cannot start with =, +, -, or @',
      );
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { displayName: name },
    });
    return this.toProfile(user);
  }

  async setTheme(userId: string, theme: ThemeName) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { theme },
    });
    this.themes.publish(userId, theme);
    return this.toProfile(user);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.requireUser(userId);
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    if (newPassword.length < 8) {
      throw new BadRequestException(
        'New password must be at least 8 characters',
      );
    }
    if (currentPassword === newPassword) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashPassword(newPassword) },
    });
    return { updated: true };
  }

  async saveAvatar(userId: string, bytes: Buffer) {
    const type = imageType(bytes);
    if (!type) {
      throw new BadRequestException('Upload a PNG, JPEG, or WebP image');
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: new Uint8Array(bytes), avatarType: type },
    });
    return this.toProfile(user);
  }

  async clearAvatar(userId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: null, avatarType: null },
    });
    return this.toProfile(user);
  }

  async readAvatar(userId: string) {
    const user = await this.requireUser(userId);
    if (!user.avatar || !user.avatarType || user.avatar.length === 0) {
      return null;
    }
    return { bytes: Buffer.from(user.avatar), type: user.avatarType };
  }

  private async requireUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.isActive) {
      throw new NotFoundException('Profile not found');
    }
    return user;
  }

  private toProfile(user: {
    email: string;
    role: string;
    displayName: string;
    theme: string;
    avatar: Uint8Array | null;
    avatarType: string | null;
  }) {
    return {
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      theme: this.themeOf(user.theme),
      hasAvatar: Boolean(user.avatar?.length && user.avatarType),
    };
  }

  private themeOf(theme: string): ThemeName {
    return theme === 'night' ? 'night' : 'day';
  }
}
