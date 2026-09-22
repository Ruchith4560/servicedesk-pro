import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Ticket } from '../src/models/Ticket.js';
import { Asset } from '../src/models/Asset.js';
import { RiskEngine } from '../src/modules/tickets/risk.engine.js';
import { RoutingEngine } from '../src/modules/tickets/routing.engine.js';

let mongoServer: MongoMemoryServer;
let adminToken: string;
let managerToken: string;
let employeeToken: string;
let tech1Id: string;
let tech2Id: string;
let testAssetId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Create Admin
  const adminRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Admin Boss',
    email: 'admin@routing.local',
    password: 'Password123!',
    department: 'IT Infrastructure',
    role: 'SYSTEM_ADMIN'
  });
  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@routing.local', password: 'Password123!' });
  adminToken = adminLogin.body.data.accessToken;

  // Create Manager
  await request(app).post('/api/v1/auth/register').send({
    name: 'Manager Sarah',
    email: 'sarah@routing.local',
    password: 'Password123!',
    department: 'IT Service Desk',
    role: 'IT_MANAGER'
  });
  const managerLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'sarah@routing.local', password: 'Password123!' });
  managerToken = managerLogin.body.data.accessToken;

  // Create Employee
  await request(app).post('/api/v1/auth/register').send({
    name: 'End User Tom',
    email: 'tom@routing.local',
    password: 'Password123!',
    department: 'Sales',
    role: 'EMPLOYEE'
  });
  const employeeLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'tom@routing.local', password: 'Password123!' });
  employeeToken = employeeLogin.body.data.accessToken;

  // Create Technicians with specific skills
  const tech1 = await User.create({
    name: 'Alice Networker',
    email: 'alice@routing.local',
    passwordHash: 'dummyhash',
    department: 'IT Support',
    role: 'TECHNICIAN',
    skills: ['Networking', 'VPN', 'Cisco AnyConnect', 'Firewall'],
    active: true
  });
  tech1Id = tech1._id.toString();

  const tech2 = await User.create({
    name: 'Bob Hardware',
    email: 'bob@routing.local',
    passwordHash: 'dummyhash',
    department: 'Hardware Services',
    role: 'TECHNICIAN',
    skills: ['Hardware Diagnostics', 'Laptop Repair', 'Printer Maintenance'],
    active: true
  });
  tech2Id = tech2._id.toString();

  // Create a Critical Asset
  const asset = await Asset.create({
    assetTag: 'AST-CRIT-001',
    serialNumber: 'SN-CRIT-999',
    name: 'Core Border Gateway Router',
    type: 'NETWORK_DEVICE',
    department: 'IT Infrastructure',
    location: 'Server Room Rack 4',
    status: 'IN_STOCK',
    purchaseDate: new Date('2024-01-01'),
    warrantyExpiry: new Date('2027-01-01'),
    vendor: 'Cisco',
    isCritical: true,
    incidentTicketIds: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()]
  });
  testAssetId = asset._id.toString();
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Ticket.deleteMany({});
});

