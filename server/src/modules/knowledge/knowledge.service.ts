import crypto from 'crypto';
import mongoose from 'mongoose';
import { KnowledgeArticle, IKnowledgeArticle, ArticleStatus } from '../../models/KnowledgeArticle.js';
import { KnowledgeChunk, IKnowledgeChunk } from '../../models/KnowledgeChunk.js';
import { getNextSequence } from '../../models/Counter.js';
import { AuditEvent } from '../../models/AuditEvent.js';
import { AppError } from '../../middleware/error.middleware.js';
import { AuthUserPayload } from '../../types/auth.types.js';
import { TicketCategory } from '../../models/Ticket.js';
import { UserRole } from '../../models/User.js';

export interface CreateArticleDTO {
  title: string;
  contentMarkdown: string;
  category: TicketCategory;
  tags?: string[];
  accessRoles?: UserRole[];
}

export interface UpdateArticleDTO {
  title?: string;
  contentMarkdown?: string;
  category?: TicketCategory;
  tags?: string[];
  accessRoles?: UserRole[];
}

export interface GetArticlesQuery {
  category?: TicketCategory;
  status?: ArticleStatus;
  tag?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export function chunkMarkdown(content: string): Array<{ heading: string; text: string }> {
  const lines = content.split('\n');
  const chunks: Array<{ heading: string; text: string }> = [];
  let currentHeading = 'Overview';
  let currentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
    if (headingMatch) {
      if (currentLines.length > 0 && currentLines.join('\n').trim().length > 0) {
        chunks.push({
          heading: currentHeading,
          text: currentLines.join('\n').trim()
        });
        currentLines = [];
      }
      currentHeading = headingMatch[1].trim();
      currentLines.push(line);
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0 && currentLines.join('\n').trim().length > 0) {
    chunks.push({
      heading: currentHeading,
      text: currentLines.join('\n').trim()
    });
  }

  if (chunks.length === 0 && content.trim().length > 0) {
    chunks.push({
      heading: 'General',
      text: content.trim()
    });
  }

  return chunks;
}

export class KnowledgeService {
  /**
   * Generates a URL-friendly slug from title
   */
  private static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  /**
   * Generates and stores semantic chunks for a published article
   */
  public static async syncArticleChunks(article: IKnowledgeArticle): Promise<IKnowledgeChunk[]> {
    // Delete existing chunks for this article
    await KnowledgeChunk.deleteMany({ articleId: article._id });

    if (article.status !== 'PUBLISHED') {
      return [];
    }

    const rawChunks = chunkMarkdown(article.contentMarkdown);
    const chunkDocs = rawChunks.map((chunk, index) => {
      const words = chunk.text.split(/\s+/).filter(Boolean);
      const tokenCount = Math.ceil(words.length * 1.3);
      const contentHash = crypto.createHash('sha256').update(chunk.text).digest('hex');

      return {
        articleId: article._id,
        articleCode: article.articleCode,
        chunkIndex: index,
        heading: chunk.heading,
        chunkText: chunk.text,
        tokenCount,
        accessRoles: article.accessRoles,
        contentHash,
        createdAt: new Date()
      };
    });

    if (chunkDocs.length > 0) {
      return (await KnowledgeChunk.insertMany(chunkDocs)) as unknown as IKnowledgeChunk[];
    }
    return [];
  }

  /**
   * Create a new draft Knowledge Article
   */
  static async createArticle(
    data: CreateArticleDTO,
    author: AuthUserPayload,
    meta: RequestMeta = {}
  ): Promise<IKnowledgeArticle> {
    const seq = await getNextSequence('knowledgeArticleCode');
    const articleCode = `KB-${seq}`;

    let baseSlug = this.generateSlug(data.title);
    if (!baseSlug) {
      baseSlug = `article-${seq}`;
    }

    // Check slug uniqueness
    const existingSlug = await KnowledgeArticle.findOne({ slug: baseSlug });
    const slug = existingSlug ? `${baseSlug}-${seq}` : baseSlug;

    const article = await KnowledgeArticle.create({
      articleCode,
      title: data.title,
      slug,
      contentMarkdown: data.contentMarkdown,
      category: data.category,
      tags: data.tags || [],
      status: 'DRAFT',
      version: 1,
      authorId: new mongoose.Types.ObjectId(author.userId),
      accessRoles: data.accessRoles || ['EMPLOYEE', 'TECHNICIAN', 'IT_MANAGER', 'SYSTEM_ADMIN', 'ASSET_MANAGER'],
      isEligibleForRAG: false
    });

    await AuditEvent.create({
      action: 'KNOWLEDGE_ARTICLE_CREATED',
      resourceType: 'KnowledgeArticle',
      resourceId: (article._id as mongoose.Types.ObjectId).toString(),
      actorId: new mongoose.Types.ObjectId(author.userId),
      actorEmail: author.email,
      actorIp: meta.ip,
      userAgent: meta.userAgent,
      severity: 'INFO',
      changes: {
        after: {
          articleCode,
          title: article.title,
          category: article.category,
          status: article.status
        }
      }
    });

    return article;
  }

