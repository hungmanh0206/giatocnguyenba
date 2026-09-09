'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Search,
  GitFork,
  Users,
  Layers3,
  Flower2,
  BookOpen,
  ChevronRight,
  CornerDownRight,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFamily } from './provider';
import { Footer } from './header';
import { branchName, initials, searchMembers, type Member } from '@/lib/family';
import { upcomingAnniversaries, vietnamToday } from '@/lib/lunar';
export function Avatar({
  person,
  large = false,
}: {
  person: Member;
  large?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`avatar ${person.gender} ${large ? 'large' : ''}`}
    >
      {initials(person.name)}
    </span>
  );
}
export function MemberTile({ person }: { person: Member }) {
  return (
    <Link href={`/members/${person.id}`} className="member-tile">
      <Avatar person={person} />
      <span>
        <strong>{person.name}</strong>
        <small>
          Đời {person.generation} · {branchName(person.branch)}
        </small>
      </span>
      <ChevronRight size={17} />
    </Link>
  );
}
export function HomePage() {
  const { members, connection } = useFamily();
  const [query, setQuery] = useState('');
  const found = searchMembers(members, query).slice(0, 4);
  const [today] = useState(vietnamToday);
  const upcoming = useMemo(
    () => upcomingAnniversaries(members, today).slice(0, 3),
    [members, today],
  );
  return (
    <main id="main">
      <section className="home-hero">
        <img className="heritage-art" src="/heritage-hero.png" alt="" />
        <div className="container hero-content">
          <div className="eyebrow">
            <span /> CỘI NGUỒN CÒN MÃI
          </div>
          <h1>
            Gia phả họ <span>Nguyễn Bá</span>
          </h1>
          <p>
            Mỗi người một nhánh, chung một cội nguồn.
            <br />
            Cùng gìn giữ những câu chuyện của gia đình.
          </p>
          <div className="hero-actions">
            <Button
              className="action-button"
              render={<Link href="/family-tree" />}
              nativeButton={false}
            >
              <GitFork />
              Khám phá cây gia phả
              <ArrowRight />
            </Button>
            <Link className="text-link" href="/history">
              Lịch sử dòng họ <ArrowRight size={17} />
            </Link>
          </div>
          <div className="hero-search">
            <Search size={21} />
            <Input
              aria-label="Tìm người thân"
              placeholder="Tìm người thân trong gia phả…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="search-hint">Họ và tên</span>
            {query.trim() && (
              <div className="search-results">
                {found.length ? (
                  found.map((p) => <MemberTile person={p} key={p.id} />)
                ) : (
                  <p>Không tìm thấy thành viên phù hợp.</p>
                )}
                <Link href={`/members?q=${encodeURIComponent(query)}`}>
                  Xem tất cả kết quả <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>
          <div className="sample-note">
            <span />
            {connection.mode === 'demo'
              ? 'Gia phả minh họa · Dữ liệu mẫu'
              : connection.mode === 'connected'
                ? 'Đang đồng bộ từ Firestore'
                : connection.mode === 'auth-required'
                  ? 'Đăng nhập để xem gia phả riêng'
                  : connection.message || 'Đang kết nối gia phả'}
          </div>
        </div>
      </section>
      <section className="stats-band">
        <div className="container stats-grid">
          {[
            { icon: Users, value: members.length, label: 'Thành viên' },
            { icon: Layers3, value: 5, label: 'Thế hệ tiếp nối' },
            { icon: GitFork, value: 3, label: 'Chi trong dòng họ' },
            { icon: BookOpen, value: 1872, label: 'Khởi đầu gia phả' },
          ].map((s) => (
            <div className="stat" key={s.label}>
              <s.icon />
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="container home-main">
        <section className="tree-overview">
          <div className="section-heading">
            <div>
              <div className="eyebrow">TỪ MỘT CỘI NGUỒN</div>
              <h2>Các thế hệ trong dòng họ</h2>
            </div>
            <Link className="text-link" href="/family-tree">
              Toàn bộ gia phả <ArrowRight size={17} />
            </Link>
          </div>
          <div className="tree-preview">
            <span className="preview-label">
              <GitFork size={15} /> Sơ đồ khởi tổ
            </span>
            <div className="root-couple">
              {members
                .filter((p) => p.generation === 1)
                .map((p) => (
                  <Link
                    className="ancestor"
                    href={`/members/${p.id}`}
                    key={p.id}
                  >
                    <Avatar person={p} />
                    <strong>{p.name}</strong>
                    <small>
                      {p.born} – {p.died}
                    </small>
                    <span className="generation-tag">
                      {p.gender === 'male' ? 'Thủy tổ' : 'Phu nhân'}
                    </span>
                  </Link>
                ))}
              <span className="couple-line" />
            </div>
            <div className="preview-branches">
              {members
                .filter((p) => p.parents.includes('p1'))
                .map((p) => (
                  <Link
                    href={`/family-tree?person=${p.id}`}
                    className={`branch-preview branch-${p.branch}`}
                    key={p.id}
                  >
                    <small>{branchName(p.branch)}</small>
                    <strong>{p.name}</strong>
                    <span>
                      Đời thứ 2 <ArrowRight size={16} />
                    </span>
                  </Link>
                ))}
            </div>
            <Link className="preview-bottom" href="/family-tree">
              <CornerDownRight size={16} />
              <span>Tiếp nối qua 5 thế hệ</span>
              <span>
                Khám phá <ArrowRight size={15} />
              </span>
            </Link>
          </div>
        </section>
        <section className="anniversary-overview">
          <div className="section-heading">
            <div>
              <div className="eyebrow">TƯỞNG NHỚ TIỀN NHÂN</div>
              <h2>Ngày giỗ sắp tới</h2>
            </div>
            <Flower2 className="muted-icon" />
          </div>
          <div className="anniversary-list">
            {upcoming.map(({ person: p, daysAway }) => (
              <Link
                href={`/lunar-calendar?person=${p.id}`}
                className="anniversary-row"
                key={p.id}
              >
                <span className="date-block">
                  <strong>{p.anniversary!.day}</strong>
                  <small>Tháng {p.anniversary!.month}</small>
                </span>
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    Đời {p.generation} · {branchName(p.branch)}
                  </small>
                  <span className="lunar-label">
                    Âm lịch ·{' '}
                    {daysAway === 0 ? 'Hôm nay' : `Còn ${daysAway} ngày`}
                  </span>
                </span>
                <ChevronRight size={17} />
              </Link>
            ))}
          </div>
          <Link className="calendar-link" href="/lunar-calendar">
            Xem lịch âm & ngày giỗ <ArrowRight size={17} />
          </Link>
          <p className="quiet-note">
            Uống nước nhớ nguồn,
            <br />
            đời đời ghi nhớ công ơn tổ tiên.
          </p>
        </section>
      </div>
      <section className="history-band">
        <div className="container history-teaser">
          <div className="history-number">
            01<span>CỘI NGUỒN</span>
          </div>
          <div>
            <div className="eyebrow">NHỮNG CÂU CHUYỆN ĐƯỢC LƯU GIỮ</div>
            <h2>Từ nếp nhà, thành dòng họ.</h2>
            <p>
              Gia phả là nơi lưu lại tên tuổi, những mối dây thân thuộc và ký ức
              được trao truyền qua từng thế hệ.
            </p>
            <Link className="text-link" href="/history">
              Đọc lịch sử dòng họ <ArrowRight size={17} />
            </Link>
          </div>
          <div className="heritage-seal">
            <BookOpen size={30} />
            <span>GIA PHẢ</span>
            <strong>Nguyễn Bá</strong>
            <small>
              <MapPin size={13} /> Nam Định · Dữ liệu mẫu
            </small>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
