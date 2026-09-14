import type { AIAppFeature } from './types.ts';

export const appFeatures: AIAppFeature[] = [
  {
    id: 'home',
    name: 'Trang chủ',
    description: 'Tìm người thân, xem tổng quan các thế hệ và ngày giỗ sắp tới.',
    route: '/',
    keywords: ['trang chủ', 'tìm', 'tìm người', 'tổng quan'],
  },
  {
    id: 'family-tree',
    name: 'Cây gia phả',
    description: 'Xem các đời, chi họ và quan hệ gia đình trên cây gia phả.',
    route: '/family-tree',
    keywords: ['gia phả', 'cây', 'thành viên', 'đời', 'chi'],
  },
  {
    id: 'members',
    name: 'Danh sách thành viên',
    description: 'Tìm, lọc và mở hồ sơ chi tiết của từng thành viên.',
    route: '/family-tree?tab=members',
    keywords: ['danh sách', 'hồ sơ', 'thành viên', 'tìm'],
  },
  {
    id: 'gallery',
    name: 'Kho ảnh',
    description: 'Xem và lưu giữ những hình ảnh của dòng họ.',
    route: '/gallery',
    keywords: ['ảnh', 'kho ảnh', 'hình'],
  },
  {
    id: 'calendar',
    name: 'Lịch âm và ngày giỗ',
    description: 'Tra cứu lịch âm, xem ngày theo việc, tử vi tham khảo và ngày giỗ.',
    route: '/lunar-calendar',
    keywords: ['lịch âm', 'lịch', 'ngày giỗ', 'xem ngày', 'tử vi'],
  },
  {
    id: 'history',
    name: 'Lịch sử dòng họ',
    description: 'Đọc tư liệu và các dấu mốc đã được ghi nhận về dòng họ.',
    route: '/history',
    keywords: ['lịch sử', 'tư liệu', 'dòng họ'],
  },
  {
    id: 'admin',
    name: 'Quản trị gia phả',
    description: 'Tài khoản quản trị có thể thêm, sửa và quản lý dữ liệu thành viên.',
    route: '/admin',
    keywords: ['thêm thành viên', 'sửa thành viên', 'quản trị', 'cập nhật hồ sơ'],
  },
];
