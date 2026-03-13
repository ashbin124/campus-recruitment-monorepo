import test from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';

process.env.NODE_ENV = 'test';
process.env.DISABLE_RATE_LIMIT = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/campus_test?schema=public';

const { createApp } = await import('../src/app.js');
const app = createApp();
const request = supertest(app);

test('GET /health returns ok', async () => {
  const response = await request.get('/health');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ok' });
});

test('POST /api/auth/register validates payload', async () => {
  const response = await request.post('/api/auth/register').send({
    name: '',
    email: 'not-an-email',
    password: '123',
    role: 'student',
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, 'Validation failed');
  assert.ok(Array.isArray(response.body.errors));
  assert.ok(response.body.errors.length > 0);
});

test('POST /api/auth/login validates email format', async () => {
  const response = await request.post('/api/auth/login').send({
    email: 'invalid-email',
    password: 'password123',
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, 'Validation failed');
});

test('GET /api/jobs/company requires auth token', async () => {
  const response = await request.get('/api/jobs/company');
  assert.equal(response.status, 401);
  assert.equal(response.body.message, 'Missing token');
});

test('POST /api/jobs requires auth token', async () => {
  const response = await request.post('/api/jobs').send({
    title: 'Software Engineer',
    description: 'Build and maintain platform features.',
    location: 'Remote',
  });
  assert.equal(response.status, 401);
  assert.equal(response.body.message, 'Missing token');
});

test('POST /api/applications/jobs/:jobId/apply requires auth token', async () => {
  const response = await request.post('/api/applications/jobs/1/apply').send({
    phone: '1234567890',
  });
  assert.equal(response.status, 401);
  assert.equal(response.body.message, 'Missing token');
});

test('GET /api/applications/company requires auth token', async () => {
  const response = await request.get('/api/applications/company');
  assert.equal(response.status, 401);
  assert.equal(response.body.message, 'Missing token');
});

test('PUT /api/student/profile requires auth token', async () => {
  const response = await request.put('/api/student/profile').send({
    name: 'Student One',
    location: 'Kochi',
  });
  assert.equal(response.status, 401);
  assert.equal(response.body.message, 'Missing token');
});

test('GET /api/admin/stats requires auth token', async () => {
  const response = await request.get('/api/admin/stats');
  assert.equal(response.status, 401);
  assert.equal(response.body.message, 'Missing token');
});

test('GET /api/jobs validates invalid companyId query', async () => {
  const response = await request.get('/api/jobs?companyId=invalid');
  assert.equal(response.status, 400);
  assert.equal(response.body.message, 'Validation failed');
});

test('POST /api/auth/register validates role enum', async () => {
  const response = await request.post('/api/auth/register').send({
    name: 'John Student',
    email: 'john@example.com',
    password: 'password123',
    role: 'ADMIN',
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, 'Validation failed');
  assert.ok(Array.isArray(response.body.errors));
  assert.ok(response.body.errors.length > 0);
});
