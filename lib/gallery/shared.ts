export const GALLERY_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const GALLERY_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const GALLERY_PAGE_SIZE = 10;

export type GalleryPhoto = {
  id: string;
  title: string;
  caption: string | null;
  cloudinaryPublicId: string;
  imageUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  albumId: string;
  albumName: string;
  year: number | null;
  takenAt: string | null;
  featured: boolean;
  uploadedByName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export function normalizedText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function searchTerms(...values: Array<string | null | undefined>) {
  return [...new Set(
    values
      .flatMap((value) => normalizedText(value || '').split(' '))
      .filter((value) => value.length >= 2),
  )].slice(0, 40);
}

export function cloudinaryUrl(imageUrl: string, width: number) {
  return imageUrl.replace(
    '/image/upload/',
    `/image/upload/f_auto,q_auto,dpr_auto,w_${width},c_limit/`,
  );
}

export function isGalleryImageType(value: string) {
  return (GALLERY_ALLOWED_TYPES as readonly string[]).includes(value);
}
