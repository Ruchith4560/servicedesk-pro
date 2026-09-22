import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Ticket } from '../src/models/Ticket.js';
import { AIService } from '../src/services/ai.service.js';

let mongoServer: MongoMemoryServer;
let employeeToken: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  await request(app).post('/api/v1/auth/register').send({
    name: 'Emma Watson',
    email: 'emma@ai.local',
    password: 'Password123!',
    department: 'Finance',
    role: 'EMPLOYEE'
  });

  const empLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'emma@ai.local', password: 'Password123!' });
  employeeToken = empLogin.body.data.accessToken;
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Ticket.deleteMany({});
});

describe('Phase 7: AI Ticket Classification & Heuristic Fallback Integration', () => {
  it('should preview AI ticket classification via /classify-preview endpoint', async () => {
    const res = await request(app)
      .post('/api/v1/tickets/classify-preview')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title: 'Cisco AnyConnect VPN disconnected and failed to connect',
        description: 'Unable to establish secure SSL tunnel to corporate gateway'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.prediction).toBeDefined();
    expect(res.body.data.prediction.predictedCategory).toBe('NETWORK');
    expect(res.body.data.prediction.topKeywords).toContain('network');
  });

  it('should auto-enrich newly created ticket with aiAnalysis metadata', async () => {
    const res = await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title: 'MacBook Pro screen flickering with purple vertical lines',
        description: 'Laptop display hardware glitch whenever opening the clamshell'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const ticket = res.body.data.ticket;
    expect(ticket.aiAnalysis).toBeDefined();
    expect(ticket.aiAnalysis.suggestedCategory).toBe('HARDWARE');
    expect(ticket.category).toBe('HARDWARE');
  });

  it('should gracefully degrade to heuristic fallback when external AI microservice fails', async () => {
    // Test the heuristic fallback logic directly
    const fallback = (AIService as any).heuristicFallback(
      'URGENT: Suspicious phishing email with malware invoice attachment',
      'Finance employee opened macro attachment from spoofed CEO address'
    );

    expect(fallback.isFallback).toBe(true);
    expect(fallback.predictedCategory).toBe('SECURITY');
    expect(fallback.predictedPriority).toBe('CRITICAL');
    expect(fallback.requiresManualTriage).toBe(true);
    expect(fallback.triageReason).toContain('heuristic fallback');
  });
});
