'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BrandIcon } from './brand-icon';
import { HeritageIcon } from './heritage-icon';
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
              <BrandIcon size={43} />
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
                <img
                  className="logout-icon"
                  src="/app-icons/logout.png"
                  alt=""
                />
              </Button>
            )}
            <Link
              className="admin-link"
              href="/admin"
              aria-label="Khu vực quản trị"
              title="Khu vực quản trị"
            >
              <HeritageIcon name="settings" size={17} />
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
              {open ? <HeritageIcon name="close" size={21} /> : <HeritageIcon name="list" size={21} />}
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
          <BrandIcon size={26} />
          <strong>Họ Nguyễn Bá</strong>
        </div>
        <span>Gìn giữ cội nguồn · Kết nối thế hệ</span>
        <Link href="/history">
          Về dòng họ <HeritageIcon name="next" size={15} />
        </Link>
      </div>
    </footer>
  );
}
