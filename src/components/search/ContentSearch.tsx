import { useState, useCallback } from 'react';
import {
  Search,
  FileText,
  AlertCircle,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { grepApi } from '../../services/api';
import type { GrepMatch, GrepResult } from '../../types';
import './ContentSearch.css';

interface ContentSearchProps {
  onFileSelect?: (path: string, lineNumber?: number) => void;
}

export function ContentSearch({ onFileSelect }: ContentSearchProps) {
  const [pattern, setPattern] = useState('');
  const [results, setResults] = useState<GrepResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  // Search options
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [wordRegexp, setWordRegexp] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!pattern.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await grepApi.search({
        pattern,
        ignore_case: ignoreCase,
        word_regexp: wordRegexp,
        extended_regexp: useRegex,
        show_line_numbers: true,
        max_count: 1000,
      });
      setResults(result);

      // Expand all files by default
      const files = new Set(result.matches.map((m) => m.path));
      setExpandedFiles(files);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed');
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, [pattern, ignoreCase, wordRegexp, useRegex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleFile = (path: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleMatchClick = (match: GrepMatch) => {
    onFileSelect?.(match.path, match.line_number ?? undefined);
  };

  // Group results by file
  const groupedResults = results?.matches.reduce((acc, match) => {
    if (!acc[match.path]) {
      acc[match.path] = [];
    }
    acc[match.path].push(match);
    return acc;
  }, {} as Record<string, GrepMatch[]>);

  return (
    <div className="content-search">
      <div className="content-search-header">
        <div className="content-search-title">
          <Search size={16} />
          <span>Search in Files</span>
        </div>
      </div>

      <div className="content-search-input-container">
        <div className="content-search-input-wrapper">
          <Search size={14} className="content-search-icon" />
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pattern..."
            className="content-search-input"
          />
          {pattern && (
            <button
              className="content-search-clear"
              onClick={() => {
                setPattern('');
                setResults(null);
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          className="btn btn-primary btn-small"
          onClick={handleSearch}
          disabled={isLoading || !pattern.trim()}
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      <div className="content-search-options">
        <button
          className="content-search-options-toggle"
          onClick={() => setShowOptions(!showOptions)}
        >
          {showOptions ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>Options</span>
        </button>
        {showOptions && (
          <div className="content-search-options-list">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={ignoreCase}
                onChange={(e) => setIgnoreCase(e.target.checked)}
              />
              <span>Ignore case</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={wordRegexp}
                onChange={(e) => setWordRegexp(e.target.checked)}
              />
              <span>Whole word</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={useRegex}
                onChange={(e) => setUseRegex(e.target.checked)}
              />
              <span>Use regex</span>
            </label>
          </div>
        )}
      </div>

      {error && (
        <div className="content-search-error">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      <div className="content-search-results">
        {results && (
          <div className="content-search-summary">
            {results.total_matches} {results.total_matches === 1 ? 'result' : 'results'} in{' '}
            {Object.keys(groupedResults || {}).length} files
          </div>
        )}

        {groupedResults && Object.entries(groupedResults).map(([path, matches]) => (
          <div key={path} className="content-search-file">
            <div
              className="content-search-file-header"
              onClick={() => toggleFile(path)}
            >
              {expandedFiles.has(path) ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
              <FileText size={14} />
              <span className="content-search-file-path">{path}</span>
              <span className="content-search-file-count">{matches.length}</span>
            </div>
            {expandedFiles.has(path) && (
              <div className="content-search-matches">
                {matches.map((match, index) => (
                  <div
                    key={index}
                    className="content-search-match"
                    onClick={() => handleMatchClick(match)}
                  >
                    {match.line_number && (
                      <span className="content-search-line-number">
                        {match.line_number}
                      </span>
                    )}
                    <span className="content-search-content">
                      {match.content}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {results && results.total_matches === 0 && (
          <div className="content-search-no-results">
            No results found for "{pattern}"
          </div>
        )}
      </div>
    </div>
  );
}
