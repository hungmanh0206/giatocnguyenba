'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  LoaderCircle,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getFirebaseServices } from '@/lib/firebase/client';
import {
  GALLERY_ALLOWED_TYPES,
  GALLERY_MAX_FILE_BYTES,
  cloudinaryUrl,
  isGalleryImageType,
  type GalleryPhoto,
} from '@/lib/gallery/shared';
import { useFamily } from './provider';

type GalleryResponse = {
  message?: string;
  photos: GalleryPhoto[];
  status: 'ready' | 'unavailable';
  total: number;
};

const galleryPageSizeOptions = [
  { value: '10', label: '10/trang' },
  { value: '20', label: '20/trang' },
  { value: '50', label: '50/trang' },
  { value: 'all', label: 'Tất cả' },
];
const galleryAllPageSize = 3000;

type UploadSignature = {
  apiKey: string;
  cloudName: string;
  context: string;
  folder: string;
  publicId: string;
  signature: string;
  timestamp: number;
};

type PhotoForm = {
  caption: string;
  takenAt: string;
  title: string;
  year: string;
};

const emptyPhotoForm: PhotoForm = {
  caption: '',
  takenAt: '',
  title: '',
  year: '',
};

function responseMessage(data: unknown, fallback: string) {
  return typeof data === 'object' && data && 'message' in data &&
    typeof data.message === 'string'
    ? data.message
    : fallback;
}

function readableBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readableDate(photo: GalleryPhoto) {
  if (photo.takenAt) {
    const [year, month, day] = photo.takenAt.split('-');
    return `${day}/${month}/${year}`;
  }
  return photo.year ? String(photo.year) : null;
}

function photoAlt(photo: GalleryPhoto) {
  return photo.caption || photo.title || 'Ảnh trong kho ảnh dòng họ';
}

function GalleryIcon({
  name,
  size = 20,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <Image
      alt=""
      aria-hidden
      className={className ? `gallery-symbol-icon ${className}` : 'gallery-symbol-icon'}
      height={size}
      src={`/heritage-icons-3d/${name}.png`}
      width={size}
    />
  );
}

