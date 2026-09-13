import { createHash, randomUUID } from 'node:crypto';
import { getFirebaseAdminServices } from '@/lib/firebase/admin';
import {
  GALLERY_MAX_FILE_BYTES,
  type GalleryPhoto,
  normalizedText,
} from './shared';

const familyId = process.env.FIREBASE_FAMILY_ID?.trim() || 'nguyen-ba';
const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const cloudApiKey = process.env.CLOUDINARY_API_KEY?.trim();
const cloudApiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

// This is the sole source folder for every image displayed by the website.
const galleryFolder = 'Gia tộc nguyễn bá';

type AuthenticatedAdmin = {
  uid: string;
  email: string | null;
  name: string | null;
};

type CloudinaryAsset = {
  asset_folder?: string;
  bytes?: number;
  context?: { custom?: Record<string, string> };
  created_at?: string;
  format?: string;
  height?: number;
  original_filename?: string;
  public_id?: string;
  resource_type?: string;
  secure_url?: string;
  updated_at?: string;
  width?: number;
};

type CloudinaryResourcesResponse = {
  next_cursor?: string;
  resources?: CloudinaryAsset[];
  total_count?: number;
};

type GalleryDetails = {
  caption: string | null;
  takenAt: string | null;
  title: string | null;
  year: number | null;
};

type GalleryMetadata = {
  caption: string | null;
  takenAt: string | null;
  title: string;
  updatedAt: string;
  year: number | null;
};

function configError(message: string) {
  const error = new Error(message);
  error.name = 'ConfigurationError';
  return error;
}

function requestError(message: string) {
  const error = new Error(message);
  error.name = 'RequestError';
  return error;
}

export function galleryConfigurationError() {
  if (!cloudName || !cloudApiKey || !cloudApiSecret) {
    return 'Cloudinary chua duoc cau hinh cho Kho anh.';
  }
  return null;
}

