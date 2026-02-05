import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarkdownEditor } from './MarkdownEditor';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Mock services/api
vi.mock('@/services/api', () => ({
  shellApi: {
    openUrl: vi.fn(),
  },
}));

// Mock react-markdown
vi.mock('react-markdown', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ children }: any) => <div data-testid="markdown-preview-content">{children}</div>,
}));

// Mock rehype-raw
vi.mock('rehype-raw', () => ({
  default: vi.fn(),
}));

// Mock remark-gfm
vi.mock('remark-gfm', () => ({
  default: vi.fn(),
}));

// Mock syntax highlighter
vi.mock('react-syntax-highlighter', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Prism: ({ children }: any) => <pre data-testid="syntax-highlighter">{children}</pre>,
}));

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  oneDark: {},
}));

// Mock lucide-react icons
vi.mock('lucide-react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('lucide-react')>()),
  Bold: ({ size }: { size: number }) => <span data-testid="icon-bold" data-size={size} />,
  Italic: ({ size }: { size: number }) => <span data-testid="icon-italic" data-size={size} />,
  Heading2: ({ size }: { size: number }) => <span data-testid="icon-heading" data-size={size} />,
  Quote: ({ size }: { size: number }) => <span data-testid="icon-quote" data-size={size} />,
  Code: ({ size }: { size: number }) => <span data-testid="icon-code" data-size={size} />,
  Link: ({ size }: { size: number }) => <span data-testid="icon-link" data-size={size} />,
  List: ({ size }: { size: number }) => <span data-testid="icon-list" data-size={size} />,
  ListOrdered: ({ size }: { size: number }) => (
    <span data-testid="icon-list-ordered" data-size={size} />
  ),
  ListChecks: ({ size }: { size: number }) => (
    <span data-testid="icon-list-checks" data-size={size} />
  ),
}));

