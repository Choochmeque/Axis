import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LfsIndicator } from './LfsIndicator';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

describe('LfsIndicator', () => {
  it('should render label', () => {
    render(<LfsIndicator />);

    expect(screen.getByText('lfs.indicator.label')).toBeInTheDocument();
  });

  it('should show downloaded title by default', () => {
    render(<LfsIndicator />);

    expect(screen.getByTitle('lfs.indicator.downloaded')).toBeInTheDocument();
  });

  it('should show pointer title when not downloaded', () => {
    render(<LfsIndicator isDownloaded={false} />);

    expect(screen.getByTitle('lfs.indicator.pointer')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<LfsIndicator className="custom-class" />);

    const indicator = screen.getByText('lfs.indicator.label').closest('span');
    expect(indicator?.className).toContain('custom-class');
  });

  it('should have accent color styling when downloaded', () => {
    render(<LfsIndicator isDownloaded={true} />);

    const indicator = screen.getByTitle('lfs.indicator.downloaded');
    expect(indicator.className).toContain('text-(--accent-color)');
  });

  it('should have warning color styling when not downloaded', () => {
    render(<LfsIndicator isDownloaded={false} />);

    const indicator = screen.getByTitle('lfs.indicator.pointer');
    expect(indicator.className).toContain('text-warning');
  });
});
