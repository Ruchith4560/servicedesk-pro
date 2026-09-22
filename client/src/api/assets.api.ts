import { apiClient } from './client.js';
import { Asset } from '../types/index.js';

export const assetsApi = {
  getAssetById: async (id: string): Promise<{ asset: Asset; events: any[] }> => {
    const res = await apiClient.get(`/assets/${id}`);
    return res.data.data;
  },

  getAssets: async (params: any = {}): Promise<{ assets: Asset[]; meta?: any }> => {
    const res = await apiClient.get('/assets', { params });
    return {
      assets: res.data.data.assets,
      meta: res.data.meta
    };
  }
};
