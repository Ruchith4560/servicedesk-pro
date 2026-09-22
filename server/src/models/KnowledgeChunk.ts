import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IKnowledgeChunk extends Document {
  articleId: mongoose.Types.ObjectId;
  articleCode: string;
  chunkIndex: number;
  heading?: string;
  chunkText: string;
  tokenCount: number;
  vectorStoreId?: string;
  accessRoles: string[];
  contentHash: string;
  createdAt: Date;
}

const KnowledgeChunkSchema = new Schema<IKnowledgeChunk>(
  {
    articleId: {
      type: Schema.Types.ObjectId,
      ref: 'KnowledgeArticle',
      required: true,
      index: true
    },
    articleCode: {
      type: String,
      required: true,
      index: true
    },
    chunkIndex: {
      type: Number,
      required: true
    },
    heading: {
      type: String
    },
    chunkText: {
      type: String,
      required: true
    },
    tokenCount: {
      type: Number,
      required: true
    },
    vectorStoreId: {
      type: String,
      index: true
    },
    accessRoles: {
      type: [String],
      required: true,
      index: true
    },
    contentHash: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false
  }
);

KnowledgeChunkSchema.index({ articleId: 1, chunkIndex: 1 }, { unique: true });

export const KnowledgeChunk: Model<IKnowledgeChunk> =
  mongoose.models.KnowledgeChunk ||
  mongoose.model<IKnowledgeChunk>('KnowledgeChunk', KnowledgeChunkSchema);
