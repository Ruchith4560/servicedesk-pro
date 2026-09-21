import mongoose, { Schema, Document, Model } from 'mongoose';
import { TicketPriority, TicketCategory, TICKET_PRIORITIES, TICKET_CATEGORIES } from './Ticket.js';

export interface ISLAPolicy extends Document {
  name: string;
  description?: string;
  priority: TicketPriority;
  category?: TicketCategory;
  responseTimeHours: number;
  resolutionTimeHours: number;
  warningThresholdPercent: number; // e.g. 75 means 75%
  escalationRole: 'IT_MANAGER' | 'SYSTEM_ADMIN';
  businessHoursOnly: boolean;
  businessHours: {
    startHour: number; // e.g. 9
    endHour: number;   // e.g. 17
    timezone: string;  // e.g. 'UTC'
  };
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SLAPolicySchema = new Schema<ISLAPolicy>(
  {
    name: {
      type: String,
      required: [true, 'SLA policy name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    priority: {
      type: String,
      enum: TICKET_PRIORITIES,
      required: true,
      index: true
    },
    category: {
      type: String,
      enum: TICKET_CATEGORIES,
      index: true
    },
    responseTimeHours: {
      type: Number,
      required: true,
      min: [0.1, 'Response time must be at least 0.1 hours (6 mins)']
    },
    resolutionTimeHours: {
      type: Number,
      required: true,
      min: [0.2, 'Resolution time must be at least 0.2 hours']
    },
    warningThresholdPercent: {
      type: Number,
      default: 75,
      min: 10,
      max: 95
    },
    escalationRole: {
      type: String,
      enum: ['IT_MANAGER', 'SYSTEM_ADMIN'],
      default: 'IT_MANAGER'
    },
    businessHoursOnly: {
      type: Boolean,
      default: false
    },
    businessHours: {
      startHour: { type: Number, default: 9 },
      endHour: { type: Number, default: 17 },
      timezone: { type: String, default: 'UTC' }
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

SLAPolicySchema.index({ priority: 1, category: 1, active: 1 });

export const SLAPolicy: Model<ISLAPolicy> =
  mongoose.models.SLAPolicy || mongoose.model<ISLAPolicy>('SLAPolicy', SLAPolicySchema);
