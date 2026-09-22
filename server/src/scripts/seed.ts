import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '../models/User.js';
import { SLAPolicy } from '../models/SLAPolicy.js';
import { Asset } from '../models/Asset.js';
import { KnowledgeArticle } from '../models/KnowledgeArticle.js';
import { KnowledgeService } from '../modules/knowledge/knowledge.service.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

interface SeedUser {
  name: string;
  email: string;
  role: UserRole;
  department: string;
  skills: string[];
}

const SEED_USERS: SeedUser[] = [
  {
    name: 'Elena Rostova (System Admin)',
    email: 'admin@servicedesk.local',
    role: 'SYSTEM_ADMIN',
    department: 'IT Administration',
    skills: ['Platform Security', 'SLA Configuration', 'Identity Provider', 'RBAC Management']
  },
  {
    name: 'Marcus Vance (IT Manager)',
    email: 'itmanager@servicedesk.local',
    role: 'IT_MANAGER',
    department: 'IT Operations',
    skills: ['Resource Allocation', 'Escalation Handling', 'SLA Monitoring', 'Incident Command']
  },
  {
    name: 'Sarah Chen (Senior Technician)',
    email: 'tech.sarah@servicedesk.local',
    role: 'TECHNICIAN',
    department: 'IT Support',
    skills: ['Networking', 'VPN', 'macOS', 'Hardware Diagnostics', 'Cisco AnyConnect']
  },
  {
    name: 'Alex Rivera (Systems Technician)',
    email: 'tech.alex@servicedesk.local',
    role: 'TECHNICIAN',
    department: 'IT Support',
    skills: ['Active Directory', 'Windows 11', 'Microsoft 365', 'SSO & MFA', 'Azure AD']
  },
  {
    name: 'Emma Watson (Employee - Finance)',
    email: 'employee.emma@servicedesk.local',
    role: 'EMPLOYEE',
    department: 'Finance',
    skills: []
  },
  {
    name: 'Liam Zhang (Employee - Engineering)',
    email: 'employee.liam@servicedesk.local',
    role: 'EMPLOYEE',
    department: 'Engineering',
    skills: []
  },
  {
    name: 'David Keller (Asset Manager)',
    email: 'assetmanager.david@servicedesk.local',
    role: 'ASSET_MANAGER',
    department: 'Procurement & Logistics',
    skills: ['Hardware Lifecycle', 'Vendor RMA', 'License Management', 'Asset Audit']
  }
];

