'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  GitFork,
  Menu,
  X,
  Search,
  Settings2,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { searchMembers } from '@/lib/family';
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchInput = useRef<HTMLInputElement>(null);
  const { connection, members, signOut } = useFamily();
  const matches = query.trim()
    ? searchMembers(members, query).slice(0, 5)
    : [];

  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);

  function closeSearch() {
    setSearchOpen(false);
    setQuery('');
  }
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
                  closeSearch();
                }}
                className={path === url ? 'active' : ''}
                aria-current={path === url ? 'page' : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <div
              className={
                searchOpen ? 'header-search is-open' : 'header-search'
              }
            >
              <Button
                className="icon-button"
                variant="ghost"
                onClick={() => {
                  setSearchOpen((current) => !current);
                  setQuery('');
                }}
                aria-label={searchOpen ? 'Đóng tìm kiếm' : 'Tìm thành viên'}
                aria-expanded={searchOpen}
                title="Tìm thành viên"
              >
                {searchOpen ? <X size={20} /> : <Search size={20} />}
              </Button>
              {searchOpen ? (
                <>
                  <label className="header-search-input">
                    <Search size={18} />
                    <input
                      ref={searchInput}
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') closeSearch();
                      }}
                      placeholder="Tìm người trong gia phả..."
                      aria-label="Tìm người trong gia phả"
                    />
                  </label>
                  {query.trim() ? (
                    <div className="header-search-results">
                      {matches.length ? (
                        matches.map((person) => (
                          <Link
                            href={`/members/${person.id}`}
                            key={person.id}
                            onClick={closeSearch}
                          >
                            <strong>{person.name}</strong>
                            <span>Đời {person.generation}</span>
                          </Link>
                        ))
                      ) : (
                        <p>Không tìm thấy thành viên phù hợp.</p>
                      )}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
            <span className="header-divider" />
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
                closeSearch();
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
