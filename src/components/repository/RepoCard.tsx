import { AlertTriangle, GitBranch } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui';
import { formatTimeAgo } from '@/lib/dateUtils';
import { truncatePath } from '@/lib/pathUtils';
import { cn } from '@/lib/utils';
import type { RecentRepository } from '@/types';

interface RepoCardProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  repo: RecentRepository;
  onClick: (path: string) => void;
}

export function RepoCard({ repo, onClick, className, ...rest }: RepoCardProps) {
  const { t } = useTranslation();

  return (
    <button
      className={cn('welcome-repo-card', className)}
      disabled={!repo.exists}
      onClick={() => onClick(repo.path)}
      {...rest}
    >
      <div
        className={`welcome-repo-card-icon${!repo.exists ? ' welcome-repo-card-icon--missing' : ''}`}
      >
        {repo.exists ? <GitBranch size={16} /> : <AlertTriangle size={16} />}
      </div>
      <div className="welcome-repo-card-content">
        <div className="welcome-repo-card-header">
          <span className="welcome-repo-card-name">{repo.name}</span>
          {repo.exists && repo.currentBranch && (
            <Badge variant="accent" size="sm">
              {repo.currentBranch}
            </Badge>
          )}
          {!repo.exists && (
            <Badge variant="error" size="sm">
              {t('welcome.repositoryMissing')}
            </Badge>
          )}
        </div>
        <span className="welcome-repo-card-path" title={repo.displayPath}>
          {truncatePath(repo.displayPath, 60)}
        </span>
      </div>
      <span className="welcome-repo-card-time">{formatTimeAgo(repo.lastOpened)}</span>
    </button>
  );
}
