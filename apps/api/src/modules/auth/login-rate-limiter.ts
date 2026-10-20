import { HttpException, HttpStatus } from '@nestjs/common';

export class LoginRateLimiter {
  private readonly failures = new Map<string, number[]>();

  constructor(
    private readonly limit = 5,
    private readonly windowMs = 15 * 60 * 1000,
  ) {}

  assertAllowed(email: string, now = Date.now()) {
    if (this.recent(email, now).length >= this.limit) {
      throw new HttpException(
        'Too many login attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  recordFailure(email: string, now = Date.now()) {
    const recent = this.recent(email, now);
    recent.push(now);
    this.failures.set(this.key(email), recent);
  }

  clear(email: string) {
    this.failures.delete(this.key(email));
  }

  private recent(email: string, now: number) {
    const windowStart = now - this.windowMs;
    return (this.failures.get(this.key(email)) ?? []).filter(
      (timestamp) => timestamp > windowStart,
    );
  }

  private key(email: string) {
    return email.trim().toLowerCase();
  }
}
