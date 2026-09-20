import mongoose, { Document, Schema, Model } from 'mongoose';

export type AuditSeverity = 'INFO' | 'WARN' | 'CRITICAL';

export interface IAuditEvent extends Document {
  actorId?: mongoose.Types.ObjectId;
  actorEmail?: string;
  actorIp?: string;
  userAgent?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  severity: AuditSeverity;
  timestamp: Date;
}

const AuditEventSchema = new Schema<IAuditEvent>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    actorEmail: {
      type: String
    },
    actorIp: {
      type: String
    },
    userAgent: {
      type: String
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    resourceType: {
      type: String,
      required: true,
      index: true
    },
    resourceId: {
      type: String,
      index: true
    },
    changes: {
      before: { type: Schema.Types.Mixed },
      after: { type: Schema.Types.Mixed }
    },
    severity: {
      type: String,
      enum: ['INFO', 'WARN', 'CRITICAL'],
      default: 'INFO',
      index: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false
  }
);

AuditEventSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });

export const AuditEvent: Model<IAuditEvent> =
  mongoose.models.AuditEvent || mongoose.model<IAuditEvent>('AuditEvent', AuditEventSchema);