describe('Phase 9: Intelligent Routing & Deterministic Risk Scoring', () => {
  describe('RiskEngine: Multi-Factor Risk Calculation', () => {
    it('should elevate risk score for CRITICAL priority, SECURITY category, and critical asset with repeated incidents', async () => {
      // 1. Create a ticket linked to critical asset
      const res = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          title: 'DDoS vulnerability observed on core firewall gateway',
          description: 'Intrusion detection flagged abnormal SYN flood traffic on border gateway',
          category: 'SECURITY',
          priority: 'CRITICAL',
          assetId: testAssetId
        });

      expect(res.status).toBe(201);
      const ticket = res.body.data.ticket;

      expect(ticket.riskScore).toBeDefined();
      // CRITICAL priority (50) + SECURITY category (30) + Critical Asset (25) + Repeated Incidents >= 3 (15) = 120 -> capped at 100
      expect(ticket.riskScore.score).toBe(100);
      expect(ticket.riskScore.level).toBe('CRITICAL');
      expect(ticket.riskScore.factors).toContain('PRIORITY_CRITICAL');
      expect(ticket.riskScore.factors).toContain('SECURITY_INCIDENT');
      expect(ticket.riskScore.factors).toContain('CRITICAL_INFRASTRUCTURE_ASSET');
      expect(ticket.riskScore.factors).toContain('REPEATED_ASSET_FAILURES');
    });

    it('should recalculate risk score dynamically via POST /:id/recalculate-risk', async () => {
      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          title: 'Low priority keyboard replacement',
          description: 'Spacebar sticking on standard USB keyboard',
          category: 'HARDWARE',
          priority: 'LOW'
        });

      const ticketId = createRes.body.data.ticket._id;

      // Simulate SLA breach directly on DB
      await Ticket.findByIdAndUpdate(ticketId, {
        'slaTimers.responseBreached': true,
        reopenCount: 2
      });

      const recalcRes = await request(app)
        .post(`/api/v1/tickets/${ticketId}/recalculate-risk`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(recalcRes.status).toBe(200);
      expect(recalcRes.body.success).toBe(true);
      const riskScore = recalcRes.body.data.riskScore;

      // LOW (5) + SLA_BREACHED (25) + CHRONIC_REOPEN_LOOP (20) = 50 -> HIGH
      expect(riskScore.score).toBe(50);
      expect(riskScore.level).toBe('HIGH');
      expect(riskScore.factors).toContain('SLA_BREACHED');
      expect(riskScore.factors).toContain('CHRONIC_REOPEN_LOOP');
    });
  });

  describe('RoutingEngine: Skill Matching, Workload Balancing & Auto-Routing', () => {
    it('should rank Alice Networker above Bob Hardware for a NETWORK incident with VPN keywords', async () => {
      // Create a network ticket
      const ticketRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          title: 'AnyConnect VPN gateway connection timeout',
          description: 'Cannot establish corporate VPN tunnel from home office',
          category: 'NETWORK',
          priority: 'HIGH'
        });

      const ticketId = ticketRes.body.data.ticket._id;

      const suggestionsRes = await request(app)
        .get(`/api/v1/tickets/${ticketId}/routing-suggestions`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(suggestionsRes.status).toBe(200);
      expect(suggestionsRes.body.success).toBe(true);
      const suggestions = suggestionsRes.body.data.suggestions;

      expect(suggestions.length).toBeGreaterThanOrEqual(2);
      // Alice (Networking, VPN, Cisco AnyConnect) should be #1
      expect(suggestions[0].name).toBe('Alice Networker');
      expect(suggestions[0].matchedSkills).toContain('Networking');
      expect(suggestions[0].scores.skillScore).toBeGreaterThan(suggestions[1].scores.skillScore);
      expect(suggestions[0].scores.compositeScore).toBeGreaterThan(suggestions[1].scores.compositeScore);
    });

    it('should penalize technician workload when they have active tickets', async () => {
      // Assign 3 active tickets to Alice
      for (let i = 0; i < 3; i++) {
        await Ticket.create({
          ticketNumber: `SDP-TEST-${i}`,
          title: `Active task ${i}`,
          description: 'Doing work',
          category: 'NETWORK',
          priority: 'MEDIUM',
          status: 'IN_PROGRESS',
          assigneeId: tech1Id,
          requesterId: new mongoose.Types.ObjectId()
        });
      }

      const ticket = await Ticket.create({
        ticketNumber: 'SDP-ROUTING-WORKLOAD',
        title: 'Network printer unreachable',
        description: 'Office network printer cannot be pinged',
        category: 'NETWORK',
        priority: 'MEDIUM',
        status: 'OPEN',
        requesterId: new mongoose.Types.ObjectId()
      });

      const rankings = await RoutingEngine.getRoutingSuggestions(ticket._id.toString());
      const alice = rankings.find((r) => r.technicianId === tech1Id);
      const bob = rankings.find((r) => r.technicianId === tech2Id);

      expect(alice).toBeDefined();
      expect(bob).toBeDefined();
      expect(alice!.activeTicketCount).toBe(3);
      expect(bob!.activeTicketCount).toBe(0);
      expect(bob!.scores.workloadScore).toBe(35);
      expect(alice!.scores.workloadScore).toBeLessThan(bob!.scores.workloadScore);
    });

    it('should auto-route ticket to top candidate and update ticket status to ASSIGNED', async () => {
      const ticketRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          title: 'Laptop motherboard fan failure and overheating',
          description: 'Hardware diagnostics report CPU throttling and fan failure',
          category: 'HARDWARE',
          priority: 'HIGH'
        });

      const ticketId = ticketRes.body.data.ticket._id;

      const autoRouteRes = await request(app)
        .post(`/api/v1/tickets/${ticketId}/auto-route`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(autoRouteRes.status).toBe(200);
      expect(autoRouteRes.body.success).toBe(true);
      expect(autoRouteRes.body.data.assignedTechnician).toBeDefined();
      // Bob has Hardware Diagnostics & Laptop Repair skills
      expect(autoRouteRes.body.data.assignedTechnician.name).toBe('Bob Hardware');
      expect(autoRouteRes.body.data.ticket.status).toBe('ASSIGNED');
      expect(autoRouteRes.body.data.ticket.assigneeId).toBe(tech2Id);
    });

    it('should reject auto-route request from an EMPLOYEE with 403 Forbidden', async () => {
      const ticket = await Ticket.create({
        ticketNumber: 'SDP-FORBIDDEN-TEST',
        title: 'Employee test',
        description: 'Testing employee authorization',
        category: 'SOFTWARE',
        priority: 'LOW',
        status: 'OPEN',
        requesterId: new mongoose.Types.ObjectId()
      });

      const res = await request(app)
        .post(`/api/v1/tickets/${ticket._id}/auto-route`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
    });
  });
});
