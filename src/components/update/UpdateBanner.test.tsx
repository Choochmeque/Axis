import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpdateBanner } from './UpdateBanner';
import { useUpdateStore } from '@/store/updateStore';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts) return `${key}: ${JSON.stringify(opts)}`;
      return key;
    },
  }),
}));

vi.mock('@tauri-apps/plugin-updater', () => ({
  check: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-process', () => ({
  relaunch: vi.fn(),
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => key,
    changeLanguage: vi.fn(),
  },
}));

describe('UpdateBanner', () => {
  beforeEach(() => {
    useUpdateStore.setState({
      updateAvailable: null,
      isChecking: false,
      isDownloading: false,
      downloadProgress: 0,
      isReadyToRestart: false,
      error: null,
      dismissed: false,
    });
    vi.clearAllMocks();
  });

  it('should not render when no update is available', () => {
    const { container } = render(<UpdateBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when dismissed', () => {
    useUpdateStore.setState({
      updateAvailable: { version: '1.2.0', date: null, body: null },
      dismissed: true,
    });

    const { container } = render(<UpdateBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('should render update available message', () => {
    useUpdateStore.setState({
      updateAvailable: { version: '1.2.0', date: null, body: null },
    });

    render(<UpdateBanner />);

    expect(screen.getByLabelText('update-banner')).toBeInTheDocument();
    expect(screen.getByText(/update\.available/)).toBeInTheDocument();
  });

  it('should render install button when update available', () => {
    useUpdateStore.setState({
      updateAvailable: { version: '1.2.0', date: null, body: null },
    });

    render(<UpdateBanner />);

    expect(screen.getByText('update.install')).toBeInTheDocument();
  });

  it('should render dismiss button when not downloading', () => {
    useUpdateStore.setState({
      updateAvailable: { version: '1.2.0', date: null, body: null },
    });

    render(<UpdateBanner />);

    expect(screen.getByLabelText('update.dismiss')).toBeInTheDocument();
  });

  it('should call downloadAndInstall when install button clicked', () => {
    const mockDownloadAndInstall = vi.fn();
    useUpdateStore.setState({
      updateAvailable: { version: '1.2.0', date: null, body: null },
      downloadAndInstall: mockDownloadAndInstall,
    });

    render(<UpdateBanner />);

    fireEvent.click(screen.getByText('update.install'));
    expect(mockDownloadAndInstall).toHaveBeenCalled();
  });

  it('should call dismiss when dismiss button clicked', () => {
    const mockDismiss = vi.fn();
    useUpdateStore.setState({
      updateAvailable: { version: '1.2.0', date: null, body: null },
      dismiss: mockDismiss,
    });

    render(<UpdateBanner />);

    fireEvent.click(screen.getByLabelText('update.dismiss'));
    expect(mockDismiss).toHaveBeenCalled();
  });

  it('should show downloading state with progress', () => {
    useUpdateStore.setState({
      updateAvailable: { version: '1.2.0', date: null, body: null },
      isDownloading: true,
      downloadProgress: 45,
    });

    render(<UpdateBanner />);

    expect(screen.getByText(/update\.downloading/)).toBeInTheDocument();
  });

  it('should hide dismiss button when downloading', () => {
    useUpdateStore.setState({
      updateAvailable: { version: '1.2.0', date: null, body: null },
      isDownloading: true,
      downloadProgress: 45,
    });

    render(<UpdateBanner />);

    expect(screen.queryByLabelText('update.dismiss')).not.toBeInTheDocument();
  });

  it('should show restart state when ready to install', () => {
    useUpdateStore.setState({
      updateAvailable: { version: '1.2.0', date: null, body: null },
      isReadyToRestart: true,
    });

    render(<UpdateBanner />);

    expect(screen.getByText('update.readyToInstall')).toBeInTheDocument();
    expect(screen.getByText('update.restart')).toBeInTheDocument();
  });

  it('should call restartApp when restart button clicked', () => {
    const mockRestartApp = vi.fn();
    useUpdateStore.setState({
      updateAvailable: { version: '1.2.0', date: null, body: null },
      isReadyToRestart: true,
      restartApp: mockRestartApp,
    });

    render(<UpdateBanner />);

    fireEvent.click(screen.getByText('update.restart'));
    expect(mockRestartApp).toHaveBeenCalled();
  });

  it('should show progress bar during download', () => {
    useUpdateStore.setState({
      updateAvailable: { version: '1.2.0', date: null, body: null },
      isDownloading: true,
      downloadProgress: 60,
    });

    render(<UpdateBanner />);

    const progressBar = document.querySelector('.update-banner-progress-bar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle({ width: '60%' });
  });
});
