import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Ticket } from '../src/models/Ticket.js';
import { KnowledgeArticle } from '../src/models/KnowledgeArticle.js';
import { WorkLog } from '../src/models/WorkLog.js';
import { SLAPolicy } from '../src/models/SLAPolicy.js';
import { CacheService } from '../src/utils/cache.service.js';
import { SLAEngine } from '../src/modules/sla/sla.engine.js';
import { TicketsService } from '../src/modules/tickets/tickets.service.js';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Ensure indexes are built in MongoMemoryServer
  await Ticket.createIndexes();
  await KnowledgeArticle.createIndexes();
  await WorkLog.createIndexes();
  await SLAPolicy.createIndexes();

  // Seed sample SLA Policy
  await SLAPolicy.create({
    name: 'Critical Infrastructure SLA',
    priority: 'CRITICAL',
    category: 'HARDWARE',
    responseTimeHours: 0.5,
    resolutionTimeHours: 2,
    businessHoursOnly: false,
    active: true
  });
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(() => {
  CacheService.clear();
  CacheService.resetStats();
});

describe('Phase 14: Performance Optimization & Caching Suite', () => {
  describe('1. Database Compound Index Coverage', () => {
    it('should have compound indexes registered on Ticket collection', async () => {
      const indexes = await Ticket.collection.indexes();
      const indexKeys = indexes.map((idx) => JSON.stringify(idx.key));

      // Verify compound queue index
      expect(indexKeys.some((k) => k.includes('"status":1') && k.includes('"priority":1'))).toBe(true);

      // Verify category analytics index
      expect(indexKeys.some((k) => k.includes('"category":1'))).toBe(true);

      // Verify requester historical view index
      expect(indexKeys.some((k) => k.includes('"requesterId":1'))).toBe(true);

      // Verify assignee workload index
      expect(indexKeys.some((k) => k.includes('"assigneeId":1') && k.includes('"status":1'))).toBe(true);
    });

    it('should have full-text and compound indexes on KnowledgeArticle collection', async () => {
      const indexes = await KnowledgeArticle.collection.indexes();
      const indexKeys = indexes.map((idx) => JSON.stringify(idx.key));

      // Verify compound status + category + viewCount index
      expect(
        indexKeys.some((k) => k.includes('"status":1') && k.includes('"category":1'))
      ).toBe(true);

      // Verify text index presence
      expect(
        indexes.some((idx) => idx.weights && idx.weights.title && idx.weights.contentMarkdown)
      ).toBe(true);
    });

    it('should have compound index on WorkLog collection for technician saturation', async () => {
      const indexes = await WorkLog.collection.indexes();
      const indexKeys = indexes.map((idx) => JSON.stringify(idx.key));

      expect(
        indexKeys.some((k) => k.includes('"technicianId":1') && k.includes('"loggedAt":-1'))
      ).toBe(true);
    });
  });

  describe('2. Query Execution Plan Optimization (IXSCAN vs COLLSCAN)', () => {
    it('should execute ticket queue queries using index scan (IXSCAN)', async () => {
      // Seed a ticket
      await Ticket.create({
        ticketNumber: 'SDP-PERF-01',
        title: 'Performance test query target ticket',
        description: 'Verifying query execution plan uses compound index',
        priority: 'CRITICAL',
        category: 'HARDWARE',
        status: 'OPEN',
        requesterId: new mongoose.Types.ObjectId()
      });

      // Explain query
      const explanation: any = await Ticket.find({
        status: 'OPEN',
        priority: 'CRITICAL'
      })
        .sort({ createdAt: -1 })
        .explain('executionStats');

      const winningPlan = explanation.queryPlanner?.winningPlan;
      const stage = winningPlan?.inputStage?.stage || winningPlan?.stage;

      // Plan should utilize IXSCAN or FETCH over index scan
      expect(['IXSCAN', 'FETCH']).toContain(stage);
    });
  });

  describe('3. In-Memory TTL Caching Engine', () => {
    it('should record cache hits, misses, and retrieve cached items', async () => {
      CacheService.set('test:key', { data: 'test_payload' }, 5000);

      // Hit
      const val = CacheService.get<{ data: string }>('test:key');
      expect(val?.data).toBe('test_payload');

      // Miss
      const missing = CacheService.get('non_existent_key');
      expect(missing).toBeNull();

      const stats = CacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.totalRequests).toBe(2);
      expect(stats.hitRatePercent).toBe(50);
    });

    it('should expire cached items after TTL exceeds', async () => {
      // 50ms TTL
      CacheService.set('test:short_lived', 'expires_soon', 50);

      expect(CacheService.get('test:short_lived')).toBe('expires_soon');

      // Wait 70ms
      await new Promise((resolve) => setTimeout(resolve, 70));

      expect(CacheService.get('test:short_lived')).toBeNull();
    });

    it('should invalidate keys by regex pattern', () => {
      CacheService.set('sla:policy:CRITICAL:HARDWARE', { id: 1 }, 10000);
      CacheService.set('sla:policy:HIGH:NETWORK', { id: 2 }, 10000);
      CacheService.set('user:profile:1001', { id: 1001 }, 10000);

      const deletedCount = CacheService.deletePattern(/^sla:policy:/);
      expect(deletedCount).toBe(2);

      expect(CacheService.get('sla:policy:CRITICAL:HARDWARE')).toBeNull();
      expect(CacheService.get('user:profile:1001')).not.toBeNull();
    });

    it('should cache SLA policy lookups in SLAEngine and increment hit stats', async () => {
      CacheService.resetStats();

      // First invocation -> DB query (Cache miss)
      const policy1 = await SLAEngine.matchPolicy('CRITICAL', 'HARDWARE', true);
      expect(policy1).toBeDefined();
      expect(policy1?.priority).toBe('CRITICAL');

      const statsAfterMiss = CacheService.getStats();
      expect(statsAfterMiss.misses).toBe(1);

      // Second invocation -> In-memory cache hit (zero DB roundtrip)
      const policy2 = await SLAEngine.matchPolicy('CRITICAL', 'HARDWARE', true);
      expect(policy2).toBeDefined();
      expect(policy2?.name).toBe('Critical Infrastructure SLA');

      const statsAfterHit = CacheService.getStats();
      expect(statsAfterHit.hits).toBe(1);
      expect(statsAfterHit.hitRatePercent).toBe(50);
    });
  });

  describe('4. Lean Query Projections (.lean())', () => {
    it('should return plain JavaScript objects without Mongoose overhead in getTickets', async () => {
      const user = {
        userId: new mongoose.Types.ObjectId().toString(),
        email: 'admin@perf.local',
        role: 'SYSTEM_ADMIN' as const,
        department: 'IT'
      };

      const result = await TicketsService.getTickets({}, user);
      expect(result.tickets.length).toBeGreaterThanOrEqual(1);

      const firstTicket = result.tickets[0];
      // A plain object from .lean() does NOT have Mongoose Document prototype methods like .save() or .isModified()
      expect(typeof (firstTicket as any).save).toBe('undefined');
      expect(typeof (firstTicket as any).isModified).toBe('undefined');
      expect(firstTicket.title).toBeDefined();
    });
  });
});
