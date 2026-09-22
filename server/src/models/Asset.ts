import mongoose, { Schema, Document, Model } from 'mongoose';

export const ASSET_TYPES = [
  'LAPTOP',
  'DESKTOP',
  'SERVER',
  'NETWORK_DEVICE',
  'PERIPHERAL',
  'SOFTWARE_LICENSE'
] as const;

export type AssetType = typeof ASSET_TYPES[number];

export const ASSET_STATUSES = [
  'PROCURED',
  'IN_STOCK',
  'ASSIGNED',
  'UNDER_REPAIR',
  'RETIRED'
] as const;

export type AssetStatus = typeof ASSET_STATUSES[number];

export interface IAsset extends Document {
  assetTag: string;
  serialNumber: string;
  name: string;
  type: AssetType;
  ownerId?: mongoose.Types.ObjectId;
  department: string;
  location: string;
  status: AssetStatus;
  purchaseDate: Date;
  warrantyExpiry: Date;
  vendor: string;
  cost?: number;
  isCritical: boolean;
  specifications: Record<string, any>;
  incidentTicketIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const AssetSchema = new Schema<IAsset>(
  {
    assetTag: {
      type: String,
      required: [true, 'Asset tag is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    serialNumber: {
      type: String,
      required: [true, 'Serial number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Asset name is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ASSET_TYPES,
      required: true,
      index: true
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    department: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ASSET_STATUSES,
      default: 'IN_STOCK',
      index: true
    },
    purchaseDate: {
      type: Date,
      required: true
    },
    warrantyExpiry: {
      type: Date,
      required: true,
      index: true
    },
    vendor: {
      type: String,
      required: true,
      trim: true
    },
    cost: {
      type: Number,
      min: 0
    },
    isCritical: {
      type: Boolean,
      default: false,
      index: true
    },
    specifications: {
      type: Schema.Types.Mixed,
      default: {}
    },
    incidentTicketIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Ticket'
      }
    ]
  },
  {
    timestamps: true
  }
);

AssetSchema.index({ status: 1, type: 1 });
AssetSchema.index({ department: 1, status: 1 });

export const Asset: Model<IAsset> =
  mongoose.models.Asset || mongoose.model<IAsset>('Asset', AssetSchema);