  /**
   * Update article details (Draft/In-Review, or new version for Published)
   */
  static async updateArticle(
    articleId: string,
    data: UpdateArticleDTO,
    user: AuthUserPayload,
    meta: RequestMeta = {}
  ): Promise<IKnowledgeArticle> {
    const article = await KnowledgeArticle.findById(articleId);
    if (!article) {
      throw new AppError('Knowledge article not found', 404, 'ARTICLE_NOT_FOUND');
    }

    const isAuthor = article.authorId.toString() === user.userId;
    const isManagerOrAdmin = ['IT_MANAGER', 'SYSTEM_ADMIN'].includes(user.role);

    if (!isAuthor && !isManagerOrAdmin) {
      throw new AppError('You do not have permission to edit this article', 403, 'FORBIDDEN');
    }

    // If article is published, editing bumps version
    if (article.status === 'PUBLISHED') {
      article.version += 1;
    }

    if (data.title) article.title = data.title;
    if (data.contentMarkdown) article.contentMarkdown = data.contentMarkdown;
    if (data.category) article.category = data.category;
    if (data.tags) article.tags = data.tags;
    if (data.accessRoles) article.accessRoles = data.accessRoles;

    await article.save();

    // Re-sync chunks if article is currently published
    if (article.status === 'PUBLISHED') {
      await this.syncArticleChunks(article);
    }

    await AuditEvent.create({
      action: 'KNOWLEDGE_ARTICLE_UPDATED',
      resourceType: 'KnowledgeArticle',
      resourceId: articleId,
      actorId: new mongoose.Types.ObjectId(user.userId),
      actorEmail: user.email,
      actorIp: meta.ip,
      userAgent: meta.userAgent,
      severity: 'INFO',
      changes: {
        after: {
          articleCode: article.articleCode,
          version: article.version,
          updatedFields: Object.keys(data)
        }
      }
    });

    return article;
  }

