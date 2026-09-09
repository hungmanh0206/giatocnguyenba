'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  GitFork,
  Menu,
  X,
  Settings2,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFamily } from './provider';
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
  const { connection, signOut } = useFamily();
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
                onClick={() => {
                  setOpen(false);
                }}
                className={path === url ? 'active' : ''}
                aria-current={path === url ? 'page' : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            {connection.user && (
              <Button
                variant="ghost"
                className="icon-button"
                onClick={() => void signOut()}
                title={`Đăng xuất ${connection.user.email || connection.user.displayName || ''}`}
                aria-label="Đăng xuất"
              >
                <LogOut size={18} />
              </Button>
            )}
            <Link
              className="admin-link"
              href="/admin"
              aria-label="Khu vực quản trị"
              title="Khu vực quản trị"
            >
              <Settings2 size={17} />
              <span>Quản trị</span>
            </Link>
            <Button
              className="icon-button mobile-menu"
              variant="ghost"
              onClick={() => {
                setOpen(!open);
              }}
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
