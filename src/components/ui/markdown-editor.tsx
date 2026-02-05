import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bold,
  Italic,
  Heading2,
  Quote,
  Code,
  Link,
  List,
  ListOrdered,
  ListChecks,
} from 'lucide-react';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import { Textarea } from '@/components/ui';
import { cn } from '@/lib/utils';
import { shellApi } from '@/services/api';

interface MarkdownEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

type ToolbarAction = {
  icon: React.ComponentType<{ size: number }>;
  label: string;
  action: (textarea: HTMLTextAreaElement) => {
    text: string;
    selectionStart: number;
    selectionEnd: number;
  };
};

function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  placeholder: string
): { text: string; selectionStart: number; selectionEnd: number } {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.substring(start, end);

  if (selected) {
    const newText = value.substring(0, start) + before + selected + after + value.substring(end);
    return {
      text: newText,
      selectionStart: start + before.length,
      selectionEnd: end + before.length,
    };
  }

  const newText = value.substring(0, start) + before + placeholder + after + value.substring(end);
  return {
    text: newText,
    selectionStart: start + before.length,
    selectionEnd: start + before.length + placeholder.length,
  };
}

function prefixLine(
  textarea: HTMLTextAreaElement,
  prefix: string
): { text: string; selectionStart: number; selectionEnd: number } {
  const start = textarea.selectionStart;
  const value = textarea.value;

  // Find the start of the current line
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const newText = value.substring(0, lineStart) + prefix + value.substring(lineStart);

  return {
    text: newText,
    selectionStart: start + prefix.length,
    selectionEnd: start + prefix.length,
  };
}

export function MarkdownEditor({
  id,
  value,
  onChange,
  placeholder,
  rows = 6,
  disabled = false,
}: MarkdownEditorProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toolbarActions: ToolbarAction[] = [
    {
      icon: Heading2,
      label: t('common.heading'),
      action: (ta) => prefixLine(ta, '## '),
    },
    {
      icon: Bold,
      label: t('common.bold'),
      action: (ta) => wrapSelection(ta, '**', '**', 'bold text'),
    },
    {
      icon: Italic,
      label: t('common.italic'),
      action: (ta) => wrapSelection(ta, '_', '_', 'italic text'),
    },
    {
      icon: Quote,
      label: t('common.quote'),
      action: (ta) => prefixLine(ta, '> '),
    },
    {
      icon: Code,
      label: t('common.code'),
      action: (ta) => wrapSelection(ta, '`', '`', 'code'),
    },
    {
      icon: Link,
      label: t('common.link'),
      action: (ta) => wrapSelection(ta, '[', '](url)', 'link text'),
    },
    {
      icon: List,
      label: t('common.bulletList'),
      action: (ta) => prefixLine(ta, '- '),
    },
    {
      icon: ListOrdered,
      label: t('common.numberedList'),
      action: (ta) => prefixLine(ta, '1. '),
    },
    {
      icon: ListChecks,
      label: t('common.taskList'),
      action: (ta) => prefixLine(ta, '- [ ] '),
    },
  ];

  const handleToolbarAction = useCallback(
    (action: ToolbarAction) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const result = action.action(textarea);
      onChange(result.text);

      // Restore focus and selection after React re-render
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
      });
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      const textarea = textareaRef.current;
      if (!textarea) return;

      let result: { text: string; selectionStart: number; selectionEnd: number } | null = null;

      if (e.key === 'b') {
        e.preventDefault();
        result = wrapSelection(textarea, '**', '**', 'bold text');
      } else if (e.key === 'i') {
        e.preventDefault();
        result = wrapSelection(textarea, '_', '_', 'italic text');
      } else if (e.key === 'k') {
        e.preventDefault();
        result = wrapSelection(textarea, '[', '](url)', 'link text');
      }

      if (result) {
        onChange(result.text);
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.setSelectionRange(result!.selectionStart, result!.selectionEnd);
        });
      }
    },
    [onChange]
  );

  return (
    <div className={cn('markdown-editor', disabled && 'opacity-50 pointer-events-none')}>
      {/* Tab bar */}
      <div className="markdown-editor-tabs">
        <button
          type="button"
          className={cn(
            'markdown-editor-tab',
            activeTab === 'write' && 'markdown-editor-tab-active'
          )}
          onClick={() => setActiveTab('write')}
        >
          {t('common.write')}
        </button>
        <button
          type="button"
          className={cn(
            'markdown-editor-tab',
            activeTab === 'preview' && 'markdown-editor-tab-active'
          )}
          onClick={() => setActiveTab('preview')}
        >
          {t('common.preview')}
        </button>
      </div>

      {/* Toolbar (write mode only) */}
      {activeTab === 'write' && (
        <div className="markdown-editor-toolbar">
          {toolbarActions.map((action) => (
            <button
              key={action.label}
              type="button"
              className="markdown-editor-toolbar-btn"
              title={action.label}
              onClick={() => handleToolbarAction(action)}
              disabled={disabled}
            >
              <action.icon size={14} />
            </button>
          ))}
        </div>
      )}

      {/* Content area */}
      {activeTab === 'write' ? (
        <Textarea
          ref={textareaRef}
          resizable={false}
          id={id}
          className="markdown-editor-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
        />
      ) : (
        <div
          className="markdown-editor-preview"
          style={{ minHeight: `${rows * 1.5}rem`, maxHeight: `${rows * 1.5}rem` }}
        >
          {value.trim() ? (
            <div className="prose prose-sm dark:prose-invert max-w-none text-(--text-primary)">
              <Markdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      onClick={(e) => {
                        e.preventDefault();
                        if (href) shellApi.openUrl(href);
                      }}
                      className="text-(--accent-color) hover:underline cursor-pointer"
                    >
                      {children}
                    </a>
                  ),
                  code: ({ className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const inline = !match;
                    return !inline ? (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                          margin: 0,
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                        }}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {value}
              </Markdown>
            </div>
          ) : (
            <p className="text-sm text-(--text-muted) italic">{t('common.previewEmpty')}</p>
          )}
        </div>
      )}
    </div>
  );
}
