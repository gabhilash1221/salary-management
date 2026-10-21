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
    const tooLarge = isUploadTooLarge(exception);
    const status = tooLarge
      ? HttpStatus.BAD_REQUEST
      : exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = tooLarge
      ? 'File exceeds the 2 MB limit'
      : 'Internal server error';
    let error = tooLarge ? 'Bad Request' : 'Internal Server Error';
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

    if (!(exception instanceof HttpException) && !tooLarge) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    if (tooLarge) {
      message = 'File exceeds the 2 MB limit';
      error = 'Bad Request';
      details = [];
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

function isUploadTooLarge(exception: unknown): boolean {
  if (exception instanceof HttpException) {
    return (
      exception.getStatus() === HttpStatus.PAYLOAD_TOO_LARGE &&
      /too large/i.test(exceptionMessage(exception))
    );
  }
  if (typeof exception !== 'object' || exception === null) return false;
  const error = exception as { name?: string; code?: string; message?: string };
  return (
    error.code === 'LIMIT_FILE_SIZE' ||
    (error.name === 'MulterError' && /too large/i.test(error.message ?? ''))
  );
}

function exceptionMessage(exception: HttpException): string {
  const body = exception.getResponse();
  if (typeof body === 'string') return body;
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(' ');
  }
  return exception.message;
}
