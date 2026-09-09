'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  GitFork,
  Menu,
  X,
  Search,
  Settings2,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
const navigation = [
  ['/', 'Trang chủ'],
  ['/family-tree', 'Cây gia phả'],
  ['/members', 'Thành viên'],
  ['/lunar-calendar', 'Lịch âm & ngày giỗ'],
  ['/history', 'Lịch sử dòng họ'],
];
export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="brand" onClick={() => setOpen(false)}>
            <span className="brand-mark">
              <GitFork size={25} />
            </span>
            <span>
              <small>GIA PHẢ DÒNG HỌ</small>
              <strong>Nguyễn Bá</strong>
            </span>
          </Link>
          <nav
            className={open ? 'main-nav is-open' : 'main-nav'}
            aria-label="Điều hướng chính"
          >
            {navigation.map(([url, label]) => (
              <Link
                key={url}
                href={url}
                onClick={() => setOpen(false)}
                className={path === url ? 'active' : ''}
                aria-current={path === url ? 'page' : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <Link
              className="icon-button"
              href="/members"
              title="Tìm thành viên"
              aria-label="Tìm thành viên"
            >
              <Search size={20} />
            </Link>
            <span className="header-divider" />
            <Link
              className="admin-link"
              href="/admin"
              aria-label="Quản lý gia phả"
              title="Quản lý gia phả"
            >
              <Settings2 size={17} />
              <span>Quản lý</span>
            </Link>
            <Button
              className="icon-button mobile-menu"
              variant="ghost"
              onClick={() => setOpen(!open)}
              aria-label={open ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={open}
            >
              {open ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
      </header>
    </>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="brand">
          <GitFork size={23} />
          <strong>Họ Nguyễn Bá</strong>
        </div>
        <span>Gìn giữ cội nguồn · Kết nối thế hệ</span>
        <Link href="/history">
          Về dòng họ <ChevronRight size={15} />
        </Link>
      </div>
    </footer>
  );
}
