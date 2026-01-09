import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  GitBranch,
  Tag,
  Cloud,
  Archive,
  FileCode,
} from 'lucide-react';
import { ScrollArea } from '@radix-ui/react-scroll-area';
import { useRepositoryStore } from '../../store/repositoryStore';
import { clsx } from 'clsx';
import './Sidebar.css';

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function Section({ title, icon, children, defaultExpanded = true }: SectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="sidebar-section">
      <button
        className="section-header"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {icon}
        <span className="section-title">{title}</span>
      </button>
      {expanded && <div className="section-content">{children}</div>}
    </div>
  );
}

export function Sidebar() {
  const { repository, branches, status } = useRepositoryStore();

  const localBranches = branches.filter((b) => b.branch_type === 'local');
  const remoteBranches = branches.filter((b) => b.branch_type === 'remote');

  const changesCount =
    (status?.staged.length ?? 0) +
    (status?.unstaged.length ?? 0) +
    (status?.untracked.length ?? 0);

  if (!repository) {
    return (
      <div className="sidebar sidebar-empty">
        <p>No repository open</p>
        <p className="sidebar-hint">Open a repository to get started</p>
      </div>
    );
  }

  return (
    <ScrollArea className="sidebar">
      <Section
        title="WORKSPACE"
        icon={<FileCode size={14} />}
        defaultExpanded={true}
      >
        <div className="sidebar-item">
          <span>File Status</span>
          {changesCount > 0 && (
            <span className="badge">{changesCount}</span>
          )}
        </div>
        <div className="sidebar-item">History</div>
        <div className="sidebar-item">Search</div>
      </Section>

      <Section
        title="BRANCHES"
        icon={<GitBranch size={14} />}
        defaultExpanded={true}
      >
        {localBranches.map((branch) => (
          <div
            key={branch.name}
            className={clsx('sidebar-item', { 'is-current': branch.is_head })}
          >
            <GitBranch size={12} />
            <span className="branch-name">{branch.name}</span>
            {branch.ahead !== null && branch.ahead > 0 && (
              <span className="badge badge-ahead">↑{branch.ahead}</span>
            )}
            {branch.behind !== null && branch.behind > 0 && (
              <span className="badge badge-behind">↓{branch.behind}</span>
            )}
          </div>
        ))}
      </Section>

      <Section title="TAGS" icon={<Tag size={14} />} defaultExpanded={false}>
        <div className="sidebar-item sidebar-empty-item">No tags</div>
      </Section>

      <Section title="REMOTES" icon={<Cloud size={14} />} defaultExpanded={false}>
        {remoteBranches.length > 0 ? (
          remoteBranches.map((branch) => (
            <div key={branch.full_name} className="sidebar-item">
              <span className="branch-name">{branch.name}</span>
            </div>
          ))
        ) : (
          <div className="sidebar-item sidebar-empty-item">No remotes</div>
        )}
      </Section>

      <Section title="STASHES" icon={<Archive size={14} />} defaultExpanded={false}>
        <div className="sidebar-item sidebar-empty-item">No stashes</div>
      </Section>
    </ScrollArea>
  );
}
