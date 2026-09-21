import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '../models/User.js';
import { SLAPolicy } from '../models/SLAPolicy.js';
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
      logger.info(`[Seeder] Seeded SLA Policy: "${policyData.name}" [${policyData.priority}]`);
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
