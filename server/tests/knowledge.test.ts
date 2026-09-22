import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { KnowledgeArticle } from '../src/models/KnowledgeArticle.js';
import { KnowledgeChunk } from '../src/models/KnowledgeChunk.js';

let mongoServer: MongoMemoryServer;

let adminToken: string;
let itManagerToken: string;
let tech1Token: string;
let tech1User: any;
let tech2Token: string;
let employeeToken: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Setup Admin
  await request(app).post('/api/v1/auth/register').send({
    name: 'Elena Admin',
    email: 'admin@kb.local',
    password: 'Password123!',
    department: 'IT Administration',
    role: 'SYSTEM_ADMIN'
  });
  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@kb.local', password: 'Password123!' });
  adminToken = adminLogin.body.data.accessToken;

  // Setup IT Manager
  await request(app).post('/api/v1/auth/register').send({
    name: 'Marcus Vance',
    email: 'manager@kb.local',
    password: 'Password123!',
    department: 'IT Operations',
    role: 'IT_MANAGER'
  });
  const managerLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'manager@kb.local', password: 'Password123!' });
  itManagerToken = managerLogin.body.data.accessToken;

  // Setup Technician 1
  const tech1Res = await request(app).post('/api/v1/auth/register').send({
    name: 'Sarah Chen',
    email: 'tech1@kb.local',
    password: 'Password123!',
    department: 'IT Support',
    role: 'TECHNICIAN'
  });
  tech1User = tech1Res.body.data.user;
  const tech1Login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'tech1@kb.local', password: 'Password123!' });
  tech1Token = tech1Login.body.data.accessToken;

  // Setup Technician 2
  await request(app).post('/api/v1/auth/register').send({
    name: 'Alex Rivera',
    email: 'tech2@kb.local',
    password: 'Password123!',
    department: 'IT Support',
    role: 'TECHNICIAN'
  });
  const tech2Login = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'tech2@kb.local', password: 'Password123!' });
  tech2Token = tech2Login.body.data.accessToken;

  // Setup Employee
  await request(app).post('/api/v1/auth/register').send({
    name: 'Emma Watson',
    email: 'employee@kb.local',
    password: 'Password123!',
    department: 'Finance',
    role: 'EMPLOYEE'
  });
  const empLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'employee@kb.local', password: 'Password123!' });
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

