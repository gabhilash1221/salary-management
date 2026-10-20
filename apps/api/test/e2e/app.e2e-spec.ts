import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { SEED_TIMESTAMP } from '../../src/common/reference-data';
import { configureApp } from '../../src/configure-app';
import { hashDemoPassword } from '../../src/modules/auth/password';
import { pushTestSchema } from '../helpers/test-db';

describe('API access', () => {
  let app: INestApplication;
  const prisma = new PrismaClient();

  beforeAll(async () => {
    pushTestSchema();
    const passwordHash = hashDemoPassword('Password123!');
    await prisma.user.deleteMany();
    await prisma.user.createMany({
      data: [
        {
          id: 'user_hr_manager',
          email: 'hr.manager@acme.test',
          passwordHash,
          role: 'HR_MANAGER',
          isActive: true,
          createdAt: SEED_TIMESTAMP,
        },
        {
          id: 'user_directory',
          email: 'directory.user@acme.test',
          passwordHash,
          role: 'DIRECTORY_USER',
          isActive: true,
          createdAt: SEED_TIMESTAMP,
        },
      ],
    });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('reports database health without a token', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('rejects anonymous directory access and blocks a directory user from analytics', async () => {
    const unauthenticated = await request(app.getHttpServer()).get(
      '/api/v1/employees',
    );
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body.statusCode).toBe(401);

    const hr = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'hr.manager@acme.test', password: 'Password123!' });
    expect(hr.status).toBe(201);

    const directory = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'directory.user@acme.test', password: 'Password123!' });
    expect(directory.status).toBe(201);

    const forbidden = await request(app.getHttpServer())
      .get('/api/v1/analytics/summary')
      .set('Authorization', `Bearer ${directory.body.accessToken}`);
    expect(forbidden.status).toBe(403);

    const allowed = await request(app.getHttpServer())
      .get('/api/v1/analytics/summary')
      .set('Authorization', `Bearer ${hr.body.accessToken}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.definition).toEqual(expect.any(String));
  });
});
