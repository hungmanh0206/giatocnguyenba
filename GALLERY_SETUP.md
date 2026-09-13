# Thiết lập Kho ảnh dòng họ

`/gallery` cho phép mọi người xem ảnh. Chỉ UID đang là `super_admin` trong `families/nguyen-ba` mới có thể tải ảnh lên, chỉnh sửa, đặt ảnh nổi bật hoặc xóa ảnh.

## 1. Cloudinary

1. Tạo hoặc chọn Cloudinary product environment.
2. Lấy ba giá trị ở **Settings > API Keys**: cloud name, API key và API secret.
3. Thêm các biến server-only sau vào `.env.local` và Vercel Production/Preview Environment Variables:

```text
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Không thêm tiền tố `NEXT_PUBLIC_` cho API key hoặc API secret. Website chỉ yêu cầu chữ ký upload ngắn hạn từ API server; secret không bao giờ đi vào bundle trình duyệt. Kho ảnh chỉ đọc và ghi vào asset folder `Gia tộc nguyễn bá`; ảnh không được lưu trong source code hoặc Firebase Storage.

## 2. Firebase Admin cho API server

API gallery xác thực Firebase ID token, sau đó đối chiếu cả `families/nguyen-ba.superAdminUid` và `memberships/{uid}.role` trước khi cho phép thao tác ghi trên Cloudinary.

Tạo service account JSON ở Firebase Console, sau đó đặt nguyên nội dung JSON vào biến server-only sau ở `.env.local` và Vercel Environment Variables:

```text
FIREBASE_PROJECT_ID=giatocnguyenba-47522
FIREBASE_FAMILY_ID=nguyen-ba
FIREBASE_SERVICE_ACCOUNT_JSON={...service account JSON...}
```

Giá trị này là secret: không commit file JSON, không đặt tên biến với `NEXT_PUBLIC_`, và không dán nó vào client code. Vercel encrypts environment variables at rest; giới hạn quyền truy cập project Vercel cho người cần vận hành.

## 3. Deploy Firestore Rules và indexes

Sau khi pull thay đổi, deploy cả Rules lẫn index:

```powershell
pnpm firebase:deploy:rules
```

Lệnh dùng `firestore.rules` và `firestore.indexes.json`. Index mới có thể mất vài phút để build trong Firebase Console. Trong thời gian đó, các bộ lọc kết hợp có thể báo lỗi Firestore; không tạo index thủ công khác với file đã commit.

## 4. Vận hành ảnh

1. Đăng nhập bằng tài khoản super admin.
2. Mở `/gallery` và chọn **Thêm ảnh**.
3. Chọn ảnh JPG, PNG hoặc WebP tối đa 10 MB, điền metadata rồi tải lên trực tiếp vào Cloudinary.
4. Mở một ảnh để chỉnh sửa, xóa hoặc **Đặt nổi bật**. Ảnh nổi bật tự động được dùng cho slideshow ở trang chủ.

Ảnh đang có sẵn trong folder `Gia tộc nguyễn bá` trên Cloudinary cũng tự động xuất hiện trên website. Khi xóa, hệ thống xóa trực tiếp asset tương ứng trên Cloudinary.
