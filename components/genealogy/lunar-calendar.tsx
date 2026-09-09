'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { vi } from 'date-fns/locale';
import { isSameMonth } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Flower2,
  ArrowRight,
  GitFork,
  ChevronRight,
} from 'lucide-react';
import { Calendar, CalendarDayButton } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { useFamily } from './provider';
import { Footer } from './header';
import { Avatar } from './home';
import { Choice, branchOptions } from './common';
import { branchName } from '@/lib/family';
import {
  anniversariesOn,
  upcomingAnniversaries,
  lunarOf,
  vietnamToday,
  dateLabel,
  getYearCanChi,
} from '@/lib/lunar';
export function LunarPage() {
  const { members } = useFamily();
  const params = useSearchParams();
  const [today] = useState(vietnamToday);
  const [month, setMonth] = useState(today);
  const [selected, setSelected] = useState(today);
  const [branch, setBranch] = useState('all');
  const filtered = useMemo(
    () =>
      members.filter((p) => branch === 'all' || p.branch === Number(branch)),
    [members, branch],
  );
  const upcoming = useMemo(
    () => upcomingAnniversaries(filtered, today),
    [filtered, today],
  );
  useEffect(() => {
    const event = upcoming.find((e) => e.person.id === params.get('person'));
    if (event) {
      setMonth(event.date);
      setSelected(event.date);
    }
  }, [params, upcoming]);
  const lunar = lunarOf(selected);
  const events = anniversariesOn(filtered, selected);
  const monthEvents = upcoming.filter((e) => isSameMonth(e.date, month));
  return (
    <main id="main">
      <div className="container page-space">
        <div className="page-heading">
          <div>
            <div className="eyebrow">GHI NHỚ NGÀY GIỖ TỔ TIÊN</div>
            <h1>Lịch âm & ngày giỗ</h1>
            <p>Năm {getYearCanChi(lunarOf(month).year)} · Giờ Việt Nam</p>
          </div>
          <Button
            variant="outline"
            className="action-button"
            onClick={() => {
              setMonth(today);
              setSelected(today);
            }}
          >
            <CalendarIcon />
            Hôm nay
          </Button>
        </div>
        <div className="calendar-layout">
          <section className="calendar-main">
            <div className="calendar-filter">
              <Choice
                label="Lọc ngày giỗ theo chi"
                value={branch}
                onChange={setBranch}
                options={branchOptions}
              />
              <span>
                <i /> Ngày giỗ dòng họ
              </span>
            </div>
            <Calendar
              mode="single"
              locale={vi}
              weekStartsOn={1}
              month={month}
              onMonthChange={setMonth}
              selected={selected}
              onSelect={(d) => d && setSelected(d)}
              className="lunar-calendar"
              startMonth={new Date(1900, 0, 1)}
              endMonth={new Date(2198, 11, 1)}
              today={today}
              fixedWeeks
              components={{
                DayButton: (props) => {
                  const l = lunarOf(props.day.date);
                  const events = anniversariesOn(filtered, props.day.date);
                  return (
                    <CalendarDayButton
                      {...props}
                      className="lunar-day"
                      aria-label={`${dateLabel(props.day.date)}, âm lịch ${l.day}/${l.month}${l.leap ? ' nhuận' : ''}${events.length ? `, ${events.length} ngày giỗ` : ''}`}
                    >
                      <strong>{props.day.date.getDate()}</strong>
                      <span
                        className={
                          l.day === 1 || l.day === 15 ? 'lunar-special' : ''
                        }
                      >
                        {l.day === 1 ? `${l.day}/${l.month}` : l.day}
                        {l.leap ? 'n' : ''}
                      </span>
                      {events.length > 0 && <i className="event-dot" />}
                    </CalendarDayButton>
                  );
                },
              }}
            />
            <div className="calendar-footnote">
              <span>
                Ngày dương <b>09</b>
              </span>
              <span>
                Ngày âm <small>28</small>
              </span>
              <span>n: tháng nhuận</span>
            </div>
          </section>
          <aside className="day-panel">
            <div className="selected-date">
              <span>
                {selected.toLocaleDateString('vi-VN', { weekday: 'long' })}
              </span>
              <strong>{selected.getDate()}</strong>
              <p>
                Tháng {selected.getMonth() + 1}, {selected.getFullYear()}
              </p>
              <div>
                Ngày {lunar.day} tháng {lunar.month}
                {lunar.leap ? ' nhuận' : ''} âm lịch
                <small>Năm {getYearCanChi(lunar.year)}</small>
              </div>
            </div>
            <div className="day-events">
              <h3>
                <Flower2 size={18} /> Ngày giỗ{' '}
                {events.length > 0 && `(${events.length})`}
              </h3>
              {events.length ? (
                events.map((p) => (
                  <div className="day-event" key={p.id}>
                    <Avatar person={p} />
                    <Link href={`/members/${p.id}`}>
                      <strong>{p.name}</strong>
                      <small>
                        Đời {p.generation} · {branchName(p.branch)}
                      </small>
                    </Link>
                    <Link
                      title="Xem trên cây"
                      aria-label={`Xem ${p.name} trên cây`}
                      href={`/family-tree?person=${p.id}`}
                    >
                      <GitFork size={19} />
                    </Link>
                  </div>
                ))
              ) : (
                <p className="muted">
                  Không có ngày giỗ được ghi nhận trong ngày này.
                </p>
              )}
            </div>
          </aside>
        </div>
        <section className="upcoming-section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">THÀNH KÍNH TƯỞNG NHỚ</div>
              <h2>Ngày giỗ sắp tới</h2>
            </div>
            <span className="muted">
              {monthEvents.length} ngày giỗ sắp tới trong tháng đang xem
            </span>
          </div>
          <div className="upcoming-grid">
            {upcoming.slice(0, 6).map(({ person: p, date, daysAway }) => (
              <button
                className="upcoming-event"
                key={p.id}
                onClick={() => {
                  setSelected(date);
                  setMonth(date);
                  document
                    .querySelector('.calendar-layout')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                <span className="date-block">
                  <strong>{p.anniversary!.day}</strong>
                  <small>Tháng {p.anniversary!.month} âm</small>
                </span>
                <span>
                  <strong>{p.name}</strong>
                  <small>{dateLabel(date)} dương lịch</small>
                  <em>{daysAway === 0 ? 'Hôm nay' : `Còn ${daysAway} ngày`}</em>
                </span>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
          <p className="calendar-policy">
            Ngày giỗ được tính vào tháng âm thường; ngày 30 trong tháng thiếu
            được ghi nhớ vào ngày 29. Thông tin gia phả hiện là dữ liệu mẫu.
          </p>
        </section>
      </div>
      <Footer />
    </main>
  );
}
