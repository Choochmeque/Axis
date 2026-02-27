import { Calendar, Copy, GitBranch, GitCommit, Key, ShieldCheck, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Avatar, Skeleton } from '@/components/ui';
import { useSignatureVerification } from '@/hooks';
import { copyToClipboard } from '@/lib/actions';
import { formatFullDateTime } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { useRepositoryStore } from '@/store/repositoryStore';
import type { Commit, GraphCommit } from '@/types';
import { RefType, SigningFormat } from '@/types';

interface CommitInfoProps {
  commit: Commit | GraphCommit;
  onScrollToCommit?: (oid: string) => void;
}

export function CommitInfo({ commit, onScrollToCommit }: CommitInfoProps) {
  const { t } = useTranslation();
  const { selectCommit } = useRepositoryStore();
  const { verification, isVerifying } = useSignatureVerification(
    commit.oid,
    commit.signature?.format ?? null
  );

  const handleParentClick = (parentOid: string) => {
    selectCommit(parentOid);
    onScrollToCommit?.(parentOid);
  };

  const rowClass = 'flex items-start gap-3 text-base';
  const metaLabelClass =
    'flex items-center gap-1 min-w-17.5 text-(--text-secondary) text-xs shrink-0';
  const valueClass = 'flex items-center gap-2 flex-wrap text-(--text-primary) min-w-0';

  return (
    <div className="flex flex-col h-full bg-(--bg-primary)">
      <div className="flex items-center gap-2 py-2 px-3 bg-(--bg-toolbar) border-b border-(--border-color) text-xs font-semibold uppercase text-(--text-secondary) shrink-0">
        <GitCommit size={16} />
        <span>{t('history.commitInfo.title')}</span>
      </div>

      <div className="flex flex-col p-3 gap-2 flex-1 overflow-y-auto">
        <div className={rowClass}>
          <span className={metaLabelClass}>{t('history.commitInfo.sha')}</span>
          <div className={valueClass}>
            <code className="font-mono text-xs bg-(--bg-tertiary) py-0.5 px-1.5 rounded break-all">
              {commit.oid}
            </code>
            <button
              className="flex items-center justify-center w-5 h-5 border-none bg-transparent text-(--text-secondary) cursor-pointer rounded transition-colors shrink-0 hover:bg-(--bg-hover) hover:text-(--text-primary)"
              onClick={() => copyToClipboard(commit.oid)}
              title={t('history.commitInfo.copySha')}
            >
              <Copy size={12} />
            </button>
          </div>
        </div>

        {commit.parentOids.length > 0 && (
          <div className={rowClass}>
            <span className={metaLabelClass}>
              {commit.parentOids.length === 1
                ? t('history.commitInfo.parent')
                : t('history.commitInfo.parents')}
            </span>
            <div className={cn(valueClass, 'gap-1')}>
              {commit.parentOids.map((parentOid) => (
                <button
                  key={parentOid}
                  className="font-mono text-xs bg-(--bg-tertiary) py-0.5 px-1.5 rounded border-none text-(--accent-color) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:underline"
                  onClick={() => handleParentClick(parentOid)}
                  title={t('history.commitInfo.goToParent')}
                >
                  {parentOid.substring(0, 7)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={rowClass}>
          <span className={metaLabelClass}>
            <Avatar
              email={commit.author.email}
              sha={commit.oid}
              name={commit.author.name}
              size={12}
            />
            {t('history.commitInfo.author')}
          </span>
          <div className={valueClass}>
            <span className="font-medium">{commit.author.name}</span>
            <span className="text-(--text-secondary) text-xs">&lt;{commit.author.email}&gt;</span>
          </div>
        </div>

        <div className={rowClass}>
          <span className={metaLabelClass}>
            <Calendar size={12} />
            {t('history.commitInfo.date')}
          </span>
          <div className={valueClass}>{formatFullDateTime(commit.timestamp)}</div>
        </div>

        {commit.signature && (
          <div className={rowClass}>
            <span className={metaLabelClass}>
              {commit.signature.format === SigningFormat.Gpg ? (
                <Key size={12} />
              ) : commit.signature.format === SigningFormat.Ssh ? (
                <ShieldCheck size={12} />
              ) : (
                <ShieldCheck size={12} />
              )}
              {t('history.commitInfo.signed')}
            </span>
            <div className={valueClass}>
              {isVerifying ? (
                <Skeleton className="h-5 w-24" />
              ) : (
                <>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 py-0.5 px-2 rounded text-xs font-medium',
                      verification?.verified
                        ? 'bg-success/20 text-success'
                        : 'bg-warning/20 text-warning'
                    )}
                  >
                    {commit.signature.format?.toUpperCase() ?? 'UNKNOWN'}
                    {verification?.verified
                      ? ` (${t('history.commitInfo.verified')})`
                      : ` (${t('history.commitInfo.unverified')})`}
                  </span>
                  {verification?.signer && (
                    <span className="text-sm text-(--text-secondary)">{verification.signer}</span>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {'refs' in commit && commit.refs.length > 0 && (
          <div className={rowClass}>
            <span className={metaLabelClass}>{t('history.commitInfo.refs')}</span>
            <div className={cn(valueClass, 'gap-1')}>
              {commit.refs.map((ref: GraphCommit['refs'][0], idx: number) => {
                // Use lane color if available, otherwise fall back to type-based colors
                const laneColor =
                  'lane' in commit
                    ? `var(--color-lane-${(commit.lane % 8) + 1})`
                    : ref.refType === RefType.LocalBranch
                      ? 'var(--color-branch-local)'
                      : ref.refType === RefType.RemoteBranch
                        ? 'var(--color-branch-remote)'
                        : 'var(--color-tag)';

                return (
                  <span
                    key={idx}
                    className={cn(
                      'inline-flex items-center gap-1 py-0.5 px-2 rounded text-sm font-medium text-white',
                      ref.isHead && 'font-semibold'
                    )}
                    style={{ backgroundColor: laneColor }}
                  >
                    {ref.refType === RefType.Tag ? <Tag size={10} /> : <GitBranch size={10} />}
                    {ref.name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1 mt-1">
          <span className={metaLabelClass}>{t('history.commitInfo.message')}</span>
          <div className="font-mono text-xs leading-relaxed whitespace-pre-wrap wrap-break-word bg-(--bg-tertiary) p-2 rounded max-h-30 overflow-y-auto">
            {commit.message}
          </div>
        </div>
      </div>
    </div>
  );
}
