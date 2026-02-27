import { AlertCircle, AlertTriangle, Bell, Check, Info, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import {
  type Toast,
  type ToastHistoryItem,
  type ToastType,
  useToastStore,
} from '@/store/toastStore';

const icons: Record<ToastType, React.ElementType> = {
  error: AlertCircle,
  success: Check,
  warning: AlertTriangle,
  info: Info,
};

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { t } = useTranslation();
  const Icon = icons[toast.type];
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (toast.duration <= 0) return;

    const startTime = Date.now();
    const endTime = startTime + toast.duration;

    const updateProgress = () => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      const percent = (remaining / toast.duration) * 100;
      setProgress(percent);

      if (percent > 0) {
        requestAnimationFrame(updateProgress);
      }
    };

    const rafId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(rafId);
  }, [toast.duration]);

  return (
    <div
      className={cn('toast', `toast-${toast.type}`)}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <Icon size={16} className="toast-icon" />
      <div className="toast-content">
        <div className="toast-title">{toast.title}</div>
        {toast.description && <div className="toast-description">{toast.description}</div>}
      </div>
      <button
        className="toast-dismiss"
        onClick={() => onDismiss(toast.id)}
        aria-label={t('ui.toast.dismiss')}
      >
        <X size={14} />
      </button>
      {toast.duration > 0 && (
        <div className="toast-progress-track">
          <div className="toast-progress" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

export function ToastContainer() {
  const { t } = useTranslation();
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-container" aria-label={t('ui.toast.notifications')}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
}

interface ToastHistoryDropdownProps {
  className?: string;
}

export function ToastHistoryDropdown({ className }: ToastHistoryDropdownProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const history = useToastStore((s) => s.history);
  const clearHistory = useToastStore((s) => s.clearHistory);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  return (
    <div className={cn('toast-history-wrapper', className)} ref={dropdownRef}>
      <button
        className="toast-history-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title={t('ui.toast.notifications')}
        aria-label={t('ui.toast.notifications')}
        aria-expanded={isOpen}
      >
        <Bell size={14} />
        {history.length > 0 && <span className="toast-history-badge">{history.length}</span>}
      </button>

      {isOpen && (
        <div className="toast-history-dropdown">
          {history.length === 0 ? (
            <div className="toast-history-empty">{t('ui.toast.noNotifications')}</div>
          ) : (
            <>
              <div className="toast-history-list">
                {history.map((item) => (
                  <HistoryItem key={item.id} item={item} />
                ))}
              </div>
              <button className="toast-history-clear" onClick={clearHistory}>
                {t('ui.toast.clearAll')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryItem({ item }: { item: ToastHistoryItem }) {
  const Icon = icons[item.type];

  return (
    <div className={cn('toast-history-item', `toast-history-item-${item.type}`)}>
      <Icon size={14} className="toast-history-item-icon" />
      <div className="toast-history-item-content">
        <div className="toast-history-item-title">{item.title}</div>
        {item.description && (
          <div className="toast-history-item-description">{item.description}</div>
        )}
      </div>
      <div className="toast-history-item-time">{formatRelativeTime(item.dismissedAt)}</div>
    </div>
  );
}
