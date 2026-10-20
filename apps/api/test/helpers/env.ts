process.env.DATABASE_URL ??= 'file:./e2e.db';
process.env.JWT_SECRET ??= 'test-secret-test-secret';
process.env.JWT_EXPIRES_IN ??= '15m';
process.env.CORS_ORIGIN ??= 'http://localhost:5173';
process.env.ANALYTICS_MIN_GROUP_SIZE ??= '5';
process.env.MAX_AMOUNT_MINOR ??= '10000000000';
