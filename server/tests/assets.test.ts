import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Asset } from '../src/models/Asset.js';
import { AssetEvent } from '../src/models/AssetEvent.js';
import { Ticket } from '../src/models/Ticket.js';
import { TicketEvent } from '../src/models/TicketEvent.js';

let mongoServer: MongoMemoryServer;

let adminToken: string;
let assetManagerToken: string;
let assetManagerUser: any;
let techToken: string;
let employee1Token: string;
let employee1User: any;
let employee2Token: string;
let employee2User: any;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Setup Admin
  const adminRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Elena Admin',
    email: 'admin@asset.local',
    password: 'Password123!',
    department: 'IT Administration',
    role: 'SYSTEM_ADMIN'
  });
  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@asset.local', password: 'Password123!' });
  adminToken = adminLogin.body.data.accessToken;

  // Setup Asset Manager
  const amRes = await request(app).post('/api/v1/auth/register').send({
    name: 'David Keller',
    email: 'david@asset.local',
    password: 'Password123!',
    department: 'Procurement',
    role: 'ASSET_MANAGER'
  });
  assetManagerUser = amRes.body.data.user;
  const amLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'david@asset.local', password: 'Password123!' });
  assetManagerToken = amLogin.body.data.accessToken;

  // Setup Tech
  const techRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Sarah Tech',
    email: 'tech@asset.local',
    password: 'Password123!',
    department: 'IT Support',
    role: 'TECHNICIAN'
  });
  const techLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'tech@asset.local', password: 'Password123!' });
  techToken = techLogin.body.data.accessToken;

  // Setup Employee 1
  const emp1Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Emma Watson',
    email: 'emma@asset.local',
    password: 'Password123!',
    department: 'Finance',
    role: 'EMPLOYEE'
  });
  employee1User = emp1Res.body.data.user;
  const emp1Login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'emma@asset.local', password: 'Password123!' });
  employee1Token = emp1Login.body.data.accessToken;

  // Setup Employee 2
  const emp2Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Liam Zhang',
    email: 'liam@asset.local',
    password: 'Password123!',
    department: 'Engineering',
    role: 'EMPLOYEE'
  });
  employee2User = emp2Res.body.data.user;
  const emp2Login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'liam@asset.local', password: 'Password123!' });
  employee2Token = emp2Login.body.data.accessToken;
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Asset.deleteMany({});
  await AssetEvent.deleteMany({});
  await Ticket.deleteMany({});
  await TicketEvent.deleteMany({});
});

