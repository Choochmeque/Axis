import { GripVertical, Pencil, Plus, Terminal, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionEditorDialog } from '@/components/custom-actions';
import { Alert, Button, ConfirmDialog } from '@/components/ui';
import { useCustomActionsStore } from '@/store/customActionsStore';
import type { CustomAction } from '@/types';
import { ActionStorageType } from '@/types';

const sectionTitleClass =
  'm-0 mb-4 pb-2 border-b border-(--border-color) text-sm font-semibold text-(--text-primary) first:mt-0 not-first:mt-6';

export function GlobalActionsSettings() {
  const { t } = useTranslation();
  const globalActions = useCustomActionsStore((s) => s.globalActions);
  const isLoading = useCustomActionsStore((s) => s.isLoading);
  const loadGlobalActions = useCustomActionsStore((s) => s.loadGlobalActions);
  const deleteAction = useCustomActionsStore((s) => s.deleteAction);

  const [showEditor, setShowEditor] = useState(false);
  const [editingAction, setEditingAction] = useState<CustomAction | null>(null);
  const [actionToDelete, setActionToDelete] = useState<CustomAction | null>(null);

  useEffect(() => {
    loadGlobalActions();
  }, [loadGlobalActions]);

  const handleCreate = () => {
    setEditingAction(null);
    setShowEditor(true);
  };

  const handleEdit = (action: CustomAction) => {
    setEditingAction(action);
    setShowEditor(true);
  };

  const handleDelete = (action: CustomAction) => {
    setActionToDelete(action);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-50 text-(--text-muted)">
        {t('actions.loading')}
      </div>
    );
  }

  return (
    <div>
      <h3 className={sectionTitleClass}>{t('actions.global.title')}</h3>

      <Alert variant="info" inline className="mb-4">
        {t('actions.global.info')}
      </Alert>

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-(--text-secondary)">
          {globalActions.length === 0
            ? t('actions.global.empty')
            : t('actions.global.count', { count: globalActions.length })}
        </p>
        <Button variant="primary" size="sm" onClick={handleCreate}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {globalActions.length > 0 && (
        <div className="space-y-2">
          {globalActions.map((action) => (
            <div
              key={action.id}
              className="flex items-center gap-3 p-3 bg-(--bg-tertiary) rounded-lg border border-(--border-color) group"
            >
              <GripVertical className="w-4 h-4 text-(--text-muted) opacity-0 group-hover:opacity-100 cursor-grab" />
              <Terminal className="w-4 h-4 text-(--text-secondary) shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-(--text-primary) truncate">{action.name}</div>
                <div className="text-xs text-(--text-muted) truncate font-mono">
                  {action.command}
                </div>
                <div className="flex gap-1 mt-1">
                  {action.contexts.map((ctx) => (
                    <span
                      key={ctx}
                      className="px-1.5 py-0.5 text-xs bg-(--bg-primary) text-(--text-secondary) rounded"
                    >
                      {ctx}
                    </span>
                  ))}
                  {action.shortcut && (
                    <span className="px-1.5 py-0.5 text-xs bg-(--accent-color)/20 text-(--accent-color) rounded font-mono">
                      {action.shortcut}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(action)}
                  aria-label={t('actions.editLabel')}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(action)}
                  aria-label={t('actions.deleteLabel')}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ActionEditorDialog
        open={showEditor}
        onOpenChange={setShowEditor}
        action={editingAction}
        defaultStorage={ActionStorageType.Global}
      />

      <ConfirmDialog
        isOpen={actionToDelete !== null}
        onClose={() => setActionToDelete(null)}
        onConfirm={async () => {
          if (actionToDelete) {
            await deleteAction(actionToDelete.id, ActionStorageType.Global);
          }
          setActionToDelete(null);
        }}
        title={t('actions.deleteTitle')}
        message={t('actions.deleteConfirm', { name: actionToDelete?.name ?? '' })}
        confirmLabel={t('common.delete')}
      />
    </div>
  );
}
