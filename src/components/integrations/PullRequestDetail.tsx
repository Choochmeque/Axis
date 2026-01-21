import { useState, useCallback } from 'react';
import {
  GitPullRequest,
  GitMerge,
  XCircle,
  X,
  ExternalLink,
  User,
  GitBranch,
  Calendar,
  MessageSquare,
  FileCode,
  Plus,
  Minus,
} from 'lucide-react';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import { Button } from '@/components/ui';
import { useIntegrationStore } from '@/store/integrationStore';
import { toast } from '@/hooks';
import { cn } from '@/lib/utils';
import { shellApi } from '@/services/api';
import type { PullRequestDetail as PullRequestDetailType, MergeMethod } from '@/bindings/api';

interface PullRequestDetailProps {
  prDetail: PullRequestDetailType | null;
  onClose: () => void;
}

export function PullRequestDetail({ prDetail, onClose }: PullRequestDetailProps) {
  const { mergePullRequest } = useIntegrationStore();
  const [isMerging, setIsMerging] = useState(false);
  const [showMergeOptions, setShowMergeOptions] = useState(false);

  const handleMerge = useCallback(
    async (method: MergeMethod) => {
      if (!prDetail) return;

      setIsMerging(true);
      try {
        await mergePullRequest(prDetail.number, {
          mergeMethod: method,
          commitTitle: null,
          commitMessage: null,
        });
        toast.success(`PR #${prDetail.number} merged successfully`);
        setShowMergeOptions(false);
        onClose();
      } catch (error) {
        toast.error(`Failed to merge PR: ${error}`);
      } finally {
        setIsMerging(false);
      }
    },
    [prDetail, mergePullRequest, onClose]
  );

  const openInBrowser = useCallback(() => {
    if (prDetail?.url) {
      shellApi.openUrl(prDetail.url);
    }
  }, [prDetail]);

  if (!prDetail) {
    return (
      <div className="flex items-center justify-center h-full bg-(--bg-secondary)">
        <div className="text-(--text-muted) text-sm">Select a pull request to view details</div>
      </div>
    );
  }

  const getStateIcon = () => {
    switch (prDetail.state) {
      case 'open':
        return <GitPullRequest size={20} className="text-success" />;
      case 'merged':
        return <GitMerge size={20} className="text-purple-500" />;
      case 'closed':
        return <XCircle size={20} className="text-error" />;
      default:
        return <GitPullRequest size={20} />;
    }
  };

  const getStateBadge = () => {
    const baseClass = 'px-2 py-0.5 text-xs rounded-full font-medium';
    switch (prDetail.state) {
      case 'open':
        return <span className={cn(baseClass, 'bg-success/20 text-success')}>Open</span>;
      case 'merged':
        return <span className={cn(baseClass, 'bg-purple-500/20 text-purple-500')}>Merged</span>;
      case 'closed':
        return <span className={cn(baseClass, 'bg-error/20 text-error')}>Closed</span>;
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full bg-(--bg-secondary)">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 border-b border-(--border-color) bg-(--bg-primary)">
        <div className="mt-1">{getStateIcon()}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-medium text-(--text-primary)">{prDetail.title}</h2>
            {prDetail.draft && (
              <span className="px-2 py-0.5 text-xs bg-(--bg-tertiary) text-(--text-muted) rounded">
                Draft
              </span>
            )}
            {getStateBadge()}
          </div>

          <div className="flex items-center gap-3 mt-1 text-sm text-(--text-secondary)">
            <span className="text-(--text-muted)">#{prDetail.number}</span>
            <span className="flex items-center gap-1">
              <User size={14} />
              {prDetail.author.login}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={openInBrowser} title="Open in browser">
            <ExternalLink size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} title="Close">
            <X size={14} />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Branch info */}
        <div className="flex items-center gap-2 text-sm">
          <GitBranch size={14} className="text-(--text-muted)" />
          <code className="px-2 py-0.5 bg-(--bg-tertiary) rounded text-xs">
            {prDetail.sourceBranch}
          </code>
          <span className="text-(--text-muted)">→</span>
          <code className="px-2 py-0.5 bg-(--bg-tertiary) rounded text-xs">
            {prDetail.targetBranch}
          </code>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-(--text-secondary)">
            <Calendar size={14} />
            <span>Created: {formatDate(prDetail.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-(--text-secondary)">
            <Calendar size={14} />
            <span>Updated: {formatDate(prDetail.updatedAt)}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-(--text-secondary)">
            <MessageSquare size={14} />
            <span>{prDetail.commentsCount} comments</span>
          </div>
          <div className="flex items-center gap-1 text-(--text-secondary)">
            <FileCode size={14} />
            <span>{prDetail.changedFiles} files</span>
          </div>
          <div className="flex items-center gap-1 text-success">
            <Plus size={14} />
            <span>{prDetail.additions}</span>
          </div>
          <div className="flex items-center gap-1 text-error">
            <Minus size={14} />
            <span>{prDetail.deletions}</span>
          </div>
        </div>

        {/* Labels */}
        {prDetail.labels.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {prDetail.labels.map((label) => (
              <span
                key={label.name}
                className="px-2 py-0.5 text-xs rounded-full"
                style={{
                  backgroundColor: `#${label.color}20`,
                  color: `#${label.color}`,
                  border: `1px solid #${label.color}40`,
                }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}

        {/* Body */}
        {prDetail.body && (
          <div className="p-4 bg-(--bg-primary) rounded-lg border border-(--border-color)">
            <div className="prose prose-sm dark:prose-invert max-w-none text-(--text-primary)">
              <Markdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      onClick={(e) => {
                        e.preventDefault();
                        if (href) shellApi.openUrl(href);
                      }}
                      className="text-(--accent-color) hover:underline cursor-pointer"
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {prDetail.body}
              </Markdown>
            </div>
          </div>
        )}

        {/* Merge status */}
        {prDetail.state === 'open' && (
          <div className="p-4 bg-(--bg-primary) rounded-lg border border-(--border-color)">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-(--text-primary)">
                  {prDetail.mergeable === true
                    ? 'This branch has no conflicts'
                    : prDetail.mergeable === false
                      ? 'This branch has conflicts'
                      : 'Checking mergeability...'}
                </div>
              </div>

              {prDetail.mergeable !== false && !prDetail.draft && (
                <div className="relative">
                  <Button
                    variant="primary"
                    onClick={() => setShowMergeOptions(!showMergeOptions)}
                    disabled={isMerging}
                  >
                    {isMerging ? 'Merging...' : 'Merge PR'}
                  </Button>

                  {showMergeOptions && (
                    <div className="absolute right-0 top-full mt-1 py-1 bg-(--bg-primary) border border-(--border-color) rounded-lg shadow-lg z-10 min-w-48">
                      <button
                        className="w-full px-4 py-2 text-left text-sm hover:bg-(--bg-hover)"
                        onClick={() => handleMerge('merge')}
                      >
                        <div className="font-medium">Create a merge commit</div>
                        <div className="text-xs text-(--text-muted)">
                          All commits will be added with a merge commit
                        </div>
                      </button>
                      <button
                        className="w-full px-4 py-2 text-left text-sm hover:bg-(--bg-hover)"
                        onClick={() => handleMerge('squash')}
                      >
                        <div className="font-medium">Squash and merge</div>
                        <div className="text-xs text-(--text-muted)">
                          Combine all commits into one commit
                        </div>
                      </button>
                      <button
                        className="w-full px-4 py-2 text-left text-sm hover:bg-(--bg-hover)"
                        onClick={() => handleMerge('rebase')}
                      >
                        <div className="font-medium">Rebase and merge</div>
                        <div className="text-xs text-(--text-muted)">
                          Add all commits to the base branch
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
