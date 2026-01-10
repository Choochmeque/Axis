import { Copy, GitCommit, User, Calendar, GitBranch, Tag } from 'lucide-react';
import { format } from 'date-fns';
import type { Commit, GraphCommit } from '../../types';
import { useRepositoryStore } from '../../store/repositoryStore';
import { cn } from '../../lib/utils';

interface CommitInfoProps {
  commit: Commit | GraphCommit;
}

export function CommitInfo({ commit }: CommitInfoProps) {
  const { selectCommit } = useRepositoryStore();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleParentClick = (parentOid: string) => {
    selectCommit(parentOid);
  };

  const rowClass = "flex items-start gap-3 text-[13px]";
  const labelClass = "flex items-center gap-1 min-w-17.5 text-(--text-secondary) text-xs shrink-0";
  const valueClass = "flex items-center gap-2 flex-wrap text-(--text-primary) min-w-0";

  return (
    <div className="flex flex-col border-b border-(--border-color) bg-(--bg-primary) shrink-0">
      <div className="flex items-center gap-2 py-2 px-3 bg-(--bg-toolbar) border-b border-(--border-color) text-xs font-semibold uppercase text-(--text-secondary)">
        <GitCommit size={16} />
        <span>Commit Details</span>
      </div>

      <div className="flex flex-col p-3 gap-2">
        <div className={rowClass}>
          <span className={labelClass}>SHA</span>
          <div className={valueClass}>
            <code className="font-mono text-xs bg-(--bg-tertiary) py-0.5 px-1.5 rounded break-all">{commit.oid}</code>
            <button
              className="flex items-center justify-center w-5 h-5 border-none bg-transparent text-(--text-secondary) cursor-pointer rounded transition-colors shrink-0 hover:bg-(--bg-hover) hover:text-(--text-primary)"
              onClick={() => copyToClipboard(commit.oid)}
              title="Copy SHA"
            >
              <Copy size={12} />
            </button>
          </div>
        </div>

        {commit.parent_oids.length > 0 && (
          <div className={rowClass}>
            <span className={labelClass}>
              {commit.parent_oids.length === 1 ? 'Parent' : 'Parents'}
            </span>
            <div className={cn(valueClass, "gap-1")}>
              {commit.parent_oids.map((parentOid) => (
                <button
                  key={parentOid}
                  className="font-mono text-xs bg-(--bg-tertiary) py-0.5 px-1.5 rounded border-none text-(--accent-color) cursor-pointer transition-colors hover:bg-(--bg-hover) hover:underline"
                  onClick={() => handleParentClick(parentOid)}
                  title="Go to parent commit"
                >
                  {parentOid.substring(0, 7)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={rowClass}>
          <span className={labelClass}>
            <User size={12} />
            Author
          </span>
          <div className={valueClass}>
            <span className="font-medium">{commit.author.name}</span>
            <span className="text-(--text-secondary) text-xs">&lt;{commit.author.email}&gt;</span>
          </div>
        </div>

        <div className={rowClass}>
          <span className={labelClass}>
            <Calendar size={12} />
            Date
          </span>
          <div className={valueClass}>
            {format(new Date(commit.timestamp), 'PPpp')}
          </div>
        </div>

        {'refs' in commit && commit.refs.length > 0 && (
          <div className={rowClass}>
            <span className={labelClass}>Refs</span>
            <div className={cn(valueClass, "gap-1")}>
              {commit.refs.map((ref: GraphCommit['refs'][0], idx: number) => (
                <span
                  key={idx}
                  className={cn(
                    "inline-flex items-center gap-1 py-0.5 px-2 rounded text-[11px] font-medium",
                    ref.ref_type === 'local_branch' && "bg-[#107c10] text-white",
                    ref.ref_type === 'remote_branch' && "bg-[#5c2d91] text-white",
                    ref.ref_type === 'tag' && "bg-[#d83b01] text-white",
                    ref.is_head && "font-semibold"
                  )}
                >
                  {ref.ref_type === 'tag' ? (
                    <Tag size={10} />
                  ) : (
                    <GitBranch size={10} />
                  )}
                  {ref.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1 mt-1">
          <span className={labelClass}>Message</span>
          <div className="font-mono text-xs leading-relaxed whitespace-pre-wrap wrap-break-word bg-(--bg-tertiary) p-2 rounded max-h-30 overflow-y-auto">{commit.message}</div>
        </div>
      </div>
    </div>
  );
}
