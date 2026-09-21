import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Ticket } from '../src/models/Ticket.js';
import { TicketEvent } from '../src/models/TicketEvent.js';
import { WorkLog } from '../src/models/WorkLog.js';
import { Counter } from '../src/models/Counter.js';

let mongoServer: MongoMemoryServer;

let adminToken: string;
let techToken: string;
let techUser: any;
let employee1Token: string;
let employee1User: any;
let employee2Token: string;
let employee2User: any;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Setup roles
  const emp1Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Alice Employee',
    email: 'alice@enterprise.local',
    password: 'Password123!',
    department: 'Finance',
    role: 'EMPLOYEE'
  });
  employee1User = emp1Res.body.data.user;
  const emp1Login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'alice@enterprise.local', password: 'Password123!' });
  employee1Token = emp1Login.body.data.accessToken;

  const emp2Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Bob Employee',
    email: 'bob@enterprise.local',
    password: 'Password123!',
    department: 'Engineering',
    role: 'EMPLOYEE'
  });
  employee2User = emp2Res.body.data.user;
  const emp2Login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'bob@enterprise.local', password: 'Password123!' });
  employee2Token = emp2Login.body.data.accessToken;

  const techRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Charlie Tech',
    email: 'charlie@enterprise.local',
    password: 'Password123!',
    department: 'IT Support',
    role: 'TECHNICIAN',
    skills: ['Networking', 'VPN']
  });
  techUser = techRes.body.data.user;
  const techLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'charlie@enterprise.local', password: 'Password123!' });
  techToken = techLogin.body.data.accessToken;

  const adminRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Diane Admin',
    email: 'diane@enterprise.local',
    password: 'Password123!',
    department: 'Executive IT',
    role: 'SYSTEM_ADMIN'
  });
  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'diane@enterprise.local', password: 'Password123!' });
  adminToken = adminLogin.body.data.accessToken;
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Ticket.deleteMany({});
  await TicketEvent.deleteMany({});
  await WorkLog.deleteMany({});
  await Counter.deleteMany({});
});

