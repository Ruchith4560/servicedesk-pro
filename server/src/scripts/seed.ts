import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '../models/User.js';
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
