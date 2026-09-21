import mongoose, { Schema, Document, Model } from 'mongoose';

export const WORKLOG_ACTIVITIES = [
  'INVESTIGATION',
  'TROUBLESHOOTING',
  'HARDWARE_REPAIR',
  'VENDOR_CONTACT',
  'USER_COMMUNICATION',
  'TESTING'
] as const;

export type WorkLogActivity = typeof WORKLOG_ACTIVITIES[number];

export interface IWorkLog extends Document {
  ticketId: mongoose.Types.ObjectId;
  technicianId: mongoose.Types.ObjectId;
  timeSpentMinutes: number;
  activityType: WorkLogActivity;
  description: string;
  loggedAt: Date;
}

const WorkLogSchema = new Schema<IWorkLog>(
  {
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      index: true
    },
    technicianId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    timeSpentMinutes: {
      type: Number,
      required: true,
      min: [1, 'Time spent must be at least 1 minute']
    },
    activityType: {
      type: String,
      enum: WORKLOG_ACTIVITIES,
      default: 'INVESTIGATION'
    },
    description: {
      type: String,
      required: [true, 'Work log description is required'],
      trim: true
    },
    loggedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false
  }
);

WorkLogSchema.index({ ticketId: 1, loggedAt: -1 });

export const WorkLog: Model<IWorkLog> =
  mongoose.models.WorkLog || mongoose.model<IWorkLog>('WorkLog', WorkLogSchema);