  /**
   * Editorial Workflow Status Transition
   * Valid Transitions:
   * DRAFT -> IN_REVIEW
   * IN_REVIEW -> APPROVED (Four-Eyes Principle: Author cannot approve their own article unless SYSTEM_ADMIN)
   * IN_REVIEW -> DRAFT (Rejection / Change Request)
   * APPROVED -> PUBLISHED
   * APPROVED -> DRAFT
   * PUBLISHED -> ARCHIVED
   * ARCHIVED -> DRAFT
   */
  static async transitionStatus(
    articleId: string,
    targetStatus: ArticleStatus,
    user: AuthUserPayload,
    meta: RequestMeta = {}
  ): Promise<IKnowledgeArticle> {
    const article = await KnowledgeArticle.findById(articleId);
    if (!article) {
      throw new AppError('Knowledge article not found', 404, 'ARTICLE_NOT_FOUND');
    }

    const currentStatus = article.status;
    const isAuthor = article.authorId.toString() === user.userId;
    const isManager = user.role === 'IT_MANAGER';
    const isAdmin = user.role === 'SYSTEM_ADMIN';

    if (currentStatus === targetStatus) {
      return article;
    }

    // Rule 1: Submitting to Review (DRAFT -> IN_REVIEW)
    if (targetStatus === 'IN_REVIEW') {
      if (currentStatus !== 'DRAFT') {
        throw new AppError(`Cannot submit article from ${currentStatus} to IN_REVIEW`, 400, 'INVALID_TRANSITION');
      }
      if (!isAuthor && !isManager && !isAdmin) {
        throw new AppError('Only the author or managers can submit this article for review', 403, 'FORBIDDEN');
      }
    }

    // Rule 2: Approving Article (IN_REVIEW -> APPROVED)
    else if (targetStatus === 'APPROVED') {
      if (currentStatus !== 'IN_REVIEW') {
        throw new AppError(`Cannot approve an article with status ${currentStatus}`, 400, 'INVALID_TRANSITION');
      }
      if (!isManager && !isAdmin) {
        throw new AppError('Only an IT Manager or System Admin can approve articles', 403, 'FORBIDDEN');
      }
      // Four-Eyes Principle: An author cannot approve their own article unless System Admin
      if (isAuthor && !isAdmin) {
        throw new AppError(
          'Four-eyes approval policy violation: Authors cannot self-approve their own articles. A separate peer review by another IT Manager is required.',
          403,
          'FOUR_EYES_PRINCIPLE_VIOLATION'
        );
      }
      article.approvedById = new mongoose.Types.ObjectId(user.userId);
    }

    // Rule 3: Rejecting back to Draft (IN_REVIEW -> DRAFT)
    else if (targetStatus === 'DRAFT' && currentStatus === 'IN_REVIEW') {
      if (!isManager && !isAdmin && !isAuthor) {
        throw new AppError('Unauthorized to reject or withdraw review', 403, 'FORBIDDEN');
      }
    }

    // Rule 4: Publishing (APPROVED -> PUBLISHED)
    else if (targetStatus === 'PUBLISHED') {
      if (currentStatus !== 'APPROVED' && !isAdmin) {
        throw new AppError('Only APPROVED articles can be PUBLISHED', 400, 'INVALID_TRANSITION');
      }
      if (!isManager && !isAdmin && !isAuthor) {
        throw new AppError('Unauthorized to publish this article', 403, 'FORBIDDEN');
      }
      article.publishedAt = new Date();
      article.isEligibleForRAG = true;
    }

    // Rule 5: Archiving (PUBLISHED -> ARCHIVED)
    else if (targetStatus === 'ARCHIVED') {
      if (currentStatus !== 'PUBLISHED' && !isAdmin) {
        throw new AppError('Only PUBLISHED articles can be ARCHIVED', 400, 'INVALID_TRANSITION');
      }
      if (!isManager && !isAdmin) {
        throw new AppError('Only IT Managers and Admins can archive articles', 403, 'FORBIDDEN');
      }
      article.isEligibleForRAG = false;
    }

    // Rule 6: Un-archiving / Re-opening to Draft (ARCHIVED -> DRAFT or APPROVED -> DRAFT)
    else if (targetStatus === 'DRAFT') {
      if (!isManager && !isAdmin && !isAuthor) {
        throw new AppError('Unauthorized to revert article to draft', 403, 'FORBIDDEN');
      }
      article.isEligibleForRAG = false;
    } else {
      // Any other transition not explicitly allowed
      if (!isAdmin) {
        throw new AppError(
          `Transition from ${currentStatus} to ${targetStatus} is not permitted`,
          400,
          'INVALID_TRANSITION'
        );
      }
    }

    article.status = targetStatus;
    await article.save();

    // Synchronize semantic chunks for RAG
    await this.syncArticleChunks(article);

    await AuditEvent.create({
      action: 'KNOWLEDGE_ARTICLE_STATUS_CHANGED',
      resourceType: 'KnowledgeArticle',
      resourceId: articleId,
      actorId: new mongoose.Types.ObjectId(user.userId),
      actorEmail: user.email,
      actorIp: meta.ip,
      userAgent: meta.userAgent,
      severity: 'INFO',
      changes: {
        before: { status: currentStatus },
        after: { status: targetStatus, isEligibleForRAG: article.isEligibleForRAG }
      }
    });

    return article;
  }

