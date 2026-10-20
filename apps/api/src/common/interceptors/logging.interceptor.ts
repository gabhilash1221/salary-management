import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { type Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { requestId?: string }>();
    const response = http.getResponse<Response>();
    const started = Date.now();

    const write = (statusCode: number) => {
      this.logger.log(
        JSON.stringify({
          requestId: request.requestId ?? null,
          method: request.method,
          url: request.originalUrl,
          statusCode,
          durationMs: Date.now() - started,
        }),
      );
    };

    return next.handle().pipe(
      tap(() => write(response.statusCode)),
      catchError((error: unknown) => {
        const statusCode =
          typeof error === 'object' &&
          error !== null &&
          'getStatus' in error &&
          typeof error.getStatus === 'function'
            ? Number(error.getStatus())
            : 500;
        write(statusCode);
        return throwError(() => error);
      }),
    );
  }
}
