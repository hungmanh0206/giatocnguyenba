import { NextResponse } from 'next/server';
import {
  buildFortuneFallback,
  isFortuneFocus,
  parseCalendarDate,
  type FortuneReading,
  type FortuneRequest,
} from '@/lib/lunar-calendar/fortune-advice';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

function readInput(input: Record<string, unknown>): FortuneRequest | null {
  const birthYear = Number(input.birthYear);
  const focus = input.focus;
  const date = typeof input.date === 'string' ? input.date : undefined;
  const birthDate =
    typeof input.birthDate === 'string' ? input.birthDate : undefined;

  if (
    !Number.isInteger(birthYear) ||
    birthYear < 1800 ||
    birthYear > new Date().getFullYear() ||
    !isFortuneFocus(focus) ||
    (date !== undefined && !parseCalendarDate(date)) ||
    (birthDate !== undefined && !parseCalendarDate(birthDate))
  ) {
    return null;
  }

  return { birthYear, birthDate, focus, date };
}

function outputText(payload: OpenAIResponse) {
  if (payload.output_text?.trim()) return payload.output_text.trim();
  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .filter((item) => item.type === 'output_text' && item.text)
    .map((item) => item.text?.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

function parseReading(value: string): FortuneReading | null {
  try {
    const parsed = JSON.parse(value) as Partial<FortuneReading>;
    if (
      typeof parsed.title !== 'string' ||
      typeof parsed.overview !== 'string' ||
      !Array.isArray(parsed.notes)
    ) {
      return null;
    }
    const notes = parsed.notes
      .filter(
        (note): note is { heading: string; text: string } =>
          typeof note?.heading === 'string' && typeof note?.text === 'string',
      )
      .slice(0, 3);
    return notes.length ? { title: parsed.title, overview: parsed.overview, notes } : null;
  } catch {
    return null;
  }
}

async function generateAiReading(input: FortuneRequest) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_FORTUNE_MODEL?.trim() || 'gpt-5-mini',
      store: false,
      max_output_tokens: 500,
      input: `Bạn là người viết lời luận giải tử vi truyền thống Việt Nam một cách điềm tĩnh và có trách nhiệm. Đây là nội dung tham khảo/giải trí, không khẳng định dự đoán là sự thật, không đưa lời khuyên đầu tư, y tế, pháp lý hoặc quyết định hệ trọng. Chỉ dùng dữ liệu được đưa, không suy đoán về danh tính.\n\nDữ liệu: năm sinh ${input.birthYear}; ngày sinh ${input.birthDate || 'không cung cấp'}; chủ đề ${input.focus}; ngày cần xem ${input.date || 'hôm nay'}.\n\nTrả về đúng JSON, không bọc markdown: {"title":"...","overview":"...","notes":[{"heading":"...","text":"..."},{"heading":"...","text":"..."},{"heading":"...","text":"..."}]}. Viết bằng tiếng Việt, mỗi phần ngắn gọn, thân thiện và không quyết định thay người dùng.`,
    }),
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as OpenAIResponse;
  const text = outputText(payload);
  return text ? parseReading(text) : null;
}

export async function POST(request: Request) {
  try {
    const input = readInput((await request.json()) as Record<string, unknown>);
    if (!input) {
      return NextResponse.json(
        { message: 'Thông tin ngày sinh hoặc chủ đề chưa hợp lệ.' },
        { status: 400 },
      );
    }

    const aiReading = await generateAiReading(input);
    const reading = aiReading ?? buildFortuneFallback(input);
    return NextResponse.json(
      { reading, source: aiReading ? 'ai' : 'traditional' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { message: 'Chưa thể tạo luận giải. Vui lòng thử lại.' },
      { status: 500 },
    );
  }
}
