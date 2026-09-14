'use client';

import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type AssistantMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </>
  );
}

function SafeMessageText({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/).filter(Boolean);
  return (
    <>
      {blocks.map((block, index) => {
        const lines = block.split('\n').filter(Boolean);
        const isList = lines.every((line) => /^[-*•]\s+/.test(line.trim()));
        if (isList) {
          return (
            <ul key={`${block}-${index}`}>
              {lines.map((line, lineIndex) => (
                <li key={`${line}-${lineIndex}`}>
                  <InlineText text={line.replace(/^[-*•]\s+/, '')} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={`${block}-${index}`}>
            {lines.map((line, lineIndex) => (
              <span key={`${line}-${lineIndex}`}>
                <InlineText text={line} />
                {lineIndex < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}

export function AIMessage({ message }: { message: AssistantMessage }) {
  async function copyAnswer() {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(message.content);
  }

  return (
    <article className={cn('ai-message', `is-${message.role}`)}>
      <div className="ai-message-content">
        <SafeMessageText content={message.content} />
      </div>
      {message.role === 'assistant' ? (
        <Button
          aria-label="Sao chép trả lời"
          className="ai-copy-button"
          onClick={() => void copyAnswer()}
          size="icon-xs"
          title="Sao chép trả lời"
          type="button"
          variant="ghost"
        >
          <Copy size={14} />
        </Button>
      ) : null}
    </article>
  );
}
