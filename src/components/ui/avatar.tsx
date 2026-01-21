import { useEffect, useState } from 'react';
import { User } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAvatarStore, getAvatarSrcUrl } from '@/store/avatarStore';
import type { AvatarResponse } from '@/types';

interface AvatarProps {
  email?: string;
  sha?: string;
  name?: string;
  size?: number;
  className?: string;
}

export function Avatar({ email, sha, name, size = 24, className }: AvatarProps) {
  const [avatarResponse, setAvatarResponse] = useState<AvatarResponse | null>(null);
  // Track which URL failed to load, so error is automatically cleared when URL changes
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const getAvatar = useAvatarStore((state) => state.getAvatar);

  useEffect(() => {
    if (!email) {
      return;
    }

    let cancelled = false;

    getAvatar(email, sha).then((response) => {
      if (!cancelled) {
        setAvatarResponse(response);
      }
    });

    return () => {
      cancelled = true;
      setAvatarResponse(null);
    };
  }, [email, sha, getAvatar]);

  const avatarUrl = getAvatarSrcUrl(avatarResponse);
  const hasError = avatarUrl !== null && avatarUrl === failedUrl;

  if (avatarUrl && !hasError) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'avatar'}
        width={size}
        height={size}
        className={cn('rounded-full', className)}
        onError={() => setFailedUrl(avatarUrl)}
      />
    );
  }

  return (
    <div
      className={cn('rounded-full bg-(--bg-tertiary) flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <User size={size * 0.6} className="text-(--text-secondary)" />
    </div>
  );
}
