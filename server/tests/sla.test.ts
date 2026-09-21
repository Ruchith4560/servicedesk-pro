import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Ticket } from '../src/models/Ticket.js';
import { TicketEvent } from '../src/models/TicketEvent.js';
import { SLAPolicy } from '../src/models/SLAPolicy.js';
import { Notification } from '../src/models/Notification.js';
import { SLACalculator } from '../src/modules/sla/sla.calculator.js';
import { SLAEngine } from '../src/modules/sla/sla.engine.js';

let mongoServer: MongoMemoryServer;

let adminToken: string;
let techToken: string;
let techUser: any;
let employeeToken: string;
let employeeUser: any;
let managerUser: any;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Setup Admin
  const adminRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Admin Elena',
    email: 'admin@sla.local',
    password: 'Password123!',
    department: 'Executive IT',
    role: 'SYSTEM_ADMIN'
  });
  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@sla.local', password: 'Password123!' });
  adminToken = adminLogin.body.data.accessToken;

  // Setup Manager
  const mgrRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Manager Marcus',
    email: 'manager@sla.local',
    password: 'Password123!',
    department: 'IT Operations',
    role: 'IT_MANAGER'
  });
  managerUser = mgrRes.body.data.user;

  // Setup Tech
  const techRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Tech Sarah',
    email: 'tech@sla.local',
    password: 'Password123!',
    department: 'IT Support',
    role: 'TECHNICIAN'
  });
  techUser = techRes.body.data.user;
  const techLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'tech@sla.local', password: 'Password123!' });
  techToken = techLogin.body.data.accessToken;

  // Setup Employee
  const empRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Employee Liam',
    email: 'liam@sla.local',
    password: 'Password123!',
    department: 'Engineering',
    role: 'EMPLOYEE'
  });
  employeeUser = empRes.body.data.user;
  const empLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'liam@sla.local', password: 'Password123!' });
  employeeToken = empLogin.body.data.accessToken;
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Ticket.deleteMany({});
  await TicketEvent.deleteMany({});
  await SLAPolicy.deleteMany({});
  await Notification.deleteMany({});

  // Seed default test policies
  await SLAPolicy.create([
    {
      name: 'Critical Incident 24/7 SLA',
      priority: 'CRITICAL',
      responseTimeHours: 0.5, // 30 mins
      resolutionTimeHours: 2.0, // 2 hours
      warningThresholdPercent: 70,
      businessHoursOnly: false,
      active: true
    },
    {
      name: 'High Priority Business Hours SLA',
      priority: 'HIGH',
      responseTimeHours: 2.0,
      resolutionTimeHours: 8.0,
      warningThresholdPercent: 75,
      businessHoursOnly: true,
      businessHours: { startHour: 9, endHour: 17, timezone: 'UTC' },
      active: true
    },
    {
      name: 'Security Rapid Containment SLA',
      priority: 'CRITICAL',
      category: 'SECURITY',
      responseTimeHours: 0.25, // 15 mins
      resolutionTimeHours: 1.0, // 1 hour
      warningThresholdPercent: 60,
      businessHoursOnly: false,
      active: true
    }
  ]);
});

