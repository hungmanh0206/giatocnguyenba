import { NextResponse } from 'next/server';
import { createAstrologyProfile, parseAstrologyInput } from '@/lib/astrology';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    const input = parseAstrologyInput(payload?.input);
    if (!input) {
      return NextResponse.json({ message: 'Họ tên, ngày sinh, giới tính hoặc giờ sinh chưa hợp lệ.' }, { status: 400 });
    }
    const result = createAstrologyProfile(input);
    if ('error' in result) return NextResponse.json({ message: result.error }, { status: 400 });
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ message: 'Không thể xử lý thông tin tử vi.' }, { status: 400 });
  }
}
