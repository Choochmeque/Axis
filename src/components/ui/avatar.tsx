import { useState } from 'react';
import { User } from 'lucide-react';
import md5 from 'crypto-js/md5';
import { cn } from '@/lib/utils';

interface AvatarProps {
  email?: string;
  name?: string;
  size?: number;
  className?: string;
}

export function Avatar({ email, name, size = 24, className }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const gravatarUrl = email
    ? `https://www.gravatar.com/avatar/${md5(email.toLowerCase().trim()).toString()}?s=${size * 2}&d=404`
    : null;

  if (gravatarUrl && !imgError) {
    return (
      <img
        src={gravatarUrl}
        alt={name || 'avatar'}
        width={size}
        height={size}
        className={cn('rounded-full', className)}
        onError={() => setImgError(true)}
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
