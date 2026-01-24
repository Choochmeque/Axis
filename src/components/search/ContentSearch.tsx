import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, FileText, AlertCircle, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Checkbox } from '@/components/ui';
import { grepApi } from '@/services/api';
import { useSettingsStore } from '@/store/settingsStore';
import type { GrepMatch, GrepResult } from '@/types';

interface ContentSearchProps {
  onFileSelect?: (path: string, lineNumber?: number) => void;
}

export function ContentSearch({ onFileSelect }: ContentSearchProps) {
  const { t } = useTranslation();
  const [pattern, setPattern] = useState('');
  const [results, setResults] = useState<GrepResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const { settings } = useSettingsStore();

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
        ignoreCase: ignoreCase,
        wordRegexp: wordRegexp,
        extendedRegexp: useRegex,
        showLineNumbers: true,
        maxCount: 1000,
      });
      setResults(result);

      // Expand all files by default
      const files = new Set(result.matches.map((m) => m.path));
      setExpandedFiles(files);
    } catch (err) {
      console.error('Search failed:', err);
      setError(t('search.failed'));
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
    onFileSelect?.(match.path, match.lineNumber != null ? Number(match.lineNumber) : undefined);
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
          <span>{t('search.title')}</span>
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
            placeholder={t('search.placeholder')}
            className="w-full py-1.5 px-7 border border-(--border-color) rounded bg-(--bg-primary) text-(--text-primary) text-base outline-none focus:border-(--accent-color)"
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
          {isLoading ? t('search.searching') : t('search.searchButton')}
        </button>
      </div>

      <div className="py-1 px-3 border-b border-(--border-color)">
        <button
          className="flex items-center gap-1 p-1 bg-transparent border-none text-(--text-secondary) text-xs cursor-pointer hover:text-(--text-primary)"
          onClick={() => setShowOptions(!showOptions)}
        >
          {showOptions ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>{t('search.options')}</span>
        </button>
        {showOptions && (
          <div className="flex gap-4 py-2 px-1">
            <div className="flex items-center gap-1.5">
              <Checkbox
                id="ignore-case"
                checked={ignoreCase}
                onCheckedChange={(checked) => setIgnoreCase(checked === true)}
              />
              <label
                htmlFor="ignore-case"
                className="text-xs text-(--text-secondary) cursor-pointer hover:text-(--text-primary)"
              >
                {t('search.ignoreCase')}
              </label>
            </div>
            <div className="flex items-center gap-1.5">
              <Checkbox
                id="whole-word"
                checked={wordRegexp}
                onCheckedChange={(checked) => setWordRegexp(checked === true)}
              />
              <label
                htmlFor="whole-word"
                className="text-xs text-(--text-secondary) cursor-pointer hover:text-(--text-primary)"
              >
                {t('search.wholeWord')}
              </label>
            </div>
            <div className="flex items-center gap-1.5">
              <Checkbox
                id="use-regex"
                checked={useRegex}
                onCheckedChange={(checked) => setUseRegex(checked === true)}
              />
              <label
                htmlFor="use-regex"
                className="text-xs text-(--text-secondary) cursor-pointer hover:text-(--text-primary)"
              >
                {t('search.useRegex')}
              </label>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 py-2 px-3 m-2 bg-error/10 text-error rounded text-base">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {results && (
          <div className="py-2 px-3 text-xs text-(--text-secondary) border-b border-(--border-color)">
            {t('search.results', {
              count: results.totalMatches,
              files: Object.keys(groupedResults || {}).length,
            })}
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
                <span className="flex-1 text-base text-(--text-primary) font-mono">{path}</span>
                <span className="bg-(--bg-secondary) py-0.5 px-1.5 rounded-full text-sm text-(--text-secondary)">
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
                      {settings?.showLineNumbers !== false && match.lineNumber && (
                        <span className="w-10 shrink-0 text-(--text-muted) text-right pr-2">
                          {match.lineNumber}
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

        {results && results.totalMatches === 0 && (
          <div className="py-6 text-center text-(--text-muted)">
            {t('search.noResults', { pattern })}
          </div>
        )}
      </div>
    </div>
  );
}
