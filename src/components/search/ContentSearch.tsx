import { useState, useCallback } from 'react';
import * as Checkbox from '@radix-ui/react-checkbox';
import { Search, FileText, AlertCircle, X, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { grepApi } from '../../services/api';
import type { GrepMatch, GrepResult } from '../../types';

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
  const groupedResults = results?.matches.reduce(
    (acc, match) => {
      if (!acc[match.path]) {
        acc[match.path] = [];
      }
      acc[match.path].push(match);
      return acc;
    },
    {} as Record<string, GrepMatch[]>
  );

  return (
    <div className="flex flex-col h-full bg-(--bg-secondary)">
      <div className="flex items-center py-2 px-3 border-b border-(--border-color)">
        <div className="flex items-center gap-2 font-medium text-(--text-primary)">
          <Search size={16} />
          <span>Search in Files</span>
        </div>
      </div>

      <div className="flex gap-2 py-2 px-3 border-b border-(--border-color)">
        <div className="flex-1 relative flex items-center">
          <Search size={14} className="absolute left-2 text-(--text-muted)" />
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pattern..."
            className="w-full py-1.5 px-7 border border-(--border-color) rounded bg-(--bg-primary) text-(--text-primary) text-[13px] outline-none focus:border-(--accent-color)"
          />
          {pattern && (
            <button
              className="absolute right-1 p-0.5 bg-transparent border-none text-(--text-muted) cursor-pointer hover:text-(--text-primary)"
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
          className="py-1 px-3 text-xs font-medium bg-(--accent-color) text-white border-none rounded cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSearch}
          disabled={isLoading || !pattern.trim()}
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      <div className="py-1 px-3 border-b border-(--border-color)">
        <button
          className="flex items-center gap-1 p-1 bg-transparent border-none text-(--text-secondary) text-xs cursor-pointer hover:text-(--text-primary)"
          onClick={() => setShowOptions(!showOptions)}
        >
          {showOptions ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>Options</span>
        </button>
        {showOptions && (
          <div className="flex gap-4 py-2 px-1">
            <div className="flex items-center gap-1.5">
              <Checkbox.Root
                id="ignore-case"
                className="checkbox"
                checked={ignoreCase}
                onCheckedChange={(checked) => setIgnoreCase(checked === true)}
              >
                <Checkbox.Indicator>
                  <Check size={10} className="text-white" />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <label
                htmlFor="ignore-case"
                className="text-xs text-(--text-secondary) cursor-pointer hover:text-(--text-primary)"
              >
                Ignore case
              </label>
            </div>
            <div className="flex items-center gap-1.5">
              <Checkbox.Root
                id="whole-word"
                className="checkbox"
                checked={wordRegexp}
                onCheckedChange={(checked) => setWordRegexp(checked === true)}
              >
                <Checkbox.Indicator>
                  <Check size={10} className="text-white" />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <label
                htmlFor="whole-word"
                className="text-xs text-(--text-secondary) cursor-pointer hover:text-(--text-primary)"
              >
                Whole word
              </label>
            </div>
            <div className="flex items-center gap-1.5">
              <Checkbox.Root
                id="use-regex"
                className="checkbox"
                checked={useRegex}
                onCheckedChange={(checked) => setUseRegex(checked === true)}
              >
                <Checkbox.Indicator>
                  <Check size={10} className="text-white" />
                </Checkbox.Indicator>
              </Checkbox.Root>
              <label
                htmlFor="use-regex"
                className="text-xs text-(--text-secondary) cursor-pointer hover:text-(--text-primary)"
              >
                Use regex
              </label>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 py-2 px-3 m-2 bg-error/10 text-error rounded text-[13px]">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {results && (
          <div className="py-2 px-3 text-xs text-(--text-secondary) border-b border-(--border-color)">
            {results.total_matches} {results.total_matches === 1 ? 'result' : 'results'} in{' '}
            {Object.keys(groupedResults || {}).length} files
          </div>
        )}

        {groupedResults &&
          Object.entries(groupedResults).map(([path, matches]) => (
            <div key={path} className="border-b border-(--border-color)">
              <div
                className="flex items-center gap-1.5 py-1.5 px-3 cursor-pointer bg-(--bg-tertiary) hover:bg-(--bg-hover)"
                onClick={() => toggleFile(path)}
              >
                {expandedFiles.has(path) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <FileText size={14} />
                <span className="flex-1 text-[13px] text-(--text-primary) font-mono">{path}</span>
                <span className="bg-(--bg-secondary) py-0.5 px-1.5 rounded-full text-[11px] text-(--text-secondary)">
                  {matches.length}
                </span>
              </div>
              {expandedFiles.has(path) && (
                <div className="bg-(--bg-primary)">
                  {matches.map((match, index) => (
                    <div
                      key={index}
                      className="flex items-start py-1 px-3 pl-8 cursor-pointer text-xs font-mono hover:bg-(--bg-hover)"
                      onClick={() => handleMatchClick(match)}
                    >
                      {match.line_number && (
                        <span className="w-10 shrink-0 text-(--text-muted) text-right pr-2">
                          {match.line_number}
                        </span>
                      )}
                      <span className="flex-1 text-(--text-primary) whitespace-pre overflow-hidden text-ellipsis">
                        {match.content}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

        {results && results.total_matches === 0 && (
          <div className="py-6 text-center text-(--text-muted)">
            No results found for "{pattern}"
          </div>
        )}
      </div>
    </div>
  );
}
