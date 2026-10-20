import { HttpException } from '@nestjs/common';
import { LoginRateLimiter } from './login-rate-limiter';

describe('LoginRateLimiter', () => {
  it('rejects the sixth failure inside the window', () => {
    const limiter = new LoginRateLimiter(5, 1_000);
    const now = 10_000;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      limiter.assertAllowed('person@acme.test', now);
      limiter.recordFailure('person@acme.test', now);
    }
    expect(() => limiter.assertAllowed('person@acme.test', now)).toThrow(
      HttpException,
    );
  });

  it('allows a new attempt after the window and after a successful clear', () => {
    const limiter = new LoginRateLimiter(1, 1_000);
    limiter.recordFailure('person@acme.test', 0);
    expect(() =>
      limiter.assertAllowed('person@acme.test', 1_001),
    ).not.toThrow();
    limiter.recordFailure('person@acme.test', 1_001);
    limiter.clear('person@acme.test');
    expect(() =>
      limiter.assertAllowed('person@acme.test', 1_001),
    ).not.toThrow();
  });
});
