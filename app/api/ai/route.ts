import { NextResponse } from 'next/server';
import { buildAIContext } from '@/lib/ai/context';
import { getAIProvider } from '@/lib/ai/providers';
import { structuredGenealogyAnswer } from '@/lib/ai/providers/mock-provider';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { AIProviderError, type AIChatResponse } from '@/lib/ai/types';
import { parseAIChatRequest } from '@/lib/ai/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const windowMs = 60_000;
const maxRequestsPerWindow = 12;
const requestWindows = new Map<string, { count: number; resetAt: number }>();

function clientAddress(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
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
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!withinRateLimit(request)) {
    return jsonError('Trợ lý AI đang nhận nhiều yêu cầu. Vui lòng thử lại sau ít phút.', 429);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError('Yêu cầu không hợp lệ.', 400);
  }

  const parsed = parseAIChatRequest(payload);
  if (!parsed) return jsonError('Nội dung hỏi hoặc ngữ cảnh không hợp lệ.', 400);

  try {
    const context = await buildAIContext(parsed);
    const localAnswer = structuredGenealogyAnswer({
      message: parsed.message,
      history: parsed.history,
      context,
      systemInstruction: buildSystemPrompt(context),
    });
    if (localAnswer) {
      return NextResponse.json({
        answer: localAnswer,
        provider: 'mock',
        contextUsed: {
          ...(parsed.context.personId ? { personId: parsed.context.personId } : {}),
          ...(parsed.context.selectedDate ? { selectedDate: parsed.context.selectedDate } : {}),
          ...(parsed.context.activity ? { activity: parsed.context.activity } : {}),
        },
        ...(context.warnings.length ? { warnings: context.warnings } : {}),
      } satisfies AIChatResponse, { headers: { 'Cache-Control': 'no-store' } });
    }
    const result = await getAIProvider().generate({
      message: parsed.message,
      history: parsed.history,
      context,
      systemInstruction: buildSystemPrompt(context),
    });
    const response: AIChatResponse = {
      answer: result.answer,
      provider: result.provider,
      contextUsed: {
        ...(parsed.context.personId ? { personId: parsed.context.personId } : {}),
        ...(parsed.context.selectedDate ? { selectedDate: parsed.context.selectedDate } : {}),
        ...(parsed.context.activity ? { activity: parsed.context.activity } : {}),
      },
      ...(context.warnings.length ? { warnings: context.warnings } : {}),
    };
    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AIProviderError) {
      if (error.code === 'quota') {
        return jsonError(
          'Trợ lý AI đã đạt giới hạn sử dụng tạm thời. Các tính năng Gia phả và Lịch vẫn hoạt động bình thường.',
          429,
        );
      }
      if (error.code === 'configuration') {
        return jsonError('Trợ lý AI hiện chưa được cấu hình. Vui lòng thử lại sau.', 503);
      }
    }
    return jsonError('Trợ lý AI tạm thời chưa phản hồi. Vui lòng thử lại sau.', 503);
  }
}