function string(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function integer(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isInteger(value) ? value : fallback;
}

function nullableString(value: unknown) {
  const text = string(value).trim();
  return text || null;
}

function nullableYear(value: unknown) {
  const year = integer(value);
  return year >= 1000 && year <= 3000 ? year : null;
}

function nullableDate(value: unknown) {
  const date = nullableString(value);
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function cloudinaryCredentials() {
  const error = galleryConfigurationError();
  if (error) throw configError(error);
  return {
    apiKey: cloudApiKey!,
    apiSecret: cloudApiSecret!,
    cloudName: cloudName!,
  };
}

function cloudinaryHeaders() {
  const { apiKey, apiSecret } = cloudinaryCredentials();
  return {
    Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
  };
}

function encodedPublicId(publicId: string) {
  return publicId.split('/').map(encodeURIComponent).join('/');
}

function cloudinarySignature(parameters: Record<string, string>) {
  const { apiSecret } = cloudinaryCredentials();
  const payload = Object.entries(parameters)
    .filter(([, value]) => value !== '')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
}

function assetIsInGallery(asset: CloudinaryAsset) {
  const publicId = string(asset.public_id).trim();
  return asset.asset_folder?.trim() === galleryFolder ||
    publicId.startsWith(`${galleryFolder}/`);
}

function contextValue(asset: CloudinaryAsset, key: string) {
  return nullableString(asset.context?.custom?.[key]);
}

function titleFromAsset(asset: CloudinaryAsset) {
  const contextTitle = contextValue(asset, 'gallery_title');
  if (contextTitle) return contextTitle;
  const filename = nullableString(asset.original_filename);
  if (filename) return filename.replace(/[-_]+/g, ' ');
  const publicId = nullableString(asset.public_id) || 'Khoanh khac dong ho';
  return publicId.split('/').pop()?.replace(/[-_]+/g, ' ') || 'Khoanh khac dong ho';
}

function opaquePhotoId(publicId: string) {
  return Buffer.from(publicId, 'utf8').toString('base64url');
}

function publicIdFromPhotoId(photoId: string) {
  try {
    const publicId = Buffer.from(photoId, 'base64url').toString('utf8');
    if (!publicId || publicId.includes('\0')) throw new Error('invalid');
    return publicId;
  } catch {
    throw requestError('Ảnh không hợp lệ.');
  }
}

function photoFromAsset(asset: CloudinaryAsset): GalleryPhoto | null {
  const publicId = nullableString(asset.public_id);
  const imageUrl = nullableString(asset.secure_url);
  const width = integer(asset.width);
  const height = integer(asset.height);
  if (!assetIsInGallery(asset) || !publicId || !imageUrl || !width || !height) return null;

  const yearFromContext = Number(contextValue(asset, 'gallery_year'));
  const createdAt = nullableString(asset.created_at);
  const inferredYear = createdAt ? new Date(createdAt).getUTCFullYear() : 0;
  const year = nullableYear(yearFromContext) || nullableYear(inferredYear) || null;

  return {
    id: opaquePhotoId(publicId),
    title: titleFromAsset(asset),
    caption: contextValue(asset, 'gallery_caption'),
    cloudinaryPublicId: publicId,
    imageUrl,
    width,
    height,
    format: nullableString(asset.format) || 'jpg',
    bytes: integer(asset.bytes),
    albumId: 'giatocnguyenba',
    albumName: 'Kho ảnh dòng họ',
    year,
    takenAt: nullableDate(contextValue(asset, 'gallery_taken_at')),
    uploadedByName: contextValue(asset, 'gallery_uploaded_by'),
    createdAt,
    updatedAt: nullableString(asset.updated_at) || createdAt,
  };
}

function escapeContextValue(value: string) {
  return value.replace(/([\\=|])/g, '\\$1');
}

function contextForPhoto(details: GalleryDetails, uploadedByName: string | null) {
  const fields: Record<string, string> = {
    gallery_title: details.title || '',
    gallery_caption: details.caption || '',
    gallery_year: details.year ? String(details.year) : '',
    gallery_taken_at: details.takenAt || '',
    gallery_uploaded_by: uploadedByName || '',
  };
  return Object.entries(fields)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${escapeContextValue(value)}`)
    .join('|');
}

function galleryMetadataRef(photoId: string) {
  return getFirebaseAdminServices()
    .db.collection('families')
    .doc(familyId)
    .collection('galleryMetadata')
    .doc(photoId);
}

function galleryMetadataFromData(data: Record<string, unknown>): GalleryMetadata | null {
  const title = nullableString(data.title);
  if (!title) return null;

  return {
    title,
    caption: nullableString(data.caption),
    year: nullableYear(data.year),
    takenAt: nullableDate(data.takenAt),
    updatedAt: nullableString(data.updatedAt) || '',
  };
}

function applyGalleryMetadata(photo: GalleryPhoto, metadata: GalleryMetadata | undefined): GalleryPhoto {
  if (!metadata) return photo;
  return {
    ...photo,
    title: metadata.title,
    caption: metadata.caption,
    year: metadata.year,
    takenAt: metadata.takenAt,
    updatedAt: metadata.updatedAt || photo.updatedAt,
  };
}

async function galleryMetadataByPhotoId() {
  try {
    const snapshot = await getFirebaseAdminServices()
      .db.collection('families')
      .doc(familyId)
      .collection('galleryMetadata')
      .get();
    return new Map(
      snapshot.docs.flatMap((document) => {
        const metadata = galleryMetadataFromData(document.data());
        return metadata ? [[document.id, metadata] as const] : [];
      }),
    );
  } catch {
    // Existing Cloudinary context remains a read fallback while server metadata is unavailable.
    return new Map<string, GalleryMetadata>();
  }
}

async function saveGalleryMetadata(photo: GalleryPhoto) {
  const metadata: GalleryMetadata = {
    title: photo.title,
    caption: photo.caption,
    year: photo.year,
    takenAt: photo.takenAt,
    updatedAt: photo.updatedAt || new Date().toISOString(),
  };
  await galleryMetadataRef(photo.id).set(metadata, { merge: true });
}

function photoInput(input: Record<string, unknown>): GalleryDetails {
  const title = nullableString(input.title);
  const caption = nullableString(input.caption);
  const year = nullableYear(input.year);
  const takenAt = nullableDate(input.takenAt);
  if (title && title.length > 150) throw requestError('Tiêu đề ảnh quá dài.');
  if (caption && caption.length > 1200) throw requestError('Mô tả ảnh quá dài.');
  if (input.takenAt && !takenAt) throw requestError('Ngày chụp không hợp lệ.');
  return { caption, takenAt, title, year };
}

async function listCloudinaryAssets({
  cursor,
  limit,
}: {
  cursor?: string | null;
  limit: number;
}) {
  const { cloudName: configuredCloudName } = cloudinaryCredentials();
  const body = {
    expression: `asset_folder="${galleryFolder.replace(/[\\"]/g, '\\$&')}"`,
    max_results: Math.min(Math.max(limit, 1), 500),
    next_cursor: cursor || undefined,
    with_field: ['context'],
  };
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(configuredCloudName)}/resources/search`,
    {
      method: 'POST',
      headers: { ...cloudinaryHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    throw configError('Không thể đọc thư mục ảnh trên Cloudinary.');
  }
  return await response.json() as CloudinaryResourcesResponse;
}

async function listAllCloudinaryAssets() {
  const resources: CloudinaryAsset[] = [];
  let cursor: string | null = null;

  do {
    const response = await listCloudinaryAssets({ cursor, limit: 500 });
    resources.push(...(response.resources || []));
    cursor = response.next_cursor || null;
  } while (cursor && resources.length < 3000);

  return resources;
}

async function cloudinaryAsset(publicId: string) {
  const { cloudName: configuredCloudName } = cloudinaryCredentials();
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(configuredCloudName)}/resources/image/upload/${encodedPublicId(publicId)}`,
    { headers: cloudinaryHeaders(), cache: 'no-store' },
  );
  if (!response.ok) throw requestError('Không tìm thấy ảnh trên Cloudinary.');
  const asset = await response.json() as CloudinaryAsset;
  if (!assetIsInGallery(asset)) {
    throw requestError('Ảnh này không thuộc thư mục kho ảnh dòng họ.');
  }
  return asset;
}

