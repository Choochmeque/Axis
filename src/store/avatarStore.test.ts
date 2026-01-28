import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAvatarStore, getAvatarSrcUrl } from './avatarStore';
import type { AvatarSource, AvatarResponse } from '@/types';

vi.mock('@/services/api', () => ({
  avatarApi: {
    get: vi.fn(),
    clearCache: vi.fn(),
  },
}));

vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: vi.fn((path: string) => `asset://${path}`),
}));

import { avatarApi } from '@/services/api';

describe('avatarStore', () => {
  const makeAvatar = (path: string | null, source: AvatarSource = 'Gravatar'): AvatarResponse => ({
    source,
    path,
  });

  beforeEach(() => {
    useAvatarStore.setState({ avatars: new Map() });
    vi.clearAllMocks();
  });

  describe('getAvatar', () => {
    it('should return cached avatar if available', async () => {
      const cachedAvatar = makeAvatar('/cache/avatar.png');
      useAvatarStore.setState({
        avatars: new Map([['test@example.com', cachedAvatar]]),
      });

      const result = await useAvatarStore.getState().getAvatar('test@example.com');

      expect(result).toBe(cachedAvatar);
      expect(avatarApi.get).not.toHaveBeenCalled();
    });

    it('should normalize email to lowercase', async () => {
      const cachedAvatar = makeAvatar('/cache/avatar.png');
      useAvatarStore.setState({
        avatars: new Map([['test@example.com', cachedAvatar]]),
      });

      const result = await useAvatarStore.getState().getAvatar('TEST@EXAMPLE.COM');

      expect(result).toBe(cachedAvatar);
    });

    it('should trim email whitespace', async () => {
      const cachedAvatar = makeAvatar('/cache/avatar.png');
      useAvatarStore.setState({
        avatars: new Map([['test@example.com', cachedAvatar]]),
      });

      const result = await useAvatarStore.getState().getAvatar('  test@example.com  ');

      expect(result).toBe(cachedAvatar);
    });

    it('should fetch avatar from API if not cached', async () => {
      const apiResponse = makeAvatar('/cache/new-avatar.png');
      vi.mocked(avatarApi.get).mockResolvedValue(apiResponse);

      const result = await useAvatarStore.getState().getAvatar('new@example.com');

      expect(avatarApi.get).toHaveBeenCalledWith('new@example.com', undefined);
      expect(result).toEqual(apiResponse);
    });

    it('should pass sha parameter to API', async () => {
      vi.mocked(avatarApi.get).mockResolvedValue(makeAvatar('/cache/avatar.png'));

      await useAvatarStore.getState().getAvatar('test@example.com', 'abc123');

      expect(avatarApi.get).toHaveBeenCalledWith('test@example.com', 'abc123');
    });

    it('should cache fetched avatar', async () => {
      const apiResponse = makeAvatar('/cache/new-avatar.png');
      vi.mocked(avatarApi.get).mockResolvedValue(apiResponse);

      await useAvatarStore.getState().getAvatar('new@example.com');

      const cached = useAvatarStore.getState().avatars.get('new@example.com');
      expect(cached).toEqual(apiResponse);
    });

    it('should return null on API error', async () => {
      vi.mocked(avatarApi.get).mockRejectedValue(new Error('Network error'));

      const result = await useAvatarStore.getState().getAvatar('test@example.com');

      expect(result).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should clear in-memory cache', async () => {
      useAvatarStore.setState({
        avatars: new Map([['test@example.com', makeAvatar('/cache/avatar.png')]]),
      });
      vi.mocked(avatarApi.clearCache).mockResolvedValue(null);

      await useAvatarStore.getState().clearCache();

      expect(useAvatarStore.getState().avatars.size).toBe(0);
    });

    it('should call API clearCache', async () => {
      vi.mocked(avatarApi.clearCache).mockResolvedValue(null);

      await useAvatarStore.getState().clearCache();

      expect(avatarApi.clearCache).toHaveBeenCalled();
    });

    it('should handle API error gracefully', async () => {
      useAvatarStore.setState({
        avatars: new Map([['test@example.com', makeAvatar('/cache/avatar.png')]]),
      });
      vi.mocked(avatarApi.clearCache).mockRejectedValue(new Error('Failed'));

      await useAvatarStore.getState().clearCache();

      // State should not be affected on error
      expect(useAvatarStore.getState().avatars.size).toBe(1);
    });
  });

  describe('getAvatarUrl', () => {
    it('should return converted URL for cached avatar with path', () => {
      useAvatarStore.setState({
        avatars: new Map([['test@example.com', makeAvatar('/cache/avatar.png')]]),
      });

      const url = useAvatarStore.getState().getAvatarUrl('test@example.com');

      expect(url).toBe('asset:///cache/avatar.png');
    });

    it('should return null for non-cached email', () => {
      const url = useAvatarStore.getState().getAvatarUrl('unknown@example.com');

      expect(url).toBeNull();
    });

    it('should return null for cached avatar without path', () => {
      useAvatarStore.setState({
        avatars: new Map([['test@example.com', makeAvatar(null)]]),
      });

      const url = useAvatarStore.getState().getAvatarUrl('test@example.com');

      expect(url).toBeNull();
    });

    it('should normalize email for lookup', () => {
      useAvatarStore.setState({
        avatars: new Map([['test@example.com', makeAvatar('/cache/avatar.png')]]),
      });

      const url = useAvatarStore.getState().getAvatarUrl('TEST@EXAMPLE.COM');

      expect(url).toBe('asset:///cache/avatar.png');
    });
  });

  describe('getAvatarSrcUrl', () => {
    it('should return converted URL for response with path', () => {
      const response = makeAvatar('/cache/avatar.png');

      const url = getAvatarSrcUrl(response);

      expect(url).toBe('asset:///cache/avatar.png');
    });

    it('should return null for null response', () => {
      const url = getAvatarSrcUrl(null);

      expect(url).toBeNull();
    });

    it('should return null for response without path', () => {
      const response = makeAvatar(null);

      const url = getAvatarSrcUrl(response);

      expect(url).toBeNull();
    });
  });
});
