import {
  Calendar,
  CheckCircle2,
  CircleDot,
  ExternalLink,
  MessageSquare,
  Milestone,
  Tag,
  User,
  Users,
  X,
} from 'lucide-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import type { IssueDetail as IssueDetailType } from '@/bindings/api';
import { Button } from '@/components/ui';
import { formatDateTime } from '@/lib/dateUtils';
import { cn, getLabelColors } from '@/lib/utils';
import { shellApi } from '@/services/api';
import { IssueState } from '@/types';

interface IssueDetailProps {
  issueDetail: IssueDetailType | null;
  onClose: () => void;
}

export function IssueDetail({ issueDetail, onClose }: IssueDetailProps) {
  const { t } = useTranslation();
  const openInBrowser = useCallback(() => {
    if (issueDetail?.url) {
      shellApi.openUrl(issueDetail.url);
    }
  }, [issueDetail]);

  if (!issueDetail) {
    return (
      <div className="flex items-center justify-center h-full bg-(--bg-secondary)">
        <div className="text-(--text-muted) text-sm">{t('integrations.issues.selectIssue')}</div>
      </div>
    );
  }

  const getStateIcon = () => {
    switch (issueDetail.state) {
      case IssueState.Open:
        return <CircleDot size={20} className="text-success" />;
      case IssueState.Closed:
        return <CheckCircle2 size={20} className="text-purple-500" />;
      default:
        return <CircleDot size={20} />;
    }
  };

  const getStateBadge = () => {
    const baseClass = 'px-2 py-0.5 text-xs rounded-full font-medium';
    switch (issueDetail.state) {
      case IssueState.Open:
        return (
          <span className={cn(baseClass, 'bg-success/20 text-success')}>
            {t('integrations.issues.state.open')}
          </span>
        );
      case IssueState.Closed:
        return (
          <span className={cn(baseClass, 'bg-purple-500/20 text-purple-500')}>
            {t('integrations.issues.state.closed')}
          </span>
        );
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
          <Button
            variant="ghost"
            size="sm"
            onClick={openInBrowser}
            title={t('common.openInBrowser')}
          >
            <ExternalLink size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose} title={t('common.close')}>
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
            <span>
              {t('integrations.issues.detail.created', {
                date: formatDateTime(issueDetail.createdAt),
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-(--text-secondary)">
            <Calendar size={14} />
            <span>
              {t('integrations.issues.detail.updated', {
                date: formatDateTime(issueDetail.updatedAt),
              })}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-(--text-secondary)">
            <MessageSquare size={14} />
            <span>
              {t('integrations.issues.detail.comments', { count: issueDetail.commentsCount })}
            </span>
          </div>
        </div>

        {/* Labels */}
        {issueDetail.labels.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-(--text-secondary)">
              <Tag size={14} />
              <span>{t('integrations.issues.detail.labels')}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {issueDetail.labels.map((label) => (
                <span
                  key={label.name}
                  className="px-2 py-0.5 text-xs rounded-full"
                  style={getLabelColors(label.color)}
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
              <span>{t('integrations.issues.detail.assignees')}</span>
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
            <span>
              {t('integrations.issues.detail.milestone', { name: issueDetail.milestone })}
            </span>
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
                  code: ({ className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const inline = !match;
                    return !inline ? (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                        }}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
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
