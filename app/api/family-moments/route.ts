import { NextResponse } from 'next/server';
import { listFamilyMomentPhotos } from '@/lib/gallery/server';
import { cloudinaryUrl } from '@/lib/gallery/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const photos = await listFamilyMomentPhotos();
    const moments = photos.map((photo) => ({
      id: photo.id,
      src: cloudinaryUrl(photo.imageUrl, 1600),
      alt: photo.title,
      caption: photo.caption || photo.title,
      createdAt: photo.takenAt || photo.createdAt,
      width: photo.width,
      height: photo.height,
    }));
    return NextResponse.json(
      { status: 'ready', moments },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { status: 'unavailable', moments: [] },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
