import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  ChevronDown,
} from 'lucide-react';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui';
import { useIntegrationStore } from '@/store/integrationStore';
import { toast } from '@/hooks';
import { cn, getLabelColors } from '@/lib/utils';
import { formatDateTime } from '@/lib/dateUtils';
import { getErrorMessage } from '@/lib/errorUtils';
import { shellApi } from '@/services/api';
import { PrState, MergeMethod } from '@/types';
import type { PullRequestDetail as PullRequestDetailType } from '@/types';

interface PullRequestDetailProps {
  prDetail: PullRequestDetailType | null;
  onClose: () => void;
}

const MERGE_METHOD_LABELS: Record<MergeMethod, string> = {
  [MergeMethod.Merge]: 'Merge',
  [MergeMethod.Squash]: 'Squash',
  [MergeMethod.Rebase]: 'Rebase',
};

export function PullRequestDetail({ prDetail, onClose }: PullRequestDetailProps) {
  const { t } = useTranslation();
  const { mergePullRequest } = useIntegrationStore();
  const [isMerging, setIsMerging] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<MergeMethod>(MergeMethod.Merge);

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
        toast.success(t('integrations.pullRequests.merge.merged', { number: prDetail.number }));
        onClose();
      } catch (error) {
        toast.error(
          t('integrations.pullRequests.merge.mergeFailed', { error: getErrorMessage(error) })
        );
      } finally {
        setIsMerging(false);
      }
    },
    [prDetail, mergePullRequest, onClose, t]
  );

  const openInBrowser = useCallback(() => {
    if (prDetail?.url) {
      shellApi.openUrl(prDetail.url);
    }
  }, [prDetail]);

  if (!prDetail) {
    return (
      <div className="flex items-center justify-center h-full bg-(--bg-secondary)">
        <div className="text-(--text-muted) text-sm">{t('integrations.pullRequests.selectPr')}</div>
      </div>
    );
  }

  const getStateIcon = () => {
    switch (prDetail.state) {
      case PrState.Open:
        return <GitPullRequest size={20} className="text-success" />;
      case PrState.Merged:
        return <GitMerge size={20} className="text-purple-500" />;
      case PrState.Closed:
        return <XCircle size={20} className="text-error" />;
      default:
        return <GitPullRequest size={20} />;
    }
  };

  const getStateBadge = () => {
    const baseClass = 'px-2 py-0.5 text-xs rounded-full font-medium';
    switch (prDetail.state) {
      case PrState.Open:
        return (
          <span className={cn(baseClass, 'bg-success/20 text-success')}>
            {t('integrations.pullRequests.state.open')}
          </span>
        );
      case PrState.Merged:
        return (
          <span className={cn(baseClass, 'bg-purple-500/20 text-purple-500')}>
            {t('integrations.pullRequests.state.merged')}
          </span>
        );
      case PrState.Closed:
        return (
          <span className={cn(baseClass, 'bg-error/20 text-error')}>
            {t('integrations.pullRequests.state.closed')}
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
            <h2 className="text-lg font-medium text-(--text-primary)">{prDetail.title}</h2>
            {prDetail.draft && (
              <span className="px-2 py-0.5 text-xs bg-(--bg-tertiary) text-(--text-muted) rounded">
                {t('integrations.pullRequests.draft')}
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
            <span>
              {t('integrations.pullRequests.detail.created', {
                date: formatDateTime(prDetail.createdAt),
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-(--text-secondary)">
            <Calendar size={14} />
            <span>
              {t('integrations.pullRequests.detail.updated', {
                date: formatDateTime(prDetail.updatedAt),
              })}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-(--text-secondary)">
            <MessageSquare size={14} />
            <span>
              {t('integrations.pullRequests.detail.comments', { count: prDetail.commentsCount })}
            </span>
          </div>
          <div className="flex items-center gap-1 text-(--text-secondary)">
            <FileCode size={14} />
            <span>
              {t('integrations.pullRequests.detail.files', { count: prDetail.changedFiles })}
            </span>
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
                style={getLabelColors(label.color)}
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
                {prDetail.body}
              </Markdown>
            </div>
          </div>
        )}

        {/* Merge status */}
        {prDetail.state === PrState.Open && (
          <div className="p-4 bg-(--bg-primary) rounded-lg border border-(--border-color)">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-(--text-primary)">
                  {prDetail.mergeable === true
                    ? t('integrations.pullRequests.merge.noConflicts')
                    : prDetail.mergeable === false
                      ? t('integrations.pullRequests.merge.hasConflicts')
                      : t('integrations.pullRequests.merge.checkingMergeability')}
                </div>
              </div>

              {prDetail.mergeable !== false && !prDetail.draft && (
                <div className="flex">
                  <Button
                    variant="primary"
                    className="rounded-r-none"
                    onClick={() => handleMerge(selectedMethod)}
                    disabled={isMerging}
                  >
                    {isMerging
                      ? t('integrations.pullRequests.merge.merging')
                      : MERGE_METHOD_LABELS[selectedMethod]}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="primary"
                        className="rounded-l-none border-l border-l-white/20 px-2"
                        disabled={isMerging}
                      >
                        <ChevronDown size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuRadioGroup
                        value={selectedMethod}
                        onValueChange={(value) => setSelectedMethod(value as MergeMethod)}
                      >
                        <DropdownMenuRadioItem value={MergeMethod.Merge}>
                          {t('integrations.pullRequests.merge.mergeCommit')}
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value={MergeMethod.Squash}>
                          {t('integrations.pullRequests.merge.squashMerge')}
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value={MergeMethod.Rebase}>
                          {t('integrations.pullRequests.merge.rebaseMerge')}
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
