import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Notification } from '../src/models/Notification.js';
import { AuditEvent } from '../src/models/AuditEvent.js';
import { NotificationsService } from '../src/modules/notifications/notifications.service.js';

let mongoServer: MongoMemoryServer;
let adminToken: string;
let managerToken: string;
let techToken: string;
let empToken: string;
let techId: string;
let empId: string;
let adminId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // 1. Register Admin
  const adminRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Admin Chief',
    email: 'admin@notify.local',
    password: 'Password123!',
    department: 'IT Admin',
    role: 'SYSTEM_ADMIN'
  });
  adminId = adminRes.body.data.user._id || adminRes.body.data.user.id;
  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@notify.local', password: 'Password123!' });
  adminToken = adminLogin.body.data.accessToken;

  // 2. Register IT Manager
  await request(app).post('/api/v1/auth/register').send({
    name: 'Manager Bob',
    email: 'bob@notify.local',
    password: 'Password123!',
    department: 'IT Management',
    role: 'IT_MANAGER'
  });
  const managerLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'bob@notify.local', password: 'Password123!' });
  managerToken = managerLogin.body.data.accessToken;

  // 3. Register Technician
  const techRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Tech Kelly',
    email: 'kelly@notify.local',
    password: 'Password123!',
    department: 'Desktop Support',
    role: 'TECHNICIAN'
  });
  techId = techRes.body.data.user._id || techRes.body.data.user.id;
  const techLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'kelly@notify.local', password: 'Password123!' });
  techToken = techLogin.body.data.accessToken;

  // 4. Register Employee
  const empRes = await request(app).post('/api/v1/auth/register').send({
    name: 'User Mark',
    email: 'mark@notify.local',
    password: 'Password123!',
    department: 'Marketing',
    role: 'EMPLOYEE'
  });
  empId = empRes.body.data.user._id || empRes.body.data.user.id;
  const empLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'mark@notify.local', password: 'Password123!' });
  empToken = empLogin.body.data.accessToken;
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Phase 12: Notification Center & Immutable Audit Trail', () => {
  describe('In-App Notification Service & API', () => {
    let createdNotificationId: string;

    it('should create in-app notifications and fetch them with unread counts', async () => {
      // Create directly using NotificationsService
      const n1 = await NotificationsService.createNotification(
        techId,
        'TICKET_ASSIGNED',
        'New Ticket Assigned',
        'You have been assigned ticket SDP-1001',
        '/workspace?ticketId=test-1'
      );
      createdNotificationId = (n1 as any)._id.toString();

      await NotificationsService.createNotification(
        techId,
        'SLA_WARNING',
        'SLA Warning',
        'Ticket SDP-1002 is 75% elapsed',
        '/workspace?ticketId=test-2'
      );

      const res = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${techToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.unreadCount).toBe(2);
      expect(res.body.data.notifications.length).toBe(2);
      expect(res.body.data.notifications[0].title).toBe('SLA Warning');
    });

    it('should mark an individual notification as read', async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${createdNotificationId}/read`)
        .set('Authorization', `Bearer ${techToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notification.read).toBe(true);

      // Verify unreadCount decreased
      const countRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${techToken}`);
      expect(countRes.body.data.unreadCount).toBe(1);
    });

    it('should return 404 if a user tries to mark another users notification as read', async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${createdNotificationId}/read`)
        .set('Authorization', `Bearer ${empToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOTIFICATION_NOT_FOUND');
    });

    it('should mark all notifications as read for the user', async () => {
      const res = await request(app)
        .post('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${techToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.modifiedCount).toBe(1);

      const countRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${techToken}`);
      expect(countRes.body.data.unreadCount).toBe(0);
    });
  });

  describe('Automatic Notifications on Ticket Lifecycle Events', () => {
    let ticketId: string;

    it('should auto-create notifications when tickets are created, assigned, and updated', async () => {
      // 1. Employee creates a ticket
      const createRes = await request(app)
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${empToken}`)
        .send({
          title: 'Monitor flickering and turns black randomly',
          description: 'Occurs every 10 minutes when HDMI is bumped',
          category: 'HARDWARE',
          priority: 'MEDIUM'
        });

      expect(createRes.status).toBe(201);
      ticketId = createRes.body.data.ticket._id;

      // 2. Admin assigns ticket to technician Kelly
      const assignRes = await request(app)
        .post(`/api/v1/tickets/${ticketId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assigneeId: techId });

      expect(assignRes.status).toBe(200);

      // Verify technician received TICKET_ASSIGNED notification
      const techNotifyRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${techToken}`);

      expect(techNotifyRes.status).toBe(200);
      const assignedNotif = techNotifyRes.body.data.notifications.find(
        (n: any) => n.type === 'TICKET_ASSIGNED'
      );
      expect(assignedNotif).toBeDefined();
      expect(assignedNotif.title).toContain('Assigned');

      // 3. Technician moves status to IN_PROGRESS
      const transitionRes = await request(app)
        .post(`/api/v1/tickets/${ticketId}/transition`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({
          targetStatus: 'IN_PROGRESS',
          notes: 'Beginning physical cable replacement'
        });

      expect(transitionRes.status).toBe(200);

      // Verify employee received STATUS_CHANGED notification
      const empNotifyRes = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${empToken}`);

      expect(empNotifyRes.status).toBe(200);
      const statusNotif = empNotifyRes.body.data.notifications.find(
        (n: any) => n.type === 'STATUS_CHANGED'
      );
      expect(statusNotif).toBeDefined();
      expect(statusNotif.title).toContain('Ticket Status');
    });
  });

  describe('Audit Trail & Compliance API', () => {
    it('should reject non-admin/non-manager access to audit events (403 Forbidden)', async () => {
      const empRes = await request(app)
        .get('/api/v1/audit')
        .set('Authorization', `Bearer ${empToken}`);
      expect(empRes.status).toBe(403);

      const techRes = await request(app)
        .get('/api/v1/audit')
        .set('Authorization', `Bearer ${techToken}`);
      expect(techRes.status).toBe(403);
    });

    it('should allow System Admin to query audit logs with pagination and filters', async () => {
      // Seed a high severity audit event
      await AuditEvent.create({
        action: 'SECURITY_ALERT',
        actorId: new mongoose.Types.ObjectId(adminId),
        actorEmail: 'admin@notify.local',
        actorRole: 'SYSTEM_ADMIN',
        resourceType: 'SECURITY',
        severity: 'CRITICAL',
        description: 'Failed root authentication threshold exceeded',
        metadata: { ip: '192.168.1.100' }
      });

      const res = await request(app)
        .get('/api/v1/audit?severity=CRITICAL')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.events)).toBe(true);
      expect(res.body.data.events.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.events[0].severity).toBe('CRITICAL');
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
      expect(res.body.meta.page).toBe(1);
    });

    it('should allow IT Manager to query ticket transition audit records', async () => {
      const res = await request(app)
        .get('/api/v1/audit?resourceType=TICKET')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.events.length).toBeGreaterThanOrEqual(1);
      const ticketEvents = res.body.data.events;
      expect(ticketEvents.some((e: any) => e.action === 'TICKET_STATUS_CHANGED' || e.action === 'TICKET_CREATED')).toBe(true);
    });
  });
});
