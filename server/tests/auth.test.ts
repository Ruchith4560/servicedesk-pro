import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { AuditEvent } from '../src/models/AuditEvent.js';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await AuditEvent.deleteMany({});
});

describe('Authentication & RBAC Module', () => {
  const validUserData = {
    name: 'Sarah Connor',
    email: 'sarah.connor@cyberdyne.local',
    password: 'Password123!',
    department: 'IT Security',
    role: 'TECHNICIAN',
    skills: ['Network Security', 'Firewalls']
  };

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user with hashed password and return sanitized user data', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUserData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toHaveProperty('_id');
      expect(res.body.data.user.email).toBe(validUserData.email);
      expect(res.body.data.user.role).toBe('TECHNICIAN');
      expect(res.body.data.user.passwordHash).toBeUndefined();

      // Verify DB persistence and password hashing
      const savedUser = await User.findOne({ email: validUserData.email }).select('+passwordHash');
      expect(savedUser).not.toBeNull();
      expect(savedUser?.passwordHash).not.toBe(validUserData.password);
      expect(savedUser?.passwordHash.startsWith('$2')).toBe(true);

      // Verify Audit Event logged
      const auditLog = await AuditEvent.findOne({ action: 'AUTH_REGISTER_SUCCESS' });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.actorEmail).toBe(validUserData.email);
    });

    it('should reject registration if email already exists with 409 Conflict', async () => {
      await request(app).post('/api/v1/auth/register').send(validUserData);

      const duplicateRes = await request(app)
        .post('/api/v1/auth/register')
        .send(validUserData);

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('should reject registration with weak password with 422 Validation Error', async () => {
      const weakUserData = {
        ...validUserData,
        email: 'weak@cyberdyne.local',
        password: 'weak'
      };

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(weakUserData);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(validUserData);
    });

    it('should authenticate valid credentials and issue JWT access and refresh tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validUserData.email,
          password: validUserData.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.email).toBe(validUserData.email);

      // Verify login audit event
      const auditLog = await AuditEvent.findOne({ action: 'AUTH_LOGIN_SUCCESS' });
      expect(auditLog).not.toBeNull();
    });

    it('should reject invalid password with 401 Unauthorized and log warning audit event', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validUserData.email,
          password: 'WrongPassword999!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');

      // Verify security failure audit trail
      const auditLog = await AuditEvent.findOne({ action: 'AUTH_LOGIN_FAILED_BAD_PASSWORD' });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.severity).toBe('WARN');
    });
  });

  describe('GET /api/v1/auth/me (Protected Route)', () => {
    it('should block unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return authenticated user payload when valid Bearer token is provided', async () => {
      await request(app).post('/api/v1/auth/register').send(validUserData);
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validUserData.email, password: validUserData.password });

      const token = loginRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(validUserData.email);
      expect(res.body.data.user.role).toBe('TECHNICIAN');
    });
  });

  describe('PATCH /api/v1/auth/users/:userId/role (RBAC Authorization Guard)', () => {
    let adminToken: string;
    let employeeToken: string;
    let targetEmployeeId: string;

    beforeEach(async () => {
      // Register Admin
      const adminRes = await request(app).post('/api/v1/auth/register').send({
        name: 'Master Admin',
        email: 'admin@cyberdyne.local',
        password: 'AdminPassword123!',
        department: 'Executive IT',
        role: 'SYSTEM_ADMIN'
      });
      const adminLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@cyberdyne.local', password: 'AdminPassword123!' });
      adminToken = adminLogin.body.data.accessToken;

      // Register Employee
      const empRes = await request(app).post('/api/v1/auth/register').send({
        name: 'John Doe',
        email: 'john.doe@cyberdyne.local',
        password: 'EmployeePassword123!',
        department: 'Operations',
        role: 'EMPLOYEE'
      });
      targetEmployeeId = empRes.body.data.user._id;

      const empLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'john.doe@cyberdyne.local', password: 'EmployeePassword123!' });
      employeeToken = empLogin.body.data.accessToken;
    });

    it('should deny role escalation when attempted by non-admin (EMPLOYEE) with 403 Forbidden', async () => {
      const res = await request(app)
        .patch(`/api/v1/auth/users/${targetEmployeeId}/role`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ role: 'IT_MANAGER' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow SYSTEM_ADMIN to elevate user role and record CRITICAL audit event', async () => {
      const res = await request(app)
        .patch(`/api/v1/auth/users/${targetEmployeeId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'TECHNICIAN' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('TECHNICIAN');

      // Verify DB update
      const updatedUser = await User.findById(targetEmployeeId);
      expect(updatedUser?.role).toBe('TECHNICIAN');

      // Verify Critical Audit Log
      const auditLog = await AuditEvent.findOne({ action: 'USER_ROLE_CHANGED' });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.severity).toBe('CRITICAL');
      expect(auditLog?.changes?.before?.role).toBe('EMPLOYEE');
      expect(auditLog?.changes?.after?.role).toBe('TECHNICIAN');
    });
  });

  describe('POST /api/v1/auth/refresh (Token Rotation)', () => {
    it('should issue a new access token when provided a valid refresh token', async () => {
      await request(app).post('/api/v1/auth/register').send(validUserData);
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validUserData.email, password: validUserData.password });

      const refreshToken = loginRes.body.data.refreshToken;

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(typeof res.body.data.accessToken).toBe('string');
    });
  });
});
