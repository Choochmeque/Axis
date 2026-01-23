import { Terminal, Loader2 } from 'lucide-react';
import { MenuItem, MenuSeparator } from '@/components/ui';
import { useCustomActionsStore } from '@/store/customActionsStore';
import { useRepositoryStore } from '@/store/repositoryStore';
import type { ActionContext, ActionVariables } from '@/types';

interface CustomActionsMenuSectionProps {
  context: ActionContext;
  variables?: Partial<ActionVariables>;
}

export function CustomActionsMenuSection({
  context,
  variables = {},
}: CustomActionsMenuSectionProps) {
  const repository = useRepositoryStore((s) => s.repository);
  const getActionsForContext = useCustomActionsStore((s) => s.getActionsForContext);
  const confirmAndExecute = useCustomActionsStore((s) => s.confirmAndExecute);
  const executingActionId = useCustomActionsStore((s) => s.executingActionId);

  const actions = getActionsForContext(context);

  if (actions.length === 0) return null;

  const buildVariables = (): ActionVariables => ({
    repoPath: repository?.path || '',
    branch: repository?.currentBranch || undefined,
    file: variables.file,
    selectedFiles: variables.selectedFiles,
    commitHash: variables.commitHash,
    commitShort: variables.commitShort,
    commitMessage: variables.commitMessage,
    remoteUrl: variables.remoteUrl,
    tag: variables.tag,
    stashRef: variables.stashRef,
  });

  return (
    <>
      <MenuSeparator />
      {actions.map((action) => {
        const isExecuting = executingActionId === action.id;
        return (
          <MenuItem
            key={action.id}
            icon={isExecuting ? Loader2 : Terminal}
            iconClassName={isExecuting ? 'animate-spin' : undefined}
            disabled={isExecuting}
            shortcut={action.shortcut || undefined}
            onSelect={() => confirmAndExecute(action, buildVariables())}
          >
            {action.name}
          </MenuItem>
        );
      })}
    </>
  );
}
