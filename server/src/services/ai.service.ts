import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { TicketCategory, TicketPriority } from '../models/Ticket.js';

export interface AIClassificationResult {
  predictedCategory: TicketCategory;
  categoryConfidence: number;
  categoryProbabilities: Record<string, number>;
  predictedPriority: TicketPriority;
  priorityConfidence: number;
  priorityProbabilities: Record<string, number>;
  topKeywords: string[];
  requiresManualTriage: boolean;
  triageReason?: string;
  suggestedSkills: string[];
  modelVersion: string;
  isFallback: boolean;
}

export class AIService {
  private static readonly TIMEOUT_MS = 3500;

  /**
   * Invokes Python AI microservice to classify ticket into category and priority
   * with explainability features. Includes graceful fallback if microservice is offline.
   */
  static async classifyTicket(title: string, description: string): Promise<AIClassificationResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/api/v1/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': env.INTERNAL_AI_SECRET
        },
        body: JSON.stringify({ title, description }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`AI Microservice responded with status ${response.status}`);
      }

      const data = await response.json();

      return {
        predictedCategory: data.predicted_category as TicketCategory,
        categoryConfidence: data.category_confidence,
        categoryProbabilities: data.category_probabilities,
        predictedPriority: data.predicted_priority as TicketPriority,
        priorityConfidence: data.priority_confidence,
        priorityProbabilities: data.priority_probabilities,
        topKeywords: data.top_keywords || [],
        requiresManualTriage: Boolean(data.requires_manual_triage),
        triageReason: data.triage_reason,
        suggestedSkills: data.suggested_skills || [],
        modelVersion: data.model_version || '1.0.0',
        isFallback: false
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      logger.warn(`[AIService] AI classification failed or microservice offline: ${error.message}. Degrading to heuristic fallback.`);

      // Graceful Heuristic Fallback
      return this.heuristicFallback(title, description);
    }
  }

  /**
   * Safe heuristic fallback when Python AI microservice is not available
   */
  private static heuristicFallback(title: string, description: string): AIClassificationResult {
    const combined = `${title} ${description}`.toLowerCase();

    let category: TicketCategory = 'SOFTWARE';
    let priority: TicketPriority = 'MEDIUM';
    const keywords: string[] = [];

    if (/\b(vpn|wifi|network|dns|ip|switch|gateway|subnet|ping)\b/i.test(combined)) {
      category = 'NETWORK';
      keywords.push('network');
    } else if (/\b(laptop|screen|monitor|printer|hardware|dock|battery|keyboard|ram|disk)\b/i.test(combined)) {
      category = 'HARDWARE';
      keywords.push('hardware');
    } else if (/\b(password|mfa|login|account|access|permission|okta|sso|iam|token)\b/i.test(combined)) {
      category = 'ACCESS_IAM';
      keywords.push('access');
    } else if (/\b(phishing|malware|ransomware|security|virus|breach|stolen|trojan)\b/i.test(combined)) {
      category = 'SECURITY';
      priority = 'CRITICAL';
      keywords.push('security');
    }

    if (/\b(urgent|critical|emergency|down|outage|fire)\b/i.test(combined)) {
      priority = 'CRITICAL';
    } else if (/\b(blocked|broken|failing|cannot work)\b/i.test(combined)) {
      priority = 'HIGH';
    } else if (/\b(request|upgrade|question|minor)\b/i.test(combined)) {
      priority = 'LOW';
    }

    return {
      predictedCategory: category,
      categoryConfidence: 0.5,
      categoryProbabilities: { [category]: 0.5 },
      predictedPriority: priority,
      priorityConfidence: 0.5,
      priorityProbabilities: { [priority]: 0.5 },
      topKeywords: keywords,
      requiresManualTriage: true,
      triageReason: 'Classified using offline heuristic fallback due to AI microservice unavailability.',
      suggestedSkills: [],
      modelVersion: 'heuristic-fallback-1.0',
      isFallback: true
    };
  }

  /**
   * Retrieves model performance metrics from AI microservice
   */
  static async getModelMetrics(): Promise<any> {
    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/api/v1/model-metrics`, {
        headers: { 'x-internal-secret': env.INTERNAL_AI_SECRET }
      });
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Invokes RAG Knowledge Assistant with user role payload filtering
   */
  static async queryKnowledgeAssistant(
    query: string,
    userRole: string,
    topK = 4
  ): Promise<RAGQueryResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/api/v1/rag/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': env.INTERNAL_AI_SECRET
        },
        body: JSON.stringify({ query, user_role: userRole, top_k: topK }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`RAG query failed with status ${response.status}`);
      }

      const data = await response.json();
      return {
        answer: data.answer,
        citations: data.citations || [],
        hasSufficientContext: Boolean(data.has_sufficient_context),
        confidence: data.confidence || 0.0
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      logger.warn(`[AIService] RAG query failed or microservice offline: ${error.message}. Returning fallback.`);

      return {
        answer: 'The Knowledge Assistant is temporarily unreachable. Please refer to standard IT operating procedures or escalate this ticket to a technician.',
        citations: [],
        hasSufficientContext: false,
        confidence: 0.0
      };
    }
  }

  /**
   * Pushes generated semantic chunks to Qdrant vector store
   */
  static async indexKnowledgeChunks(chunks: any[]): Promise<boolean> {
    if (!chunks || chunks.length === 0) return true;

    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/api/v1/rag/index`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': env.INTERNAL_AI_SECRET
        },
        body: JSON.stringify({
          chunks: chunks.map((c) => ({
            articleId: c.articleId ? c.articleId.toString() : '',
            articleCode: c.articleCode,
            chunkIndex: c.chunkIndex,
            heading: c.heading || 'General',
            chunkText: c.chunkText,
            accessRoles: c.accessRoles,
            contentHash: c.contentHash
          }))
        })
      });
      return response.ok;
    } catch (error: any) {
      logger.warn(`[AIService] Failed to push chunks to vector store: ${error.message}`);
      return false;
    }
  }

  /**
   * Deletes vector points for an article from Qdrant
   */
  static async deleteArticleVectors(articleId: string): Promise<boolean> {
    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/api/v1/rag/articles/${articleId}`, {
        method: 'DELETE',
        headers: {
          'x-internal-secret': env.INTERNAL_AI_SECRET
        }
      });
      return response.ok;
    } catch (error: any) {
      logger.warn(`[AIService] Failed to delete article vectors: ${error.message}`);
      return false;
    }
  }
}

export interface RAGCitation {
  articleCode: string;
  heading: string;
  relevanceScore: number;
  chunkText: string;
}

export interface RAGQueryResponse {
  answer: string;
  citations: RAGCitation[];
  hasSufficientContext: boolean;
  confidence: number;
}
