import mongoose, { Schema, Document, Model } from 'mongoose';
import { TicketCategory, TICKET_CATEGORIES } from './Ticket.js';

export const ARTICLE_STATUSES = [
  'DRAFT',
  'IN_REVIEW',
  'APPROVED',
  'PUBLISHED',
  'ARCHIVED'
] as const;

export type ArticleStatus = typeof ARTICLE_STATUSES[number];

export interface IKnowledgeArticle extends Document {
  articleCode: string; // e.g. "KB-101"
  title: string;
  slug: string;
  contentMarkdown: string;
  category: TicketCategory;
  tags: string[];
  status: ArticleStatus;
  version: number;
  authorId: mongoose.Types.ObjectId;
  approvedById?: mongoose.Types.ObjectId;
  publishedAt?: Date;
  accessRoles: string[]; // ['EMPLOYEE', 'TECHNICIAN', 'IT_MANAGER', 'SYSTEM_ADMIN']
  helpfulVotes: number;
  unhelpfulVotes: number;
  viewCount: number;
  isEligibleForRAG: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeArticleSchema = new Schema<IKnowledgeArticle>(
  {
    articleCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Article title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    contentMarkdown: {
      type: String,
      required: [true, 'Article markdown content is required']
    },
    category: {
      type: String,
      enum: TICKET_CATEGORIES,
      required: true,
      index: true
    },
    tags: {
      type: [String],
      default: [],
      index: true
    },
    status: {
      type: String,
      enum: ARTICLE_STATUSES,
      default: 'DRAFT',
      index: true
    },
    version: {
      type: Number,
      default: 1
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    approvedById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    publishedAt: {
      type: Date
    },
    accessRoles: {
      type: [String],
      default: ['EMPLOYEE', 'TECHNICIAN', 'IT_MANAGER', 'SYSTEM_ADMIN', 'ASSET_MANAGER'],
      index: true
    },
    helpfulVotes: {
      type: Number,
      default: 0
    },
    unhelpfulVotes: {
      type: Number,
      default: 0
    },
    viewCount: {
      type: Number,
      default: 0
    },
    isEligibleForRAG: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound text index for search
KnowledgeArticleSchema.index({
  title: 'text',
  contentMarkdown: 'text',
  tags: 'text'
});

KnowledgeArticleSchema.index({ status: 1, accessRoles: 1 });
KnowledgeArticleSchema.index({ category: 1, status: 1 });
KnowledgeArticleSchema.index({ status: 1, category: 1, viewCount: -1 });

export const KnowledgeArticle: Model<IKnowledgeArticle> =
  mongoose.models.KnowledgeArticle ||
  mongoose.model<IKnowledgeArticle>('KnowledgeArticle', KnowledgeArticleSchema);
