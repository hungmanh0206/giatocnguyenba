'use client';

import { useState, type KeyboardEvent } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function AIComposer({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (message: string) => void;
}) {
  const [draft, setDraft] = useState('');

  function submit() {
    const message = draft.trim();
    if (!message || disabled) return;
    setDraft('');
    onSend(message);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="ai-composer">
      <Textarea
        aria-label="Nội dung hỏi Trợ lý"
        className="ai-composer-input"
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        rows={2}
        value={draft}
      />
      <Button
        aria-label="Gửi câu hỏi"
        className="ai-send-button"
        disabled={disabled || !draft.trim()}
        onClick={submit}
        size="icon"
        title="Gửi câu hỏi"
        type="button"
      >
        <Image
          alt=""
          aria-hidden="true"
          className="ai-send-icon"
          height={26}
          src="/app-icons/ai-send-paper-plane.png"
          width={26}
        />
      </Button>
    </div>
  );
}
