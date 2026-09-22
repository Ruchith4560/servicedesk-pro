import { apiClient } from './client.js';
import { RAGQueryResponse } from '../types/index.js';

export const knowledgeApi = {
  askAssistant: async (question: string, topK: number = 4): Promise<RAGQueryResponse> => {
    const res = await apiClient.post('/knowledge/ask', { question, topK });
    return res.data.data;
  },

  getArticleByCodeOrSlug: async (codeOrSlug: string): Promise<any> => {
    const res = await apiClient.get(`/knowledge/${codeOrSlug}`);
    return res.data.data.article;
  }
};
