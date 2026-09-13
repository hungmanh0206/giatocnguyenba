import { NextResponse } from 'next/server';
import {
  createGalleryPhoto,
  isExpectedGalleryError,
  requireSuperAdmin,
} from '@/lib/gallery/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    await requireSuperAdmin(request);
    const input = (await request.json()) as Record<string, unknown>;
    const photo = await createGalleryPhoto(input);
    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    const message = isExpectedGalleryError(error)
      ? error.message
      : 'Không thể lưu thông tin ảnh.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
