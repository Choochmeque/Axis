import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LargeBinaryWarningDialog } from './LargeBinaryWarningDialog';
import type { LargeBinaryFileInfo } from '@/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts?.count !== undefined && opts?.threshold)
        return `${key}: ${opts.count} files, ${opts.threshold}`;
      if (opts?.pattern) return `${key}: ${opts.pattern}`;
      return key;
    },
  }),
}));

vi.mock('@/services/api', () => ({
  shellApi: {
    openUrl: vi.fn(),
  },
}));

const mockFiles: LargeBinaryFileInfo[] = [
  {
    path: 'assets/image.psd',
    size: 15728640,
    isBinary: true,
    isLfsTracked: false,
    suggestedPattern: '*.psd',
  },
  {
    path: 'assets/video.mp4',
    size: 52428800,
    isBinary: true,
    isLfsTracked: false,
    suggestedPattern: '*.mp4',
  },
];

describe('LargeBinaryWarningDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    files: mockFiles,
    lfsInstalled: true,
    lfsInitialized: true,
    onStageAnyway: vi.fn(),
    onTrackWithLfs: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(<LargeBinaryWarningDialog {...defaultProps} />);

    expect(screen.getByText('staging.lfsWarning.title')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<LargeBinaryWarningDialog {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('staging.lfsWarning.title')).not.toBeInTheDocument();
  });

  it('should display all files in the list', () => {
    render(<LargeBinaryWarningDialog {...defaultProps} />);

    expect(screen.getByText('assets/image.psd')).toBeInTheDocument();
    expect(screen.getByText('assets/video.mp4')).toBeInTheDocument();
  });

  it('should display suggested patterns for each file', () => {
    render(<LargeBinaryWarningDialog {...defaultProps} />);

    expect(screen.getByText('staging.lfsWarning.suggestedPattern: *.psd')).toBeInTheDocument();
    expect(screen.getByText('staging.lfsWarning.suggestedPattern: *.mp4')).toBeInTheDocument();
  });

  it('should show warning message with file count', () => {
    render(<LargeBinaryWarningDialog {...defaultProps} />);

    // The message includes count and threshold
    expect(screen.getByText(/staging.lfsWarning.message/)).toBeInTheDocument();
  });

  it('should call onStageAnyway and onClose when stage anyway is clicked', () => {
    render(<LargeBinaryWarningDialog {...defaultProps} />);

    const stageAnywayButton = screen.getByText('staging.lfsWarning.stageAnyway');
    fireEvent.click(stageAnywayButton);

    expect(defaultProps.onStageAnyway).toHaveBeenCalledTimes(1);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onTrackWithLfs with unique patterns and onClose when track with LFS is clicked', () => {
    render(<LargeBinaryWarningDialog {...defaultProps} />);

    const trackButton = screen.getByText('staging.lfsWarning.trackWithLfs');
    fireEvent.click(trackButton);

    expect(defaultProps.onTrackWithLfs).toHaveBeenCalledWith(['*.psd', '*.mp4']);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should deduplicate patterns when calling onTrackWithLfs', () => {
    const filesWithDuplicatePatterns: LargeBinaryFileInfo[] = [
      {
        path: 'assets/image1.psd',
        size: 15728640,
        isBinary: true,
        isLfsTracked: false,
        suggestedPattern: '*.psd',
      },
      {
        path: 'assets/image2.psd',
        size: 20971520,
        isBinary: true,
        isLfsTracked: false,
        suggestedPattern: '*.psd',
      },
    ];

    render(<LargeBinaryWarningDialog {...defaultProps} files={filesWithDuplicatePatterns} />);

    const trackButton = screen.getByText('staging.lfsWarning.trackWithLfs');
    fireEvent.click(trackButton);

    expect(defaultProps.onTrackWithLfs).toHaveBeenCalledWith(['*.psd']);
  });

  it('should show Track with LFS button when LFS is installed', () => {
    render(<LargeBinaryWarningDialog {...defaultProps} lfsInstalled={true} />);

    expect(screen.getByText('staging.lfsWarning.trackWithLfs')).toBeInTheDocument();
  });

  it('should hide Track with LFS button when LFS is not installed', () => {
    render(<LargeBinaryWarningDialog {...defaultProps} lfsInstalled={false} />);

    expect(screen.queryByText('staging.lfsWarning.trackWithLfs')).not.toBeInTheDocument();
  });

  it('should show LFS not installed info when LFS is not installed', () => {
    render(<LargeBinaryWarningDialog {...defaultProps} lfsInstalled={false} />);

    expect(screen.getByText('staging.lfsWarning.lfsNotInstalled')).toBeInTheDocument();
    expect(screen.getByText('staging.lfsWarning.installLfs')).toBeInTheDocument();
  });

  it('should not show LFS not installed info when LFS is installed', () => {
    render(<LargeBinaryWarningDialog {...defaultProps} lfsInstalled={true} />);

    expect(screen.queryByText('staging.lfsWarning.lfsNotInstalled')).not.toBeInTheDocument();
  });

  it('should open LFS install URL when install link is clicked', async () => {
    const { shellApi } = await import('@/services/api');

    render(<LargeBinaryWarningDialog {...defaultProps} lfsInstalled={false} />);

    const installLink = screen.getByText('staging.lfsWarning.installLfs');
    fireEvent.click(installLink);

    expect(shellApi.openUrl).toHaveBeenCalledWith('https://git-lfs.com');
  });

  it('should show cancel button', () => {
    render(<LargeBinaryWarningDialog {...defaultProps} />);

    expect(screen.getByText('common.cancel')).toBeInTheDocument();
  });

  it('should always show stage anyway button', () => {
    render(<LargeBinaryWarningDialog {...defaultProps} />);

    const stageAnywayButton = screen.getByText('staging.lfsWarning.stageAnyway');
    expect(stageAnywayButton).toBeInTheDocument();
    expect(stageAnywayButton.closest('button')).not.toBeDisabled();
  });

  it('should show stage anyway button even when LFS is not installed', () => {
    render(<LargeBinaryWarningDialog {...defaultProps} lfsInstalled={false} />);

    expect(screen.getByText('staging.lfsWarning.stageAnyway')).toBeInTheDocument();
  });

  it('should hide Track with LFS button when onTrackWithLfs is not provided', () => {
    render(
      <LargeBinaryWarningDialog {...defaultProps} lfsInstalled={true} onTrackWithLfs={undefined} />
    );

    expect(screen.queryByText('staging.lfsWarning.trackWithLfs')).not.toBeInTheDocument();
  });

  it('should render single file correctly', () => {
    const singleFile: LargeBinaryFileInfo[] = [
      {
        path: 'model.bin',
        size: 104857600,
        isBinary: true,
        isLfsTracked: false,
        suggestedPattern: '*.bin',
      },
    ];

    render(<LargeBinaryWarningDialog {...defaultProps} files={singleFile} />);

    expect(screen.getByText('model.bin')).toBeInTheDocument();
    expect(screen.getByText('staging.lfsWarning.suggestedPattern: *.bin')).toBeInTheDocument();
  });
});
