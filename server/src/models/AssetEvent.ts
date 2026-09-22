import mongoose, { Schema, Document, Model } from 'mongoose';
import { AssetStatus } from './Asset.js';

export const ASSET_EVENT_TYPES = [
  'PROCURED',
  'STATUS_CHANGED',
  'ASSIGNED',
  'UNASSIGNED',
  'REPAIR_STARTED',
  'REPAIR_COMPLETED',
  'RETIRED',
  'WARRANTY_EXTENDED',
  'INCIDENT_LINKED'
] as const;

export type AssetEventType = typeof ASSET_EVENT_TYPES[number];

export interface IAssetEvent extends Document {
  assetId: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  eventType: AssetEventType;
  previousStatus?: AssetStatus;
  newStatus?: AssetStatus;
  previousOwnerId?: mongoose.Types.ObjectId;
  newOwnerId?: mongoose.Types.ObjectId;
  ticketId?: mongoose.Types.ObjectId;
  notes?: string;
  timestamp: Date;
}

const AssetEventSchema = new Schema<IAssetEvent>(
  {
    assetId: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
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
      enum: ASSET_EVENT_TYPES,
      required: true,
      index: true
    },
    previousStatus: {
      type: String
    },
    newStatus: {
      type: String
    },
    previousOwnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    newOwnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: 'Ticket'
    },
    notes: {
      type: String
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

AssetEventSchema.index({ assetId: 1, timestamp: -1 });

export const AssetEvent: Model<IAssetEvent> =
  mongoose.models.AssetEvent || mongoose.model<IAssetEvent>('AssetEvent', AssetEventSchema);
