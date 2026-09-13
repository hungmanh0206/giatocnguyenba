import { NextResponse } from 'next/server';
import {
  isExpectedGalleryError,
  requireSuperAdmin,
  uploadSignature,
} from '@/lib/gallery/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const admin = await requireSuperAdmin(request);
    const input = (await request.json()) as Record<string, unknown>;
    return NextResponse.json(uploadSignature(input, admin), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const message = isExpectedGalleryError(error)
      ? error.message
      : 'Không thể khởi tạo phiên tải ảnh.';
    return NextResponse.json({ message }, { status: 403 });
  }
}
