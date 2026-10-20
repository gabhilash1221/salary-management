import {
  type ExecutionContext,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const TOKEN_EXPIRED_MESSAGE = 'The token is expired';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  override handleRequest<TUser>(
    err: unknown,
    user: TUser,
    info: unknown,
  ): TUser {
    if (user) return user;
    if (isExpiredToken(info) || isExpiredToken(err)) {
      throw new UnauthorizedException(TOKEN_EXPIRED_MESSAGE);
    }
    if (err instanceof HttpException) throw err;
    throw new UnauthorizedException();
  }
}

function isExpiredToken(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const record = value as { name?: string; message?: string };
  return (
    record.name === 'TokenExpiredError' || record.message === 'jwt expired'
  );
}
