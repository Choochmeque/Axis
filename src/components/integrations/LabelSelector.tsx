import { Check, Tag, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ui';
import { getLabelColors } from '@/lib/utils';
import { useIntegrationStore } from '@/store/integrationStore';
import type { IntegrationLabel } from '@/types';

interface LabelSelectorProps {
  selectedLabels: IntegrationLabel[];
  onSelectionChange: (labels: IntegrationLabel[]) => void;
  disabled?: boolean;
}

export function LabelSelector({
  selectedLabels,
  onSelectionChange,
  disabled = false,
}: LabelSelectorProps) {
  const { t } = useTranslation();
  const { availableLabels, isLoadingLabels, loadLabels } = useIntegrationStore();

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Load labels on mount
  useEffect(() => {
    loadLabels();
  }, [loadLabels]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Determine dropdown direction and focus search when opened
  useEffect(() => {
    if (!isOpen) return;

    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 240; // approximate max height (max-h-48 + search input)
      setOpenUpward(spaceBelow < dropdownHeight);
    }

    requestAnimationFrame(() => searchRef.current?.focus());
  }, [isOpen]);

  const filteredLabels = useMemo(() => {
    if (!search.trim()) return availableLabels;
    const query = search.toLowerCase();
    return availableLabels.filter(
      (label) =>
        label.name.toLowerCase().includes(query) ||
        (label.description && label.description.toLowerCase().includes(query))
    );
  }, [availableLabels, search]);

  const isSelected = useCallback(
    (label: IntegrationLabel) => selectedLabels.some((l) => l.name === label.name),
    [selectedLabels]
  );

  const toggleLabel = useCallback(
    (label: IntegrationLabel) => {
      if (isSelected(label)) {
        onSelectionChange(selectedLabels.filter((l) => l.name !== label.name));
      } else {
        onSelectionChange([...selectedLabels, label]);
      }
    },
    [selectedLabels, onSelectionChange, isSelected]
  );

  const removeLabel = useCallback(
    (label: IntegrationLabel) => {
      onSelectionChange(selectedLabels.filter((l) => l.name !== label.name));
    },
    [selectedLabels, onSelectionChange]
  );

  return (
    <div className="field" ref={containerRef}>
      <label className="label">{t('integrations.pullRequests.create.labelsLabel')}</label>

      {/* Selected labels badges */}
      {selectedLabels.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          {selectedLabels.map((label) => (
            <span
              key={label.name}
              className="label-selector-badge"
              style={getLabelColors(label.color)}
            >
              {label.name}
              {!disabled && (
                <button
                  type="button"
                  className="ml-0.5 hover:opacity-70"
                  onClick={() => removeLabel(label)}
                >
                  <X size={10} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Trigger button */}
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          className="label-selector-trigger"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <Tag size={12} />
          <span>{t('integrations.pullRequests.create.labelsNoneSelected')}</span>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            className={`label-selector-dropdown ${openUpward ? 'label-selector-dropdown-up' : ''}`}
          >
            <Input
              ref={searchRef}
              className="label-selector-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('integrations.pullRequests.create.labelsPlaceholder')}
            />
            <div className="label-selector-list">
              {isLoadingLabels ? (
                <div className="px-3 py-2 text-xs text-(--text-muted)">
                  {t('integrations.pullRequests.create.labelsLoading')}
                </div>
              ) : filteredLabels.length === 0 ? (
                <div className="px-3 py-2 text-xs text-(--text-muted)">
                  {t('integrations.pullRequests.create.labelsEmpty')}
                </div>
              ) : (
                filteredLabels.map((label) => (
                  <button
                    key={label.name}
                    type="button"
                    className="label-selector-item w-full text-left"
                    onClick={() => toggleLabel(label)}
                  >
                    <span
                      className="label-selector-dot"
                      style={{ backgroundColor: `#${label.color}` }}
                    />
                    <span className="flex-1 text-(--text-primary) truncate">{label.name}</span>
                    {isSelected(label) && (
                      <Check size={14} className="text-(--accent-color) shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
