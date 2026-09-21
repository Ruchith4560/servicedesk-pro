import mongoose, { Schema, Document, Model } from 'mongoose';

export const TICKET_EVENT_TYPES = [
  'TICKET_CREATED',
  'STATUS_CHANGED',
  'ASSIGNED',
  'UNASSIGNED',
  'PRIORITY_CHANGED',
  'CATEGORY_CHANGED',
  'COMMENT_ADDED',
  'INTERNAL_NOTE_ADDED',
  'WORK_LOG_RECORDED',
  'SLA_WARNING',
  'SLA_BREACHED',
  'REOPENED'
] as const;

export type TicketEventType = typeof TICKET_EVENT_TYPES[number];

export interface ITicketEvent extends Document {
  ticketId: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  eventType: TicketEventType;
  previousValue?: any;
  newValue?: any;
  note?: string;
  isInternal: boolean;
  timestamp: Date;
}

const TicketEventSchema = new Schema<ITicketEvent>(
  {
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      index: true
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    eventType: {
      type: String,
      enum: TICKET_EVENT_TYPES,
      required: true,
      index: true
    },
    previousValue: {
      type: Schema.Types.Mixed
    },
    newValue: {
      type: Schema.Types.Mixed
    },
    note: {
      type: String
    },
    isInternal: {
      type: Boolean,
      default: false
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

TicketEventSchema.index({ ticketId: 1, timestamp: -1 });

export const TicketEvent: Model<ITicketEvent> =
  mongoose.models.TicketEvent || mongoose.model<ITicketEvent>('TicketEvent', TicketEventSchema);
