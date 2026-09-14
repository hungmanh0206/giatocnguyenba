import { NextResponse } from 'next/server';
import {
  createAstrologyProfile,
  generateAstrologyFollowUp,
  generateAstrologyInterpretation,
  parseAstrologyFocus,
  parseAstrologyInput,
  parseAstrologyInterpretation,
  parseFollowUpQuestion,
  type AstrologyInterpretation,
} from '@/lib/astrology';
import type { AIHistoryMessage } from '@/lib/ai/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function readHistory(value: unknown): AIHistoryMessage[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-6).flatMap((item) => {
    if (typeof item !== 'object' || item === null) return [];
    const message = item as Record<string, unknown>;
    if ((message.role !== 'user' && message.role !== 'assistant') || typeof message.content !== 'string') return [];
    const content = message.content.trim().slice(0, 800);
    return content ? [{ role: message.role, content }] : [];
  });
}

function readInterpretation(value: unknown): AstrologyInterpretation | null {
  if (typeof value !== 'object' || value === null) return null;
  return parseAstrologyInterpretation(JSON.stringify(value));
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const input = parseAstrologyInput(payload.input);
    if (!input) return NextResponse.json({ message: 'Thông tin tử vi chưa hợp lệ.' }, { status: 400 });

    const result = createAstrologyProfile(input);
    if ('error' in result) return NextResponse.json({ message: result.error }, { status: 400 });

    const question = parseFollowUpQuestion(payload.question);
    if (payload.question !== undefined && !question) {
      return NextResponse.json({ message: 'Câu hỏi cần dài từ 1 đến 800 ký tự.' }, { status: 400 });
    }
    if (question) {
      const answer = await generateAstrologyFollowUp({
        profile: result.profile,
        interpretation: readInterpretation(payload.interpretation),
        question,
        history: readHistory(payload.history),
      });
      return NextResponse.json({ profile: result.profile, ...answer }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const reading = await generateAstrologyInterpretation(result.profile, parseAstrologyFocus(payload.focus));
    return NextResponse.json({ profile: result.profile, ...reading }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ message: 'Luận giải AI tạm thời chưa phản hồi. Dữ liệu lịch vẫn có thể được xem.' }, { status: 503 });
  }
}