describe('Phase 6: Knowledge Base & Editorial Approval Pipeline', () => {
  it('should allow a technician to create a draft article with generated code and slug', async () => {
    const res = await request(app)
      .post('/api/v1/knowledge')
      .set('Authorization', `Bearer ${tech1Token}`)
      .send({
        title: 'Cisco AnyConnect VPN Setup Guide',
        contentMarkdown: '# Cisco AnyConnect VPN Setup\n\n## Overview\nConnect securely to the intranet.\n\n## Steps\nInstall client and enter gateway.',
        category: 'NETWORK',
        tags: ['vpn', 'cisco', 'network']
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.article.articleCode).toMatch(/^KB-\d+$/);
    expect(res.body.data.article.slug).toBe('cisco-anyconnect-vpn-setup-guide');
    expect(res.body.data.article.status).toBe('DRAFT');
    expect(res.body.data.article.isEligibleForRAG).toBe(false);
    expect(res.body.data.article.version).toBe(1);
  });

  it('should block an employee from creating knowledge articles', async () => {
    const res = await request(app)
      .post('/api/v1/knowledge')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        title: 'Unauthorized Employee Article',
        contentMarkdown: '# Trying to write documentation without permission',
        category: 'SOFTWARE'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should enforce the Four-Eyes Principle: author cannot self-approve their own article', async () => {
    // 1. Tech 1 creates draft
    const createRes = await request(app)
      .post('/api/v1/knowledge')
      .set('Authorization', `Bearer ${tech1Token}`)
      .send({
        title: 'Hardware Upgrade Protocol',
        contentMarkdown: '# Hardware Upgrade Protocol\n\n## Overview\nStandard steps for RAM and SSD upgrades.',
        category: 'HARDWARE',
        tags: ['hardware', 'upgrade']
      });

    const articleId = createRes.body.data.article._id;

    // 2. Tech 1 submits to review
    const submitRes = await request(app)
      .patch(`/api/v1/knowledge/${articleId}/status`)
      .set('Authorization', `Bearer ${tech1Token}`)
      .send({ status: 'IN_REVIEW' });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.article.status).toBe('IN_REVIEW');

    // 3. Tech 1 attempts to self-approve -> BLOCKED
    const selfApproveRes = await request(app)
      .patch(`/api/v1/knowledge/${articleId}/status`)
      .set('Authorization', `Bearer ${tech1Token}`)
      .send({ status: 'APPROVED' });

    // Technician role is blocked from approving in general, but let's test if manager who is author is also blocked!
    expect([400, 403]).toContain(selfApproveRes.status);

    // 4. IT Manager creates an article and attempts to self-approve
    const mgrArticleRes = await request(app)
      .post('/api/v1/knowledge')
      .set('Authorization', `Bearer ${itManagerToken}`)
      .send({
        title: 'Emergency Incident Response Standard',
        contentMarkdown: '# Incident Response\n\n## Overview\nP1 outage command structure.\n\n## Escalation\nContact tier 3 immediately.',
        category: 'SECURITY'
      });
    const mgrArticleId = mgrArticleRes.body.data.article._id;

    await request(app)
      .patch(`/api/v1/knowledge/${mgrArticleId}/status`)
      .set('Authorization', `Bearer ${itManagerToken}`)
      .send({ status: 'IN_REVIEW' });

    // Manager attempts self-approval -> 403 FOUR_EYES_PRINCIPLE_VIOLATION
    const mgrSelfApprove = await request(app)
      .patch(`/api/v1/knowledge/${mgrArticleId}/status`)
      .set('Authorization', `Bearer ${itManagerToken}`)
      .send({ status: 'APPROVED' });

    expect(mgrSelfApprove.status).toBe(403);
    expect(mgrSelfApprove.body.error.code).toBe('FOUR_EYES_PRINCIPLE_VIOLATION');

    // 5. System Admin peer-reviews and approves manager article
    const adminApprove = await request(app)
      .patch(`/api/v1/knowledge/${mgrArticleId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });

    expect(adminApprove.status).toBe(200);
    expect(adminApprove.body.data.article.status).toBe('APPROVED');
  });

  it('should auto-generate semantic chunks when an article transitions to PUBLISHED', async () => {
    // 1. Create and review article
    const createRes = await request(app)
      .post('/api/v1/knowledge')
      .set('Authorization', `Bearer ${tech1Token}`)
      .send({
        title: 'PostgreSQL Disaster Recovery Playbook',
        contentMarkdown: `# PostgreSQL Disaster Recovery

## Architecture
Three-node Patroni cluster with Raft consensus.

## Failover Steps
Run patronictl switchover on the primary node.

## Verification
Inspect database connection pools.`,
        category: 'SOFTWARE',
        tags: ['postgres', 'failover', 'patroni']
      });

    const articleId = createRes.body.data.article._id;

    await request(app)
      .patch(`/api/v1/knowledge/${articleId}/status`)
      .set('Authorization', `Bearer ${tech1Token}`)
      .send({ status: 'IN_REVIEW' });

    await request(app)
      .patch(`/api/v1/knowledge/${articleId}/status`)
      .set('Authorization', `Bearer ${itManagerToken}`)
      .send({ status: 'APPROVED' });

    // 2. Publish article
    const publishRes = await request(app)
      .patch(`/api/v1/knowledge/${articleId}/status`)
      .set('Authorization', `Bearer ${itManagerToken}`)
      .send({ status: 'PUBLISHED' });

    expect(publishRes.status).toBe(200);
    expect(publishRes.body.data.article.status).toBe('PUBLISHED');
    expect(publishRes.body.data.article.isEligibleForRAG).toBe(true);
    expect(publishRes.body.data.article.publishedAt).toBeDefined();

    // 3. Verify semantic chunks created in database
    const chunks = await KnowledgeChunk.find({ articleId }).sort({ chunkIndex: 1 });
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    const archChunk = chunks.find(c => c.heading === 'Architecture');
    expect(archChunk).toBeDefined();
    expect(archChunk!.chunkText).toContain('Three-node Patroni cluster');
    expect(archChunk!.contentHash).toBeDefined();
    expect(archChunk!.tokenCount).toBeGreaterThan(0);
  });

  it('should restrict Employee visibility to PUBLISHED articles matching accessRoles', async () => {
    // 1. Create and publish Public article (Employee included)
    const publicRes = await request(app)
      .post('/api/v1/knowledge')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Employee Password Reset SOP',
        contentMarkdown: '# Password Reset\n\n## Overview\nVisit the portal to reset password.',
        category: 'ACCESS_IAM',
        accessRoles: ['EMPLOYEE', 'TECHNICIAN', 'IT_MANAGER', 'SYSTEM_ADMIN']
      });
    const publicId = publicRes.body.data.article._id;
    await request(app).patch(`/api/v1/knowledge/${publicId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'IN_REVIEW' });
    await request(app).patch(`/api/v1/knowledge/${publicId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'APPROVED' });
    await request(app).patch(`/api/v1/knowledge/${publicId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'PUBLISHED' });

    // 2. Create and publish Internal Tech-only article
    const techOnlyRes = await request(app)
      .post('/api/v1/knowledge')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Core Switch Root Bridge BGP Configuration',
        contentMarkdown: '# BGP Config\n\n## Overview\nInternal routing protocols.',
        category: 'NETWORK',
        accessRoles: ['TECHNICIAN', 'IT_MANAGER', 'SYSTEM_ADMIN']
      });
    const techOnlyId = techOnlyRes.body.data.article._id;
    await request(app).patch(`/api/v1/knowledge/${techOnlyId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'IN_REVIEW' });
    await request(app).patch(`/api/v1/knowledge/${techOnlyId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'APPROVED' });
    await request(app).patch(`/api/v1/knowledge/${techOnlyId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'PUBLISHED' });

    // 3. Create Draft article
    await request(app)
      .post('/api/v1/knowledge')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Unpublished Internal Draft',
        contentMarkdown: '# Draft\n\n## Incomplete Notes\nNot ready for anyone yet.',
        category: 'SOFTWARE'
      });

    // Employee query: Should only see the 1 public published article
    const empArticlesRes = await request(app)
      .get('/api/v1/knowledge')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(empArticlesRes.status).toBe(200);
    expect(empArticlesRes.body.data.articles.length).toBe(1);
    expect(empArticlesRes.body.data.articles[0].title).toBe('Employee Password Reset SOP');

    // Employee trying to access tech-only article by ID -> 403 FORBIDDEN
    const forbiddenGet = await request(app)
      .get(`/api/v1/knowledge/${techOnlyId}`)
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(forbiddenGet.status).toBe(403);
  });

  it('should track views and allow helpful/unhelpful feedback voting', async () => {
    // 1. Create and publish an article
    const articleRes = await request(app)
      .post('/api/v1/knowledge')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Office WiFi Troubleshooting',
        contentMarkdown: '# Office WiFi\n\n## Steps\nConnect to Corporate-5G with 802.1x credentials.',
        category: 'NETWORK'
      });
    const articleId = articleRes.body.data.article._id;
    await request(app).patch(`/api/v1/knowledge/${articleId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'IN_REVIEW' });
    await request(app).patch(`/api/v1/knowledge/${articleId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'APPROVED' });
    await request(app).patch(`/api/v1/knowledge/${articleId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'PUBLISHED' });

    // 2. Fetching article increments view count
    const getRes1 = await request(app)
      .get(`/api/v1/knowledge/${articleId}`)
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(getRes1.status).toBe(200);
    expect(getRes1.body.data.article.viewCount).toBe(1);

    const getRes2 = await request(app)
      .get(`/api/v1/knowledge/${articleId}`)
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(getRes2.body.data.article.viewCount).toBe(2);

    // 3. Vote helpful
    const voteHelpful = await request(app)
      .post(`/api/v1/knowledge/${articleId}/feedback`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ isHelpful: true });

    expect(voteHelpful.status).toBe(200);
    expect(voteHelpful.body.data.article.helpfulVotes).toBe(1);
    expect(voteHelpful.body.data.article.unhelpfulVotes).toBe(0);

    // 4. Vote unhelpful
    const voteUnhelpful = await request(app)
      .post(`/api/v1/knowledge/${articleId}/feedback`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ isHelpful: false });

    expect(voteUnhelpful.status).toBe(200);
    expect(voteUnhelpful.body.data.article.helpfulVotes).toBe(1);
    expect(voteUnhelpful.body.data.article.unhelpfulVotes).toBe(1);
  });

  it('should invalidate RAG eligibility and purge chunks when article is ARCHIVED', async () => {
    // 1. Create, approve, and publish article
    const createRes = await request(app)
      .post('/api/v1/knowledge')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Legacy Windows 7 Support SOP',
        contentMarkdown: '# Windows 7 Support\n\n## EOL Notice\nWindows 7 is deprecated.',
        category: 'HARDWARE'
      });
    const articleId = createRes.body.data.article._id;
    await request(app).patch(`/api/v1/knowledge/${articleId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'IN_REVIEW' });
    await request(app).patch(`/api/v1/knowledge/${articleId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'APPROVED' });
    await request(app).patch(`/api/v1/knowledge/${articleId}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'PUBLISHED' });

    let chunks = await KnowledgeChunk.find({ articleId });
    expect(chunks.length).toBeGreaterThan(0);

    // 2. Archive article
    const archiveRes = await request(app)
      .patch(`/api/v1/knowledge/${articleId}/status`)
      .set('Authorization', `Bearer ${itManagerToken}`)
      .send({ status: 'ARCHIVED' });

    expect(archiveRes.status).toBe(200);
    expect(archiveRes.body.data.article.status).toBe('ARCHIVED');
    expect(archiveRes.body.data.article.isEligibleForRAG).toBe(false);

    // 3. Verify chunks were purged so vector retrieval will not index stale archived content
    chunks = await KnowledgeChunk.find({ articleId });
    expect(chunks.length).toBe(0);
  });
});