async function updateCloudinaryContext(publicId: string, context: string) {
  const { apiKey, cloudName: configuredCloudName } = cloudinaryCredentials();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const parameters = {
    context,
    invalidate: 'true',
    public_id: publicId,
    timestamp,
    type: 'upload',
  };
  const body = new URLSearchParams({
    ...parameters,
    api_key: apiKey,
    signature: cloudinarySignature(parameters),
  });
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(configuredCloudName)}/image/explicit`,
    { method: 'POST', body, cache: 'no-store' },
  );
  if (!response.ok) throw requestError('Không thể cập nhật thông tin ảnh trên Cloudinary.');
}

async function destroyCloudinaryAsset(publicId: string) {
  const { apiKey, cloudName: configuredCloudName } = cloudinaryCredentials();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const parameters = { public_id: publicId, timestamp };
  const body = new URLSearchParams({
    ...parameters,
    api_key: apiKey,
    signature: cloudinarySignature(parameters),
  });
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(configuredCloudName)}/image/destroy`,
    { method: 'POST', body, cache: 'no-store' },
  );
  if (!response.ok) throw requestError('Không thể xóa ảnh trên Cloudinary.');
  const result = await response.json() as { result?: string };
  if (result.result !== 'ok' && result.result !== 'not found') {
    throw requestError('Không thể xóa ảnh trên Cloudinary.');
  }
}

function bearerToken(request: Request) {
  const value = request.headers.get('authorization') || '';
  return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}

