import { NextResponse } from 'next/server';
import { buildAIContext } from '@/lib/ai/context';
import { buildGeneralContext } from '@/lib/ai/context/build-general-context';
import { createAIAgentToolRegistry } from '@/lib/ai/agent/tool-registry';
import { loadFamilyMembers } from '@/lib/ai/context/load-family-members';
import { getAIProvider, hasGeminiProvider } from '@/lib/ai/providers';
import { MockProvider, structuredGenealogyAnswer } from '@/lib/ai/providers/mock-provider';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { AIProviderError, type AIChatResponse } from '@/lib/ai/types';
import { parseAIChatRequest } from '@/lib/ai/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const windowMs = 60_000;
const maxRequestsPerWindow = 12;
const responseDeadlineMs = 28_000;
const requestWindows = new Map<string, { count: number; resetAt: number }>();

function clientAddress(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  );
}

function withinRateLimit(request: Request) {
  const address = clientAddress(request);
  const now = Date.now();
  const existing = requestWindows.get(address);
  if (!existing || existing.resetAt <= now) {
    requestWindows.set(address, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= maxRequestsPerWindow) return false;
  existing.count += 1;
  return true;
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

function asksForAppGuidance(message: string) {
  return /cách dùng|hướng dẫn|làm sao (?:xem|dùng|mở)|mở (?:cây )?gia phả|dùng (?:cây )?gia phả/i.test(
    message,
  );
}

function logGenealogyResolution(
  context: Awaited<ReturnType<typeof buildAIContext>>,
) {
  if (process.env.NODE_ENV !== 'development' || !context.genealogy) return;
  const relationship = context.genealogy.relationship;
  console.info('[GenealogyAI]', {
    intent: relationship ? 'GET_RELATIONSHIP' : 'LOOKUP_GENEALOGY',
    people: context.genealogy.people.map((person) => person.person.id),
    ambiguities: context.genealogy.ambiguities?.map((item) =>
      item.candidates.map((person) => person.id),
    ),
    relationship: relationship?.relationshipCode,
    status: relationship?.status,
    path: relationship?.path.map(
      (step) => `${step.fromId}:${step.relation}:${step.toId}`,
    ),
  });
}

function contextUsed(
  parsed: ReturnType<typeof parseAIChatRequest> & {},
  context: Awaited<ReturnType<typeof buildAIContext>>,
) {
  const resolvedPersonIds = [
    ...new Set([
      ...(context.genealogy?.people.map((person) => person.person.id) || []),
      ...(context.genealogy?.referencePeople?.map(
        (person) => person.person.id,
      ) || []),
    ]),
  ].slice(0, 3);
  return {
    ...(parsed.context.personId ? { personId: parsed.context.personId } : {}),
    ...(resolvedPersonIds.length ? { resolvedPersonIds } : {}),
    ...(parsed.context.selectedDate
      ? { selectedDate: parsed.context.selectedDate }
      : {}),
    ...(parsed.context.activity ? { activity: parsed.context.activity } : {}),
  };
}

function logAgentRun({
  conversationId,
  context,
  toolCalls,
  toolResults,
  startedAt,
  model,
}: {
  conversationId?: string;
  context: Awaited<ReturnType<typeof buildAIContext>>;
  toolCalls: string[];
  toolResults: string[];
  startedAt: number;
  model: string;
}) {
  if (process.env.NODE_ENV !== 'development') return;
  const relationship = context.genealogy?.relationship;
  console.info('[GenealogyAIAgent]', {
    conversationId: conversationId || 'anonymous',
    intent: context.genealogy
      ? 'GENEALOGY'
      : context.calendar
        ? 'CALENDAR'
        : 'GENERAL',
    resolvedPeople:
      context.genealogy?.people.map((person) => person.person.id) || [],
    toolCalls,
    toolResults,
    relationship: relationship?.relationshipCode,
    path: relationship?.path.map(
      (step) => `${step.fromId}:${step.relation}:${step.toId}`,
    ),
    latencyMs: Date.now() - startedAt,
    model,
  });
}

export async function POST(request: Request) {
  if (!withinRateLimit(request)) {
    return jsonError(
      'Trợ lý AI đang nhận nhiều yêu cầu. Vui lòng thử lại sau ít phút.',
      429,
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError('Yêu cầu không hợp lệ.', 400);
  }

  const parsed = parseAIChatRequest(payload);
  if (!parsed)
    return jsonError('Nội dung hỏi hoặc ngữ cảnh không hợp lệ.', 400);

  if (asksForAppGuidance(parsed.message)) {
    const context = {
      mode: parsed.mode,
      source: parsed.context.source || 'global',
      appFeatures: buildGeneralContext().appFeatures,
      warnings: [],
    };
    const result = await new MockProvider().generate({
      message: parsed.message,
      history: parsed.history,
      context,
      systemInstruction: buildSystemPrompt(context),
      deadlineAt: Date.now() + responseDeadlineMs,
    });
    return NextResponse.json(
      {
        answer: result.answer,
        provider: result.provider,
        contextUsed: contextUsed(parsed, context),
      } satisfies AIChatResponse,
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const startedAt = Date.now();
    const deadlineAt = startedAt + responseDeadlineMs;
    const context = await buildAIContext(parsed);
    logGenealogyResolution(context);
    const localRequest = {
      message: parsed.message,
      history: parsed.history,
      context,
      systemInstruction: buildSystemPrompt(context),
      deadlineAt,
    };
    const localAnswer = structuredGenealogyAnswer(localRequest);

    // Relationship Engine answers are quicker and more dependable than a
    // remote model when the requested fact is already confirmed locally.
    if (localAnswer) {
      return NextResponse.json(
        {
          answer: localAnswer,
          provider: 'mock',
          contextUsed: contextUsed(parsed, context),
          ...(context.warnings.length ? { warnings: context.warnings } : {}),
        } satisfies AIChatResponse,
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    // A factual request gets Gemini's tool-calling loop first. The prompt only
    // contains a minimal resolved context; the registry supplies every further
    // fact on demand from the configured family collection.
    if (hasGeminiProvider() && (context.genealogy || context.calendar)) {
      const registry = createAIAgentToolRegistry(await loadFamilyMembers());
      try {
        const result = await getAIProvider('gemini').generate({
          message: parsed.message,
          history: parsed.history,
          context,
          systemInstruction: buildSystemPrompt(context),
          deadlineAt,
          agentTools: registry,
        });
        const trace = registry.getTrace();
        logAgentRun({
          conversationId: parsed.conversationId,
          context,
          toolCalls: trace.calls,
          toolResults: trace.summaries,
          startedAt,
          model:
            process.env.GEMINI_MODEL?.trim() ||
            process.env.AI_MODEL?.trim() ||
            'gemini',
        });
        return NextResponse.json(
          {
            answer: result.answer,
            provider: result.provider,
            contextUsed: contextUsed(parsed, context),
            ...(context.warnings.length ? { warnings: context.warnings } : {}),
          } satisfies AIChatResponse,
          { headers: { 'Cache-Control': 'no-store' } },
        );
      } catch (agentError) {
        const trace = registry.getTrace();
        logAgentRun({
          conversationId: parsed.conversationId,
          context,
          toolCalls: trace.calls,
          toolResults: [
            ...trace.summaries,
            `fallback:${agentError instanceof AIProviderError ? agentError.code : 'unavailable'}`,
          ],
          startedAt,
          model:
            process.env.GEMINI_MODEL?.trim() ||
            process.env.AI_MODEL?.trim() ||
            'gemini',
        });
      }
    }

    const result = await getAIProvider().generate({
      message: parsed.message,
      history: parsed.history,
      context,
      systemInstruction: buildSystemPrompt(context),
      deadlineAt,
    });
    const response: AIChatResponse = {
      answer: result.answer,
      provider: result.provider,
      contextUsed: contextUsed(parsed, context),
      ...(context.warnings.length ? { warnings: context.warnings } : {}),
    };
    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[ai] Falling back to the local assistant response', {
      reason: error instanceof AIProviderError ? error.code : 'unexpected',
    });
    const context = {
      mode: parsed.mode,
      source: parsed.context.source || 'global',
      appFeatures: buildGeneralContext().appFeatures,
      warnings: [],
    };
    const result = await new MockProvider().generate({
      message: parsed.message,
      history: parsed.history,
      context,
      systemInstruction: buildSystemPrompt(context),
    });
    return NextResponse.json(
      {
        answer: result.answer,
        provider: result.provider,
        contextUsed: contextUsed(parsed, context),
        warnings: ['Dịch vụ AI đang chậm; câu trả lời này dùng dữ liệu dự phòng của hệ thống.'],
      } satisfies AIChatResponse,
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
