import request from 'supertest';
import app from '../src/server.js';

describe('GET /health', () => {
  it('should return 200 and healthy status metadata', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
    expect(res.body).toHaveProperty('service', 'servicedesk-pro-core-api');
    expect(res.body).toHaveProperty('timestamp');
  });
});
