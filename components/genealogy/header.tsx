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

type AuthMode = 'sign-in' | 'reset' | 'change';

export function Header() {
  const path = usePathname();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authPending, setAuthPending] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const {
    connection,
    signIn,
    signInWithPassword,
    requestPasswordReset,
    changePassword,
    signOut,
  } = useFamily();

  function clearAuthFeedback() {
    setAuthError('');
    setAuthNotice('');
  }

  function clearPasswordFields() {
    setPassword('');
    setCurrentPassword('');
    setNextPassword('');
    setConfirmPassword('');
  }

  function openAuth(mode: AuthMode) {
    setNavigationOpen(false);
    clearAuthFeedback();
    clearPasswordFields();
    setAuthMode(mode);
    setLoginOpen(true);
  }

  function openLogin() {
    openAuth('sign-in');
  }

  function openChangePassword() {
    openAuth('change');
  }

  async function loginWithGoogle() {
    setAuthPending(true);
    clearAuthFeedback();
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
    clearAuthFeedback();
    const result = await signInWithPassword(email, password);
    setAuthPending(false);
    if (result) {
      setAuthError(result);
      return;
    }
    clearPasswordFields();
    setLoginOpen(false);
  }

  async function sendPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      setAuthError('Nhập email để nhận liên kết đặt lại mật khẩu.');
      return;
    }

    setAuthPending(true);
    clearAuthFeedback();
    const result = await requestPasswordReset(email);
    setAuthPending(false);
    if (result) {
      setAuthError(result);
      return;
    }
    setAuthNotice('Đã gửi liên kết đặt lại mật khẩu. Hãy kiểm tra hộp thư email.');
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentPassword || !nextPassword || !confirmPassword) {
      setAuthError('Nhập đủ mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu.');
      return;
    }
    if (nextPassword.length < 8) {
      setAuthError('Mật khẩu mới cần có ít nhất 8 ký tự.');
      return;
    }
    if (nextPassword !== confirmPassword) {
      setAuthError('Xác nhận mật khẩu chưa khớp.');
      return;
    }

    setAuthPending(true);
    clearAuthFeedback();
    const result = await changePassword(currentPassword, nextPassword);
    setAuthPending(false);
    if (result) {
      setAuthError(result);
      return;
    }
    clearPasswordFields();
    setAuthNotice('Đã đổi mật khẩu thành công.');
  }

  async function logout() {
    setNavigationOpen(false);
    try {
      await signOut();
    } finally {
      window.location.assign('/');
    }
  }

  const dialogTitle =
    authMode === 'change'
      ? 'Đổi mật khẩu'
      : authMode === 'reset'
        ? 'Đặt lại mật khẩu'
        : 'Đăng nhập';
  const dialogDescription =
    authMode === 'change'
      ? 'Xác thực mật khẩu hiện tại trước khi cập nhật mật khẩu mới.'
      : authMode === 'reset'
        ? 'Chúng tôi sẽ gửi liên kết tạo mật khẩu mới về email của bạn.'
        : 'Xác thực để quản lý dữ liệu gia phả.';

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
                    onClick={openChangePassword}
                  >
                    <HeritageIcon name="security" size={17} />
                    Đổi mật khẩu
                  </Button>
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
                    <DropdownMenuItem
                      className="account-menu-item"
                      onClick={openChangePassword}
                    >
                      <HeritageIcon name="security" size={17} />
                      Đổi mật khẩu
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
          if (!nextOpen) {
            clearAuthFeedback();
            clearPasswordFields();
            setAuthMode('sign-in');
          }
        }}
      >
        <DialogContent
          className="login-dialog"
          closeIcon={
            <img
              className="login-close-icon"
              src="/heritage-icons-3d/close.png"
              alt=""
            />
          }
        >
          <DialogHeader className="login-dialog-header">
            <BrandIcon className="login-dialog-icon" size={46} />
            <div>
              <DialogTitle>{dialogTitle}</DialogTitle>
              <DialogDescription>{dialogDescription}</DialogDescription>
            </div>
          </DialogHeader>
          {authMode === 'sign-in' && (
            <>
              <form className="login-form" onSubmit={(event) => void loginWithPassword(event)}>
                <label>
                  Tài khoản email
                  <Input
                    autoComplete="username"
                    disabled={authPending}
                    inputMode="email"
                    onChange={(event) => setEmail(event.target.value)}
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
                    type="password"
                    value={password}
                  />
                </label>
                <button
                  className="login-text-link"
                  disabled={authPending}
                  onClick={() => openAuth('reset')}
                  type="button"
                >
                  Quên mật khẩu?
                </button>
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
                <img className="google-icon" src="/app-icons/google.svg" alt="" />
                Đăng nhập nhanh với Google
              </Button>
            </>
          )}
          {authMode === 'reset' && (
            <form className="login-form" onSubmit={(event) => void sendPasswordReset(event)}>
              <label>
                Tài khoản email
                <Input
                  autoComplete="email"
                  disabled={authPending}
                  inputMode="email"
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  value={email}
                />
              </label>
              {authError && <p className="login-error" role="alert">{authError}</p>}
              {authNotice && <p className="login-success" role="status">{authNotice}</p>}
              <Button className="action-button login-submit" disabled={authPending} type="submit">
                {authPending ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
              </Button>
              <button className="login-text-link login-text-link-centered" onClick={() => openAuth('sign-in')} type="button">
                Quay lại đăng nhập
              </button>
            </form>
          )}
          {authMode === 'change' && (
            <form className="login-form" onSubmit={(event) => void updatePassword(event)}>
              <label>
                Mật khẩu hiện tại
                <Input
                  autoComplete="current-password"
                  disabled={authPending}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  type="password"
                  value={currentPassword}
                />
              </label>
              <label>
                Mật khẩu mới
                <Input
                  autoComplete="new-password"
                  disabled={authPending}
                  onChange={(event) => setNextPassword(event.target.value)}
                  type="password"
                  value={nextPassword}
                />
              </label>
              <label>
                Xác nhận mật khẩu mới
                <Input
                  autoComplete="new-password"
                  disabled={authPending}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  type="password"
                  value={confirmPassword}
                />
              </label>
              {authError && <p className="login-error" role="alert">{authError}</p>}
              {authNotice && <p className="login-success" role="status">{authNotice}</p>}
              <Button className="action-button login-submit" disabled={authPending} type="submit">
                {authPending ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
              </Button>
            </form>
          )}
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
