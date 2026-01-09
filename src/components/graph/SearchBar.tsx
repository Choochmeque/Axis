import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { searchApi } from '../../services/api';
import type { Commit, SearchResult } from '../../types';
import './SearchBar.css';

interface SearchBarProps {
  onResultSelect?: (commit: Commit) => void;
  onClose?: () => void;
}

export function SearchBar({ onResultSelect, onClose }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setResults(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const result = await searchApi.commits({
          query: query.trim(),
          search_message: true,
          search_author: true,
          search_hash: true,
          limit: 20,
        });
        setResults(result);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search failed:', error);
        setResults(null);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!results?.commits.length) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) =>
            i < results.commits.length - 1 ? i + 1 : i
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => (i > 0 ? i - 1 : i));
          break;
        case 'Enter':
          e.preventDefault();
          const selected = results.commits[selectedIndex];
          if (selected && onResultSelect) {
            onResultSelect(selected);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose?.();
          break;
      }
    },
    [results, selectedIndex, onResultSelect, onClose]
  );

  const handleClear = () => {
    setQuery('');
    setResults(null);
    inputRef.current?.focus();
  };

  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <Search size={16} className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Search commits by message, author, or hash..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button className="search-clear" onClick={handleClear}>
            <X size={14} />
          </button>
        )}
      </div>

      {(results || isLoading) && (
        <div className="search-results">
          {isLoading ? (
            <div className="search-loading">Searching...</div>
          ) : results?.commits.length === 0 ? (
            <div className="search-no-results">No commits found</div>
          ) : (
            <>
              <div className="search-results-header">
                {results?.total_matches} commit
                {results?.total_matches !== 1 ? 's' : ''} found
              </div>
              <ul className="search-results-list">
                {results?.commits.map((commit, index) => (
                  <li
                    key={commit.oid}
                    className={`search-result-item ${
                      index === selectedIndex ? 'is-selected' : ''
                    }`}
                    onClick={() => onResultSelect?.(commit)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <span className="search-result-oid">{commit.short_oid}</span>
                    <span className="search-result-message">
                      {commit.summary}
                    </span>
                    <span className="search-result-author">
                      {commit.author.name}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