describe('SLA Engine & Background Processing', () => {
  describe('SLACalculator (Business Hours Math)', () => {
    it('should calculate 24/7 calendar elapsed time accurately', () => {
      // Friday 10:00 AM UTC
      const start = new Date('2026-05-15T10:00:00Z');
      const deadline = SLACalculator.calculateDeadline(start, 2.5, false);
      expect(deadline.toISOString()).toBe('2026-05-15T12:30:00.000Z');
    });

    it('should calculate business hours on same day (within window)', () => {
      // Monday 10:00 AM UTC (within 9 to 17 window)
      const start = new Date('2026-05-18T10:00:00Z');
      const deadline = SLACalculator.calculateDeadline(start, 4, true, { startHour: 9, endHour: 17 });
      expect(deadline.toISOString()).toBe('2026-05-18T14:00:00.000Z');
    });

    it('should rollover business hours over weekend (Friday 16:00 -> Monday 12:00)', () => {
      // Friday May 15, 2026 at 16:00 UTC (4 PM)
      // 1 hour left on Friday (16:00 - 17:00)
      // Need 4 hours total -> 3 hours remaining on Monday starting at 09:00 UTC
      // Result: Monday May 18, 2026 at 12:00 UTC
      const fridayLate = new Date('2026-05-15T16:00:00Z');
      const deadline = SLACalculator.calculateDeadline(fridayLate, 4, true, { startHour: 9, endHour: 17 });
      expect(deadline.toISOString()).toBe('2026-05-18T12:00:00.000Z');
    });
  });

  describe('Policy Matching & Ticket Binding', () => {
    it('should automatically bind Category-Specific policy over Priority-only policy', async () => {
      const res = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          title: 'Ransomware alert on workstation',
          description: 'Files encrypted with .lock extension',
          category: 'SECURITY',
          priority: 'CRITICAL'
        });

      expect(res.status).toBe(201);
      const ticket = res.body.data.ticket;
      expect(ticket.slaPolicyId).toBeDefined();

      const boundPolicy = await SLAPolicy.findById(ticket.slaPolicyId);
      expect(boundPolicy?.name).toBe('Security Rapid Containment SLA');
      expect(boundPolicy?.resolutionTimeHours).toBe(1.0);
      expect(ticket.slaTimers.resolutionDeadline).toBeDefined();
    });

    it('should bind priority-level policy when no category-specific policy exists', async () => {
      const res = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          title: 'Database connection timeouts',
          description: 'Postgres reporting 100% pool exhaustion',
          category: 'SOFTWARE',
          priority: 'HIGH'
        });

      expect(res.status).toBe(201);
      const ticket = res.body.data.ticket;

      const boundPolicy = await SLAPolicy.findById(ticket.slaPolicyId);
      expect(boundPolicy?.name).toBe('High Priority Business Hours SLA');
      expect(boundPolicy?.resolutionTimeHours).toBe(8.0);
    });
  });

  describe('SLA Evaluation Engine (Warnings, Breaches & Pauses)', () => {
    let testTicket: any;

    beforeEach(async () => {
      // Create ticket with 1-hour resolution policy (Security Rapid Containment SLA)
      const res = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          title: 'Credential stuffing detected',
          description: 'Suspicious IP trying 5000 logins',
          category: 'SECURITY',
          priority: 'CRITICAL'
        });
      testTicket = res.body.data.ticket;

      // Assign to technician
      await request(app)
        .post(`/api/v1/tickets/${testTicket._id}/assign`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ assigneeId: techUser._id });
    });

    it('should trigger SLA Warning when consumed time exceeds threshold (60%)', async () => {
      const createdTime = new Date(testTicket.createdAt).getTime();

      // Advance evaluation clock to 40 mins later (40 / 60 = 66.6% consumed, >= 60% threshold)
      const warningTime = new Date(createdTime + 40 * 60 * 1000);

      const evalResult = await SLAEngine.evaluateSLAs(warningTime);
      expect(evalResult.warningsTriggered).toBe(1);
      expect(evalResult.breachesTriggered).toBe(0);

      // Verify SLA Warning Event logged
      const warningEvent = await TicketEvent.findOne({
        ticketId: testTicket._id,
        eventType: 'SLA_WARNING'
      });
      expect(warningEvent).not.toBeNull();

      // Verify Notification sent to Assignee
      const notif = await Notification.findOne({
        recipientId: techUser._id,
        type: 'SLA_WARNING'
      });
      expect(notif).not.toBeNull();
      expect(notif?.title).toContain('SLA Warning Threshold');
    });

    it('should detect Resolution SLA breach, escalate ticket, and notify IT Managers', async () => {
      const createdTime = new Date(testTicket.createdAt).getTime();

      // Advance evaluation clock to 65 mins later (> 60 mins target)
      const breachTime = new Date(createdTime + 65 * 60 * 1000);

      const evalResult = await SLAEngine.evaluateSLAs(breachTime);
      expect(evalResult.breachesTriggered).toBeGreaterThanOrEqual(1);

      // Verify ticket state updated in DB
      const updatedTicket = await Ticket.findById(testTicket._id);
      expect(updatedTicket?.slaTimers.resolutionBreached).toBe(true);
      expect(updatedTicket?.riskScore.score).toBe(95);

      // Verify SLA Breach Event in timeline
      const breachEvent = await TicketEvent.findOne({
        ticketId: testTicket._id,
        eventType: 'SLA_BREACHED'
      });
      expect(breachEvent).not.toBeNull();

      // Verify Escalation Notification sent to IT Manager
      const escalationNotif = await Notification.findOne({
        recipientId: managerUser._id,
        type: 'TICKET_ESCALATED'
      });
      expect(escalationNotif).not.toBeNull();
      expect(escalationNotif?.title).toContain('Critical SLA Escalation');
    });

    it('should NOT breach resolution SLA if ticket is PAUSED in WAITING status', async () => {
      // Transition ticket to IN_PROGRESS then WAITING
      await request(app)
        .post(`/api/v1/tickets/${testTicket._id}/transition`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ targetStatus: 'IN_PROGRESS' });

      await request(app)
        .post(`/api/v1/tickets/${testTicket._id}/transition`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({ targetStatus: 'WAITING', waitingReason: 'Waiting on user screenshot of MFA error' });

      const createdTime = new Date(testTicket.createdAt).getTime();
      // Advance evaluation clock to 90 mins later (> 60 mins)
      const lateTime = new Date(createdTime + 90 * 60 * 1000);

      const evalResult = await SLAEngine.evaluateSLAs(lateTime);
      expect(evalResult.breachesTriggered).toBe(0);

      const ticketAfter = await Ticket.findById(testTicket._id);
      expect(ticketAfter?.slaTimers.resolutionBreached).toBe(false);
      expect(ticketAfter?.slaTimers.isPaused).toBe(true);
    });
  });

  describe('SLA Dashboard Endpoints', () => {
    it('should return at-risk tickets with high operational risk score', async () => {
      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ title: 'Critical outage', description: 'Production API down', priority: 'CRITICAL' });

      const ticketId = createRes.body.data.ticket._id;

      // Artificially simulate high risk score
      await Ticket.findByIdAndUpdate(ticketId, { 'riskScore.score': 85 });

      const res = await request(app)
        .get('/api/v1/sla/at-risk')
        .set('Authorization', `Bearer ${techToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.count).toBeGreaterThanOrEqual(1);
      expect(res.body.data.tickets[0]._id).toBe(ticketId);
    });

    it('should return breached tickets in breach dashboard', async () => {
      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ title: 'Breached ticket test', description: 'Already past target', priority: 'LOW' });

      const ticketId = createRes.body.data.ticket._id;

      await Ticket.findByIdAndUpdate(ticketId, {
        'slaTimers.resolutionBreached': true
      });

      const res = await request(app)
        .get('/api/v1/sla/breaches')
        .set('Authorization', `Bearer ${techToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.count).toBe(1);
      expect(res.body.data.tickets[0]._id).toBe(ticketId);
    });
  });
});
