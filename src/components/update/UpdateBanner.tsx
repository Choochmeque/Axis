import { Download, RefreshCw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUpdateStore } from '@/store/updateStore';

export function UpdateBanner() {
  const { t } = useTranslation();
  const {
    updateAvailable,
    isDownloading,
    downloadProgress,
    isReadyToRestart,
    dismissed,
    downloadAndInstall,
    restartApp,
    dismiss,
  } = useUpdateStore();

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="update-banner" aria-label="update-banner">
      <div className="update-banner-content">
        {isReadyToRestart ? (
          <>
            <span className="update-banner-text">{t('update.readyToInstall')}</span>
            <button className="update-banner-action" onClick={restartApp}>
              <RefreshCw size={14} />
              {t('update.restart')}
            </button>
          </>
        ) : isDownloading ? (
          <>
            <span className="update-banner-text">
              {t('update.downloading', { progress: downloadProgress })}
            </span>
            <div className="update-banner-progress">
              <div
                className="update-banner-progress-bar"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <span className="update-banner-text">
              {t('update.available', { version: updateAvailable.version })}
            </span>
            <button className="update-banner-action" onClick={downloadAndInstall}>
              <Download size={14} />
              {t('update.install')}
            </button>
          </>
        )}
      </div>
      {!isDownloading && (
        <button
          className="update-banner-dismiss"
          onClick={dismiss}
          aria-label={t('update.dismiss')}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
