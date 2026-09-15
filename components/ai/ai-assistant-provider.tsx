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
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  type AIChatResponse,
  type AIClientContext,
  type AIMode,
} from '@/lib/ai/types';
import { AIComposer } from './ai-composer';
import { AIMessage, type AssistantMessage } from './ai-message';
import { AIQuickActions } from './ai-quick-actions';
import { AIButtonIcon } from './ai-button-icon';
import { HeritageIcon } from '@/components/genealogy/heritage-icon';

const storageKey = 'nguyen-ba-ai-assistant-session';
const isEnabled = process.env.NEXT_PUBLIC_AI_ASSISTANT_ENABLED !== 'false';
const requestTimeoutMs = 36_000;

type AssistantState = {
  conversationId: string;
  mode: AIMode;
  context: AIClientContext;
  contextLabel?: string;
  signature: string;
};

type StoredAssistantSession = {
  signature?: string;
  messages?: AssistantMessage[];
  conversationId?: string;
  referencePersonIds?: string[];
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
    conversationId: createConversationId(),
    mode,
    context,
    contextLabel: options.contextLabel,
    signature: JSON.stringify({ mode, context }),
  };
}

function createConversationId() {
  return `ai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function initialAssistantSession() {
  const active = createState();
  if (typeof window === 'undefined')
    return { active, messages: [] as AssistantMessage[] };
  try {
    const value = JSON.parse(
      window.sessionStorage.getItem(storageKey) || '{}',
    ) as StoredAssistantSession;
    if (
      value.signature !== active.signature ||
      !Array.isArray(value.messages)
    ) {
      return { active, messages: [] as AssistantMessage[] };
    }
    return {
      active: {
        ...active,
        ...(typeof value.conversationId === 'string' &&
        /^ai_[A-Za-z0-9_]{8,100}$/.test(value.conversationId)
          ? { conversationId: value.conversationId }
          : {}),
        context: {
          ...active.context,
          ...(Array.isArray(value.referencePersonIds)
            ? {
                referencePersonIds: value.referencePersonIds
                  .filter((id): id is string => typeof id === 'string')
                  .slice(0, 3),
              }
            : {}),
        },
      },
      messages: value.messages.slice(-16),
    };
  } catch {
    window.sessionStorage.removeItem(storageKey);
    return { active, messages: [] as AssistantMessage[] };
  }
}

function messageId(role: AssistantMessage['role']) {
  return `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function AIAssistantDrawer({
  active,
  messages,
  onMessagesChange,
  onDeleteConversation,
  onNewConversation,
  onResolvedPeople,
  onOpenChange,
  open,
}: {
  active: AssistantState;
  messages: AssistantMessage[];
  onMessagesChange: (messages: AssistantMessage[]) => void;
  onDeleteConversation: () => void;
  onNewConversation: () => void;
  onResolvedPeople: (personIds: string[]) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [lastPrompt, setLastPrompt] = useState('');

  function resetConversation(action: () => void) {
    if (pending) return;
    setError('');
    setLastPrompt('');
    action();
  }

  const send = useCallback(
    async (rawMessage: string) => {
      const message = rawMessage.trim();
      if (!message || pending) return;
      const userMessage: AssistantMessage = {
        id: messageId('user'),
        role: 'user',
        content: message,
      };
      const history = messages
        .slice(-8)
        .map(({ role, content }) => ({ role, content }));
      const nextMessages = [...messages, userMessage].slice(-16);
      onMessagesChange(nextMessages);
      setPending(true);
      setError('');
      setLastPrompt(message);
      const controller = new AbortController();
      const timeout = window.setTimeout(
        () => controller.abort(),
        requestTimeoutMs,
      );

      try {
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            conversationId: active.conversationId,
            message,
            mode: active.mode,
            context: active.context,
            history,
          }),
        });
        const payload = (await response.json()) as AIChatResponse & {
          error?: string;
        };
        if (!response.ok || !payload.answer)
          throw new Error(payload.error || 'Không thể nhận phản hồi.');
        if (payload.contextUsed.resolvedPersonIds?.length) {
          onResolvedPeople(payload.contextUsed.resolvedPersonIds);
        }
        onMessagesChange(
          [
            ...nextMessages,
            {
              id: messageId('assistant'),
              role: 'assistant' as const,
              content: payload.answer,
            },
          ].slice(-16),
        );
      } catch (requestError) {
        setError(
          requestError instanceof DOMException &&
            requestError.name === 'AbortError'
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
    [active, messages, onMessagesChange, onResolvedPeople, pending],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="ai-assistant-sheet" showCloseButton={false}>
        <SheetClose
          aria-label="Đóng Trợ lý"
          className="ai-sheet-close"
          render={<Button size="icon-sm" variant="ghost" />}
        >
          <HeritageIcon name="close" size={16} />
        </SheetClose>
        <SheetHeader className="ai-sheet-header">
          <div className="ai-sheet-heading-copy">
            <SheetTitle>Trợ lý AI</SheetTitle>
            <SheetDescription>
              Tra cứu trong phạm vi dữ liệu hiện có.
            </SheetDescription>
          </div>
          <div
            className="ai-conversation-actions"
            aria-label="Quản lý đoạn chat"
          >
            <Button
              className="ai-conversation-action"
              disabled={pending}
              onClick={() => resetConversation(onNewConversation)}
              title="Đoạn chat mới"
              type="button"
              variant="outline"
            >
              <Image
                alt=""
                aria-hidden="true"
                className="ai-new-chat-icon"
                height={22}
                src="/app-icons/ai-new-chat.png"
                width={22}
              />
              <span className="ai-conversation-action-label">Chat mới</span>
            </Button>
            <Button
              aria-label="Xóa đoạn chat"
              className="ai-conversation-action ai-conversation-delete"
              disabled={pending || messages.length === 0}
              onClick={() => resetConversation(onDeleteConversation)}
              title="Xóa đoạn chat"
              type="button"
              variant="outline"
            >
              <HeritageIcon name="delete" size={14} />
              <span className="ai-conversation-action-label">Xóa</span>
            </Button>
          </div>
        </SheetHeader>
        <div className="ai-assistant-scroll">
          {messages.length ? (
            <div className="ai-messages" aria-live="polite">
              {messages.map((message) => (
                <AIMessage key={message.id} message={message} />
              ))}
            </div>
          ) : (
            <div className="ai-empty-state">
              <AIButtonIcon size={40} />
              <strong>Xin chào, mình có thể giúp gì?</strong>
              <p>Hỏi về thành viên, quan hệ gia phả, lịch âm hoặc ngày giỗ.</p>
              <AIQuickActions
                mode={active.mode}
                onChoose={(prompt) => void send(prompt)}
              />
            </div>
          )}
          {pending ? (
            <output className="ai-pending">
              Đang tìm dữ liệu và soạn trả lời...
            </output>
          ) : null}
          {error ? (
            <div className="ai-error" role="alert">
              <span>{error}</span>
              <Button
                onClick={() => void send(lastPrompt)}
                size="sm"
                type="button"
                variant="outline"
              >
                <HeritageIcon name="reset" size={14} /> Thử lại
              </Button>
            </div>
          ) : null}
        </div>
        <AIComposer
          disabled={pending}
          onSend={(message) => void send(message)}
        />
      </SheetContent>
    </Sheet>
  );
}

function AIAssistantLauncher({ onOpen }: { onOpen: () => void }) {
  return (
    <Button
      aria-label="Mở Trợ lý AI"
      className="ai-assistant-fab"
      onClick={onOpen}
      title="Trợ lý AI"
      type="button"
    >
      <Image
        alt=""
        aria-hidden="true"
        className="ai-assistant-fab-icon"
        height={48}
        loading="eager"
        src="/app-icons/ai-new-chat.png"
        width={48}
      />
    </Button>
  );
}

export function AIAssistantProvider({ children }: PropsWithChildren) {
  const [initialSession] = useState(initialAssistantSession);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<AssistantState>(initialSession.active);
  const [messages, setMessages] = useState<AssistantMessage[]>(
    initialSession.messages,
  );
  const signatureRef = useRef(active.signature);

  useEffect(() => {
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        signature: active.signature,
        messages,
        conversationId: active.conversationId,
        referencePersonIds: active.context.referencePersonIds,
      }),
    );
  }, [
    active.context.referencePersonIds,
    active.conversationId,
    active.signature,
    messages,
  ]);

  const openAIAssistant = useCallback(
    (options: OpenAIAssistantOptions = {}) => {
      if (!isEnabled) return;
      const next = createState(options);
      if (signatureRef.current !== next.signature) {
        signatureRef.current = next.signature;
        setMessages([]);
      }
      setActive(next);
      setOpen(true);
    },
    [],
  );

  const startNewConversation = useCallback(() => {
    setMessages([]);
    setActive((current) => ({
      ...current,
      conversationId: createConversationId(),
      context: { ...current.context, referencePersonIds: undefined },
    }));
  }, []);

  const deleteConversation = useCallback(() => {
    setMessages([]);
    setActive((current) => ({
      ...current,
      conversationId: createConversationId(),
      context: { ...current.context, referencePersonIds: undefined },
    }));
  }, []);

  const rememberResolvedPeople = useCallback((personIds: string[]) => {
    setActive((current) => ({
      ...current,
      context: {
        ...current.context,
        referencePersonIds: personIds.slice(0, 3),
      },
    }));
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
        onDeleteConversation={deleteConversation}
        onNewConversation={startNewConversation}
        onResolvedPeople={rememberResolvedPeople}
        onOpenChange={setOpen}
        open={open}
      />
      <AIAssistantLauncher onOpen={() => openAIAssistant()} />
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
