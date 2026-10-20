import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export const RequestId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string | undefined => {
    return context.switchToHttp().getRequest<{ requestId?: string }>()
      .requestId;
  },
);
