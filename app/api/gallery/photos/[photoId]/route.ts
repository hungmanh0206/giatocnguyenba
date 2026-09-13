import { NextResponse } from 'next/server';
import {
  deleteGalleryPhoto,
  isExpectedGalleryError,
  requireSuperAdmin,
  updateGalleryPhoto,
} from '@/lib/gallery/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ photoId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    await requireSuperAdmin(request);
    const { photoId } = await params;
    const input = (await request.json()) as Record<string, unknown>;
    const photo = await updateGalleryPhoto(photoId, input);
    return NextResponse.json({ photo });
  } catch (error) {
    const message = isExpectedGalleryError(error)
      ? error.message
      : 'Không thể cập nhật ảnh.';
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    await requireSuperAdmin(request);
    const { photoId } = await params;
    await deleteGalleryPhoto(photoId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = isExpectedGalleryError(error)
      ? error.message
      : 'Không thể xóa ảnh.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