  /**
   * List / Search knowledge articles with role-based visibility
   */
  static async getArticles(
    query: GetArticlesQuery,
    user: AuthUserPayload
  ): Promise<{ articles: IKnowledgeArticle[]; meta: { total: number; page: number; totalPages: number; limit: number } }> {
    const filter: Record<string, any> = {};

    // RBAC Visibility Scope
    if (user.role === 'EMPLOYEE') {
      filter.status = 'PUBLISHED';
      filter.accessRoles = { $in: ['EMPLOYEE'] };
    } else if (user.role === 'TECHNICIAN' || user.role === 'ASSET_MANAGER') {
      if (query.status === 'PUBLISHED') {
        filter.status = 'PUBLISHED';
        filter.accessRoles = { $in: [user.role] };
      } else if (query.status) {
        filter.authorId = new mongoose.Types.ObjectId(user.userId);
        filter.status = query.status;
      } else {
        filter.$or = [
          { status: 'PUBLISHED', accessRoles: { $in: [user.role] } },
          { authorId: new mongoose.Types.ObjectId(user.userId) }
        ];
      }
    } else {
      // IT_MANAGER, SYSTEM_ADMIN can filter by any status
      if (query.status) {
        filter.status = query.status;
      }
    }

    if (query.category) {
      filter.category = query.category;
    }

    if (query.tag) {
      filter.tags = { $in: [query.tag] };
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      const searchConditions = [
        { title: searchRegex },
        { tags: searchRegex },
        { contentMarkdown: searchRegex }
      ];

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [articles, total] = await Promise.all([
      KnowledgeArticle.find(filter)
        .populate('authorId', 'firstName lastName email role')
        .populate('approvedById', 'firstName lastName email role')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      KnowledgeArticle.countDocuments(filter)
    ]);

    return {
      articles,
      meta: {
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
        limit
      }
    };
  }

  /**
   * Get single article by ID or Slug with view increment and role validation
   */
  static async getArticleByIdOrSlug(idOrSlug: string, user: AuthUserPayload): Promise<IKnowledgeArticle> {
    const isObjectId = mongoose.Types.ObjectId.isValid(idOrSlug) && idOrSlug.length === 24;
    const query = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };

    const article = await KnowledgeArticle.findOne(query)
      .populate('authorId', 'firstName lastName email role')
      .populate('approvedById', 'firstName lastName email role');

    if (!article) {
      throw new AppError('Knowledge article not found', 404, 'ARTICLE_NOT_FOUND');
    }

    const isAuthor = article.authorId && (article.authorId as any)._id
      ? (article.authorId as any)._id.toString() === user.userId
      : article.authorId.toString() === user.userId;
    const isManagerOrAdmin = ['IT_MANAGER', 'SYSTEM_ADMIN'].includes(user.role);

    // Non-published articles can only be read by author or IT_MANAGER/SYSTEM_ADMIN
    if (article.status !== 'PUBLISHED') {
      if (!isAuthor && !isManagerOrAdmin) {
        throw new AppError('You do not have permission to view unpublished drafts', 403, 'FORBIDDEN');
      }
    } else {
      // For published articles, verify access role
      if (!article.accessRoles.includes(user.role) && !isManagerOrAdmin) {
        throw new AppError('You do not have role permission to view this article', 403, 'FORBIDDEN');
      }
    }

    // Atomically increment view count
    article.viewCount += 1;
    await KnowledgeArticle.updateOne({ _id: article._id }, { $inc: { viewCount: 1 } });

    return article;
  }

  /**
   * Submit helpful / unhelpful feedback vote
   */
  static async voteFeedback(
    articleId: string,
    isHelpful: boolean,
    user: AuthUserPayload
  ): Promise<IKnowledgeArticle> {
    const article = await KnowledgeArticle.findById(articleId);
    if (!article) {
      throw new AppError('Knowledge article not found', 404, 'ARTICLE_NOT_FOUND');
    }

    if (article.status !== 'PUBLISHED') {
      throw new AppError('Only published articles can receive feedback', 400, 'ARTICLE_NOT_PUBLISHED');
    }

    const updateField = isHelpful ? 'helpfulVotes' : 'unhelpfulVotes';
    const updated = await KnowledgeArticle.findByIdAndUpdate(
      articleId,
      { $inc: { [updateField]: 1 } },
      { new: true }
    );

    return updated!;
  }

  /**
   * Delete article (IT Managers and Admins only)
   */
  static async deleteArticle(articleId: string, user: AuthUserPayload, meta: RequestMeta = {}): Promise<void> {
    const article = await KnowledgeArticle.findById(articleId);
    if (!article) {
      throw new AppError('Knowledge article not found', 404, 'ARTICLE_NOT_FOUND');
    }

    await KnowledgeChunk.deleteMany({ articleId: article._id });
    await KnowledgeArticle.deleteOne({ _id: article._id });

    await AuditEvent.create({
      action: 'KNOWLEDGE_ARTICLE_DELETED',
      resourceType: 'KnowledgeArticle',
      resourceId: articleId,
      actorId: new mongoose.Types.ObjectId(user.userId),
      actorEmail: user.email,
      actorIp: meta.ip,
      userAgent: meta.userAgent,
      severity: 'WARN',
      changes: {
        before: {
          articleCode: article.articleCode,
          title: article.title
        }
      }
    });
  }
}
