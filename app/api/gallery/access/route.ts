import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/gallery/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    await requireSuperAdmin(request);
    return NextResponse.json(
      { isSuperAdmin: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { isSuperAdmin: false },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
