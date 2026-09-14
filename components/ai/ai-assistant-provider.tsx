'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { type AIChatResponse, type AIClientContext, type AIMode } from '@/lib/ai/types';
import { AIComposer } from './ai-composer';
import { AIContextHeader } from './ai-context-header';
import { AIMessage, type AssistantMessage } from './ai-message';
import { AIQuickActions } from './ai-quick-actions';

const storageKey = 'nguyen-ba-ai-assistant-session';
const isEnabled = process.env.NEXT_PUBLIC_AI_ASSISTANT_ENABLED !== 'false';

type AssistantState = {
  mode: AIMode;
  context: AIClientContext;
  contextLabel?: string;
  signature: string;
};

type OpenAIAssistantOptions = {
  mode?: AIMode;
  context?: AIClientContext;
  contextLabel?: string;
};

type AIAssistantContextValue = {
  enabled: boolean;
  openAIAssistant: (options?: OpenAIAssistantOptions) => void;
};

const AIAssistantContext = createContext<AIAssistantContextValue | null>(null);

function createState(options: OpenAIAssistantOptions = {}): AssistantState {
  const mode = options.mode || 'general';
  const context = { source: 'global' as const, ...options.context };
  return {
    mode,
    context,
    contextLabel: options.contextLabel,
    signature: JSON.stringify({ mode, context }),
  };
}

function messageId(role: AssistantMessage['role']) {
  return `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function AIAssistantDrawer({
  active,
  messages,
  onMessagesChange,
  onOpenChange,
  onClearContext,
  open,
}: {
  active: AssistantState;
  messages: AssistantMessage[];
  onMessagesChange: (messages: AssistantMessage[]) => void;
  onOpenChange: (open: boolean) => void;
  onClearContext: () => void;
  open: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [lastPrompt, setLastPrompt] = useState('');

  const send = useCallback(
    async (rawMessage: string) => {
      const message = rawMessage.trim();
      if (!message || pending) return;
      const userMessage: AssistantMessage = { id: messageId('user'), role: 'user', content: message };
      const history = messages.slice(-8).map(({ role, content }) => ({ role, content }));
      const nextMessages = [...messages, userMessage].slice(-16);
      onMessagesChange(nextMessages);
      setPending(true);
      setError('');
      setLastPrompt(message);
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 20_000);

      try {
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            message,
            mode: active.mode,
            context: active.context,
            history,
          }),
        });
        const payload = (await response.json()) as AIChatResponse & { error?: string };
        if (!response.ok || !payload.answer) throw new Error(payload.error || 'Không thể nhận phản hồi.');
        onMessagesChange([
          ...nextMessages,
          { id: messageId('assistant'), role: 'assistant' as const, content: payload.answer },
        ].slice(-16));
      } catch (requestError) {
        setError(
          requestError instanceof DOMException && requestError.name === 'AbortError'
            ? 'Trợ lý AI tạm thời chưa phản hồi. Vui lòng thử lại sau.'
            : requestError instanceof Error
              ? requestError.message
              : 'Không thể nhận phản hồi.',
        );
      } finally {
        window.clearTimeout(timeout);
        setPending(false);
      }
    },
    [active, messages, onMessagesChange, pending],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="ai-assistant-sheet" showCloseButton={false}>
        <SheetClose
          aria-label="Đóng Trợ lý"
          className="ai-sheet-close"
          render={<Button size="icon-sm" variant="ghost" />}
        >
          <span aria-hidden="true">×</span>
        </SheetClose>
        <SheetHeader className="ai-sheet-header">
          <SheetTitle>Trợ lý AI</SheetTitle>
          <SheetDescription>Tra cứu trong phạm vi dữ liệu hiện có.</SheetDescription>
        </SheetHeader>
        <AIContextHeader
          context={active.context}
          contextLabel={active.contextLabel}
          mode={active.mode}
          onClearContext={active.context.source !== 'global' ? onClearContext : undefined}
        />
        <div className="ai-assistant-scroll">
          {messages.length ? (
            <div className="ai-messages" aria-live="polite">
              {messages.map((message) => <AIMessage key={message.id} message={message} />)}
            </div>
          ) : (
            <div className="ai-empty-state">
              <Sparkles size={27} aria-hidden="true" />
              <strong>Xin chào, mình có thể giúp gì?</strong>
              <p>Hỏi về thành viên, quan hệ gia phả, lịch âm hoặc ngày giỗ.</p>
              <AIQuickActions mode={active.mode} onChoose={(prompt) => void send(prompt)} />
            </div>
          )}
          {pending ? <p className="ai-pending" role="status">Đang tìm dữ liệu và soạn trả lời...</p> : null}
          {error ? (
            <div className="ai-error" role="alert">
              <span>{error}</span>
              <Button onClick={() => void send(lastPrompt)} size="sm" type="button" variant="outline">
                <RefreshCw size={14} /> Thử lại
              </Button>
            </div>
          ) : null}
        </div>
        <AIComposer disabled={pending} onSend={(message) => void send(message)} />
      </SheetContent>
    </Sheet>
  );
}

export function AIAssistantProvider({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<AssistantState>(() => createState());
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const signatureRef = useRef(active.signature);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(storageKey);
    if (!stored) return;
    try {
      const value = JSON.parse(stored) as { signature?: string; messages?: AssistantMessage[] };
      if (value.signature === signatureRef.current && Array.isArray(value.messages)) {
        setMessages(value.messages.slice(-16));
      }
    } catch {
      window.sessionStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(storageKey, JSON.stringify({ signature: active.signature, messages }));
  }, [active.signature, messages]);

  const openAIAssistant = useCallback((options: OpenAIAssistantOptions = {}) => {
    if (!isEnabled) return;
    const next = createState(options);
    if (signatureRef.current !== next.signature) {
      signatureRef.current = next.signature;
      setMessages([]);
    }
    setActive(next);
    setOpen(true);
  }, []);

  const clearContext = useCallback(() => {
    const next = createState();
    signatureRef.current = next.signature;
    setActive(next);
    setMessages([]);
  }, []);

  const value = useMemo(
    () => ({ enabled: isEnabled, openAIAssistant }),
    [openAIAssistant],
  );

  if (!isEnabled) return <>{children}</>;

  return (
    <AIAssistantContext.Provider value={value}>
      {children}
      <AIAssistantDrawer
        active={active}
        messages={messages}
        onMessagesChange={setMessages}
        onOpenChange={setOpen}
        onClearContext={clearContext}
        open={open}
      />
    </AIAssistantContext.Provider>
  );
}

export function useAIAssistant() {
  const context = useContext(AIAssistantContext);
  if (!context) {
    return { enabled: false, openAIAssistant: () => undefined };
  }
  return context;
}