describe('Ticket Management & Finite State Machine (FSM)', () => {
  describe('POST /api/v1/tickets (Creation & Sequence Generation)', () => {
    it('should create ticket with atomic sequence SDP-XXXX and log creation event', async () => {
      const res1 = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${employee1Token}`)
        .send({
          title: 'VPN connection failure on laptop',
          description: 'Cisco AnyConnect gives error 404 when connecting from home WiFi.',
          category: 'NETWORK',
          priority: 'HIGH'
        });

      expect(res1.status).toBe(201);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data.ticket.ticketNumber).toBe('SDP-1001');
      expect(res1.body.data.ticket.status).toBe('OPEN');
      expect(res1.body.data.ticket.requesterId).toBe(employee1User._id);

      // Verify sequence increments
      const res2 = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${employee1Token}`)
        .send({
          title: 'Monitor flickering at desk',
          description: 'Secondary Dell monitor blinks black every 10 seconds.',
          category: 'HARDWARE',
          priority: 'LOW'
        });

      expect(res2.status).toBe(201);
      expect(res2.body.data.ticket.ticketNumber).toBe('SDP-1002');

      // Verify timeline event exists
      const event = await TicketEvent.findOne({
        ticketId: res1.body.data.ticket._id,
        eventType: 'TICKET_CREATED'
      });
      expect(event).not.toBeNull();
      expect(event?.actorId.toString()).toBe(employee1User._id);
    });
  });

  describe('GET /api/v1/tickets (Role-Scoped Access Control)', () => {
    beforeEach(async () => {
      // Alice creates 1 ticket
      await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${employee1Token}`)
        .send({ title: 'Alice Ticket 1', description: 'Finance payroll issue' });

      // Bob creates 1 ticket
      await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${employee2Token}`)
        .send({ title: 'Bob Ticket 1', description: 'GitLab access issue' });
    });

    it('should restrict employees to only see tickets they requested', async () => {
      const aliceRes = await request(app)
        .get('/api/v1/tickets')
        .set('Authorization', `Bearer ${employee1Token}`);

      expect(aliceRes.status).toBe(200);
      expect(aliceRes.body.data.tickets.length).toBe(1);
      expect(aliceRes.body.data.tickets[0].title).toBe('Alice Ticket 1');

      const bobRes = await request(app)
        .get('/api/v1/tickets')
        .set('Authorization', `Bearer ${employee2Token}`);

      expect(bobRes.status).toBe(200);
      expect(bobRes.body.data.tickets.length).toBe(1);
      expect(bobRes.body.data.tickets[0].title).toBe('Bob Ticket 1');
    });

    it('should allow technicians and admins to see tickets from all users', async () => {
      const techRes = await request(app)
        .get('/api/v1/tickets')
        .set('Authorization', `Bearer ${techToken}`);

      expect(techRes.status).toBe(200);
      expect(techRes.body.data.tickets.length).toBe(2);
    });
  });

  describe('GET /api/v1/tickets/:id & Internal Notes Isolation', () => {
    let ticketId: string;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${employee1Token}`)
        .send({ title: 'Confidential Finance Issue', description: 'Need export permissions' });
      ticketId = createRes.body.data.ticket._id;

      // Tech adds a public comment
      await request(app)
        .post(`/api/v1/tickets/${ticketId}/comments`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ comment: 'Hello Alice, investigating your request now.', isInternal: false });

      // Tech adds an internal note
      await request(app)
        .post(`/api/v1/tickets/${ticketId}/comments`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ comment: 'Internal Note: Checking with CFO before granting access.', isInternal: true });
    });

    it('should prevent Employee 2 from viewing Employee 1 ticket (IDOR guard)', async () => {
      const res = await request(app)
        .get(`/api/v1/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${employee2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should filter internal notes when viewed by requester (Employee 1)', async () => {
      const res = await request(app)
        .get(`/api/v1/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${employee1Token}`);

      expect(res.status).toBe(200);
      const events = res.body.data.events;
      const internalNotes = events.filter((e: any) => e.isInternal === true);
      expect(internalNotes.length).toBe(0);
      const publicComments = events.filter((e: any) => e.eventType === 'COMMENT_ADDED');
      expect(publicComments.length).toBe(1);
    });

    it('should include internal notes when viewed by Technician', async () => {
      const res = await request(app)
        .get(`/api/v1/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${techToken}`);

      expect(res.status).toBe(200);
      const events = res.body.data.events;
      const internalNotes = events.filter((e: any) => e.isInternal === true);
      expect(internalNotes.length).toBe(1);
      expect(internalNotes[0].note).toContain('Checking with CFO');
    });
  });

  describe('Ticket State Machine (FSM) Lifecycle & Guards', () => {
    let ticketId: string;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${employee1Token}`)
        .send({ title: 'Printer jamming repeatedly', description: 'HP LaserJet on 3rd floor error 13.00' });
      ticketId = createRes.body.data.ticket._id;
    });

    it('should reject invalid transition OPEN -> IN_PROGRESS without assignment', async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${ticketId}/transition`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ targetStatus: 'IN_PROGRESS' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('should auto-transition to ASSIGNED upon technician assignment', async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${ticketId}/assign`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ assigneeId: techUser._id });

      expect(res.status).toBe(200);
      expect(res.body.data.ticket.status).toBe('ASSIGNED');
      expect(res.body.data.ticket.assigneeId).toBe(techUser._id);
    });

    it('should allow ASSIGNED -> IN_PROGRESS once assigned', async () => {
      await request(app)
        .post(`/api/v1/tickets/${ticketId}/assign`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ assigneeId: techUser._id });

      const res = await request(app)
        .post(`/api/v1/tickets/${ticketId}/transition`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ targetStatus: 'IN_PROGRESS' });

      expect(res.status).toBe(200);
      expect(res.body.data.ticket.status).toBe('IN_PROGRESS');
    });

    it('should reject IN_PROGRESS -> WAITING if waitingReason is missing', async () => {
      await request(app)
        .post(`/api/v1/tickets/${ticketId}/assign`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ assigneeId: techUser._id });

      await request(app)
        .post(`/api/v1/tickets/${ticketId}/transition`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ targetStatus: 'IN_PROGRESS' });

      const res = await request(app)
        .post(`/api/v1/tickets/${ticketId}/transition`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ targetStatus: 'WAITING' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('WAITING_REASON_REQUIRED');
    });

    it('should pause SLA timer when transitioning to WAITING and resume on IN_PROGRESS', async () => {
      await request(app)
        .post(`/api/v1/tickets/${ticketId}/assign`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ assigneeId: techUser._id });

      await request(app)
        .post(`/api/v1/tickets/${ticketId}/transition`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ targetStatus: 'IN_PROGRESS' });

      // Move to WAITING
      const waitRes = await request(app)
        .post(`/api/v1/tickets/${ticketId}/transition`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ targetStatus: 'WAITING', waitingReason: 'Waiting for replacement roller from HP vendor' });

      expect(waitRes.status).toBe(200);
      expect(waitRes.body.data.ticket.status).toBe('WAITING');
      expect(waitRes.body.data.ticket.slaTimers.isPaused).toBe(true);
      expect(waitRes.body.data.ticket.slaTimers.pausedAt).toBeDefined();

      // Resume back to IN_PROGRESS
      const resumeRes = await request(app)
        .post(`/api/v1/tickets/${ticketId}/transition`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ targetStatus: 'IN_PROGRESS' });

      expect(resumeRes.status).toBe(200);
      expect(resumeRes.body.data.ticket.status).toBe('IN_PROGRESS');
      expect(resumeRes.body.data.ticket.slaTimers.isPaused).toBe(false);
      expect(resumeRes.body.data.ticket.slaTimers.totalPausedDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('should prevent Employee from resolving ticket, and require resolution details from Technician', async () => {
      await request(app)
        .post(`/api/v1/tickets/${ticketId}/assign`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ assigneeId: techUser._id });

      await request(app)
        .post(`/api/v1/tickets/${ticketId}/transition`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ targetStatus: 'IN_PROGRESS' });

      // Employee attempts resolution
      const empResolve = await request(app)
        .post(`/api/v1/tickets/${ticketId}/transition`)
        .set('Authorization', `Bearer ${employee1Token}`)
        .send({
          targetStatus: 'RESOLVED',
          resolutionSummary: 'I fixed it myself',
          rootCause: 'Paper jam'
        });

      expect(empResolve.status).toBe(403);
      expect(empResolve.body.error.code).toBe('RESOLVE_FORBIDDEN');

      // Tech resolves with valid details
      const techResolve = await request(app)
        .post(`/api/v1/tickets/${ticketId}/transition`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({
          targetStatus: 'RESOLVED',
          resolutionSummary: 'Replaced pickup roller and cleaned paper path.',
          rootCause: 'Worn hardware component'
        });

      expect(techResolve.status).toBe(200);
      expect(techResolve.body.data.ticket.status).toBe('RESOLVED');
      expect(techResolve.body.data.ticket.slaTimers.resolvedAt).toBeDefined();
    });

    it('should complete full lifecycle: RESOLVED -> CLOSED, and block reopening terminal CLOSED', async () => {
      // Step 1: Assign
      await request(app)
        .post(`/api/v1/tickets/${ticketId}/assign`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ assigneeId: techUser._id });

      // Step 2: In Progress
      await request(app)
        .post(`/api/v1/tickets/${ticketId}/transition`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ targetStatus: 'IN_PROGRESS' });

      // Step 3: Resolve
      await request(app)
        .post(`/api/v1/tickets/${ticketId}/transition`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({
          targetStatus: 'RESOLVED',
          resolutionSummary: 'Replaced roller and tested test print successfully.',
          rootCause: 'Mechanical wear'
        });

      // Step 4: Close confirmed by Employee
      const closeRes = await request(app)
        .post(`/api/v1/tickets/${ticketId}/transition`)
        .set('Authorization', `Bearer ${employee1Token}`)
        .send({ targetStatus: 'CLOSED' });

      expect(closeRes.status).toBe(200);
      expect(closeRes.body.data.ticket.status).toBe('CLOSED');

      // Step 5: Terminal state check - cannot move from CLOSED
      const illegalReopen = await request(app)
        .post(`/api/v1/tickets/${ticketId}/transition`)
        .set('Authorization', `Bearer ${employee1Token}`)
        .send({ targetStatus: 'REOPENED', reopenReason: 'Still broken' });

      expect(illegalReopen.status).toBe(400);
      expect(illegalReopen.body.error.code).toBe('TICKET_CLOSED_TERMINAL');
    });

    it('should allow RESOLVED -> REOPENED when issue returns before closing', async () => {
      await request(app)
        .post(`/api/v1/tickets/${ticketId}/assign`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ assigneeId: techUser._id });

      await request(app)
        .post(`/api/v1/tickets/${ticketId}/transition`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ targetStatus: 'IN_PROGRESS' });

      await request(app)
        .post(`/api/v1/tickets/${ticketId}/transition`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({
          targetStatus: 'RESOLVED',
          resolutionSummary: 'Rebooted printer firmware.',
          rootCause: 'Spooler crash'
        });

      const reopenRes = await request(app)
        .post(`/api/v1/tickets/${ticketId}/transition`)
        .set('Authorization', `Bearer ${employee1Token}`)
        .send({
          targetStatus: 'REOPENED',
          reopenReason: 'Printer stopped responding again 10 minutes after reboot.'
        });

      expect(reopenRes.status).toBe(200);
      expect(reopenRes.body.data.ticket.status).toBe('REOPENED');
      expect(reopenRes.body.data.ticket.reopenCount).toBe(1);
    });
  });

  describe('Work Logs Management', () => {
    let ticketId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${employee1Token}`)
        .send({ title: 'Server high latency', description: 'API p99 latency > 2s' });
      ticketId = res.body.data.ticket._id;
    });

    it('should permit technician to record work logs with activity type', async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${ticketId}/work-logs`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({
          timeSpentMinutes: 45,
          activityType: 'TROUBLESHOOTING',
          description: 'Inspected MongoDB slow query logs and identified missing index on ticketNumber.'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.workLog.timeSpentMinutes).toBe(45);
      expect(res.body.data.workLog.activityType).toBe('TROUBLESHOOTING');

      // Verify work log appears in ticket detail
      const detailRes = await request(app)
        .get(`/api/v1/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${techToken}`);

      expect(detailRes.body.data.workLogs.length).toBe(1);
      expect(detailRes.body.data.workLogs[0].timeSpentMinutes).toBe(45);
    });

    it('should deny employee from logging work entries', async () => {
      const res = await request(app)
        .post(`/api/v1/tickets/${ticketId}/work-logs`)
        .set('Authorization', `Bearer ${employee1Token}`)
        .send({
          timeSpentMinutes: 10,
          activityType: 'INVESTIGATION',
          description: 'Employee trying to log work'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
