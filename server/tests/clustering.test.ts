import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { Ticket } from '../src/models/Ticket.js';
import { AuditEvent } from '../src/models/AuditEvent.js';

describe('Phase 17: Semantic Duplicate Detection & Incident Clustering', () => {
  let mongoServer: MongoMemoryServer;
  let adminToken: string;
  let technicianToken: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    // Register Admin
    await request(app).post('/api/v1/auth/register').send({
      name: 'System Admin',
      email: 'admin@cluster.test',
      password: 'AdminPassword123!',
      department: 'Executive IT',
      role: 'SYSTEM_ADMIN'
    });

    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@cluster.test',
      password: 'AdminPassword123!'
    });
    adminToken = adminLogin.body.data.accessToken;

    // Register Technician
    await request(app).post('/api/v1/auth/register').send({
      name: 'Network Tech',
      email: 'tech@cluster.test',
      password: 'TechPassword123!',
      department: 'Network Operations',
      role: 'TECHNICIAN'
    });

    const techLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'tech@cluster.test',
      password: 'TechPassword123!'
    });
    technicianToken = techLogin.body.data.accessToken;
  });

  describe('GET /api/v1/tickets/:id/duplicates (Semantic Duplicate Detection)', () => {
    it('should detect duplicate incident candidates using semantic similarity', async () => {
      // Create primary target incident
      const t1 = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'VPN connection drops repeatedly',
          description: 'AnyConnect remote VPN client drops connection every 5 minutes while working.',
          category: 'NETWORK',
          priority: 'HIGH'
        });

      // Create duplicate incident
      const t2 = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'VPN connection drops frequently',
          description: 'Remote VPN tunnel keeps disconnecting and failing every few minutes.',
          category: 'NETWORK',
          priority: 'HIGH'
        });

      // Create unrelated incident
      await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Ergonomic keyboard wrist rest',
          description: 'Requesting an ergonomic gel wrist rest for desktop workstation.',
          category: 'HARDWARE',
          priority: 'LOW'
        });

      const res = await request(app)
        .get(`/api/v1/tickets/${t1.body.data.ticket._id}/duplicates`)
        .set('Authorization', `Bearer ${technicianToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.targetTicketNumber).toBe(t1.body.data.ticket.ticketNumber);
      expect(res.body.data.duplicates.length).toBeGreaterThanOrEqual(1);

      const matchedCandidate = res.body.data.duplicates.find(
        (d: any) => d.id === t2.body.data.ticket._id
      );
      expect(matchedCandidate).toBeDefined();
      expect(matchedCandidate.similarityScore).toBeGreaterThanOrEqual(0.35);
      expect(['HIGH', 'EXACT', 'MEDIUM']).toContain(matchedCandidate.matchLevel);
    });
  });

  describe('POST /api/v1/tickets/:id/cluster (Major Incident & Child Clustering)', () => {
    it('should cluster child tickets into parent incident and elevate risk score', async () => {
      const parentRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Core Switch Outage on Floor 4',
          description: 'All network drops on floor 4 are down due to Cisco switch power failure.',
          category: 'NETWORK',
          priority: 'CRITICAL'
        });

      const childRes1 = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Cannot connect to wired LAN on 4th floor',
          description: 'Ethernet cable has no link light at desk 412.',
          category: 'NETWORK',
          priority: 'HIGH'
        });

      const childRes2 = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Network down floor 4',
          description: 'No internet access in meeting room 4B.',
          category: 'NETWORK',
          priority: 'HIGH'
        });

      const parentId = parentRes.body.data.ticket._id;
      const childId1 = childRes1.body.data.ticket._id;
      const childId2 = childRes2.body.data.ticket._id;

      // Cluster both children into parent
      const clusterRes = await request(app)
        .post(`/api/v1/tickets/${parentId}/cluster`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({
          childTicketIds: [childId1, childId2],
          reason: 'Switch power outage causing floor-wide connectivity loss'
        });

      expect(clusterRes.status).toBe(200);
      expect(clusterRes.body.data.ticket.duplicateTickets.length).toBe(2);
      expect(clusterRes.body.data.ticket.isMajorIncident).toBe(true);

      // Verify child tickets have parentIncidentId
      const c1 = await Ticket.findById(childId1);
      const c2 = await Ticket.findById(childId2);
      expect(c1?.parentIncidentId?.toString()).toBe(parentId);
      expect(c2?.parentIncidentId?.toString()).toBe(parentId);

      // Verify parent risk score was elevated
      const p = await Ticket.findById(parentId);
      expect(p?.riskScore.score).toBeGreaterThanOrEqual(75);
      expect(p?.riskScore.factors).toContain('MAJOR_INCIDENT_DECLARED');

      // Verify Audit Ledger recorded the cluster event
      const audit = await AuditEvent.findOne({
        action: 'TICKETS_CLUSTERED',
        resourceId: parentId
      });
      expect(audit).toBeDefined();
    });

    it('should automatically cascade resolution to all clustered child tickets when parent is resolved', async () => {
      const parentRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'LDAP Authentication Gateway Error',
          description: 'LDAP server running out of socket descriptors.',
          category: 'ACCESS_IAM',
          priority: 'CRITICAL'
        });

      const childRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Cannot login to LDAP portal',
          description: 'Invalid credentials prompt even with correct password.',
          category: 'ACCESS_IAM',
          priority: 'HIGH'
        });

      const parentId = parentRes.body.data.ticket._id;
      const childId = childRes.body.data.ticket._id;

      // Cluster child into parent
      await request(app)
        .post(`/api/v1/tickets/${parentId}/cluster`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({
          childTicketIds: [childId],
          reason: 'Related to LDAP gateway socket exhaustion'
        });

      // Move parent through FSM: OPEN -> ASSIGNED -> IN_PROGRESS -> RESOLVED
      const techUser = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${technicianToken}`);
      const techId = techUser.body.data.user.userId;

      const assignRes = await request(app)
        .post(`/api/v1/tickets/${parentId}/assign`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ assigneeId: techId });
      expect(assignRes.status).toBe(200);

      const inProgressRes = await request(app)
        .post(`/api/v1/tickets/${parentId}/transition`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ targetStatus: 'IN_PROGRESS' });
      expect(inProgressRes.status).toBe(200);

      const resolveRes = await request(app)
        .post(`/api/v1/tickets/${parentId}/transition`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({
          targetStatus: 'RESOLVED',
          resolutionSummary: 'Restarted LDAP gateway process and increased ulimit file descriptors.',
          rootCause: 'Socket descriptor pool leak in legacy gateway daemon.'
        });

      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.data.ticket.status).toBe('RESOLVED');

      // Verify child ticket was automatically transitioned to RESOLVED
      const updatedChild = await Ticket.findById(childId);
      expect(updatedChild?.status).toBe('RESOLVED');
      expect(updatedChild?.resolutionSummary).toContain('Resolved via Major Parent Incident');
      expect(updatedChild?.rootCause).toContain('Socket descriptor pool leak');
    });

    it('should reject clustering into an invalid child target', async () => {
      const t1 = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Primary root problem report',
          description: 'Network switch power failure description in server room.',
          category: 'SOFTWARE',
          priority: 'LOW'
        });

      const t2 = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Secondary dependent problem report',
          description: 'Workstation ethernet port down description on desk.',
          category: 'SOFTWARE',
          priority: 'LOW'
        });

      const t3 = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Third dependent incident report',
          description: 'VoIP phone offline in conference room audio rack.',
          category: 'SOFTWARE',
          priority: 'LOW'
        });

      // Cluster T2 into T1 (T2 becomes child)
      const cRes1 = await request(app)
        .post(`/api/v1/tickets/${t1.body.data.ticket._id}/cluster`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ childTicketIds: [t2.body.data.ticket._id] });
      expect(cRes1.status).toBe(200);

      // Attempting to cluster T3 into T2 should fail with 400 because T2 is already a child
      const invalidRes = await request(app)
        .post(`/api/v1/tickets/${t2.body.data.ticket._id}/cluster`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({ childTicketIds: [t3.body.data.ticket._id] });

      expect(invalidRes.status).toBe(400);
      expect(invalidRes.body.error.code).toBe('INVALID_CLUSTER_TARGET');
    });
  });
});