describe('MarkdownEditor', () => {
  const mockOnChange = vi.fn();

  const defaultProps = {
    value: '',
    onChange: mockOnChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with write tab active by default', () => {
    render(<MarkdownEditor {...defaultProps} />);

    const writeTab = screen.getByText('common.write');
    const previewTab = screen.getByText('common.preview');

    expect(writeTab).toBeInTheDocument();
    expect(previewTab).toBeInTheDocument();
    expect(writeTab.className).toContain('markdown-editor-tab-active');
    expect(previewTab.className).not.toContain('markdown-editor-tab-active');
  });

  it('should render textarea in write mode', () => {
    render(<MarkdownEditor {...defaultProps} id="test-editor" />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('id', 'test-editor');
  });

  it('should render with placeholder', () => {
    render(<MarkdownEditor {...defaultProps} placeholder="Enter text..." />);

    expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
  });

  it('should render with value', () => {
    render(<MarkdownEditor {...defaultProps} value="Hello world" />);

    expect(screen.getByRole('textbox')).toHaveValue('Hello world');
  });

  it('should call onChange when typing', () => {
    render(<MarkdownEditor {...defaultProps} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new text' } });

    expect(mockOnChange).toHaveBeenCalledWith('new text');
  });

  it('should render toolbar with all 9 actions in write mode', () => {
    render(<MarkdownEditor {...defaultProps} />);

    expect(screen.getByTitle('common.heading')).toBeInTheDocument();
    expect(screen.getByTitle('common.bold')).toBeInTheDocument();
    expect(screen.getByTitle('common.italic')).toBeInTheDocument();
    expect(screen.getByTitle('common.quote')).toBeInTheDocument();
    expect(screen.getByTitle('common.code')).toBeInTheDocument();
    expect(screen.getByTitle('common.link')).toBeInTheDocument();
    expect(screen.getByTitle('common.bulletList')).toBeInTheDocument();
    expect(screen.getByTitle('common.numberedList')).toBeInTheDocument();
    expect(screen.getByTitle('common.taskList')).toBeInTheDocument();
  });

  it('should switch to preview mode', () => {
    render(<MarkdownEditor {...defaultProps} value="**bold text**" />);

    fireEvent.click(screen.getByText('common.preview'));

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByTestId('markdown-preview-content')).toBeInTheDocument();
  });

  it('should show empty preview message when value is empty', () => {
    render(<MarkdownEditor {...defaultProps} value="" />);

    fireEvent.click(screen.getByText('common.preview'));

    expect(screen.getByText('common.previewEmpty')).toBeInTheDocument();
  });

  it('should show empty preview message when value is whitespace only', () => {
    render(<MarkdownEditor {...defaultProps} value="   " />);

    fireEvent.click(screen.getByText('common.preview'));

    expect(screen.getByText('common.previewEmpty')).toBeInTheDocument();
  });

  it('should render markdown content in preview mode', () => {
    render(<MarkdownEditor {...defaultProps} value="Hello markdown" />);

    fireEvent.click(screen.getByText('common.preview'));

    expect(screen.getByTestId('markdown-preview-content')).toHaveTextContent('Hello markdown');
  });

  it('should hide toolbar in preview mode', () => {
    render(<MarkdownEditor {...defaultProps} />);

    fireEvent.click(screen.getByText('common.preview'));

    expect(screen.queryByTitle('common.bold')).not.toBeInTheDocument();
    expect(screen.queryByTitle('common.italic')).not.toBeInTheDocument();
  });

  it('should switch back to write mode', () => {
    render(<MarkdownEditor {...defaultProps} />);

    fireEvent.click(screen.getByText('common.preview'));
    fireEvent.click(screen.getByText('common.write'));

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByTitle('common.bold')).toBeInTheDocument();
  });

  it('should apply disabled class when disabled', () => {
    const { container } = render(<MarkdownEditor {...defaultProps} disabled />);

    const editor = container.firstChild as HTMLElement;
    expect(editor.className).toContain('opacity-50');
    expect(editor.className).toContain('pointer-events-none');
  });

  it('should disable textarea when disabled', () => {
    render(<MarkdownEditor {...defaultProps} disabled />);

    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('should disable toolbar buttons when disabled', () => {
    render(<MarkdownEditor {...defaultProps} disabled />);

    const boldButton = screen.getByTitle('common.bold');
    expect(boldButton).toBeDisabled();
  });

  it('should use custom rows', () => {
    render(<MarkdownEditor {...defaultProps} rows={10} />);

    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '10');
  });

  it('should use default rows of 6', () => {
    render(<MarkdownEditor {...defaultProps} />);

    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '6');
  });

  it('should call onChange when bold toolbar button is clicked', () => {
    render(<MarkdownEditor {...defaultProps} value="hello" />);

    // The toolbar button triggers handleToolbarAction which calls onChange
    fireEvent.click(screen.getByTitle('common.bold'));

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should call onChange when heading toolbar button is clicked', () => {
    render(<MarkdownEditor {...defaultProps} value="hello" />);

    fireEvent.click(screen.getByTitle('common.heading'));

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should handle Ctrl+B keyboard shortcut', () => {
    render(<MarkdownEditor {...defaultProps} value="hello" />);

    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'b', ctrlKey: true });

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should handle Ctrl+I keyboard shortcut', () => {
    render(<MarkdownEditor {...defaultProps} value="hello" />);

    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'i', ctrlKey: true });

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should handle Ctrl+K keyboard shortcut', () => {
    render(<MarkdownEditor {...defaultProps} value="hello" />);

    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'k', ctrlKey: true });

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should handle Meta+B keyboard shortcut (macOS)', () => {
    render(<MarkdownEditor {...defaultProps} value="hello" />);

    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'b', metaKey: true });

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should not trigger shortcut without modifier key', () => {
    render(<MarkdownEditor {...defaultProps} value="hello" />);

    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'b' });

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('should not trigger shortcut for unhandled keys', () => {
    render(<MarkdownEditor {...defaultProps} value="hello" />);

    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'z', ctrlKey: true });

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('should call onChange for all toolbar actions', () => {
    render(<MarkdownEditor {...defaultProps} value="some text" />);

    const actions = [
      'common.heading',
      'common.bold',
      'common.italic',
      'common.quote',
      'common.code',
      'common.link',
      'common.bulletList',
      'common.numberedList',
      'common.taskList',
    ];

    for (const action of actions) {
      mockOnChange.mockClear();
      fireEvent.click(screen.getByTitle(action));
      expect(mockOnChange).toHaveBeenCalled();
    }
  });
});
