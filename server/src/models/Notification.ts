import mongoose, { Schema, Document, Model } from 'mongoose';

export const NOTIFICATION_TYPES = [
  'TICKET_ASSIGNED',
  'SLA_WARNING',
  'SLA_BREACH',
  'STATUS_CHANGED',
  'COMMENT_RECEIVED',
  'TICKET_ESCALATED'
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number];

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    linkUrl: {
      type: String
    },
    read: {
      type: Boolean,
      default: false,
      index: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false
  }
);

NotificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema);
