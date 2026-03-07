import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OperationBanners } from './OperationBanners';

// Mock child components
vi.mock('./BisectBanner', () => ({
  BisectBanner: ({ onComplete }: { onComplete?: () => void }) => (
    <div data-testid="bisect-banner" data-oncomplete={!!onComplete}>
      BisectBanner
    </div>
  ),
}));

vi.mock('./MergeBanner', () => ({
  MergeBanner: ({ onComplete }: { onComplete?: () => void }) => (
    <div data-testid="merge-banner" data-oncomplete={!!onComplete}>
      MergeBanner
    </div>
  ),
}));

vi.mock('./RebaseBanner', () => ({
  RebaseBanner: ({ onComplete }: { onComplete?: () => void }) => (
    <div data-testid="rebase-banner" data-oncomplete={!!onComplete}>
      RebaseBanner
    </div>
  ),
}));

describe('OperationBanners', () => {
  it('should render all three banners', () => {
    const { getByTestId } = render(<OperationBanners />);

    expect(getByTestId('bisect-banner')).toBeInTheDocument();
    expect(getByTestId('merge-banner')).toBeInTheDocument();
    expect(getByTestId('rebase-banner')).toBeInTheDocument();
  });

  it('should pass onComplete to all child banners', () => {
    const onComplete = vi.fn();
    const { getByTestId } = render(<OperationBanners onComplete={onComplete} />);

    expect(getByTestId('bisect-banner')).toHaveAttribute('data-oncomplete', 'true');
    expect(getByTestId('merge-banner')).toHaveAttribute('data-oncomplete', 'true');
    expect(getByTestId('rebase-banner')).toHaveAttribute('data-oncomplete', 'true');
  });

  it('should render without onComplete', () => {
    const { getByTestId } = render(<OperationBanners />);

    expect(getByTestId('bisect-banner')).toHaveAttribute('data-oncomplete', 'false');
    expect(getByTestId('merge-banner')).toHaveAttribute('data-oncomplete', 'false');
    expect(getByTestId('rebase-banner')).toHaveAttribute('data-oncomplete', 'false');
  });

  it('should have sticky positioning', () => {
    const { container } = render(<OperationBanners />);
    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper).toHaveClass('sticky');
    expect(wrapper).toHaveClass('top-0');
    expect(wrapper).toHaveClass('z-10');
  });
});
