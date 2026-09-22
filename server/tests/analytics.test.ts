import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Ticket } from '../src/models/Ticket.js';
import { Asset } from '../src/models/Asset.js';
import { WorkLog } from '../src/models/WorkLog.js';

let mongoServer: MongoMemoryServer;
let adminToken: string;
let managerToken: string;
let employeeToken: string;
let technicianId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Register Admin
  await request(app).post('/api/v1/auth/register').send({
    name: 'Admin Chief',
    email: 'admin@analytics.local',
    password: 'Password123!',
    department: 'IT Executive',
    role: 'SYSTEM_ADMIN'
  });
  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@analytics.local', password: 'Password123!' });
  adminToken = adminLogin.body.data.accessToken;

  // Register IT Manager
  await request(app).post('/api/v1/auth/register').send({
    name: 'Manager Dave',
    email: 'dave@analytics.local',
    password: 'Password123!',
    department: 'Operations',
    role: 'IT_MANAGER'
  });
  const managerLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'dave@analytics.local', password: 'Password123!' });
  managerToken = managerLogin.body.data.accessToken;

  // Register Employee
  await request(app).post('/api/v1/auth/register').send({
    name: 'Staff Alice',
    email: 'alice@analytics.local',
    password: 'Password123!',
    department: 'HR',
    role: 'EMPLOYEE'
  });
  const empLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'alice@analytics.local', password: 'Password123!' });
  employeeToken = empLogin.body.data.accessToken;

  // Create a Technician
  const tech = await User.create({
    name: 'Tech Sarah',
    email: 'sarah@analytics.local',
    passwordHash: 'dummyhash',
    department: 'IT Support',
    role: 'TECHNICIAN',
    skills: ['Networking', 'Hardware Diagnostics'],
    active: true
  });
  technicianId = tech._id.toString();

  // Create Assets
  const asset1 = await Asset.create({
    assetTag: 'AST-ANALYTICS-1',
    serialNumber: 'SN-AN-01',
    name: 'Primary LDAP Authentication Server',
    type: 'SERVER',
    department: 'Infrastructure',
    location: 'Data Center Rack 1',
    status: 'IN_STOCK',
    purchaseDate: new Date('2023-01-01'),
    warrantyExpiry: new Date('2026-01-01'),
    vendor: 'Dell Enterprise',
    isCritical: true,
    incidentTicketIds: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()]
  });

  // Seed sample tickets
  const now = new Date();
  const threeHoursAgo = new Date(now.getTime() - 3 * 3600000);
  const oneHourAgo = new Date(now.getTime() - 1 * 3600000);

  // 1. Resolved Ticket
  const resolvedTicket = await Ticket.create({
    ticketNumber: 'SDP-AN-101',
    title: 'VPN timeout on client machine',
    description: 'Resolved via config reset',
    category: 'NETWORK',
    priority: 'HIGH',
    status: 'RESOLVED',
    requesterId: new mongoose.Types.ObjectId(),
    assigneeId: tech._id,
    createdAt: threeHoursAgo,
    slaTimers: {
      responseDeadline: new Date(now.getTime() + 3600000),
      resolutionDeadline: new Date(now.getTime() + 7200000),
      firstRespondedAt: new Date(threeHoursAgo.getTime() + 1800000),
      resolvedAt: oneHourAgo,
      responseBreached: false,
      resolutionBreached: false,
      isPaused: false,
      totalPausedDurationMs: 0
    },
    riskScore: { score: 30, level: 'MEDIUM', calculatedAt: new Date(), factors: ['PRIORITY_HIGH'] },
    aiAnalysis: { applied: true, confidence: 0.95 }
  });

  // 2. Active In-Progress Ticket with Breach
  await Ticket.create({
    ticketNumber: 'SDP-AN-102',
    title: 'Core Switch flapping in building B',
    description: 'Intermittent packet loss',
    category: 'NETWORK',
    priority: 'CRITICAL',
    status: 'IN_PROGRESS',
    requesterId: new mongoose.Types.ObjectId(),
    assigneeId: tech._id,
    assetId: asset1._id,
    createdAt: new Date(now.getTime() - 10 * 3600000),
    slaTimers: {
      responseDeadline: new Date(now.getTime() - 8 * 3600000),
      resolutionDeadline: new Date(now.getTime() - 2 * 3600000),
      responseBreached: true,
      resolutionBreached: true,
      isPaused: false,
      totalPausedDurationMs: 0
    },
    riskScore: { score: 95, level: 'CRITICAL', calculatedAt: new Date(), factors: ['PRIORITY_CRITICAL', 'SLA_BREACHED'] },
    aiAnalysis: { applied: true, confidence: 0.98 }
  });

  // 3. Log a work entry
  await WorkLog.create({
    ticketId: resolvedTicket._id,
    technicianId: tech._id,
    timeSpentMinutes: 90,
    activityType: 'TROUBLESHOOTING',
    description: 'Reconfigured routing tables and verified ping latency',
    loggedAt: new Date()
  });
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Phase 11: Management Analytics & Executive Dashboards', () => {
  describe('GET /api/v1/analytics/overview', () => {
    it('should return executive KPI summary, MTTR by category, and distributions', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/overview')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const summary = res.body.data.summary;
      expect(summary.totalTickets).toBeGreaterThanOrEqual(2);
      expect(summary.activeTickets).toBeGreaterThanOrEqual(1);
      expect(summary.resolvedTickets).toBeGreaterThanOrEqual(1);
      expect(summary.breachedTickets).toBeGreaterThanOrEqual(1);
      expect(summary.slaComplianceRate).toBeDefined();
      expect(summary.overallMTTRHours).toBeGreaterThanOrEqual(0);

      // MTTR breakdown by category
      const mttrList = res.body.data.mttrByCategory;
      expect(Array.isArray(mttrList)).toBe(true);
      const networkMttr = mttrList.find((m: any) => m.category === 'NETWORK');
      expect(networkMttr).toBeDefined();
      expect(networkMttr.ticketCount).toBeGreaterThanOrEqual(1);

      // Status and Priority distributions
      expect(res.body.data.priorityDistribution).toBeDefined();
      expect(res.body.data.statusDistribution).toBeDefined();
    });

    it('should block non-privileged EMPLOYEE role from accessing executive overview', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/overview')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/analytics/technicians', () => {
    it('should aggregate active tickets and total work log hours per technician', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/technicians')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const techs = res.body.data.technicians;
      expect(Array.isArray(techs)).toBe(true);
      const sarah = techs.find((t: any) => t.technicianId === technicianId);
      expect(sarah).toBeDefined();
      expect(sarah.name).toBe('Tech Sarah');
      expect(sarah.activeTickets).toBeGreaterThanOrEqual(1);
      expect(sarah.resolvedTickets).toBeGreaterThanOrEqual(1);
      expect(sarah.totalTimeLoggedMinutes).toBe(90);
    });
  });

  describe('GET /api/v1/analytics/assets', () => {
    it('should return asset reliability metrics and incident frequency', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/assets')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const assets = res.body.data.assets;
      expect(Array.isArray(assets)).toBe(true);
      const ldapAsset = assets.find((a: any) => a.assetTag === 'AST-ANALYTICS-1');
      expect(ldapAsset).toBeDefined();
      expect(ldapAsset.isCritical).toBe(true);
      expect(ldapAsset.incidentCount).toBe(2);
    });
  });
});
