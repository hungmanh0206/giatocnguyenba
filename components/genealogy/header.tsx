'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { BrandIcon } from './brand-icon';
import { HeritageIcon } from './heritage-icon';
import { useFamily } from './provider';
const navigation = [
  ['/', 'Trang chủ'],
  ['/family-tree', 'Gia phả'],
  ['/lunar-calendar', 'Lịch âm & ngày giỗ'],
  ['/history', 'Lịch sử dòng họ'],
];
export function Header() {
  const path = usePathname();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState('');
  const { connection, signIn, signInWithPassword, signOut } = useFamily();

  function openLogin() {
    setNavigationOpen(false);
    setAuthError('');
    setLoginOpen(true);
  }

  async function loginWithGoogle() {
    setAuthPending(true);
    setAuthError('');
    const result = await signIn();
    setAuthPending(false);
    if (result) {
      setAuthError(result);
      return;
    }
    setLoginOpen(false);
  }

  async function loginWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setAuthError('Nhập email và mật khẩu để tiếp tục.');
      return;
    }
    setAuthPending(true);
    setAuthError('');
    const result = await signInWithPassword(email, password);
    setAuthPending(false);
    if (result) {
      setAuthError(result);
      return;
    }
    setPassword('');
    setLoginOpen(false);
  }

  async function logout() {
    setNavigationOpen(false);
    await signOut();
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link
            href="/"
            className="brand"
            onClick={() => setNavigationOpen(false)}
          >
            <span className="brand-mark">
              <BrandIcon size={43} />
            </span>
            <span>
              <small>GIA PHẢ DÒNG HỌ</small>
              <strong>Nguyễn Bá</strong>
            </span>
          </Link>
          <nav
            className={navigationOpen ? 'main-nav is-open' : 'main-nav'}
            aria-label="Điều hướng chính"
          >
            {navigation.map(([url, label]) => (
              <Link
                key={url}
                href={url}
                onClick={() => {
                  setNavigationOpen(false);
                }}
                className={path === url ? 'active' : ''}
                aria-current={path === url ? 'page' : undefined}
              >
                {label}
              </Link>
            ))}
            <div className="mobile-account-links">
              {!connection.user ? (
                <Button
                  className="mobile-account-entry"
                  variant="ghost"
                  onClick={openLogin}
                >
                  <img className="login-icon" src="/app-icons/login.png" alt="" />
                  Đăng nhập
                </Button>
              ) : (
                <>
                  <Link href="/admin" onClick={() => setNavigationOpen(false)}>
                    <HeritageIcon name="settings" size={17} />
                    Quản trị
                  </Link>
                  <Button
                    className="mobile-account-entry"
                    variant="ghost"
                    onClick={() => void logout()}
                  >
                    <img className="logout-icon" src="/app-icons/logout.png" alt="" />
                    Đăng xuất
                  </Button>
                </>
              )}
            </div>
          </nav>
          <div className="header-actions">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    className="icon-button account-menu-trigger"
                    variant="ghost"
                    aria-label="Tùy chọn tài khoản"
                    title="Tùy chọn tài khoản"
                  />
                }
              >
                <HeritageIcon name="list" size={21} />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="account-menu-content"
                sideOffset={8}
              >
                {!connection.user ? (
                  <DropdownMenuItem
                    className="account-menu-item"
                    onClick={openLogin}
                  >
                    <img className="login-icon" src="/app-icons/login.png" alt="" />
                    Đăng nhập
                  </DropdownMenuItem>
                ) : (
                  <>
                    <DropdownMenuItem
                      className="account-menu-item"
                      onClick={() => {
                        window.location.assign('/admin');
                      }}
                    >
                      <HeritageIcon name="settings" size={17} />
                      Quản trị
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="account-menu-item account-menu-logout"
                      onClick={() => void logout()}
                    >
                      <img
                        className="logout-icon"
                        src="/app-icons/logout.png"
                        alt=""
                      />
                      Đăng xuất
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              className="icon-button mobile-menu"
              variant="ghost"
              onClick={() => {
                setNavigationOpen(!navigationOpen);
              }}
              aria-label={navigationOpen ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={navigationOpen}
            >
              {navigationOpen ? (
                <HeritageIcon name="close" size={21} />
              ) : (
                <HeritageIcon name="list" size={21} />
              )}
            </Button>
          </div>
        </div>
      </header>
      <Dialog
        open={loginOpen}
        onOpenChange={(nextOpen) => {
          setLoginOpen(nextOpen);
          if (!nextOpen) setAuthError('');
        }}
      >
        <DialogContent className="login-dialog">
          <DialogHeader className="login-dialog-header">
            <img className="login-dialog-icon" src="/app-icons/login.png" alt="" />
            <div>
              <DialogTitle>Đăng nhập</DialogTitle>
              <DialogDescription>
                Xác thực để quản lý dữ liệu gia phả.
              </DialogDescription>
            </div>
          </DialogHeader>
          <form className="login-form" onSubmit={(event) => void loginWithPassword(event)}>
            <label>
              Tài khoản email
              <Input
                autoComplete="username"
                disabled={authPending}
                inputMode="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                value={email}
              />
            </label>
            <label>
              Mật khẩu
              <Input
                autoComplete="current-password"
                disabled={authPending}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Nhập mật khẩu"
                type="password"
                value={password}
              />
            </label>
            {authError && <p className="login-error" role="alert">{authError}</p>}
            <Button className="action-button login-submit" disabled={authPending} type="submit">
              {authPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>
          <div className="login-divider" aria-hidden="true">
            <span />
            <small>hoặc</small>
            <span />
          </div>
          <Button
            className="google-login-button"
            disabled={authPending}
            onClick={() => void loginWithGoogle()}
            type="button"
            variant="outline"
          >
            <span className="google-mark" aria-hidden="true">G</span>
            Đăng nhập nhanh với Google
          </Button>
        </DialogContent>
      </Dialog>
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
