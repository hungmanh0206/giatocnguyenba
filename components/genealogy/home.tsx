'use client';
import Image from 'next/image';
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
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useFamily } from './provider';
import { Footer } from './header';
import { QuickView } from './members';
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
export function MemberTile({
  person,
  onSelect,
}: {
  person: Member;
  onSelect?: (person: Member) => void;
}) {
  if (onSelect) {
    return (
      <button
        type="button"
        className="member-tile"
        onClick={() => onSelect(person)}
      >
        <Avatar person={person} />
        <span>
          <strong>{person.name}</strong>
          <small>
            Đời {person.generation} · {branchName(person.branch)}
          </small>
        </span>
        <ChevronRight size={17} />
      </button>
    );
  }

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

function countdownText(daysAway: number) {
  if (daysAway === 0) return 'Hôm nay';
  if (daysAway === 1) return 'Ngày mai';
  return `Còn ${String(daysAway).padStart(2, '0')} ngày`;
}

export function HomePage() {
  const { members } = useFamily();
  const [query, setQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<Member | null>(null);
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
      : 0;
    const branches = new Set(
      members
        .filter((person) => person.branch > 0)
        .map((person) => person.branch),
    ).size;
    const founderYears = members
      .map((person) => person.born)
      .filter(Boolean);
    const founderYear = founderYears.length ? Math.min(...founderYears) : 1872;

    const summary = [
      { icon: Users, value: members.length, label: 'Thành viên' },
      { icon: Layers3, value: generations, label: 'Thế hệ' },
    ];

    if (branches) summary.push({ icon: GitFork, value: branches, label: 'Chi họ' });
    if (founderYears.length)
      summary.push({ icon: BookOpen, value: founderYear, label: 'Khởi nguồn' });

    return summary;
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
                  found.map((p) => (
                    <MemberTile
                      person={p}
                      key={p.id}
                      onSelect={setSelectedPerson}
                    />
                  ))
                ) : (
                  <p>Không tìm thấy thành viên phù hợp.</p>
                )}
                <Link
                  href={`/family-tree?view=list&q=${encodeURIComponent(query)}`}
                >
                  Xem tất cả kết quả <ArrowRight size={16} />
                </Link>
              </div>
            )}
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
              Khám phá cây gia phả <ArrowRight size={17} />
            </Link>
          </div>
          <div className="tree-summary-stats" aria-label="Tổng quan về dòng họ">
            {stats.map((stat) => (
              <div className="tree-summary-stat" key={stat.label}>
                <stat.icon aria-hidden="true" />
                <div>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="tree-preview">
            <span className="preview-label">
              <GitFork size={15} /> Sơ đồ khởi tổ
            </span>
            <div className="root-couple">
              {members
                .filter((p) => p.generation === 1)
                .map((p) => (
                  <button
                    type="button"
                    className="ancestor"
                    key={p.id}
                    onClick={() => setSelectedPerson(p)}
                  >
                    <Avatar person={p} />
                    <strong>{p.name}</strong>
                    <small>
                      {p.born} – {p.died}
                    </small>
                    <span className="generation-tag">
                      {p.gender === 'male' ? 'Thủy tổ' : 'Phu nhân'}
                    </span>
                  </button>
                ))}
              <span className="couple-line" />
            </div>
            <div className="preview-branches">
              {branchPreviews.map(({ person, descendants, generations }) => (
                  <button
                    type="button"
                    className={`branch-preview branch-${person.branch}`}
                    key={person.id}
                    onClick={() => setSelectedPerson(person)}
                  >
                    <small>{branchName(person.branch)}</small>
                    <strong>{person.name}</strong>
                    <span className="branch-preview-era">Đời thứ 2</span>
                    <span className="branch-preview-meta">
                      {descendants} hậu duệ · {generations} thế hệ
                      <ArrowRight size={16} />
                    </span>
                  </button>
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
            {upcoming.map(({ person: p, daysAway, date }, index) => (
              <Link
                href={`/lunar-calendar?person=${p.id}`}
                className={`anniversary-row ${index === 0 ? 'is-next' : ''}`}
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
                  <small className="anniversary-solar-date">
                    {date.toLocaleDateString('vi-VN')} dương lịch
                  </small>
                </span>
                <span
                  className={`anniversary-countdown ${daysAway < 2 ? 'is-imminent' : ''}`}
                  aria-label={countdownText(daysAway)}
                >
                  <strong>{countdownText(daysAway)}</strong>
                </span>
                <span className="anniversary-footer">
                  <span className="lunar-label">
                    Ngày giỗ âm lịch
                  </span>
                  <ChevronRight size={17} />
                </span>
              </Link>
            ))}
          </div>
          <Link className="calendar-link" href="/lunar-calendar">
            Xem lịch âm & ngày giỗ <ArrowRight size={17} />
          </Link>
          <blockquote className="ancestral-quote">
            <span aria-hidden="true">“</span>
            <strong>Uống nước nhớ nguồn</strong>
            <small>Đời đời ghi nhớ công ơn tổ tiên.</small>
          </blockquote>
          </section>
        </div>
      </section>
      <QuickView
        person={selectedPerson}
        onClose={() => setSelectedPerson(null)}
        onSelect={setSelectedPerson}
      />
      <Footer />
    </main>
  );
}
