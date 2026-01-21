import { useCallback } from 'react';
import {
  CircleDot,
  CheckCircle2,
  X,
  ExternalLink,
  User,
  Calendar,
  MessageSquare,
  Tag,
  Users,
  Milestone,
} from 'lucide-react';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/dateUtils';
import { shellApi } from '@/services/api';
import type { IssueDetail as IssueDetailType } from '@/bindings/api';

interface IssueDetailProps {
  issueDetail: IssueDetailType | null;
  onClose: () => void;
}

export function IssueDetail({ issueDetail, onClose }: IssueDetailProps) {
  const openInBrowser = useCallback(() => {
    if (issueDetail?.url) {
      shellApi.openUrl(issueDetail.url);
    }
  }, [issueDetail]);

  if (!issueDetail) {
    return (
      <div className="flex items-center justify-center h-full bg-(--bg-secondary)">
        <div className="text-(--text-muted) text-sm">Select an issue to view details</div>
      </div>
    );
  }

  const getStateIcon = () => {
    switch (issueDetail.state) {
      case 'open':
        return <CircleDot size={20} className="text-success" />;
      case 'closed':
        return <CheckCircle2 size={20} className="text-purple-500" />;
      default:
        return <CircleDot size={20} />;
    }
  };

  const getStateBadge = () => {
    const baseClass = 'px-2 py-0.5 text-xs rounded-full font-medium';
    switch (issueDetail.state) {
      case 'open':
        return <span className={cn(baseClass, 'bg-success/20 text-success')}>Open</span>;
      case 'closed':
        return <span className={cn(baseClass, 'bg-purple-500/20 text-purple-500')}>Closed</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-(--bg-secondary)">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 border-b border-(--border-color) bg-(--bg-primary)">
        <div className="mt-1">{getStateIcon()}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-medium text-(--text-primary)">{issueDetail.title}</h2>
            {getStateBadge()}
          </div>

          <div className="flex items-center gap-3 mt-1 text-sm text-(--text-secondary)">
            <span className="text-(--text-muted)">#{issueDetail.number}</span>
            <span className="flex items-center gap-1">
              <User size={14} />
              {issueDetail.author.login}
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
        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-(--text-secondary)">
            <Calendar size={14} />
            <span>Created: {formatDateTime(issueDetail.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-(--text-secondary)">
            <Calendar size={14} />
            <span>Updated: {formatDateTime(issueDetail.updatedAt)}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-(--text-secondary)">
            <MessageSquare size={14} />
            <span>{issueDetail.commentsCount} comments</span>
          </div>
        </div>

        {/* Labels */}
        {issueDetail.labels.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-(--text-secondary)">
              <Tag size={14} />
              <span>Labels</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {issueDetail.labels.map((label) => (
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
          </div>
        )}

        {/* Assignees */}
        {issueDetail.assignees.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-(--text-secondary)">
              <Users size={14} />
              <span>Assignees</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {issueDetail.assignees.map((assignee) => (
                <div key={assignee.login} className="flex items-center gap-1">
                  {assignee.avatarUrl && (
                    <img
                      src={assignee.avatarUrl}
                      alt={assignee.login}
                      className="w-5 h-5 rounded-full"
                    />
                  )}
                  <span className="text-sm text-(--text-secondary)">{assignee.login}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Milestone */}
        {issueDetail.milestone && (
          <div className="flex items-center gap-2 text-sm text-(--text-secondary)">
            <Milestone size={14} />
            <span>Milestone: {issueDetail.milestone}</span>
          </div>
        )}

        {/* Body */}
        {issueDetail.body && (
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
                {issueDetail.body}
              </Markdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
