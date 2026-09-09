'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Search,
  GitFork,
  Users,
  Layers3,
  Flower2,
  BookOpen,
  ChevronRight,
  MapPin,
  CalendarDays,
  MoonStar,
  Clock3,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useFamily } from './provider';
import { Footer } from './header';
import { branchName, initials, searchMembers, type Member } from '@/lib/family';
import {
  getYearCanChi,
  lunarOf,
  upcomingAnniversaries,
  vietnamDate,
  vietnamToday,
} from '@/lib/lunar';
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

function VietnamClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let interval: number | undefined;
    const update = () => setNow(new Date());
    const frame = window.requestAnimationFrame(update);
    const timeout = window.setTimeout(() => {
      update();
      interval = window.setInterval(update, 1000);
    }, 1000 - new Date().getMilliseconds());

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      if (interval) window.clearInterval(interval);
    };
  }, []);

  const displayTime = now
    ? new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }).format(now)
    : '--:--:--';
  const solarDate = now
    ? new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now)
    : 'Đang cập nhật ngày dương';
  const lunar = now ? lunarOf(vietnamDate(now)) : null;

  return (
    <div className="hero-utility" aria-live="polite">
      <span className="hero-utility-item">
        <CalendarDays aria-hidden="true" />
        <span>{solarDate}</span>
      </span>
      <span className="hero-utility-divider" aria-hidden="true" />
      <span className="hero-utility-item">
        <MoonStar aria-hidden="true" />
        <span>
          {lunar
            ? `${lunar.day}/${lunar.month}${lunar.leap ? ' nhuận' : ''} ${getYearCanChi(lunar.year)}`
            : 'Đang cập nhật ngày âm'}
        </span>
      </span>
      <span className="hero-utility-divider" aria-hidden="true" />
      <time className="hero-utility-item hero-utility-time" dateTime={now?.toISOString()}>
        <Clock3 aria-hidden="true" />
        <span>{displayTime}</span>
      </time>
    </div>
  );
}

function getBranchSummary(person: Member, members: Member[]) {
  const descendantIds = new Set<string>();
  const pending = [person.id];

  while (pending.length) {
    const parentId = pending.shift();
    if (!parentId) continue;

    for (const child of members) {
      if (!child.parents.includes(parentId) || descendantIds.has(child.id))
        continue;
      descendantIds.add(child.id);
      pending.push(child.id);
    }
  }

  const farthestGeneration = Math.max(
    person.generation,
    ...members
      .filter((member) => descendantIds.has(member.id))
      .map((member) => member.generation),
  );

  return {
    descendants: descendantIds.size,
    generations: farthestGeneration - person.generation + 1,
  };
}

export function HomePage() {
  const { members } = useFamily();
  const [query, setQuery] = useState('');
  const found = searchMembers(members, query).slice(0, 4);
  const [today] = useState(vietnamToday);
  const upcoming = useMemo(
    () => upcomingAnniversaries(members, today).slice(0, 3),
    [members, today],
  );
  const branchPreviews = useMemo(
    () =>
      members
        .filter(
          (person) =>
            person.generation === 2 &&
            person.branch > 0 &&
            person.gender === 'male',
        )
        .map((person) => ({
          person,
          ...getBranchSummary(person, members),
        })),
    [members],
  );
  const stats = useMemo(() => {
    const generations = members.length
      ? Math.max(...members.map((person) => person.generation))
      : 5;
    const branches = new Set(
      members
        .filter((person) => person.branch > 0)
        .map((person) => person.branch),
    ).size;
    const founderYears = members
      .map((person) => person.born)
      .filter(Boolean);
    const founderYear = founderYears.length ? Math.min(...founderYears) : 1872;

    return [
      { icon: Users, value: members.length, label: 'Thành viên' },
      { icon: Layers3, value: generations, label: 'Thế hệ' },
      { icon: GitFork, value: branches || 3, label: 'Chi họ' },
      { icon: BookOpen, value: founderYear, label: 'Khởi nguồn' },
    ];
  }, [members]);
  return (
    <main id="main">
      <section className="home-hero">
        <Image
          className="heritage-art"
          src="/heritage-hero.png"
          alt=""
          fill
          priority
          sizes="(max-width: 900px) 100vw, 1200px"
        />
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
            <Link className="action-button hero-tree-link" href="/family-tree">
              <GitFork />
              Khám phá cây gia phả
              <ArrowRight />
            </Link>
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
          <VietnamClock />
        </div>
      </section>
      <section className="home-stats-band" aria-label="Tổng quan về dòng họ">
        <div className="container">
          <div className="home-quick-stats">
            {stats.map((stat) => (
              <div className="home-quick-stat" key={stat.label}>
                <stat.icon aria-hidden="true" />
                <div>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="home-tree-band">
        <div className="container">
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
              {branchPreviews.map(({ person, descendants, generations }) => (
                  <Link
                    href={`/family-tree?person=${person.id}`}
                    className={`branch-preview branch-${person.branch}`}
                    key={person.id}
                  >
                    <small>{branchName(person.branch)}</small>
                    <strong>{person.name}</strong>
                    <span className="branch-preview-era">Đời thứ 2</span>
                    <span className="branch-preview-meta">
                      {descendants} hậu duệ · {generations} thế hệ
                      <ArrowRight size={16} />
                    </span>
                  </Link>
                ))}
            </div>
          </div>
          </section>
        </div>
      </section>
      <section className="home-anniversary-band">
        <div className="container">
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
                <span className="anniversary-person">
                  <strong>{p.name}</strong>
                  <small>
                    Đời {p.generation} · {branchName(p.branch)}
                  </small>
                </span>
                <span className="anniversary-footer">
                  <span className="lunar-label">
                    Âm lịch ·{' '}
                    {daysAway === 0 ? 'Hôm nay' : `Còn ${daysAway} ngày`}
                  </span>
                  <ChevronRight size={17} />
                </span>
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
      </section>
      <section className="history-band">
        <div className="container history-teaser">
          <div className="history-number">
            01<span>CỘI NGUỒN</span>
          </div>
          <div className="story-copy">
            <div className="eyebrow">NHỮNG CÂU CHUYỆN ĐƯỢC LƯU GIỮ</div>
            <h2>
              Từ nếp nhà, <span>thành dòng họ.</span>
            </h2>
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
              <MapPin size={13} /> Thôn Quảng Trường, Quảng Chính, Thanh Hóa
            </small>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
