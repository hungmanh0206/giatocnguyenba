# Hướng dẫn kết nối Firebase

Ứng dụng dùng Cloud Firestore để lưu gia phả và Firebase Authentication để kiểm soát quyền truy cập. Dữ liệu không cho phép ghi công khai.

## 1. Tạo và cấu hình Firebase project

1. Mở [Firebase Console](https://console.firebase.google.com/) và chọn project `giatocnguyenba-47522`.
2. Vào **Build > Firestore Database**, chọn **Create database**, chọn **Production mode** và khu vực gần với người dùng của bạn.
3. Vào **Build > Authentication > Sign-in method**, bật nhà cung cấp **Google** và điền email hỗ trợ nếu Firebase yêu cầu.
4. Vào **Authentication > Settings > Authorized domains**, thêm `giatocnguyenba.vercel.app`. Đây là domain website production, cần có để đăng nhập Google hoạt động trên Vercel.
5. Vào **Project settings > General**, kiểm tra Web App đã đăng ký và lưu lại cấu hình Firebase Web App. Cấu hình này đã được thêm vào `.env.local` trên máy và Vercel.

## 2. Đăng nhập Firebase CLI và deploy Rules

Mở PowerShell tại thư mục dự án và chạy:

```powershell
pnpm firebase:login
```

Hoàn tất đăng nhập bằng tài khoản có quyền quản trị project `giatocnguyenba-47522`. Sau đó deploy Firestore Rules và indexes:

```powershell
pnpm firebase:deploy:rules
```

File `.firebaserc` trên máy đã trỏ đến đúng Firebase project. Nếu bạn làm trên máy khác, sao chép `.firebaserc.example` thành `.firebaserc` và thay `your-firebase-project-id` bằng `giatocnguyenba-47522`.

## 3. Tạo tài khoản chủ sở hữu gia phả

1. Mở [website production](https://giatocnguyenba.vercel.app) và đăng nhập bằng tài khoản Google sẽ quản lý gia phả.
2. Vào Firebase Console > **Authentication > Users**, tìm tài khoản vừa đăng nhập và sao chép cột **User UID**.
3. Vào **Project settings > Service accounts**, tạo khóa mới và tải file JSON service account về máy. Không gửi file này qua chat, GitHub hoặc Vercel.

## 4. Nạp dữ liệu gia phả mẫu

Trong PowerShell, đặt ba biến tạm thời bên dưới. Thay đường dẫn bằng vị trí file service-account JSON của bạn và thay `UID_CUA_BAN` bằng User UID ở bước 3:

```powershell
$env:FIREBASE_PROJECT_ID = "giatocnguyenba-47522"
$env:FIREBASE_OWNER_UID = "UID_CUA_BAN"
$env:FIREBASE_SERVICE_ACCOUNT_JSON = Get-Content -Raw "C:\duong-dan\service-account.json"
pnpm firebase:bootstrap
```

Lệnh này tạo gia phả `nguyen-ba`, cấp vai trò `owner` cho UID của bạn và nạp 38 hồ sơ mẫu. Sau khi xong, đóng PowerShell hoặc xóa các biến tạm thời:

```powershell
Remove-Item Env:FIREBASE_PROJECT_ID
Remove-Item Env:FIREBASE_OWNER_UID
Remove-Item Env:FIREBASE_SERVICE_ACCOUNT_JSON
```

## 5. Cấp quyền cho người thân

Thêm document ở đường dẫn `families/nguyen-ba/memberships/{uid}` trong Firestore. Trường `role` có một trong các giá trị:

| Vai trò | Quyền |
| --- | --- |
| `viewer` | Xem gia phả |
| `editor` | Xem và chỉnh sửa thành viên |
| `owner` | Toàn quyền, bao gồm cấp quyền cho người khác |

Chỉ `owner` và `editor` có thể thêm, sửa hoặc xóa thành viên.

## Cấu trúc dữ liệu Firestore

```text
families/{familyId}
families/{familyId}/members/{memberId}
families/{familyId}/memberships/{uid}
```

## Lưu ý bảo mật

- Không commit `.env.local`, `.firebaserc` hoặc file service-account JSON lên GitHub.
- Các biến `NEXT_PUBLIC_FIREBASE_*` là cấu hình Web App và có thể xuất hiện trong trình duyệt. Đây không phải là khóa quản trị.
- Tuyệt đối không đưa service-account JSON vào Vercel Environment Variables. Đây là thông tin mật có toàn quyền project.
