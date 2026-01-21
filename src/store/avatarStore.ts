import { create } from 'zustand';
import { convertFileSrc } from '@tauri-apps/api/core';

import { avatarApi } from '@/services/api';
import type { AvatarResponse } from '@/types';

interface AvatarState {
  avatars: Map<string, AvatarResponse>;

  getAvatar: (email: string, sha?: string) => Promise<AvatarResponse | null>;
  clearCache: () => Promise<void>;
  getAvatarUrl: (email: string) => string | null;
}

export const useAvatarStore = create<AvatarState>((set, get) => ({
  avatars: new Map(),

  getAvatar: async (email: string, sha?: string) => {
    const key = email.toLowerCase().trim();

    // Check in-memory cache first
    const cached = get().avatars.get(key);
    if (cached) {
      return cached;
    }

    try {
      const response = await avatarApi.get(email, sha);
      set((state) => {
        const newAvatars = new Map(state.avatars);
        newAvatars.set(key, response);
        return { avatars: newAvatars };
      });
      return response;
    } catch (error) {
      console.error('Failed to get avatar:', error);
      return null;
    }
  },

  clearCache: async () => {
    try {
      await avatarApi.clearCache();
      set({ avatars: new Map() });
    } catch (error) {
      console.error('Failed to clear avatar cache:', error);
    }
  },

  getAvatarUrl: (email: string) => {
    const key = email.toLowerCase().trim();
    const cached = get().avatars.get(key);

    if (cached?.path) {
      return convertFileSrc(cached.path);
    }

    return null;
  },
}));

// Helper function to get avatar URL for a cached avatar
export function getAvatarSrcUrl(response: AvatarResponse | null): string | null {
  if (!response?.path) {
    return null;
  }
  return convertFileSrc(response.path);
}
