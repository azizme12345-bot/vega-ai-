import React from 'react';
import { CodeBlock } from './CodeBlock';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  // Split by code blocks first
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.slice(lastIndex, match.index);
    if (textBefore) {
      elements.push(renderTextWithFormatting(textBefore, `text-${lastIndex}`));
    }

    const language = match[1] || 'text';
    const code = match[2].trimEnd();
    elements.push(
      <CodeBlock key={`code-${match.index}`} language={language} code={code} />
    );

    lastIndex = match.index + match[0].length;
  }

  const remainingText = content.slice(lastIndex);
  if (remainingText) {
    elements.push(renderTextWithFormatting(remainingText, `text-${lastIndex}`));
  }

  return <div className="space-y-2 text-sm leading-relaxed break-words">{elements}</div>;
};

function renderTextWithFormatting(text: string, keyPrefix: string): React.ReactNode {
  const lines = text.split('\n');
  const renderedLines: React.ReactNode[] = [];

  let currentList: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = (idx: number) => {
    if (listType && currentList.length > 0) {
      if (listType === 'ul') {
        renderedLines.push(
          <ul key={`list-${idx}`} className="my-2 list-disc list-outside pl-5 space-y-1">
            {currentList}
          </ul>
        );
      } else {
        renderedLines.push(
          <ol key={`list-${idx}`} className="my-2 list-decimal list-outside pl-5 space-y-1">
            {currentList}
          </ol>
        );
      }
      currentList = [];
      listType = null;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      flushList(idx);
      return;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      flushList(idx);
      renderedLines.push(
        <h3 key={`h3-${idx}`} className="mt-3 mb-1 text-base font-semibold text-slate-900 dark:text-white">
          {formatInline(trimmed.slice(4))}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushList(idx);
      renderedLines.push(
        <h2 key={`h2-${idx}`} className="mt-4 mb-1.5 text-lg font-bold text-slate-900 dark:text-white">
          {formatInline(trimmed.slice(3))}
        </h2>
      );
      return;
    }
    if (trimmed.startsWith('# ')) {
      flushList(idx);
      renderedLines.push(
        <h1 key={`h1-${idx}`} className="mt-4 mb-2 text-xl font-bold text-slate-900 dark:text-white">
          {formatInline(trimmed.slice(2))}
        </h1>
      );
      return;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList(idx);
      renderedLines.push(
        <blockquote
          key={`quote-${idx}`}
          className="my-2 border-l-4 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 pl-3 py-1 text-slate-700 dark:text-slate-300 italic rounded-r-md"
        >
          {formatInline(trimmed.slice(2))}
        </blockquote>
      );
      return;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(trimmed)) {
      if (listType !== 'ul') flushList(idx);
      listType = 'ul';
      const itemContent = trimmed.replace(/^[-*+]\s+/, '');
      currentList.push(<li key={`li-${idx}`}>{formatInline(itemContent)}</li>);
      return;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      if (listType !== 'ol') flushList(idx);
      listType = 'ol';
      const itemContent = trimmed.replace(/^\d+\.\s+/, '');
      currentList.push(<li key={`li-${idx}`}>{formatInline(itemContent)}</li>);
      return;
    }

    // Regular line
    flushList(idx);
    renderedLines.push(
      <p key={`p-${idx}`} className="my-1 text-slate-800 dark:text-slate-200">
        {formatInline(trimmed)}
      </p>
    );
  });

  flushList(lines.length);

  return <React.Fragment key={keyPrefix}>{renderedLines}</React.Fragment>;
}

function formatInline(text: string): React.ReactNode[] {
  // Regex to split into inline code, bold, italic, links
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }

    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={`inline-code-${match.index}`}
          className="rounded bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-medium"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`bold-${match.index}`} className="font-semibold text-slate-900 dark:text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={`italic-${match.index}`} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('[') && token.includes('](')) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        parts.push(
          <a
            key={`link-${match.index}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:opacity-80 transition"
          >
            {linkMatch[1]}
          </a>
        );
      }
    }

    lastIdx = match.index + token.length;
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }

  return parts.length > 0 ? parts : [text];
}
