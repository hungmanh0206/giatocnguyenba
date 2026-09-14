'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type AIClientContext, type AIMode } from '@/lib/ai/types';
import { useAIAssistant } from './ai-assistant-provider';

export function AIAssistantButton({
  className,
  context,
  contextLabel,
  label = 'Hỏi Trợ lý',
  mode,
  onOpened,
}: {
  className?: string;
  context?: AIClientContext;
  contextLabel?: string;
  label?: string;
  mode?: AIMode;
  onOpened?: () => void;
}) {
  const { enabled, openAIAssistant } = useAIAssistant();
  if (!enabled) return null;

  return (
    <Button
      className={cn('ai-assistant-entry', className)}
      onClick={() => {
        openAIAssistant({ mode, context, contextLabel });
        onOpened?.();
      }}
      type="button"
      variant="outline"
    >
      <Sparkles size={16} />
      {label}
    </Button>
  );
}