export function GalleryPage() {
  const { connection } = useFamily();
  const isSuperAdmin = connection.role === 'super_admin';
  const [serverConfirmsSuperAdmin, setServerConfirmsSuperAdmin] = useState(false);
  const canManageGallery = isSuperAdmin || serverConfirmsSuperAdmin;
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('all');
  const [pageSize, setPageSize] = useState('10');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryIndex, setRetryIndex] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadForm, setUploadForm] = useState<PhotoForm>(emptyPhotoForm);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<'idle' | 'signing' | 'uploading' | 'saving'>('idle');
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<PhotoForm>(emptyPhotoForm);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GalleryPhoto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [useCompactGalleryDialog, setUseCompactGalleryDialog] = useState(false);
  const [useMobileGalleryViewer, setUseMobileGalleryViewer] = useState(false);

  const activePhoto = photos.find((photo) => photo.id === viewerId) || null;
  const visiblePageSize = pageSize === 'all' ? Math.max(total, 1) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(total / visiblePageSize));
  const currentPage = Math.min(page, totalPages);
  const years = useMemo(
    () =>
      [...new Set(photos.map((photo) => photo.year).filter((value): value is number => value !== null))]
        .sort((left, right) => right - left),
    [photos],
  );

  const loadGallery = useCallback(
    async () => {
      setLoading(true);
      setLoadError(null);
      const limit = pageSize === 'all' ? galleryAllPageSize : Number(pageSize);
      const params = new URLSearchParams({ limit: String(limit), page: String(page) });
      if (query.trim()) params.set('q', query.trim());
      if (year !== 'all') params.set('year', year);

      try {
        const response = await fetch(`/api/gallery?${params.toString()}`, { cache: 'no-store' });
        const data = (await response.json()) as GalleryResponse;
        if (!response.ok || data.status !== 'ready') {
          throw new Error(data.message || 'Không thể tải kho ảnh.');
        }
        setPhotos(data.photos);
        setTotal(data.total);
      } catch (error) {
        setPhotos([]);
        setTotal(0);
        setLoadError(error instanceof Error ? error.message : 'Không thể tải kho ảnh.');
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, query, year],
  );

  useEffect(() => {
    const timeout = window.setTimeout(
      () => void loadGallery(),
      query.trim() ? 260 : 0,
    );
    return () => window.clearTimeout(timeout);
  }, [loadGallery, query, retryIndex]);

  useEffect(() => {
    setPage(1);
  }, [query, year, pageSize]);

  useEffect(() => {
    const queries = [
      window.matchMedia('(max-width: 900px)'),
      window.matchMedia('(pointer: coarse)'),
      window.matchMedia('(hover: none) and (orientation: portrait)'),
    ];
    const mobileViewerQuery = window.matchMedia('(max-width: 799px)');
    const updateDialogLayout = () => {
      const shortestScreenSide = Math.min(window.screen.width, window.screen.height);
      const visualViewport = window.visualViewport;
      const isPortraitViewport =
        window.innerHeight > window.innerWidth ||
        Boolean(
          visualViewport && visualViewport.height > visualViewport.width,
        );
      setUseCompactGalleryDialog(
        queries.some((query) => query.matches) ||
          shortestScreenSide <= 900 ||
          isPortraitViewport,
      );
      setUseMobileGalleryViewer(mobileViewerQuery.matches);
    };

    updateDialogLayout();
    queries.forEach((query) => query.addEventListener('change', updateDialogLayout));
    mobileViewerQuery.addEventListener('change', updateDialogLayout);
    window.addEventListener('resize', updateDialogLayout);
    window.visualViewport?.addEventListener('resize', updateDialogLayout);
    return () => {
      queries.forEach((query) => query.removeEventListener('change', updateDialogLayout));
      mobileViewerQuery.removeEventListener('change', updateDialogLayout);
      window.removeEventListener('resize', updateDialogLayout);
      window.visualViewport?.removeEventListener('resize', updateDialogLayout);
    };
  }, []);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    let active = true;
    setServerConfirmsSuperAdmin(false);
    if (!connection.user) return () => {
      active = false;
    };

    async function confirmGalleryAccess() {
      try {
        const user = getFirebaseServices().auth.currentUser;
        if (!user) return;
        const response = await fetch('/api/gallery/access', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        });
        if (active) setServerConfirmsSuperAdmin(response.ok);
      } catch {
        if (active) setServerConfirmsSuperAdmin(false);
      }
    }

    void confirmGalleryAccess();
    return () => {
      active = false;
    };
  }, [connection.user]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (!activePhoto || editing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) return;
      if (event.key === 'Escape') setViewerId(null);
      const currentIndex = photos.findIndex((photo) => photo.id === viewerId);
      if (event.key === 'ArrowLeft' && currentIndex >= 0) {
        setViewerId(photos[(currentIndex - 1 + photos.length) % photos.length]?.id || null);
      }
      if (event.key === 'ArrowRight' && currentIndex >= 0) {
        setViewerId(photos[(currentIndex + 1) % photos.length]?.id || null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activePhoto, editing, photos, viewerId]);

  function setUploadValue<K extends keyof PhotoForm>(key: K, value: PhotoForm[K]) {
    setUploadForm((current) => ({ ...current, [key]: value }));
  }

  function setEditValue<K extends keyof PhotoForm>(key: K, value: PhotoForm[K]) {
    setEditForm((current) => ({ ...current, [key]: value }));
  }

  function resetUpload() {
    setUploadFile(null);
    setPreviewUrl(null);
    setUploadForm(emptyPhotoForm);
    setUploadError(null);
    setUploadState('idle');
  }

  function closeUpload(open: boolean) {
    if (!open && uploadState === 'idle') resetUpload();
    setUploadOpen(open);
  }

  function chooseFile(file: File | null) {
    setUploadError(null);
    if (!file) return;
    if (!isGalleryImageType(file.type)) {
      setUploadError('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.');
      return;
    }
    if (file.size > GALLERY_MAX_FILE_BYTES) {
      setUploadError('Ảnh vượt quá dung lượng tối đa 10 MB.');
      return;
    }
    setUploadFile(file);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    if (!uploadForm.title) {
      setUploadValue('title', file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
    }
  }

  async function adminFetch(path: string, init: RequestInit) {
    const user = getFirebaseServices().auth.currentUser;
    if (!user) throw new Error('Hãy đăng nhập tài khoản super admin.');
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
    const response = await fetch(path, { ...init, headers });
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : null;
    if (!response.ok) throw new Error(responseMessage(data, 'Không thể xử lý yêu cầu.'));
    return data;
  }

  async function uploadPhoto() {
    if (!uploadFile) {
      setUploadError('Hãy chọn một ảnh trước khi tải lên.');
      return;
    }
    setUploadError(null);
    try {
      setUploadState('signing');
      const signature = await adminFetch('/api/gallery/upload-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...uploadForm,
          year: uploadForm.year ? Number(uploadForm.year) : null,
        }),
      }) as UploadSignature;
      const body = new FormData();
      body.set('file', uploadFile);
      body.set('api_key', signature.apiKey);
      body.set('context', signature.context);
      body.set('folder', signature.folder);
      body.set('public_id', signature.publicId);
      body.set('signature', signature.signature);
      body.set('timestamp', String(signature.timestamp));

      setUploadState('uploading');
      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/image/upload`,
        { method: 'POST', body },
      );
      const uploadData = await uploadResponse.json() as { public_id?: string; error?: { message?: string } };
      if (!uploadResponse.ok || !uploadData.public_id) {
        throw new Error(uploadData.error?.message || 'Không thể tải ảnh lên Cloudinary.');
      }

      setUploadState('saving');
      const saved = await adminFetch('/api/gallery/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...uploadForm,
          publicId: uploadData.public_id,
          year: uploadForm.year ? Number(uploadForm.year) : null,
        }),
      }) as { photo: GalleryPhoto };
      setPhotos((current) => [saved.photo, ...current]);
      setUploadOpen(false);
      resetUpload();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Không thể tải ảnh lên.');
      setUploadState('idle');
    }
  }

  function openViewer(photo: GalleryPhoto) {
    setViewerId(photo.id);
    setEditing(false);
    setViewerError(null);
  }

  function moveViewer(direction: -1 | 1) {
    if (!viewerId || !photos.length) return;
    const index = photos.findIndex((photo) => photo.id === viewerId);
    setViewerId(photos[(index + direction + photos.length) % photos.length]?.id || null);
    setEditing(false);
    setViewerError(null);
  }

  function beginEdit(photo: GalleryPhoto) {
    setEditForm({
      caption: photo.caption || '',
      takenAt: photo.takenAt || '',
      title: photo.title,
      year: photo.year ? String(photo.year) : '',
    });
    setEditing(true);
    setViewerError(null);
  }

  async function updatePhoto(payload: Record<string, unknown>) {
    if (!activePhoto) return;
    setSavingEdit(true);
    setViewerError(null);
    try {
      const data = await adminFetch(`/api/gallery/photos/${activePhoto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }) as { photo: GalleryPhoto };
      setPhotos((current) => current.map((photo) => photo.id === data.photo.id ? data.photo : photo));
      setEditing(false);
    } catch (error) {
      setViewerError(error instanceof Error ? error.message : 'Không thể cập nhật ảnh.');
    } finally {
      setSavingEdit(false);
    }
  }

  async function deletePhoto() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminFetch(`/api/gallery/photos/${deleteTarget.id}`, { method: 'DELETE' });
      setPhotos((current) => current.filter((photo) => photo.id !== deleteTarget.id));
      setViewerId((current) => current === deleteTarget.id ? null : current);
      setDeleteTarget(null);
    } catch (error) {
      setViewerError(error instanceof Error ? error.message : 'Không thể xóa ảnh.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const filtersActive = Boolean(query.trim()) || year !== 'all';
  const uploadBusy = uploadState !== 'idle';

  return (
    <main id="main" className="gallery-page">
      <div className="container page-space gallery-shell">
        <header className="page-heading gallery-heading">
          <div>
            <div className="eyebrow">NHỮNG KHOẢNH KHẮC ĐƯỢC LƯU GIỮ</div>
            <h1>Kho ảnh dòng họ</h1>
            <p>Những hình ảnh, ký ức và câu chuyện được trao truyền qua các thế hệ Nguyễn Bá.</p>
            <small className="gallery-heading-mobile">Tư liệu hình ảnh của dòng họ</small>
          </div>
          {canManageGallery && <Button aria-label="Thêm ảnh" className="action-button gallery-upload-button" onClick={() => setUploadOpen(true)} title="Thêm ảnh"><Image alt="" aria-hidden className="gallery-upload-icon" height={28} src="/heritage-icons-3d/add-photo.png" width={31} /><span>Thêm ảnh</span></Button>}
        </header>

        <section className="gallery-toolbar" aria-label="Tìm và lọc kho ảnh">
          <label className="gallery-search">
            <GalleryIcon name="search" size={19} />
            <Input aria-label="Tìm kiếm ảnh" placeholder="Tìm trong kho ảnh..." value={query} onChange={(event) => setQuery(event.target.value)} />
            {query && <Button aria-label="Xóa tìm kiếm" className="gallery-search-clear" size="icon-xs" variant="ghost" onClick={() => setQuery('')}><GalleryIcon name="close" size={17} /></Button>}
          </label>
          <div className="gallery-filter-group">
            <Select value={year} onValueChange={(value) => value && setYear(value)} items={[{ value: 'all', label: 'Tất cả năm' }, ...years.map((value) => ({ value: String(value), label: String(value) }))]}>
              <SelectTrigger aria-label="Lọc theo năm" className="gallery-filter"><GalleryIcon name="calendar-day" size={18} /><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Tất cả năm</SelectItem>{years.map((value) => <SelectItem key={value} value={String(value)}>{value}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </section>

        {loadError ? (
          <section className="gallery-state gallery-error-state" aria-live="polite"><GalleryIcon className="gallery-state-icon" name="refresh" size={46} /><h2>Không thể tải kho ảnh</h2><p>{loadError}</p><Button className="action-button" onClick={() => setRetryIndex((current) => current + 1)}>Thử lại</Button></section>
        ) : loading ? (
          <section className="gallery-grid gallery-skeleton-grid" aria-label="Đang tải kho ảnh">{Array.from({ length: 12 }, (_, index) => <span className="gallery-skeleton" key={index} />)}</section>
        ) : photos.length ? (
          <>
            <p className="gallery-results" aria-live="polite">{total} ảnh{filtersActive ? ' phù hợp với bộ lọc' : ' được lưu giữ'}</p>
            <section className="gallery-grid" aria-label="Ảnh trong kho ảnh">
              {photos.map((photo) => <article className="gallery-photo" key={photo.id}>
                <button className="gallery-photo-button" onClick={() => openViewer(photo)} type="button">
                  <Image alt={photoAlt(photo)} height={photo.height} sizes="(max-width: 720px) 48vw, (max-width: 1200px) 31vw, 23vw" src={cloudinaryUrl(photo.imageUrl, 760)} width={photo.width} />
                  <span className="gallery-photo-overlay"><strong>{photo.title}</strong><small>{photo.albumName}{photo.year ? ` · ${photo.year}` : ''}</small></span>
                </button>
                <div className="gallery-photo-meta"><strong>{photo.title}</strong><span>{photo.albumName}{photo.year ? ` · ${photo.year}` : ''}</span></div>
              </article>)}
            </section>
            <nav className="gallery-pagination" aria-label="Phân trang kho ảnh">
              <Select value={pageSize} onValueChange={(value) => value && setPageSize(value)} items={galleryPageSizeOptions}>
                <SelectTrigger aria-label="Số ảnh mỗi trang" className="gallery-page-size"><SelectValue /></SelectTrigger>
                <SelectContent>{galleryPageSizeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
              </Select>
              {totalPages > 1 && <div className="gallery-pagination-controls"><Button aria-label="Trang trước" className="icon-button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} variant="outline"><GalleryIcon name="previous" size={20} /></Button><span>Trang {currentPage} / {totalPages}</span><Button aria-label="Trang sau" className="icon-button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} variant="outline"><GalleryIcon name="next" size={20} /></Button></div>}
            </nav>
          </>
        ) : (
          <section className="gallery-state"><GalleryIcon className="gallery-state-icon" name="add-photo" size={52} /><h2>{filtersActive ? 'Không tìm thấy ảnh phù hợp' : 'Kho ảnh chưa có hình ảnh'}</h2><p>{filtersActive ? 'Thử thay đổi từ khóa hoặc bộ lọc.' : canManageGallery ? 'Thêm những hình ảnh đầu tiên của dòng họ.' : 'Những khoảnh khắc của dòng họ sẽ được cập nhật tại đây.'}</p>{filtersActive ? <Button className="action-button" onClick={() => { setQuery(''); setYear('all'); }} variant="outline">Xóa bộ lọc</Button> : canManageGallery ? <Button aria-label="Thêm ảnh" className="action-button gallery-empty-upload-button" onClick={() => setUploadOpen(true)} title="Thêm ảnh"><Image alt="" aria-hidden className="gallery-upload-icon" height={28} src="/heritage-icons-3d/add-photo.png" width={31} /><span>Thêm ảnh</span></Button> : null}</section>
        )}
      </div>

      <Dialog open={uploadOpen} onOpenChange={closeUpload}>
        <DialogContent className={`gallery-upload-dialog${useCompactGalleryDialog ? ' gallery-mobile-dialog' : ''}`} closeIcon={<GalleryIcon name="close" size={18} />} showCloseButton={!uploadBusy}>
          <DialogHeader><DialogTitle>Thêm ảnh vào kho</DialogTitle><DialogDescription>Ảnh được lưu trực tiếp trong thư mục Kho ảnh của Cloudinary.</DialogDescription></DialogHeader>
          <div className="gallery-upload-form">
            <label className={previewUrl ? 'gallery-file-picker has-preview' : 'gallery-file-picker'}>
              {previewUrl ? <span aria-label="Xem trước ảnh sẽ tải lên" className="gallery-upload-preview-frame" role="img" style={{ backgroundImage: `url("${previewUrl}")` }} /> : <span className="gallery-file-picker-empty"><Image alt="" aria-hidden className="gallery-upload-picker-icon" height={52} src="/heritage-icons-3d/upload-photo.png" width={58} /><strong>Chọn ảnh để tải lên</strong><small>JPG, PNG hoặc WebP · tối đa 10 MB</small></span>}
              <Input accept={GALLERY_ALLOWED_TYPES.join(',')} aria-label="Chọn ảnh tải lên" className="gallery-file-input" disabled={uploadBusy} onChange={(event) => chooseFile(event.target.files?.[0] || null)} type="file" />
            </label>
            {uploadFile && <div className="gallery-file-summary"><span><strong>{uploadFile.name}</strong><small>{readableBytes(uploadFile.size)}</small></span><Button aria-label="Bỏ ảnh đã chọn" disabled={uploadBusy} onClick={resetUpload} size="icon-sm" type="button" variant="ghost"><GalleryIcon name="close" size={17} /></Button></div>}
            <div className="gallery-form-grid">
              <div className="gallery-field gallery-field-title"><span>Tiêu đề</span><Input aria-label="Tiêu đề" disabled={uploadBusy} value={uploadForm.title} onChange={(event) => setUploadValue('title', event.target.value)} /></div>
              <div className="gallery-field"><span>Năm chụp</span><Input aria-label="Năm chụp" disabled={uploadBusy} inputMode="numeric" max="3000" min="1000" type="number" value={uploadForm.year} onChange={(event) => setUploadValue('year', event.target.value)} /></div>
              <div className="gallery-field gallery-date-field"><span>Ngày chụp</span><Input aria-label="Ngày chụp" className="gallery-date-input" disabled={uploadBusy} type="date" value={uploadForm.takenAt} onChange={(event) => setUploadValue('takenAt', event.target.value)} /><GalleryIcon className="gallery-date-icon" name="calendar-day" size={20} /></div>
              <div className="gallery-field gallery-field-full"><span>Mô tả</span><Textarea aria-label="Mô tả" disabled={uploadBusy} rows={3} value={uploadForm.caption} onChange={(event) => setUploadValue('caption', event.target.value)} /></div>
            </div>
            {uploadError && <p className="gallery-form-error" role="alert">{uploadError}</p>}
            <div className="gallery-dialog-actions"><Button disabled={uploadBusy} onClick={() => closeUpload(false)} type="button" variant="outline">Hủy</Button><Button disabled={uploadBusy || !uploadFile} onClick={() => void uploadPhoto()} type="button">{uploadBusy && <LoaderCircle className="gallery-spinner" />}{uploadState === 'signing' ? 'Đang xác thực...' : uploadState === 'uploading' ? 'Đang tải ảnh...' : uploadState === 'saving' ? 'Đang lưu...' : 'Tải ảnh lên'}</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!activePhoto} onOpenChange={(open) => { if (!open) { setViewerId(null); setEditing(false); setViewerError(null); } }}>
        {activePhoto && <DialogContent className={`gallery-viewer-dialog${useMobileGalleryViewer ? ' gallery-mobile-dialog' : ''}`} closeIcon={<GalleryIcon name="close" size={18} />} showCloseButton={!useMobileGalleryViewer}>
          {useMobileGalleryViewer && <div className="gallery-viewer-mobile-header"><span>Preview</span><DialogClose aria-label="Đóng preview ảnh" render={<Button size="icon-sm" variant="ghost" />}><GalleryIcon name="close" size={18} /></DialogClose></div>}
          <div className="gallery-viewer-layout">
            <div className="gallery-viewer-image-wrap">
              {photos.length > 1 && <Button aria-label="Ảnh trước" className="gallery-viewer-arrow previous" onClick={() => moveViewer(-1)} size="icon" variant="outline"><GalleryIcon name="previous" size={22} /></Button>}
              <Image alt={photoAlt(activePhoto)} className="gallery-viewer-image" height={activePhoto.height} sizes="(max-width: 720px) 100vw, 70vw" src={cloudinaryUrl(activePhoto.imageUrl, 1800)} width={activePhoto.width} />
              {photos.length > 1 && <Button aria-label="Ảnh tiếp theo" className="gallery-viewer-arrow next" onClick={() => moveViewer(1)} size="icon" variant="outline"><GalleryIcon name="next" size={22} /></Button>}
            </div>
            <div className="gallery-viewer-copy">
              {editing ? <div className="gallery-edit-form">
                <div className="gallery-field"><span>Tiêu đề</span><Input aria-label="Tiêu đề" value={editForm.title} onChange={(event) => setEditValue('title', event.target.value)} /></div>
                <div className="gallery-form-grid"><div className="gallery-field"><span>Năm chụp</span><Input aria-label="Năm chụp" inputMode="numeric" max="3000" min="1000" type="number" value={editForm.year} onChange={(event) => setEditValue('year', event.target.value)} /></div><div className="gallery-field gallery-date-field"><span>Ngày chụp</span><Input aria-label="Ngày chụp" className="gallery-date-input" type="date" value={editForm.takenAt} onChange={(event) => setEditValue('takenAt', event.target.value)} /><GalleryIcon className="gallery-date-icon" name="calendar-day" size={20} /></div></div>
                <div className="gallery-field"><span>Mô tả</span><Textarea aria-label="Mô tả" rows={4} value={editForm.caption} onChange={(event) => setEditValue('caption', event.target.value)} /></div>
                <div className="gallery-dialog-actions"><Button disabled={savingEdit} onClick={() => setEditing(false)} variant="outline">Hủy</Button><Button disabled={savingEdit} onClick={() => void updatePhoto({ ...editForm, year: editForm.year ? Number(editForm.year) : null })}>{savingEdit && <LoaderCircle className="gallery-spinner" />}{savingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}</Button></div>
              </div> : <>
                <div className="gallery-viewer-kicker">{activePhoto.albumName}</div>
                <DialogTitle>{activePhoto.title}</DialogTitle>
                {activePhoto.caption && <DialogDescription>{activePhoto.caption}</DialogDescription>}
                <dl className="gallery-viewer-details">{readableDate(activePhoto) && <div><dt>Thời gian</dt><dd>{readableDate(activePhoto)}</dd></div>}<div><dt>Định dạng</dt><dd>{activePhoto.format.toUpperCase()} · {readableBytes(activePhoto.bytes)}</dd></div>{activePhoto.uploadedByName && <div><dt>Người thêm</dt><dd>{activePhoto.uploadedByName}</dd></div>}</dl>
                {canManageGallery && <div className="gallery-viewer-actions"><Button disabled={savingEdit} onClick={() => beginEdit(activePhoto)} variant="outline"><GalleryIcon name="edit" size={18} /> Chỉnh sửa</Button><Button aria-pressed={activePhoto.featured} className={activePhoto.featured ? 'is-featured' : ''} disabled={savingEdit} onClick={() => void updatePhoto({ featured: !activePhoto.featured })} variant="outline"><GalleryIcon className="gallery-featured-icon" name={activePhoto.featured ? 'featured-on' : 'featured-off'} size={20} /> {activePhoto.featured ? 'Bỏ nổi bật' : 'Đặt nổi bật'}</Button><Button className="gallery-delete-button" disabled={savingEdit} onClick={() => setDeleteTarget(activePhoto)} variant="outline"><GalleryIcon name="delete" size={18} /> Xóa ảnh</Button></div>}
              </>}
              {viewerError && <p className="gallery-form-error" role="alert">{viewerError}</p>}
            </div>
          </div>
        </DialogContent>}
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent className="gallery-delete-dialog"><AlertDialogHeader><AlertDialogTitle>Xóa ảnh này?</AlertDialogTitle><AlertDialogDescription>Ảnh sẽ bị xóa trực tiếp khỏi Cloudinary. Thao tác này không thể hoàn tác.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel><AlertDialogAction className="gallery-delete-confirm" disabled={deleting} onClick={() => void deletePhoto()}>{deleting && <LoaderCircle className="gallery-spinner" />}{deleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
