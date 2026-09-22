import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Ticket } from '../src/models/Ticket.js';
import { TicketEvent } from '../src/models/TicketEvent.js';
import { KnowledgeArticle } from '../src/models/KnowledgeArticle.js';
import { Notification } from '../src/models/Notification.js';

let mongoServer: MongoMemoryServer;
let adminToken: string;
let techToken: string;
let emp1Token: string;
let emp2Token: string;
let adminId: string;
let techId: string;
let emp1Id: string;
let emp2Id: string;
let emp1TicketId: string;
let emp2NotificationId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // 1. Admin
  const adminRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Security Admin',
    email: 'secadmin@sec.local',
    password: 'Password123!',
    department: 'Cybersecurity',
    role: 'SYSTEM_ADMIN'
  });
  adminId = adminRes.body.data.user._id || adminRes.body.data.user.id;
  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'secadmin@sec.local', password: 'Password123!' });
  adminToken = adminLogin.body.data.accessToken;

  // 2. Technician
  const techRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Sec Tech',
    email: 'sectech@sec.local',
    password: 'Password123!',
    department: 'IT Operations',
    role: 'TECHNICIAN'
  });
  techId = techRes.body.data.user._id || techRes.body.data.user.id;
  const techLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'sectech@sec.local', password: 'Password123!' });
  techToken = techLogin.body.data.accessToken;

  // 3. Employee 1
  const emp1Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Victim Alice',
    email: 'alice@sec.local',
    password: 'Password123!',
    department: 'Finance',
    role: 'EMPLOYEE'
  });
  emp1Id = emp1Res.body.data.user._id || emp1Res.body.data.user.id;
  const emp1Login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'alice@sec.local', password: 'Password123!' });
  emp1Token = emp1Login.body.data.accessToken;

  // 4. Employee 2 (Attacker)
  const emp2Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Attacker Bob',
    email: 'bob@sec.local',
    password: 'Password123!',
    department: 'Marketing',
    role: 'EMPLOYEE'
  });
  emp2Id = emp2Res.body.data.user._id || emp2Res.body.data.user.id;
  const emp2Login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'bob@sec.local', password: 'Password123!' });
  emp2Token = emp2Login.body.data.accessToken;

  // 5. Seed a ticket for Employee 1 with internal notes
  const ticketRes = await request(app)
    .post('/api/v1/tickets')
    .set('Authorization', `Bearer ${emp1Token}`)
    .send({
      title: 'Confidential Executive payroll spreadsheet corruption',
      description: 'Payroll numbers are misaligned after latest macro run',
      category: 'SOFTWARE',
      priority: 'HIGH'
    });
  emp1TicketId = ticketRes.body.data.ticket._id;

  // Add internal note by Technician
  await TicketEvent.create({
    ticketId: new mongoose.Types.ObjectId(emp1TicketId),
    actorId: new mongoose.Types.ObjectId(techId),
    eventType: 'COMMENT_ADDED',
    note: 'INTERNAL INVESTIGATION: Suspect potential insider tampering with formula',
    isInternal: true
  });

  // Seed notification for Employee 2
  const notif = await Notification.create({
    recipientId: new mongoose.Types.ObjectId(emp2Id),
    type: 'SLA_WARNING',
    title: 'Security Alert for Bob',
    message: 'Your password was changed from another terminal',
    read: false
  });
  emp2NotificationId = (notif as any)._id.toString();
}, 35000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Phase 13: Security Penetration & Chaos Resilience Suite', () => {
  describe('1. HTTP Security Headers & Fingerprinting Defense', () => {
    it('should inject complete suite of OWASP recommended security headers', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);

      // Verify defense headers
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-xss-protection']).toBe('1; mode=block');
      expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(res.headers['content-security-policy']).toBeDefined();

      // Verify fingerprint suppression
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('2. NoSQL Injection Resistance & Operator Neutralization', () => {
    it('should sanitize body query operators ($ne, $gt) preventing authentication bypass', async () => {
      // Attacker attempts blind NoSQL injection login: { "email": { "$ne": null }, "password": { "$ne": null } }
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: { $ne: null },
          password: { $ne: null }
        });

      // Sanitization strips $ne, causing Zod schema validation to reject non-string inputs
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('should strip malicious operators ($gt) from URL query parameters', async () => {
      // Attacker attempts query manipulation: ?priority[$gt]=LOW
      const res = await request(app)
        .get('/api/v1/tickets?priority[$gt]=LOW')
        .set('Authorization', `Bearer ${emp1Token}`);

      // The sanitization strips $gt operator; schema rejects invalid structure with 422 rather than executing NoSQL query
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('3. Broken Object Level Authorization (BOLA / IDOR) Defense', () => {
    it('should block Employee 2 from viewing Employee 1 ticket (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/tickets/${emp1TicketId}`)
        .set('Authorization', `Bearer ${emp2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should filter internal technician investigation notes from requester view', async () => {
      // Employee 1 views their own ticket
      const res = await request(app)
        .get(`/api/v1/tickets/${emp1TicketId}`)
        .set('Authorization', `Bearer ${emp1Token}`);

      expect(res.status).toBe(200);
      const events = res.body.data.events;
      const hasInternal = events.some((e: any) => e.isInternal === true);
      expect(hasInternal).toBe(false);
      expect(events.some((e: any) => e.note?.includes('insider tampering'))).toBe(false);

      // Technician views same ticket and DOES see internal notes
      const techRes = await request(app)
        .get(`/api/v1/tickets/${emp1TicketId}`)
        .set('Authorization', `Bearer ${techToken}`);

      expect(techRes.status).toBe(200);
      const techEvents = techRes.body.data.events;
      expect(techEvents.some((e: any) => e.isInternal === true)).toBe(true);
    });

    it('should prevent Employee 1 from marking Employee 2 notification as read (404 Isolation)', async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${emp2NotificationId}/read`)
        .set('Authorization', `Bearer ${emp1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. Broken Function Level Authorization & Privilege Escalation', () => {
    it('should prevent standard Employee from escalating own role to SYSTEM_ADMIN (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/v1/auth/users/${emp2Id}/role`)
        .set('Authorization', `Bearer ${emp2Token}`)
        .send({ role: 'SYSTEM_ADMIN' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);

      // Confirm role remained EMPLOYEE
      const user = await User.findById(emp2Id);
      expect(user?.role).toBe('EMPLOYEE');
    });

    it('should prevent Employee from accessing Audit Trail ledger (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/audit')
        .set('Authorization', `Bearer ${emp1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should prevent Employee from accessing Executive Analytics (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/overview')
        .set('Authorization', `Bearer ${emp1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should enforce the Four-Eyes principle: Technician cannot approve own Knowledge Article', async () => {
      // 1. Tech creates draft article
      const draftRes = await request(app)
        .post('/api/v1/knowledge')
        .set('Authorization', `Bearer ${techToken}`)
        .send({
          title: 'Emergency Firewall Bypass Procedure for Remote Workers',
          contentMarkdown: 'This guide outlines how to circumvent corporate IDS during emergency off-hours.',
          category: 'SECURITY',
          tags: ['security', 'bypass'],
          accessRoles: ['EMPLOYEE']
        });

      expect(draftRes.status).toBe(201);
      const articleId = draftRes.body.data.article._id;

      // 2. Tech submits to review
      await request(app)
        .patch(`/api/v1/knowledge/${articleId}/status`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ status: 'IN_REVIEW' });

      // 3. Tech attempts to self-approve
      const approveRes = await request(app)
        .patch(`/api/v1/knowledge/${articleId}/status`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ status: 'APPROVED' });

      expect([400, 403]).toContain(approveRes.status);
      expect(approveRes.body.success).toBe(false);
    });
  });

  describe('5. JWT Signature & Token Tampering Defense', () => {
    it('should reject requests with missing Authorization header (401 Unauthorized)', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject tokens signed with an invalid/forged secret key (401 Unauthorized)', async () => {
      const forgedToken = jwt.sign(
        { userId: emp2Id, role: 'SYSTEM_ADMIN', email: 'forged@sec.local' },
        'malicious-attacker-secret-key-12345',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject expired JWT tokens (401 Unauthorized)', async () => {
      const expiredToken = jwt.sign(
        { userId: emp2Id, role: 'EMPLOYEE', email: 'bob@sec.local' },
        env.JWT_SECRET,
        { expiresIn: -10 } // Expired 10 seconds ago
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('6. Chaos & Resilience: AI Microservice Failure Graceful Degradation', () => {
    it('should gracefully degrade to heuristic fallback when AI service is offline without 500 error', async () => {
      // During unit/integration tests without running FastAPI, the HTTP client fails to connect.
      // Core API must catch this failure, log a diagnostic warning, and apply rule-based heuristics.
      const res = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${emp1Token}`)
        .send({
          title: 'VPN AnyConnect drops every 10 minutes on Wi-Fi connection',
          description: 'Client loses subnet routing and cannot reach intranet web servers',
          category: 'NETWORK',
          priority: 'MEDIUM'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const ticket = res.body.data.ticket;
      expect(ticket._id).toBeDefined();
      expect(ticket.aiAnalysis).toBeDefined();
      // Verifies system did not abort or crash; ticket was successfully persisted
      expect(ticket.status).toBe('OPEN');
    });
  });
});
