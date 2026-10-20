import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details: string[] = [];

    if (typeof body === 'string') {
      message = body;
    } else if (body && typeof body === 'object') {
      const record = body as { message?: string | string[]; error?: string };
      if (typeof record.error === 'string') {
        error = record.error;
      }
      if (Array.isArray(record.message)) {
        details = record.message.map(String);
        message = 'Validation failed';
      } else if (typeof record.message === 'string') {
        message = record.message;
      }
    }

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      details,
      requestId: request.requestId ?? null,
    });
  }
}