describe('Asset Management & Lifecycle Module', () => {
  const sampleAsset = {
    assetTag: 'AST-1001',
    serialNumber: 'SN-ABC-12345',
    name: 'MacBook Pro 16 M3 Max',
    type: 'LAPTOP',
    department: 'Finance',
    location: 'Building A, Floor 3, Desk 42',
    status: 'IN_STOCK',
    purchaseDate: '2024-01-15',
    warrantyExpiry: '2027-01-15',
    vendor: 'Apple Enterprise',
    cost: 3499,
    isCritical: false
  };

  describe('POST /api/v1/assets (Creation & Uniqueness)', () => {
    it('should permit ASSET_MANAGER to register asset and log PROCURED event', async () => {
      const res = await request(app)
        .post('/api/v1/assets')
        .set('Authorization', `Bearer ${assetManagerToken}`)
        .send(sampleAsset);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.asset.assetTag).toBe('AST-1001');
      expect(res.body.data.asset.status).toBe('IN_STOCK');

      // Verify event logged in AssetEvent
      const event = await AssetEvent.findOne({ assetId: res.body.data.asset._id });
      expect(event).not.toBeNull();
      expect(event?.eventType).toBe('PROCURED');
    });

    it('should reject duplicate assetTag with 409 Conflict', async () => {
      await request(app)
        .post('/api/v1/assets')
        .set('Authorization', `Bearer ${assetManagerToken}`)
        .send(sampleAsset);

      const duplicateRes = await request(app)
        .post('/api/v1/assets')
        .set('Authorization', `Bearer ${assetManagerToken}`)
        .send({
          ...sampleAsset,
          serialNumber: 'DIFFERENT-SN'
        });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.error.code).toBe('ASSET_TAG_EXISTS');
    });

    it('should deny non-asset managers (EMPLOYEE and TECHNICIAN) from creating assets', async () => {
      const empRes = await request(app)
        .post('/api/v1/assets')
        .set('Authorization', `Bearer ${employee1Token}`)
        .send(sampleAsset);
      expect(empRes.status).toBe(403);

      const techRes = await request(app)
        .post('/api/v1/assets')
        .set('Authorization', `Bearer ${techToken}`)
        .send(sampleAsset);
      expect(techRes.status).toBe(403);
    });
  });

  describe('GET /api/v1/assets (Role-Scoped Inventory Visibility)', () => {
    let asset1Id: string;
    let asset2Id: string;

    beforeEach(async () => {
      // Asset 1 assigned to Emma
      const a1 = await request(app)
        .post('/api/v1/assets')
        .set('Authorization', `Bearer ${assetManagerToken}`)
        .send({ ...sampleAsset, assetTag: 'AST-1001', serialNumber: 'SN-001' });
      asset1Id = a1.body.data.asset._id;

      await request(app)
        .post(`/api/v1/assets/${asset1Id}/assign`)
        .set('Authorization', `Bearer ${assetManagerToken}`)
        .send({ ownerId: employee1User._id });

      // Asset 2 unassigned (In stock)
      const a2 = await request(app)
        .post('/api/v1/assets')
        .set('Authorization', `Bearer ${assetManagerToken}`)
        .send({ ...sampleAsset, assetTag: 'AST-1002', serialNumber: 'SN-002', name: 'Dell Monitor' });
      asset2Id = a2.body.data.asset._id;
    });

    it('should restrict Employee to only view assets assigned to them', async () => {
      const res = await request(app)
        .get('/api/v1/assets')
        .set('Authorization', `Bearer ${employee1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.assets.length).toBe(1);
      expect(res.body.data.assets[0].assetTag).toBe('AST-1001');

      // Employee 2 has 0 assigned assets
      const emp2Res = await request(app)
        .get('/api/v1/assets')
        .set('Authorization', `Bearer ${employee2Token}`);

      expect(emp2Res.status).toBe(200);
      expect(emp2Res.body.data.assets.length).toBe(0);
    });

    it('should allow Asset Manager and Technicians to view all inventory assets', async () => {
      const res = await request(app)
        .get('/api/v1/assets')
        .set('Authorization', `Bearer ${techToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.assets.length).toBe(2);
    });
  });

  describe('Asset Lifecycle Transitions & Assignment', () => {
    let assetId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/assets')
        .set('Authorization', `Bearer ${assetManagerToken}`)
        .send(sampleAsset);
      assetId = res.body.data.asset._id;
    });

    it('should assign asset to user and update status to ASSIGNED', async () => {
      const res = await request(app)
        .post(`/api/v1/assets/${assetId}/assign`)
        .set('Authorization', `Bearer ${assetManagerToken}`)
        .send({ ownerId: employee1User._id, notes: 'Deploying laptop for new hire' });

      expect(res.status).toBe(200);
      expect(res.body.data.asset.status).toBe('ASSIGNED');
      expect(res.body.data.asset.ownerId).toBe(employee1User._id);

      // Verify event
      const event = await AssetEvent.findOne({ assetId, eventType: 'ASSIGNED' });
      expect(event).not.toBeNull();
      expect(event?.newOwnerId?.toString()).toBe(employee1User._id);
    });

    it('should transition to UNDER_REPAIR and back to IN_STOCK with complete event audit trail', async () => {
      // 1. In Stock -> Under Repair
      const repairRes = await request(app)
        .patch(`/api/v1/assets/${assetId}/status`)
        .set('Authorization', `Bearer ${assetManagerToken}`)
        .send({ status: 'UNDER_REPAIR', notes: 'Battery swelling detected' });

      expect(repairRes.status).toBe(200);
      expect(repairRes.body.data.asset.status).toBe('UNDER_REPAIR');

      // 2. Under Repair -> In Stock
      const stockRes = await request(app)
        .patch(`/api/v1/assets/${assetId}/status`)
        .set('Authorization', `Bearer ${assetManagerToken}`)
        .send({ status: 'IN_STOCK', notes: 'Battery replaced under warranty' });

      expect(stockRes.status).toBe(200);
      expect(stockRes.body.data.asset.status).toBe('IN_STOCK');

      // Verify full history
      const detail = await request(app)
        .get(`/api/v1/assets/${assetId}`)
        .set('Authorization', `Bearer ${assetManagerToken}`);

      expect(detail.status).toBe(200);
      expect(detail.body.data.events.length).toBeGreaterThanOrEqual(3);
    });

    it('should lock RETIRED assets as terminal state', async () => {
      // Retire asset
      const retireRes = await request(app)
        .patch(`/api/v1/assets/${assetId}/status`)
        .set('Authorization', `Bearer ${assetManagerToken}`)
        .send({ status: 'RETIRED', notes: 'End of 5-year hardware lifecycle' });

      expect(retireRes.status).toBe(200);
      expect(retireRes.body.data.asset.status).toBe('RETIRED');

      // Attempt to move from RETIRED -> IN_STOCK
      const illegalRes = await request(app)
        .patch(`/api/v1/assets/${assetId}/status`)
        .set('Authorization', `Bearer ${assetManagerToken}`)
        .send({ status: 'IN_STOCK' });

      expect(illegalRes.status).toBe(400);
      expect(illegalRes.body.error.code).toBe('ASSET_RETIRED_TERMINAL');
    });
  });

  describe('Ticket & Asset Incident Correlation', () => {
    it('should link incident ticket to asset and elevate risk score for critical infrastructure', async () => {
      // 1. Create critical infrastructure server asset
      const serverAsset = await request(app)
        .post('/api/v1/assets')
        .set('Authorization', `Bearer ${assetManagerToken}`)
        .send({
          ...sampleAsset,
          assetTag: 'AST-SRV-99',
          serialNumber: 'SRV-XYZ-88',
          name: 'Core LDAP Production Server',
          type: 'SERVER',
          department: 'IT Operations',
          location: 'Austin DC Rack 1',
          isCritical: true
        });

      const serverAssetId = serverAsset.body.data.asset._id;

      // 2. Submit ticket linked to this critical asset
      const ticketRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${employee1Token}`)
        .send({
          title: 'LDAP Authentication Timeout',
          description: 'Production users unable to authenticate against primary server',
          category: 'SECURITY',
          priority: 'HIGH',
          assetId: serverAssetId
        });

      expect(ticketRes.status).toBe(201);
      const ticket = ticketRes.body.data.ticket;
      expect(ticket.assetId).toBe(serverAssetId);
      // Risk score should be boosted to at least 75 for critical infrastructure
      expect(ticket.riskScore.score).toBeGreaterThanOrEqual(75);
      expect(ticket.riskScore.factors).toContain('CRITICAL_INFRASTRUCTURE_ASSET');

      // 3. Verify asset incident correlation in asset history
      const assetDetail = await request(app)
        .get(`/api/v1/assets/${serverAssetId}`)
        .set('Authorization', `Bearer ${assetManagerToken}`);

      expect(assetDetail.status).toBe(200);
      expect(assetDetail.body.data.asset.incidentTicketIds.length).toBe(1);
      expect(assetDetail.body.data.asset.incidentTicketIds[0]._id).toBe(ticket._id);
    });
  });
});
