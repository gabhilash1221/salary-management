import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import type { Observable } from 'rxjs';
import { requestIdMiddleware } from './request-id.middleware';

type RequestWithId = {
  requestId?: string;
  header: (name: string) => string | undefined;
};

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    if (!request.requestId) {
      requestIdMiddleware(
        request as Parameters<typeof requestIdMiddleware>[0],
        http.getResponse<Response>(),
        () => undefined,
      );
    }
    return next.handle();
  }
}
