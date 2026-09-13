import { NextResponse } from 'next/server';
import {
  isExpectedGalleryError,
  listGalleryPhotos,
} from '@/lib/gallery/server';
import { GALLERY_PAGE_SIZE } from '@/lib/gallery/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function numberInRange(value: string | null, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 3000
    ? number
    : fallback;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const limit = numberInRange(params.get('limit'), GALLERY_PAGE_SIZE);
  const search = params.get('q')?.trim() || null;
  const rawYear = params.get('year');
  const year = rawYear ? numberInRange(rawYear, 0) || null : null;

  try {
    const { photos, total } = await listGalleryPhotos({
      limit,
      page: numberInRange(params.get('page'), 1),
      search,
      year,
    });
    return NextResponse.json(
      { status: 'ready', photos, total },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    const message = isExpectedGalleryError(error)
      ? error.message
      : 'Không thể tải kho ảnh.';
    return NextResponse.json(
      { status: 'unavailable', message, photos: [], total: 0 },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
