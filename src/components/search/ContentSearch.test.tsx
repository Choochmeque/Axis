import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContentSearch } from './ContentSearch';
import { grepApi } from '../../services/api';

// Mock the API
vi.mock('../../services/api', () => ({
  grepApi: {
    search: vi.fn(),
    searchCommit: vi.fn(),
  },
}));

describe('ContentSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render search input', () => {
    render(<ContentSearch />);

    expect(screen.getByPlaceholderText('Search pattern...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });

  it('should disable search button when input is empty', () => {
    render(<ContentSearch />);

    const searchButton = screen.getByRole('button', { name: 'Search' });
    expect(searchButton).toBeDisabled();
  });

  it('should enable search button when input has value', () => {
    render(<ContentSearch />);

    const input = screen.getByPlaceholderText('Search pattern...');
    fireEvent.change(input, { target: { value: 'test' } });

    const searchButton = screen.getByRole('button', { name: 'Search' });
    expect(searchButton).not.toBeDisabled();
  });

  it('should perform search and display results', async () => {
    vi.mocked(grepApi.search).mockResolvedValue({
      matches: [
        { path: 'src/main.ts', lineNumber: 10, content: 'const test = 1;' },
        { path: 'src/main.ts', lineNumber: 20, content: 'function test() {}' },
        { path: 'src/utils.ts', lineNumber: 5, content: 'export const test = true;' },
      ],
      totalMatches: 3,
    });

    render(<ContentSearch />);

    const input = screen.getByPlaceholderText('Search pattern...');
    fireEvent.change(input, { target: { value: 'test' } });

    const searchButton = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('3 results in 2 files')).toBeInTheDocument();
    });

    expect(screen.getByText('src/main.ts')).toBeInTheDocument();
    expect(screen.getByText('src/utils.ts')).toBeInTheDocument();
  });

  it('should show no results message', async () => {
    vi.mocked(grepApi.search).mockResolvedValue({
      matches: [],
      totalMatches: 0,
    });

    render(<ContentSearch />);

    const input = screen.getByPlaceholderText('Search pattern...');
    fireEvent.change(input, { target: { value: 'nonexistent' } });

    const searchButton = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('No results found for "nonexistent"')).toBeInTheDocument();
    });
  });

  it('should toggle search options', () => {
    render(<ContentSearch />);

    // Options should be hidden by default
    expect(screen.queryByText('Ignore case')).not.toBeInTheDocument();

    // Click to show options
    const optionsButton = screen.getByText('Options');
    fireEvent.click(optionsButton);

    expect(screen.getByText('Ignore case')).toBeInTheDocument();
    expect(screen.getByText('Whole word')).toBeInTheDocument();
    expect(screen.getByText('Use regex')).toBeInTheDocument();
  });

  it('should search with options', async () => {
    vi.mocked(grepApi.search).mockResolvedValue({
      matches: [],
      totalMatches: 0,
    });

    render(<ContentSearch />);

    // Show options
    fireEvent.click(screen.getByText('Options'));

    // Enable ignore case
    const ignoreCaseCheckbox = screen.getByLabelText('Ignore case');
    fireEvent.click(ignoreCaseCheckbox);

    // Perform search
    const input = screen.getByPlaceholderText('Search pattern...');
    fireEvent.change(input, { target: { value: 'TEST' } });

    const searchButton = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(grepApi.search).toHaveBeenCalledWith({
        pattern: 'TEST',
        ignoreCase: true,
        wordRegexp: false,
        extendedRegexp: false,
        showLineNumbers: true,
        maxCount: 1000,
      });
    });
  });

  it('should search on Enter key', async () => {
    vi.mocked(grepApi.search).mockResolvedValue({
      matches: [],
      totalMatches: 0,
    });

    render(<ContentSearch />);

    const input = screen.getByPlaceholderText('Search pattern...');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(grepApi.search).toHaveBeenCalled();
    });
  });

  it('should call onFileSelect when clicking a match', async () => {
    const onFileSelect = vi.fn();
    vi.mocked(grepApi.search).mockResolvedValue({
      matches: [{ path: 'src/main.ts', lineNumber: 10, content: 'const test = 1;' }],
      totalMatches: 1,
    });

    render(<ContentSearch onFileSelect={onFileSelect} />);

    const input = screen.getByPlaceholderText('Search pattern...');
    fireEvent.change(input, { target: { value: 'test' } });

    const searchButton = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('const test = 1;')).toBeInTheDocument();
    });

    // Click on the match
    fireEvent.click(screen.getByText('const test = 1;'));

    expect(onFileSelect).toHaveBeenCalledWith('src/main.ts', 10);
  });

  it('should show error on search failure', async () => {
    vi.mocked(grepApi.search).mockRejectedValue(new Error('Search failed'));

    render(<ContentSearch />);

    const input = screen.getByPlaceholderText('Search pattern...');
    fireEvent.change(input, { target: { value: 'test' } });

    const searchButton = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Search failed')).toBeInTheDocument();
    });
  });
});
