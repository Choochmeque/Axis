import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OperationProgressBar } from './OperationProgressBar';
import { ProgressStage } from '@/types';
import type { OperationProgress } from '@/store/operationStore';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('OperationProgressBar', () => {
  const baseProgress: OperationProgress = {
    stage: ProgressStage.Receiving,
    receivedBytes: 0,
    totalObjects: 0,
    receivedObjects: 0,
    indexedDeltas: 0,
    totalDeltas: 0,
  };

  it('should render progress bar', () => {
    render(<OperationProgressBar progress={baseProgress} />);

    expect(document.querySelector('.operations-progress-bar')).toBeInTheDocument();
  });

  it('should render progress text', () => {
    render(<OperationProgressBar progress={baseProgress} />);

    expect(document.querySelector('.operations-progress-text')).toBeInTheDocument();
  });

  it('should show 0% progress when no data', () => {
    render(<OperationProgressBar progress={baseProgress} />);

    const fill = document.querySelector('.operations-progress-fill') as HTMLElement;
    expect(fill.style.width).toBe('0%');
  });

  it('should show correct percentage for receiving stage', () => {
    const progress: OperationProgress = {
      ...baseProgress,
      stage: ProgressStage.Receiving,
      totalObjects: 100,
      receivedObjects: 50,
    };

    render(<OperationProgressBar progress={progress} />);

    const fill = document.querySelector('.operations-progress-fill') as HTMLElement;
    expect(fill.style.width).toBe('50%');
  });

  it('should show correct percentage for resolving stage', () => {
    const progress: OperationProgress = {
      ...baseProgress,
      stage: ProgressStage.Resolving,
      totalDeltas: 200,
      indexedDeltas: 100,
    };

    render(<OperationProgressBar progress={progress} />);

    const fill = document.querySelector('.operations-progress-fill') as HTMLElement;
    expect(fill.style.width).toBe('50%');
  });

  it('should format bytes correctly', () => {
    const progress: OperationProgress = {
      ...baseProgress,
      stage: ProgressStage.Receiving,
      receivedBytes: 1024,
    };

    render(<OperationProgressBar progress={progress} />);

    expect(screen.getByText(/1.*KB/)).toBeInTheDocument();
  });

  it('should format megabytes correctly', () => {
    const progress: OperationProgress = {
      ...baseProgress,
      stage: ProgressStage.Receiving,
      receivedBytes: 1048576,
    };

    render(<OperationProgressBar progress={progress} />);

    expect(screen.getByText(/1.*MB/)).toBeInTheDocument();
  });

  it('should show objects count for receiving stage', () => {
    const progress: OperationProgress = {
      ...baseProgress,
      stage: ProgressStage.Receiving,
      totalObjects: 100,
      receivedObjects: 50,
      receivedBytes: 512,
    };

    render(<OperationProgressBar progress={progress} />);

    expect(screen.getByText(/50\/100/)).toBeInTheDocument();
  });

  it('should show deltas count for resolving stage', () => {
    const progress: OperationProgress = {
      ...baseProgress,
      stage: ProgressStage.Resolving,
      totalDeltas: 100,
      indexedDeltas: 75,
    };

    render(<OperationProgressBar progress={progress} />);

    expect(screen.getByText(/75\/100/)).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <OperationProgressBar progress={baseProgress} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
