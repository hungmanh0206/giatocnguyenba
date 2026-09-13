'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { FamilyMoments } from './family-moments';
import { HeritageIcon, type HeritageIconName } from './heritage-icon';
import { MemorialDetailDialog } from './memorial-detail-dialog';
import { Avatar } from './member-avatar';
import { useFamily } from './provider';
import { Footer } from './header';
import {
  compareSiblingOrder,
  memberBranchName,
  memberName,
  memberYearRange,
  searchMembers,
  type Member,
} from '@/lib/family';
import { layoutFamily, type Household } from '@/lib/tree-layout';
import {
  getYearCanChi,
  lunarOf,
  vietnamDate,
  vietnamToday,
} from '@/lib/lunar';
import { getMemorialEvents } from '@/lib/lunar-calendar/service';
import type { UpcomingFamilyEvent } from '@/lib/lunar-calendar/types';

type QuickStat =
  | { icon: HeritageIconName; image?: never; label: string; value: number }
  | { icon?: never; image: string; label: string; value: number };

export { Avatar } from './member-avatar';
export function MemberTile({
  person,
  members,
}: {
  person: Member;
  members?: Member[];
}) {
  return (
    <Link href={`/members/${person.id}`} className="member-tile">
      <Avatar person={person} />
      <span>
        <strong>{memberName(person)}</strong>
        <small>
          Đời {person.generation} · {memberBranchName(person, members)}
        </small>
      </span>
      <HeritageIcon name="next" size={17} />
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
      interval = window.setInterval(update, 60_000);
    },
    60_000 - new Date().getSeconds() * 1000 - new Date().getMilliseconds());

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
        hourCycle: 'h23',
      }).format(now)
    : '--:--';
  const solarDate = now
    ? new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now)
    : 'Đang cập nhật ngày dương';
  const compactSolarDate = now
    ? (() => {
        const parts = new Intl.DateTimeFormat('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          weekday: 'long',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).formatToParts(now);
        const part = (type: Intl.DateTimeFormatPartTypes) =>
          parts.find((value) => value.type === type)?.value || '';
        return `${part('weekday')}, ${part('day')}/${part('month')}/${part('year')}`;
      })()
    : 'Đang cập nhật ngày dương';
  const lunar = now ? lunarOf(vietnamDate(now)) : null;

  return (
    <div className="hero-utility" aria-live="polite">
      <div className="hero-utility-primary">
        <span className="hero-utility-item hero-utility-date">
          <HeritageIcon className="hero-calendar-icon" name="solar-calendar" size={16} />
          <span className="hero-date-long">{solarDate}</span>
          <span className="hero-date-compact">{compactSolarDate}</span>
        </span>
        <span className="hero-utility-divider" aria-hidden="true">
          ·
        </span>
        <span className="hero-utility-item hero-utility-lunar">
          <HeritageIcon className="hero-calendar-icon" name="time" size={16} />
          <span>
            {lunar
              ? `${lunar.day}/${lunar.month}${lunar.leap ? ' nhuận' : ''} ${getYearCanChi(lunar.year)}`
              : 'Đang cập nhật ngày âm'}
          </span>
          <small>Âm lịch</small>
        </span>
      </div>
      <time className="hero-utility-time" dateTime={now?.toISOString()}>
        <HeritageIcon name="clock" size={14} />
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
      if (!child.parents.includes(parentId) || descendantIds.has(child.id)) continue;
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
  const router = useRouter();
  const [query, setQuery] = useState('');
  const found = searchMembers(members, query).slice(0, 4);
  const [today] = useState(vietnamToday);
  const [activeMemorial, setActiveMemorial] =
    useState<UpcomingFamilyEvent | null>(null);
  const upcoming = useMemo(
    () =>
      getMemorialEvents({ members, from: today })
        .slice(0, 3),
    [members, today],
  );
  const familyPreview = useMemo(() => {
    const model = layoutFamily(members);
    const root = model.groups.find((group) => group.root);
    if (!root) return null;
    const branchGroups = model.links
      .filter((link) => link.source === root.id)
      .map((link) => model.groups.find((group) => group.id === link.target))
      .filter((group): group is Household => !!group)
      .sort((a, b) => compareSiblingOrder(a.clanMember, b.clanMember));
    return {
      founders: [root.clanMember, ...root.spouses],
      branches: branchGroups.map((group) => ({
        group,
        ...getBranchSummary(group.clanMember, members),
      })),
    };
  }, [members]);
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
      .filter((born): born is number => Number.isInteger(born));
    const founderYear = founderYears.length ? Math.min(...founderYears) : 1872;

    return [
      { icon: 'members', value: members.length, label: 'Thành viên' },
      {
        image: '/app-icons/home-generations.png',
        value: generations,
        label: 'Thế hệ',
      },
      {
        image: '/app-icons/home-branches.png',
        value: branches || 4,
        label: 'Chi họ',
      },
      { icon: 'history', value: founderYear, label: 'Khởi nguồn' },
    ] satisfies QuickStat[];
  }, [members]);
  return (
    <main id="main" className="home-page">
      <section className="home-hero">
        <Image
          className="heritage-art"
          src="/home-hero-heritage-panorama.png"
          alt=""
          fill
          priority
          sizes="(max-width: 900px) 100vw, (max-width: 1600px) 49vw, 1040px"
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
              Khám phá cây gia phả
              <HeritageIcon name="next" size={18} />
            </Link>
            <Link className="text-link hero-history-link" href="/history">
              Lịch sử dòng họ <HeritageIcon name="next" size={17} />
            </Link>
          </div>
          <div className="hero-search">
            <HeritageIcon name="search" size={21} />
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
                  found.map((p) => <MemberTile person={p} members={members} key={p.id} />)
                ) : (
                  <p>Không tìm thấy thành viên phù hợp.</p>
                )}
                <Link href={`/family-tree?tab=members&q=${encodeURIComponent(query)}`}>
                  Xem tất cả kết quả <HeritageIcon name="next" size={16} />
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
                {'image' in stat ? (
                  <img className="home-quick-stat-icon" src={stat.image} alt="" />
                ) : (
                  <HeritageIcon name={stat.icon} size={18} />
                )}
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
          <section className="tree-overview tree-overview-compact">
          <div className="section-heading">
            <div>
              <div className="eyebrow">TỪ MỘT CỘI NGUỒN</div>
              <h2>Các thế hệ trong dòng họ</h2>
            </div>
            <Link className="text-link" href="/family-tree">
              Toàn bộ gia phả <HeritageIcon name="next" size={17} />
            </Link>
          </div>
          <div className="tree-preview">
            <span className="preview-label">
              <HeritageIcon name="tree" size={15} /> Sơ đồ khởi tổ
            </span>
            {familyPreview && (
              <div className="home-family-preview">
                <div className="home-family-card is-root">
                  <div className="home-family-heading">
                    <span>KHỞI NGUỒN DÒNG HỌ</span>
                  </div>
                  {familyPreview.founders.map((person, index) => {
                    const founder = (
                      <Link
                        className="home-family-person"
                        href={`/members/${person.id}`}
                        key={person.id}
                      >
                        <Avatar person={person} />
                        <span>
                          <strong>{memberName(person)}</strong>
                          <small>
                            {memberYearRange(person)}
                          </small>
                          <em>{person.gender === 'male' ? 'Thủy tổ' : 'Phu nhân'}</em>
                        </span>
                      </Link>
                    );

                    return index === 0 ? (
                      founder
                    ) : (
                      <div className="home-family-spouse" key={person.id}>
                        {founder}
                      </div>
                    );
                  })}
                </div>
                {familyPreview.branches.length > 0 && <span className="home-family-connector" />}
                {familyPreview.branches.length > 0 && (
                  <div
                    className="home-family-branches"
                    data-branch-count={familyPreview.branches.length}
                  >
                    {familyPreview.branches.map(({ group, descendants, generations }) => (
                      <Link
                        href={`/family-tree?person=${group.clanMember.id}`}
                        className={`home-family-branch branch-${group.clanMember.branch}`}
                        key={group.id}
                        onClick={(event) => {
                          if (
                            !window.matchMedia('(max-width: 767px)').matches ||
                            event.metaKey ||
                            event.ctrlKey ||
                            event.shiftKey ||
                            event.altKey
                          ) {
                            return;
                          }

                          event.preventDefault();
                          router.push(`/members/${group.clanMember.id}`);
                        }}
                      >
                        <article className="home-family-card">
                          <div className="home-family-heading">
                            <span>
                              {memberBranchName(group.clanMember, members)}
                            </span>
                            <em>Đời thứ {group.generation}</em>
                          </div>
                          <div className="home-family-person">
                            <Avatar person={group.clanMember} />
                            <span>
                              <strong>{memberName(group.clanMember)}</strong>
                              <small className="home-family-summary">
                                <span>Đời {group.generation}</span>
                                <span>{descendants} hậu duệ</span>
                                <span>{generations} thế hệ</span>
                              </small>
                            </span>
                          </div>
                          <HeritageIcon name="next" size={16} />
                        </article>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
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
          </div>
          <div className="anniversary-list">
            {upcoming.map((occurrence) => {
              const { event } = occurrence;
              const p = event.person;
              return (
              <button
                className="anniversary-row"
                key={event.id}
                aria-label={`Xem chi tiết ngày giỗ ${p ? memberName(p) : event.title}`}
                onClick={() => setActiveMemorial(occurrence)}
                type="button"
              >
                <span className="date-block">
                  <strong>{event.lunarDay}</strong>
                  <small>Tháng {event.lunarMonth}</small>
                </span>
                <span className={`anniversary-person${p ? '' : ' is-clan-memorial'}`}>
                  <strong>{p ? memberName(p) : event.title}</strong>
                  <small>
                    {p
                      ? `Đời ${p.generation} · ${memberBranchName(p, members)}`
                      : 'Ngày tưởng niệm chung của toàn dòng họ'}
                  </small>
                </span>
                <span className="anniversary-footer">
                  <span className="lunar-label">
                    Âm lịch ·{' '}
                    {occurrence.daysAway === 0
                      ? 'Hôm nay'
                      : `Còn ${occurrence.daysAway} ngày`}
                  </span>
                  <HeritageIcon name="next" size={17} />
                </span>
              </button>
              );
            })}
          </div>
          <Link className="calendar-link" href="/lunar-calendar">
            Xem lịch âm & ngày giỗ <HeritageIcon name="next" size={17} />
          </Link>
          <p className="quiet-note">
            Uống nước nhớ nguồn,
            <br />
            đời đời ghi nhớ công ơn tổ tiên.
          </p>
          </section>
        </div>
      </section>
      <MemorialDetailDialog
        activeEvent={activeMemorial}
        members={members}
        onOpenChange={(open) => !open && setActiveMemorial(null)}
      />
      <FamilyMoments />
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
              Đọc lịch sử dòng họ <HeritageIcon name="next" size={17} />
            </Link>
          </div>
          <div className="heritage-seal">
            <HeritageIcon name="history" size={30} />
            <span>GIA PHẢ</span>
            <strong>Nguyễn Bá</strong>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