export async function seedDatabase(mongoUri = env.MONGODB_URI) {
  try {
    logger.info(`[Seeder] Connecting to MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    const salt = await bcrypt.genSalt(12);
    const defaultPasswordHash = await bcrypt.hash('Password123!', salt);

    logger.info(`[Seeder] Seeding ${SEED_USERS.length} enterprise users...`);

    for (const seed of SEED_USERS) {
      const existing = await User.findOne({ email: seed.email });
      if (existing) {
        existing.name = seed.name;
        existing.role = seed.role;
        existing.department = seed.department;
        existing.skills = seed.skills;
        existing.passwordHash = defaultPasswordHash;
        existing.active = true;
        await existing.save();
        logger.info(`[Seeder] Updated user: ${seed.email} [${seed.role}]`);
      } else {
        await User.create({
          name: seed.name,
          email: seed.email,
          passwordHash: defaultPasswordHash,
          role: seed.role,
          department: seed.department,
          skills: seed.skills,
          active: true
        });
        logger.info(`[Seeder] Created user: ${seed.email} [${seed.role}]`);
      }
    }

    // Seed Enterprise SLA Policies
    const SEED_SLA_POLICIES = [
      {
        name: 'Critical Incident 24/7 SLA',
        description: 'Maximum urgency for critical outages and widespread disruption',
        priority: 'CRITICAL',
        responseTimeHours: 0.5, // 30 mins
        resolutionTimeHours: 2.0, // 2 hours
        warningThresholdPercent: 70,
        businessHoursOnly: false,
        active: true
      },
      {
        name: 'High Priority Standard SLA',
        description: 'Urgent departmental issues affecting business productivity',
        priority: 'HIGH',
        responseTimeHours: 2.0, // 2 hours
        resolutionTimeHours: 8.0, // 8 business hours
        warningThresholdPercent: 75,
        businessHoursOnly: true,
        active: true
      },
      {
        name: 'Medium Priority General SLA',
        description: 'Standard support tickets for non-blocking software/hardware issues',
        priority: 'MEDIUM',
        responseTimeHours: 8.0, // 8 business hours
        resolutionTimeHours: 24.0, // 3 business days (24h)
        warningThresholdPercent: 80,
        businessHoursOnly: true,
        active: true
      },
      {
        name: 'Low Priority Routine SLA',
        description: 'Low urgency inquiries, feature requests, and peripheral accessories',
        priority: 'LOW',
        responseTimeHours: 24.0,
        resolutionTimeHours: 72.0,
        warningThresholdPercent: 85,
        businessHoursOnly: true,
        active: true
      },
      {
        name: 'Critical Security Breach Rapid Response',
        description: 'Immediate containment for suspected compromise or security alerts',
        priority: 'CRITICAL',
        category: 'SECURITY',
        responseTimeHours: 0.25, // 15 mins
        resolutionTimeHours: 1.0, // 1 hour
        warningThresholdPercent: 60,
        businessHoursOnly: false,
        active: true
      }
    ];

    logger.info(`[Seeder] Seeding ${SEED_SLA_POLICIES.length} SLA policies...`);
    for (const policyData of SEED_SLA_POLICIES) {
      await SLAPolicy.findOneAndUpdate(
        { name: policyData.name },
        policyData,
        { upsert: true, new: true }
      );
    }

    // Seed Enterprise Assets
    const emma = await User.findOne({ email: 'employee.emma@servicedesk.local' });
    const liam = await User.findOne({ email: 'employee.liam@servicedesk.local' });
    const sarah = await User.findOne({ email: 'tech.sarah@servicedesk.local' });
    const alex = await User.findOne({ email: 'tech.alex@servicedesk.local' });
    const itManager = await User.findOne({ email: 'itmanager@servicedesk.local' });
    const adminUser = await User.findOne({ email: 'admin@servicedesk.local' });

    const SEED_ASSETS = [
      {
        assetTag: 'AST-1001',
        serialNumber: 'C02G41ABMD6M',
        name: 'MacBook Pro 16" M3 Max (36GB/1TB)',
        type: 'LAPTOP',
        ownerId: emma?._id,
        department: 'Finance',
        location: 'Building A, Floor 3, Desk 42',
        status: 'ASSIGNED',
        purchaseDate: new Date('2024-01-15'),
        warrantyExpiry: new Date('2027-01-15'),
        vendor: 'Apple Enterprise',
        cost: 3499,
        isCritical: false,
        specifications: { cpu: 'Apple M3 Max', ram: '36GB', storage: '1TB SSD', os: 'macOS Sonoma' }
      },
      {
        assetTag: 'AST-1002',
        serialNumber: '8FK9L23',
        name: 'Dell Precision 5680 Workstation',
        type: 'LAPTOP',
        ownerId: liam?._id,
        department: 'Engineering',
        location: 'Building B, Floor 2, Desk 18',
        status: 'ASSIGNED',
        purchaseDate: new Date('2023-08-20'),
        warrantyExpiry: new Date('2026-08-20'),
        vendor: 'Dell Technologies',
        cost: 2899,
        isCritical: false,
        specifications: { cpu: 'Intel Core i9-13900H', ram: '64GB', gpu: 'NVIDIA RTX 3500 Ada', os: 'Ubuntu 24.04' }
      },
      {
        assetTag: 'AST-2001',
        serialNumber: 'SRV-R760-9941',
        name: 'Dell PowerEdge R760 Rack Server',
        type: 'SERVER',
        department: 'IT Operations',
        location: 'Austin Datacenter, Rack 4, U12-U14',
        status: 'IN_STOCK',
        purchaseDate: new Date('2023-04-10'),
        warrantyExpiry: new Date('2028-04-10'),
        vendor: 'Dell Technologies',
        cost: 14500,
        isCritical: true,
        specifications: { cpu: 'Dual Intel Xeon Gold 6430', ram: '256GB ECC', storage: '8x 3.84TB NVMe RAID' }
      },
      {
        assetTag: 'AST-3001',
        serialNumber: 'FOC2419U0X8',
        name: 'Cisco Catalyst 9300 48-Port PoE Switch',
        type: 'NETWORK_DEVICE',
        department: 'IT Operations',
        location: 'Building A, MDF Rack 1',
        status: 'IN_STOCK',
        purchaseDate: new Date('2022-11-05'),
        warrantyExpiry: new Date('2027-11-05'),
        vendor: 'Cisco Systems',
        cost: 6200,
        isCritical: true,
        specifications: { ports: '48x 1G PoE+', uplinks: '4x 10G SFP+', stackable: true }
      },
      {
        assetTag: 'AST-4001',
        serialNumber: 'HP-MFP-48821',
        name: 'HP LaserJet Enterprise MFP M528',
        type: 'PERIPHERAL',
        department: 'IT Operations',
        location: 'IT Depot Shelf B',
        status: 'IN_STOCK',
        purchaseDate: new Date('2023-03-01'),
        warrantyExpiry: new Date('2026-03-01'),
        vendor: 'HP Inc.',
        cost: 1250,
        isCritical: false,
        specifications: { speed: '45 ppm', features: 'Duplex Print, Scan, Fax' }
      },
      {
        assetTag: 'AST-5001',
        serialNumber: 'MS-E5-SARAH-01',
        name: 'Microsoft 365 E5 Enterprise License',
        type: 'SOFTWARE_LICENSE',
        ownerId: sarah?._id,
        department: 'IT Support',
        location: 'Cloud / Azure AD Tenant',
        status: 'ASSIGNED',
        purchaseDate: new Date('2024-01-01'),
        warrantyExpiry: new Date('2025-01-01'),
        vendor: 'Microsoft Corporation',
        cost: 684,
        isCritical: false,
        specifications: { sku: 'SPE_E5', features: 'Entra ID P2, Defender for Endpoint, Intune' }
      }
    ];

    logger.info(`[Seeder] Seeding ${SEED_ASSETS.length} enterprise assets...`);
    for (const assetData of SEED_ASSETS) {
      await Asset.findOneAndUpdate(
        { assetTag: assetData.assetTag },
        assetData,
        { upsert: true, new: true }
      );
      logger.info(`[Seeder] Seeded Asset: "${assetData.assetTag}" - ${assetData.name}`);
    }

    if (!adminUser) {
      throw new Error('[Seeder] Admin user was not found');
    }

    // Seed Knowledge Base Articles
    const SEED_ARTICLES = [
      {
        articleCode: 'KB-1001',
        title: 'Cisco AnyConnect VPN Setup and Troubleshooting Guide',
        slug: 'cisco-anyconnect-vpn-setup-and-troubleshooting-guide',
        category: 'NETWORK' as const,
        tags: ['vpn', 'cisco', 'remote-access', 'networking', 'anyconnect'],
        status: 'PUBLISHED' as const,
        authorId: sarah?._id || adminUser._id,
        approvedById: adminUser._id,
        publishedAt: new Date('2024-02-01'),
        accessRoles: ['EMPLOYEE', 'TECHNICIAN', 'IT_MANAGER', 'SYSTEM_ADMIN', 'ASSET_MANAGER'],
        isEligibleForRAG: true,
        helpfulVotes: 42,
        unhelpfulVotes: 2,
        viewCount: 380,
        contentMarkdown: `# Cisco AnyConnect VPN Setup and Troubleshooting Guide

## Overview
This standard operating procedure provides step-by-step instructions for establishing a secure connection to the corporate intranet using Cisco AnyConnect Secure Mobility Client.

## Prerequisites
- Active corporate credentials with Multi-Factor Authentication (MFA) enrolled.
- Cisco AnyConnect Client version 4.10 or higher installed on Windows or macOS.
- Gateway host address: \`vpn.servicedesk.local\`.

## Step-by-Step Connection Instructions
1. Open the Cisco AnyConnect client from your applications menu.
2. In the connection window, enter the gateway address: \`vpn.servicedesk.local\`.
3. Click **Connect** and enter your corporate email address and password.
4. Approve the push notification on your Microsoft Authenticator mobile app.
5. Once authenticated, the AnyConnect tray icon will display a green lock symbol indicating an active encrypted tunnel.

## Common Error Codes and Resolution
### Error: Certificate Validation Failed (Code 403)
If you receive a certificate error:
1. Verify system clock synchronization against NTP servers.
2. Open Windows Certificate Manager (\`certmgr.msc\`) or macOS Keychain.
3. Ensure the **Corporate Root CA 2024** certificate is listed under Trusted Root Certification Authorities.
4. Restart the Cisco AnyConnect service (\`vpnagent.exe\`).

### Error: Login Failed / Authentication Rejected
1. Confirm your password has not expired via the Self-Service Identity Portal.
2. Ensure you approved the MFA push prompt within 30 seconds.
3. If account is locked after 5 invalid attempts, contact the IT Service Desk.`
      },
      {
        articleCode: 'KB-1002',
        title: 'Self-Service Password Reset and MFA Recovery SOP',
        slug: 'self-service-password-reset-and-mfa-recovery-sop',
        category: 'ACCESS' as const,
        tags: ['password', 'mfa', 'security', 'authenticator', 'sso'],
        status: 'PUBLISHED' as const,
        authorId: alex?._id || adminUser._id,
        approvedById: adminUser._id,
        publishedAt: new Date('2024-02-15'),
        accessRoles: ['EMPLOYEE', 'TECHNICIAN', 'IT_MANAGER', 'SYSTEM_ADMIN', 'ASSET_MANAGER'],
        isEligibleForRAG: true,
        helpfulVotes: 68,
        unhelpfulVotes: 1,
        viewCount: 520,
        contentMarkdown: `# Self-Service Password Reset and MFA Recovery SOP

## Overview
Employees can independently reset expired passwords or re-register MFA authenticator devices without waiting for technician triage.

## Resetting Expired Corporate Password
1. Navigate to \`https://auth.servicedesk.local/reset\`.
2. Input your corporate email address and solve the security challenge.
3. A verification code will be dispatched to your registered SMS or secondary email.
4. Enter your new password meeting the complexity standard: minimum 14 characters, containing uppercase, lowercase, numbers, and symbols.
5. Previous 12 passwords cannot be reused.

## Re-registering Authenticator Device
If you upgraded or replaced your smartphone:
1. Log in to the Security Settings page while connected to corporate network or VPN.
2. Select **MFA Settings** -> **Add New Device**.
3. Scan the generated QR code using Microsoft Authenticator or Google Authenticator.
4. Enter the 6-digit confirmation token to activate the replacement device.`
      },
      {
        articleCode: 'KB-1003',
        title: 'Network Printer Configuration and Hardware Clearance',
        slug: 'network-printer-configuration-and-hardware-clearance',
        category: 'HARDWARE' as const,
        tags: ['printer', 'hardware', 'paper-jam', 'laserjet', 'office'],
        status: 'PUBLISHED' as const,
        authorId: sarah?._id || adminUser._id,
        approvedById: itManager?._id || adminUser._id,
        publishedAt: new Date('2024-03-01'),
        accessRoles: ['EMPLOYEE', 'TECHNICIAN', 'IT_MANAGER', 'SYSTEM_ADMIN', 'ASSET_MANAGER'],
        isEligibleForRAG: true,
        helpfulVotes: 19,
        unhelpfulVotes: 3,
        viewCount: 145,
        contentMarkdown: `# Network Printer Configuration and Hardware Clearance

## Overview
Instructions for adding network laser printers and resolving common physical print queue jams.

## Adding Corporate Printers in Windows 11
1. Press \`Win + I\` to open Settings, navigate to **Bluetooth & devices** -> **Printers & scanners**.
2. Click **Add device**. If the device is not detected automatically, click **Add manually**.
3. Select **Find a printer in the directory, based on location or feature**.
4. Type the printer queue name (e.g., \`\\\\printsvr01\\Austin-Floor2-HP528\`) and click Next.

## Clearing Physical Paper Jams
1. Turn off the printer power switch before accessing internal feed rollers.
2. Open Tray 2 and inspect the paper feed path for crumpled sheets.
3. Open the rear duplex cover and carefully remove any trapped sheets in the direction of the paper path.
4. Close all covers firmly and power on the printer. The self-test routine will automatically resume queued jobs.`
      },
      {
        articleCode: 'KB-1004',
        title: 'PostgreSQL Production Failover and High Availability SOP',
        slug: 'postgresql-production-failover-and-high-availability-sop',
        category: 'DATABASE' as const,
        tags: ['database', 'postgres', 'failover', 'disaster-recovery', 'patroni'],
        status: 'PUBLISHED' as const,
        authorId: adminUser._id,
        approvedById: itManager?._id || adminUser._id,
        publishedAt: new Date('2024-03-10'),
        accessRoles: ['TECHNICIAN', 'IT_MANAGER', 'SYSTEM_ADMIN'],
        isEligibleForRAG: true,
        helpfulVotes: 14,
        unhelpfulVotes: 0,
        viewCount: 88,
        contentMarkdown: `# PostgreSQL Production Failover and High Availability SOP

## Internal Architecture Overview
Our primary database tier uses Patroni with Raft-backed DCS (Distributed Configuration Store) and streaming replication across 3 cluster nodes.

## Verifying Node Topology
Run the cluster topology query on the primary bastion host:
\`\`\`bash
patronictl -c /etc/patroni/patroni.yml list
\`\`\`
Ensure the Leader node is healthy and lag on replicas is below 16MB.

## Initiating Controlled Switchover
1. To initiate planned maintenance switchover:
\`\`\`bash
patronictl -c /etc/patroni/patroni.yml switchover --master pg-node-01 --candidate pg-node-02
\`\`\`
2. Confirm the prompt. HAProxy routing will transparently redirect active write connections within 3 seconds.
3. Validate connection pools on Core API servers.`
      },
      {
        articleCode: 'KB-1005',
        title: 'Draft: Kubernetes Cluster Ingress Gateway Upgrade Runbook',
        slug: 'draft-kubernetes-cluster-ingress-gateway-upgrade-runbook',
        category: 'DEVOPS' as const,
        tags: ['kubernetes', 'ingress', 'istio', 'devops'],
        status: 'DRAFT' as const,
        authorId: sarah?._id || adminUser._id,
        accessRoles: ['TECHNICIAN', 'IT_MANAGER', 'SYSTEM_ADMIN'],
        isEligibleForRAG: false,
        helpfulVotes: 0,
        unhelpfulVotes: 0,
        viewCount: 6,
        contentMarkdown: `# Draft: Kubernetes Cluster Ingress Gateway Upgrade Runbook

## Overview
This runbook details the canary deployment strategy for upgrading Istio Ingress Gateway from v1.21 to v1.22.

## Canary Rollout Steps
1. Deploy new ingress canary pods with tag \`1.22.0\`.
2. Direct 10% of external synthetic traffic to the canary service.
3. Monitor error rate and 99th percentile response latency in Prometheus dashboard.
4. If zero 5xx errors after 30 minutes, promote canary to 100% traffic weight.`
      }
    ];

    logger.info(`[Seeder] Seeding ${SEED_ARTICLES.length} enterprise knowledge base articles...`);
    for (const articleData of SEED_ARTICLES) {
      const article = await KnowledgeArticle.findOneAndUpdate(
        { articleCode: articleData.articleCode },
        articleData,
        { upsert: true, new: true }
      );
      if (article.status === 'PUBLISHED') {
        await KnowledgeService.syncArticleChunks(article);
      }
      logger.info(`[Seeder] Seeded KB Article: "${article.articleCode}" - ${article.title} [${article.status}]`);
    }

    logger.info('[Seeder] Database seeding completed successfully.');
  } catch (error) {
    logger.error('[Seeder] Seeding failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    logger.info('[Seeder] Database disconnected.');
  }
}

// Allow direct CLI invocation: tsx src/scripts/seed.ts
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase().catch(() => process.exit(1));
}
