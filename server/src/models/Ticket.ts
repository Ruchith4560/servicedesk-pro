import mongoose, { Schema, Document, Model } from 'mongoose';

export const TICKET_STATUSES = [
  'OPEN',
  'TRIAGED',
  'ASSIGNED',
  'IN_PROGRESS',
  'WAITING',
  'RESOLVED',
  'CLOSED',
  'REOPENED'
] as const;

export type TicketStatus = typeof TICKET_STATUSES[number];

export const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type TicketPriority = typeof TICKET_PRIORITIES[number];

export const TICKET_CATEGORIES = [
  'HARDWARE',
  'SOFTWARE',
  'NETWORK',
  'ACCESS_IAM',
  'SECURITY'
] as const;
export type TicketCategory = typeof TICKET_CATEGORIES[number];

export interface ISLATimers {
  responseDeadline?: Date;
  resolutionDeadline?: Date;
  firstRespondedAt?: Date;
  resolvedAt?: Date;
  responseBreached: boolean;
  resolutionBreached: boolean;
  isPaused: boolean;
  pausedAt?: Date;
  totalPausedDurationMs: number;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface IRiskScore {
  score: number;
  level?: RiskLevel;
  calculatedAt: Date;
  factors: string[];
}

export interface IAIAnalysisSummary {
  suggestedCategory?: TicketCategory;
  suggestedPriority?: TicketPriority;
  confidence?: number;
  probableIssue?: string;
  applied: boolean;
  topKeywords?: string[];
  requiresManualTriage?: boolean;
  triageReason?: string;
  suggestedSkills?: string[];
}

export interface ITicket extends Document {
  ticketNumber: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  requesterId: mongoose.Types.ObjectId;
  assigneeId?: mongoose.Types.ObjectId;
  teamId?: mongoose.Types.ObjectId;
  assetId?: mongoose.Types.ObjectId;
  slaPolicyId?: mongoose.Types.ObjectId;
  slaTimers: ISLATimers;
  riskScore: IRiskScore;
  aiAnalysis?: IAIAnalysisSummary;
  tags: string[];
  reopenCount: number;
  reopenReason?: string;
  resolutionSummary?: string;
  rootCause?: string;
  waitingReason?: string;
  parentIncidentId?: mongoose.Types.ObjectId;
  duplicateTickets?: mongoose.Types.ObjectId[];
  duplicateScore?: number;
  isMajorIncident?: boolean;
  clusterReason?: string;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema = new Schema<ITicket>(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Ticket title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Ticket description is required']
    },
    category: {
      type: String,
      enum: TICKET_CATEGORIES,
      required: true,
      default: 'SOFTWARE',
      index: true
    },
    priority: {
      type: String,
      enum: TICKET_PRIORITIES,
      required: true,
      default: 'MEDIUM',
      index: true
    },
    status: {
      type: String,
      enum: TICKET_STATUSES,
      default: 'OPEN',
      index: true
    },
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    assigneeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      index: true
    },
    assetId: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      index: true
    },
    slaPolicyId: {
      type: Schema.Types.ObjectId,
      ref: 'SLAPolicy'
    },
    slaTimers: {
      responseDeadline: { type: Date },
      resolutionDeadline: { type: Date, index: true },
      firstRespondedAt: { type: Date },
      resolvedAt: { type: Date },
      responseBreached: { type: Boolean, default: false },
      resolutionBreached: { type: Boolean, default: false },
      isPaused: { type: Boolean, default: false },
      pausedAt: { type: Date },
      totalPausedDurationMs: { type: Number, default: 0 }
    },
    riskScore: {
      score: { type: Number, default: 10, min: 0, max: 100 },
      level: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
      calculatedAt: { type: Date, default: Date.now },
      factors: { type: [String], default: ['INITIAL_CREATION'] }
    },
    aiAnalysis: {
      suggestedCategory: { type: String, enum: TICKET_CATEGORIES },
      suggestedPriority: { type: String, enum: TICKET_PRIORITIES },
      confidence: { type: Number, min: 0, max: 1 },
      probableIssue: { type: String },
      applied: { type: Boolean, default: false },
      topKeywords: { type: [String], default: [] },
      requiresManualTriage: { type: Boolean, default: false },
      triageReason: { type: String },
      suggestedSkills: { type: [String], default: [] }
    },
    tags: {
      type: [String],
      default: []
    },
    reopenCount: {
      type: Number,
      default: 0
    },
    reopenReason: {
      type: String
    },
    resolutionSummary: {
      type: String
    },
    rootCause: {
      type: String
    },
    waitingReason: {
      type: String
    },
    parentIncidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
      index: true
    },
    duplicateTickets: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Ticket'
      }
    ],
    duplicateScore: {
      type: Number,
      min: 0,
      max: 1
    },
    isMajorIncident: {
      type: Boolean,
      default: false,
      index: true
    },
    clusterReason: {
      type: String
    },
    closedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

TicketSchema.index({ status: 1, priority: 1 });
TicketSchema.index({ status: 1, priority: 1, createdAt: -1 });
TicketSchema.index({ category: 1, createdAt: -1 });
TicketSchema.index({ assigneeId: 1, status: 1 });
TicketSchema.index({ requesterId: 1, createdAt: -1 });
TicketSchema.index({ "slaTimers.resolutionDeadline": 1, status: 1 });

export const Ticket: Model<ITicket> =
  mongoose.models.Ticket || mongoose.model<ITicket>('Ticket', TicketSchema);