export async function requireSuperAdmin(request: Request): Promise<AuthenticatedAdmin> {
  const token = bearerToken(request);
  if (!token) throw requestError('Hãy đăng nhập tài khoản super admin.');

  const { auth, db } = getFirebaseAdminServices();
  let decoded: Awaited<ReturnType<typeof auth.verifyIdToken>>;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch {
    throw requestError('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
  }

  const family = await db.collection('families').doc(familyId).get();
  const membership = await family.ref.collection('memberships').doc(decoded.uid).get();
  if (
    !family.exists ||
    !membership.exists ||
    family.data()?.superAdminUid !== decoded.uid ||
    membership.data()?.role !== 'super_admin'
  ) {
    throw requestError('Tài khoản này không có quyền quản lý kho ảnh.');
  }

  return { uid: decoded.uid, email: decoded.email || null, name: decoded.name || null };
}

export async function listGalleryPhotos({
  limit,
  page,
  search,
  year,
}: {
  limit: number;
  page: number;
  search?: string | null;
  year?: number | null;
}) {
  const [assets, metadataByPhotoId] = await Promise.all([
    listAllCloudinaryAssets(),
    galleryMetadataByPhotoId(),
  ]);
  const normalizedSearch = normalizedText(search || '');
  const allPhotos = assets
    .map(photoFromAsset)
    .filter((photo): photo is GalleryPhoto => photo !== null)
    .map((photo) => applyGalleryMetadata(photo, metadataByPhotoId.get(photo.id)))
    .filter((photo) => !year || photo.year === year)
    .filter((photo) =>
      !normalizedSearch ||
      normalizedText(`${photo.title} ${photo.caption || ''}`).includes(normalizedSearch),
    );
  const start = Math.max(0, page - 1) * limit;
  return {
    photos: allPhotos.slice(start, start + limit),
    total: allPhotos.length,
  };
}

export async function listFamilyMomentPhotos() {
  const [assets, metadataByPhotoId] = await Promise.all([
    listAllCloudinaryAssets(),
    galleryMetadataByPhotoId(),
  ]);
  return assets
    .map(photoFromAsset)
    .filter((photo): photo is GalleryPhoto => photo !== null)
    .map((photo) => applyGalleryMetadata(photo, metadataByPhotoId.get(photo.id)))
    .sort((left, right) => (right.createdAt || '').localeCompare(left.createdAt || ''))
    .slice(0, 18);
}

export function uploadSignature(input: Record<string, unknown>, admin: AuthenticatedAdmin) {
  const { apiKey, cloudName: configuredCloudName } = cloudinaryCredentials();
  const details = photoInput(input);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const publicId = `photo-${randomUUID()}`;
  const context = contextForPhoto(details, admin.name || admin.email);
  const parameters = {
    context,
    folder: galleryFolder,
    public_id: publicId,
    timestamp,
  };
  return {
    apiKey,
    cloudName: configuredCloudName,
    context,
    folder: galleryFolder,
    publicId,
    signature: cloudinarySignature(parameters),
    timestamp: Number(timestamp),
  };
}

export async function createGalleryPhoto(input: Record<string, unknown>) {
  const publicId = nullableString(input.publicId);
  if (!publicId) throw requestError('Thiếu thông tin ảnh vừa tải lên.');
  const asset = await cloudinaryAsset(publicId);
  const photo = photoFromAsset(asset);
  if (!photo || asset.resource_type !== 'image' || photo.bytes > GALLERY_MAX_FILE_BYTES) {
    throw requestError('Ảnh tải lên không đúng định dạng hỗ trợ hoặc quá dung lượng.');
  }
  await saveGalleryMetadata(photo);
  return photo;
}

export async function updateGalleryPhoto(photoId: string, input: Record<string, unknown>) {
  const publicId = publicIdFromPhotoId(photoId);
  const asset = await cloudinaryAsset(publicId);
  const current = photoFromAsset(asset);
  if (!current) throw requestError('Dữ liệu ảnh không hợp lệ.');

  const details = photoInput({
    title: input.title ?? current.title,
    caption: input.caption ?? current.caption,
    year: input.year ?? current.year,
    takenAt: input.takenAt ?? current.takenAt,
  });
  const context = contextForPhoto(details, current.uploadedByName);
  await updateCloudinaryContext(publicId, context);

  const updated: GalleryPhoto = {
    ...current,
    ...details,
    title: details.title || current.title,
    updatedAt: new Date().toISOString(),
  };
  await saveGalleryMetadata(updated);
  return updated;
}

export async function deleteGalleryPhoto(photoId: string) {
  const publicId = publicIdFromPhotoId(photoId);
  await cloudinaryAsset(publicId);
  await destroyCloudinaryAsset(publicId);
  await galleryMetadataRef(photoId).delete();
}

export function isExpectedGalleryError(error: unknown): error is Error {
  return error instanceof Error &&
    (error.name === 'RequestError' || error.name === 'ConfigurationError');
}
