import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IntegrationLabel } from '@/types';
import { LabelSelector } from './LabelSelector';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock lucide-react icons
vi.mock('lucide-react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('lucide-react')>()),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Tag: ({ size }: any) => <span data-testid="icon-tag" data-size={size} />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Check: ({ size }: any) => <span data-testid="icon-check" data-size={size} />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  X: ({ size }: any) => <span data-testid="icon-x" data-size={size} />,
}));

// Mock integration store
const mockLoadLabels = vi.fn();
const mockAvailableLabels: IntegrationLabel[] = [
  { name: 'bug', color: 'd73a4a', description: 'Something is broken' },
  { name: 'enhancement', color: 'a2eeef', description: 'New feature request' },
  { name: 'documentation', color: '0075ca', description: 'Improvements to docs' },
];
let mockIsLoadingLabels = false;

vi.mock('@/store/integrationStore', () => ({
  useIntegrationStore: () => ({
    availableLabels: mockAvailableLabels,
    isLoadingLabels: mockIsLoadingLabels,
    loadLabels: mockLoadLabels,
  }),
}));

describe('LabelSelector', () => {
  const mockOnSelectionChange = vi.fn();

  const defaultProps = {
    selectedLabels: [] as IntegrationLabel[],
    onSelectionChange: mockOnSelectionChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoadingLabels = false;
  });

  it('should render label field with trigger button', () => {
    render(<LabelSelector {...defaultProps} />);

    expect(screen.getByText('integrations.pullRequests.create.labelsLabel')).toBeInTheDocument();
    expect(
      screen.getByText('integrations.pullRequests.create.labelsNoneSelected')
    ).toBeInTheDocument();
  });

  it('should load labels on mount', () => {
    render(<LabelSelector {...defaultProps} />);

    expect(mockLoadLabels).toHaveBeenCalled();
  });

  it('should show dropdown when trigger is clicked', () => {
    render(<LabelSelector {...defaultProps} />);

    fireEvent.click(screen.getByText('integrations.pullRequests.create.labelsNoneSelected'));

    expect(
      screen.getByPlaceholderText('integrations.pullRequests.create.labelsPlaceholder')
    ).toBeInTheDocument();
    expect(screen.getByText('bug')).toBeInTheDocument();
    expect(screen.getByText('enhancement')).toBeInTheDocument();
    expect(screen.getByText('documentation')).toBeInTheDocument();
  });

  it('should not open dropdown when disabled', () => {
    render(<LabelSelector {...defaultProps} disabled />);

    fireEvent.click(screen.getByText('integrations.pullRequests.create.labelsNoneSelected'));

    expect(
      screen.queryByPlaceholderText('integrations.pullRequests.create.labelsPlaceholder')
    ).not.toBeInTheDocument();
  });

  it('should call onSelectionChange when a label is clicked', () => {
    render(<LabelSelector {...defaultProps} />);

    // Open dropdown
    fireEvent.click(screen.getByText('integrations.pullRequests.create.labelsNoneSelected'));

    // Click a label
    fireEvent.click(screen.getByText('bug'));

    expect(mockOnSelectionChange).toHaveBeenCalledWith([
      { name: 'bug', color: 'd73a4a', description: 'Something is broken' },
    ]);
  });

  it('should deselect label when already selected', () => {
    const selectedLabels: IntegrationLabel[] = [
      { name: 'bug', color: 'd73a4a', description: 'Something is broken' },
    ];

    render(
      <LabelSelector selectedLabels={selectedLabels} onSelectionChange={mockOnSelectionChange} />
    );

    // Open dropdown
    fireEvent.click(screen.getByText('integrations.pullRequests.create.labelsNoneSelected'));

    // Click the already-selected label in the dropdown (not the badge)
    const bugElements = screen.getAllByText('bug');
    // The last one is inside the dropdown list
    fireEvent.click(bugElements[bugElements.length - 1]);

    expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
  });

  it('should show selected labels as badges', () => {
    const selectedLabels: IntegrationLabel[] = [
      { name: 'bug', color: 'd73a4a', description: 'Something is broken' },
      { name: 'enhancement', color: 'a2eeef', description: 'New feature request' },
    ];

    render(
      <LabelSelector selectedLabels={selectedLabels} onSelectionChange={mockOnSelectionChange} />
    );

    // Both labels should be visible as badges (outside the dropdown)
    const badges = screen.getAllByText(/^(bug|enhancement)$/);
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });

  it('should remove label when badge X button is clicked', () => {
    const selectedLabels: IntegrationLabel[] = [
      { name: 'bug', color: 'd73a4a', description: 'Something is broken' },
    ];

    render(
      <LabelSelector selectedLabels={selectedLabels} onSelectionChange={mockOnSelectionChange} />
    );

    // Find the X button inside the badge
    const removeButtons = screen.getAllByTestId('icon-x');
    fireEvent.click(removeButtons[0].closest('button')!);

    expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
  });

  it('should not show remove button on badges when disabled', () => {
    const selectedLabels: IntegrationLabel[] = [
      { name: 'bug', color: 'd73a4a', description: 'Something is broken' },
    ];

    render(
      <LabelSelector
        selectedLabels={selectedLabels}
        onSelectionChange={mockOnSelectionChange}
        disabled
      />
    );

    // Badge should exist but no X button
    expect(screen.queryByTestId('icon-x')).not.toBeInTheDocument();
  });

  it('should filter labels by search', () => {
    render(<LabelSelector {...defaultProps} />);

    // Open dropdown
    fireEvent.click(screen.getByText('integrations.pullRequests.create.labelsNoneSelected'));

    // Type in search
    fireEvent.change(
      screen.getByPlaceholderText('integrations.pullRequests.create.labelsPlaceholder'),
      { target: { value: 'bug' } }
    );

    expect(screen.getByText('bug')).toBeInTheDocument();
    expect(screen.queryByText('enhancement')).not.toBeInTheDocument();
    expect(screen.queryByText('documentation')).not.toBeInTheDocument();
  });

  it('should filter labels by description', () => {
    render(<LabelSelector {...defaultProps} />);

    // Open dropdown
    fireEvent.click(screen.getByText('integrations.pullRequests.create.labelsNoneSelected'));

    // Type search matching description
    fireEvent.change(
      screen.getByPlaceholderText('integrations.pullRequests.create.labelsPlaceholder'),
      { target: { value: 'broken' } }
    );

    expect(screen.getByText('bug')).toBeInTheDocument();
    expect(screen.queryByText('enhancement')).not.toBeInTheDocument();
  });

  it('should show empty state when no labels match search', () => {
    render(<LabelSelector {...defaultProps} />);

    // Open dropdown
    fireEvent.click(screen.getByText('integrations.pullRequests.create.labelsNoneSelected'));

    fireEvent.change(
      screen.getByPlaceholderText('integrations.pullRequests.create.labelsPlaceholder'),
      { target: { value: 'nonexistent' } }
    );

    expect(screen.getByText('integrations.pullRequests.create.labelsEmpty')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    mockIsLoadingLabels = true;

    render(<LabelSelector {...defaultProps} />);

    // Open dropdown
    fireEvent.click(screen.getByText('integrations.pullRequests.create.labelsNoneSelected'));

    expect(screen.getByText('integrations.pullRequests.create.labelsLoading')).toBeInTheDocument();
  });

  it('should close dropdown on outside click', () => {
    render(<LabelSelector {...defaultProps} />);

    // Open dropdown
    fireEvent.click(screen.getByText('integrations.pullRequests.create.labelsNoneSelected'));

    expect(
      screen.getByPlaceholderText('integrations.pullRequests.create.labelsPlaceholder')
    ).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(document.body);

    expect(
      screen.queryByPlaceholderText('integrations.pullRequests.create.labelsPlaceholder')
    ).not.toBeInTheDocument();
  });

  it('should show check icon for selected labels in dropdown', () => {
    const selectedLabels: IntegrationLabel[] = [
      { name: 'bug', color: 'd73a4a', description: 'Something is broken' },
    ];

    render(
      <LabelSelector selectedLabels={selectedLabels} onSelectionChange={mockOnSelectionChange} />
    );

    // Open dropdown
    fireEvent.click(screen.getByText('integrations.pullRequests.create.labelsNoneSelected'));

    // Should have check icon for the selected label
    const checkIcons = screen.getAllByTestId('icon-check');
    expect(checkIcons.length).toBe(1);
  });

  it('should add label to existing selection when clicking unselected label', () => {
    const selectedLabels: IntegrationLabel[] = [
      { name: 'bug', color: 'd73a4a', description: 'Something is broken' },
    ];

    render(
      <LabelSelector selectedLabels={selectedLabels} onSelectionChange={mockOnSelectionChange} />
    );

    // Open dropdown
    fireEvent.click(screen.getByText('integrations.pullRequests.create.labelsNoneSelected'));

    // Click enhancement label
    fireEvent.click(screen.getByText('enhancement'));

    expect(mockOnSelectionChange).toHaveBeenCalledWith([
      { name: 'bug', color: 'd73a4a', description: 'Something is broken' },
      { name: 'enhancement', color: 'a2eeef', description: 'New feature request' },
    ]);
  });

  it('should toggle dropdown open and closed', () => {
    render(<LabelSelector {...defaultProps} />);

    const trigger = screen.getByText('integrations.pullRequests.create.labelsNoneSelected');

    // Open
    fireEvent.click(trigger);
    expect(
      screen.getByPlaceholderText('integrations.pullRequests.create.labelsPlaceholder')
    ).toBeInTheDocument();

    // Close
    fireEvent.click(trigger);
    expect(
      screen.queryByPlaceholderText('integrations.pullRequests.create.labelsPlaceholder')
    ).not.toBeInTheDocument();
  });

  it('should disable trigger button when disabled', () => {
    render(<LabelSelector {...defaultProps} disabled />);

    const triggerButton = screen
      .getByText('integrations.pullRequests.create.labelsNoneSelected')
      .closest('button')!;

    expect(triggerButton).toBeDisabled();
  });
});
