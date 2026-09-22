import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { KnowledgeArticle } from '../src/models/KnowledgeArticle.js';
import { KnowledgeChunk } from '../src/models/KnowledgeChunk.js';

let mongoServer: MongoMemoryServer;
let employeeToken: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  await request(app).post('/api/v1/auth/register').send({
    name: 'Emma Watson',
    email: 'emma@rag.local',
    password: 'Password123!',
    department: 'Finance',
    role: 'EMPLOYEE'
  });

  const empLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'emma@rag.local', password: 'Password123!' });
  employeeToken = empLogin.body.data.accessToken;
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await KnowledgeArticle.deleteMany({});
  await KnowledgeChunk.deleteMany({});
});

describe('Phase 8: RAG Knowledge Assistant & Vector Search Integration', () => {
  it('should accept queries to POST /api/v1/knowledge/ask and return grounded answers or fallback', async () => {
    const res = await request(app)
      .post('/api/v1/knowledge/ask')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        query: 'How do I resolve Cisco AnyConnect certificate validation error 403?'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.answer).toBeDefined();
    expect(Array.isArray(res.body.data.citations)).toBe(true);
    expect(typeof res.body.data.hasSufficientContext).toBe('boolean');
  });

  it('should reject invalid empty or too short query with 422 Validation Error', async () => {
    const res = await request(app)
      .post('/api/v1/knowledge/ask')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        query: 'hi'
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });
});
