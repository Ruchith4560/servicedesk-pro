import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Asset } from '../src/models/Asset.js';
import { SLAPolicy } from '../src/models/SLAPolicy.js';

let mongoServer: MongoMemoryServer;
let adminToken: string;
let managerToken: string;
let techToken: string;
let empToken: string;
let techId: string;
let empId: string;
let assetId: string;
let ticketId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // 1. Seed Enterprise SLA Policies
  await SLAPolicy.create([
    {
      name: 'High Priority SLA Policy',
      priority: 'HIGH',
      responseTimeHours: 1,
      resolutionTimeHours: 8,
      businessHoursOnly: false,
      active: true
    },
    {
      name: 'Default Medium SLA Policy',
      priority: 'MEDIUM',
      responseTimeHours: 2,
      resolutionTimeHours: 24,
      businessHoursOnly: false,
      active: true
    }
  ]);

  // 2. Register System Admin
  await request(app).post('/api/v1/auth/register').send({
    name: 'Admin Boss',
    email: 'admin@e2e.local',
    password: 'Password123!',
    department: 'IT Administration',
    role: 'SYSTEM_ADMIN'
  });
  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@e2e.local', password: 'Password123!' });
  adminToken = adminLogin.body.data.accessToken;

  // 3. Register IT Operations Manager
  await request(app).post('/api/v1/auth/register').send({
    name: 'Manager Chloe',
    email: 'chloe@e2e.local',
    password: 'Password123!',
    department: 'IT Operations',
    role: 'IT_MANAGER'
  });
  const managerLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'chloe@e2e.local', password: 'Password123!' });
  managerToken = managerLogin.body.data.accessToken;

  // 4. Register Senior Technician
  const techUser = await User.create({
    name: 'Senior Tech Marcus',
    email: 'marcus@e2e.local',
    passwordHash: 'dummyhash',
    department: 'Hardware Support',
    role: 'TECHNICIAN',
    skills: ['Hardware Repair', 'Component Diagnostics', 'macOS', 'Networking'],
    active: true
  });
  techId = techUser._id.toString();

  // Login as Technician
  const techLoginRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Senior Tech Marcus',
    email: 'marcus.auth@e2e.local',
    password: 'Password123!',
    department: 'Hardware Support',
    role: 'TECHNICIAN'
  });
  techId = techLoginRes.body.data.user._id || techLoginRes.body.data.user.id;
  const techLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'marcus.auth@e2e.local', password: 'Password123!' });
  techToken = techLogin.body.data.accessToken;

  // Update skills on tech user
  await User.findByIdAndUpdate(techId, {
    skills: ['Hardware Repair', 'Component Diagnostics', 'macOS', 'Networking']
  });

  // 5. Register Corporate Employee (Requester)
  const empRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Emily Employee',
    email: 'emily@e2e.local',
    password: 'Password123!',
    department: 'Product Design',
    role: 'EMPLOYEE'
  });
  empId = empRes.body.data.user._id || empRes.body.data.user.id;
  const empLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'emily@e2e.local', password: 'Password123!' });
  empToken = empLogin.body.data.accessToken;

  // 6. Procure Enterprise Laptop Asset
  const asset = await Asset.create({
    assetTag: 'AST-E2E-0099',
    serialNumber: 'SN-E2E-APL-99',
    name: 'MacBook Pro 16 M3 Max',
    type: 'LAPTOP',
    department: 'Product Design',
    location: 'Building 4 Floor 2',
    status: 'ASSIGNED',
    ownerId: new mongoose.Types.ObjectId(empId),
    purchaseDate: new Date('2024-01-15'),
    warrantyExpiry: new Date('2027-01-15'),
    vendor: 'Apple Enterprise',
    isCritical: true,
    incidentTicketIds: []
  });
  assetId = asset._id.toString();
}, 35000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Phase 13: Master End-to-End Enterprise ITSM Lifecycle', () => {
  it('Step 1: Employee creates high-priority incident linked to corporate asset', async () => {
    const res = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${empToken}`)
      .send({
        title: 'Kernel panic on MacBook Pro during 4K render export',
        description: 'System freezes with pink screen artifact and shuts down abruptly when exporting timeline',
        category: 'HARDWARE',
        priority: 'HIGH',
        assetId: assetId,
        tags: ['macOS', 'hardware-crash', 'urgent-production']
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const ticket = res.body.data.ticket;
    ticketId = ticket._id;

    expect(ticket.ticketNumber).toMatch(/^SDP-\d{4}$/);
    expect(ticket.status).toBe('OPEN');
    expect(ticket.priority).toBe('HIGH');
    expect(ticket.category).toBe('HARDWARE');
    expect(ticket.assetId).toBe(assetId);

    // SLA initialization
    expect(ticket.slaTimers).toBeDefined();
    expect(ticket.slaTimers.responseDeadline).toBeDefined();
    expect(ticket.slaTimers.resolutionDeadline).toBeDefined();
    expect(ticket.slaTimers.responseBreached).toBe(false);
    expect(ticket.slaTimers.resolutionBreached).toBe(false);
  });

  it('Step 2: AI Triage & Deterministic Risk scoring are computed', async () => {
    const res = await request(app)
      .get(`/api/v1/tickets/${ticketId}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    const ticket = res.body.data.ticket;
    expect(ticket.riskScore).toBeDefined();
    expect(ticket.riskScore.score).toBeGreaterThan(0);
    expect(ticket.riskScore.factors).toBeDefined();
    expect(ticket.riskScore.factors).toContain('CRITICAL_INFRASTRUCTURE_ASSET');
  });

  it('Step 3: Intelligent Routing Engine suggests optimal technicians', async () => {
    const res = await request(app)
      .get(`/api/v1/tickets/${ticketId}/routing-suggestions`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const suggestions = res.body.data.suggestions;
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThanOrEqual(1);

    const marcus = suggestions.find((r: any) => r.technicianId === techId);
    expect(marcus).toBeDefined();
    expect(marcus.scores.compositeScore).toBeGreaterThan(0);
    expect(marcus.rationale).toBeDefined();
  });

  it('Step 4: IT Manager assigns ticket to recommended Senior Technician', async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        assigneeId: techId,
        notes: 'Assigned based on hardware component repair expertise'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ticket.status).toBe('ASSIGNED');
    expect(res.body.data.ticket.assigneeId).toBe(techId);

    // Verify technician received in-app assignment notification
    const notifRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${techToken}`);

    expect(notifRes.status).toBe(200);
    const assignNotif = notifRes.body.data.notifications.find(
      (n: any) => n.type === 'TICKET_ASSIGNED'
    );
    expect(assignNotif).toBeDefined();
    expect(assignNotif.read).toBe(false);
  });

  it('Step 5: Technician acknowledges ticket and transitions to IN_PROGRESS (stamps First Response)', async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${ticketId}/transition`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({
        targetStatus: 'IN_PROGRESS',
        notes: 'Diagnosing logic board and thermal sensor logs'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.ticket.status).toBe('IN_PROGRESS');
    expect(res.body.data.ticket.slaTimers.firstRespondedAt).toBeDefined();
  });

  it('Step 6: Technician pauses SLA by transitioning to WAITING for vendor parts', async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${ticketId}/transition`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({
        targetStatus: 'WAITING',
        waitingReason: 'Awaiting delivery of replacement Apple GPU thermal module'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.ticket.status).toBe('WAITING');
    expect(res.body.data.ticket.slaTimers.isPaused).toBe(true);
    expect(res.body.data.ticket.slaTimers.pausedAt).toBeDefined();
  });

  it('Step 7: Vendor delivers parts; technician resumes to IN_PROGRESS (resuming SLA clock)', async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${ticketId}/transition`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({
        targetStatus: 'IN_PROGRESS',
        notes: 'Replacement parts arrived from vendor; starting re-paste and assembly'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.ticket.status).toBe('IN_PROGRESS');
    expect(res.body.data.ticket.slaTimers.isPaused).toBe(false);
  });

  it('Step 8: Technician logs 120 minutes of hardware repair work', async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${ticketId}/work-logs`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({
        timeSpentMinutes: 120,
        activityType: 'HARDWARE_REPAIR',
        description: 'Replaced thermal sync module, applied Kryonaut grease, executed 45min Unigine benchmark'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.workLog.timeSpentMinutes).toBe(120);
    expect(res.body.data.workLog.activityType).toBe('HARDWARE_REPAIR');
  });

  it('Step 9: Technician resolves ticket with RCA and resolution summary', async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${ticketId}/transition`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({
        targetStatus: 'RESOLVED',
        rootCause: 'Thermal interface degradation between GPU VRM and chassis heatpipe',
        resolutionSummary: 'Installed replacement high-conductivity thermal assembly and verified 0% throttled frames'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.ticket.status).toBe('RESOLVED');
    expect(res.body.data.ticket.slaTimers.resolvedAt).toBeDefined();
    expect(res.body.data.ticket.rootCause).toContain('Thermal interface degradation');
    expect(res.body.data.ticket.resolutionSummary).toContain('Installed replacement');

    // Verify employee received status change notification
    const empNotifRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${empToken}`);

    expect(empNotifRes.status).toBe(200);
    const statusNotif = empNotifRes.body.data.notifications.find(
      (n: any) => n.type === 'STATUS_CHANGED'
    );
    expect(statusNotif).toBeDefined();
  });

  it('Step 10: Requester verifies and closes ticket into terminal CLOSED state', async () => {
    const res = await request(app)
      .post(`/api/v1/tickets/${ticketId}/transition`)
      .set('Authorization', `Bearer ${empToken}`)
      .send({
        targetStatus: 'CLOSED',
        notes: 'Render export ran flawlessly for 2 hours with no heat spike. Closing ticket.'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.ticket.status).toBe('CLOSED');
    expect(res.body.data.ticket.closedAt).toBeDefined();

    // Verify terminal state rejection: cannot transition a CLOSED ticket
    const invalidRes = await request(app)
      .post(`/api/v1/tickets/${ticketId}/transition`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({
        targetStatus: 'IN_PROGRESS',
        notes: 'Attempting illegal transition from closed'
      });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.success).toBe(false);
  });

  it('Step 11: Analytics and Immutable Audit Ledger confirm lifecycle execution', async () => {
    // 1. Check Executive Analytics
    const analyticsRes = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.data.summary.totalTickets).toBeGreaterThanOrEqual(1);
    expect(analyticsRes.body.data.summary.closedTickets).toBeGreaterThanOrEqual(1);
    expect(analyticsRes.body.data.summary.slaComplianceRate).toBeGreaterThanOrEqual(0);

    // 2. Check Technician Saturation & Time Logged
    const techAnalyticsRes = await request(app)
      .get('/api/v1/analytics/technicians')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(techAnalyticsRes.status).toBe(200);
    const marcusStats = techAnalyticsRes.body.data.technicians.find(
      (t: any) => t.technicianId === techId
    );
    expect(marcusStats).toBeDefined();
    expect(marcusStats.totalTimeLoggedMinutes).toBe(120);

    // 3. Check Audit Ledger
    const auditRes = await request(app)
      .get('/api/v1/audit?resourceType=Ticket')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.events.length).toBeGreaterThanOrEqual(1);

    const ticketAuditEvents = auditRes.body.data.events.filter(
      (e: any) => e.resourceId === ticketId
    );
    expect(ticketAuditEvents.length).toBeGreaterThanOrEqual(2);

    // Verify presence of state mutation before/after diffs
    const statusChangedEvent = ticketAuditEvents.find(
      (e: any) => e.action === 'TICKET_STATUS_CHANGED'
    );
    expect(statusChangedEvent).toBeDefined();
    expect(statusChangedEvent.changes).toBeDefined();
    expect(statusChangedEvent.changes.before).toBeDefined();
    expect(statusChangedEvent.changes.after).toBeDefined();
  });
});
