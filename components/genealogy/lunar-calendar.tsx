'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { isSameMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  ChevronRight,
  Clock3,
  Compass,
  Flower2,
  GitFork,
  Sparkles,
  Stars,
} from 'lucide-react';
import { Calendar, CalendarDayButton } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { useFamily } from './provider';
import { Footer } from './header';
import { Avatar } from './home';
import { Choice, branchOptions } from './common';
import { branchName } from '@/lib/family';
import { dateLabel, vietnamToday } from '@/lib/lunar';
import {
  getFamilyEventsForDate,
  getLunarDayInfo,
  getLunarYearCanChi,
  getUpcomingFamilyEvents,
} from '@/lib/lunar-calendar/service';

export function LunarPage() {
  const { members } = useFamily();
  const params = useSearchParams();
  const [today] = useState(vietnamToday);
  const [month, setMonth] = useState(today);
  const [selected, setSelected] = useState(today);
  const [branch, setBranch] = useState('all');
  const filtered = useMemo(
    () =>
      members.filter((person) =>
        branch === 'all' ? true : person.branch === Number(branch),
      ),
    [members, branch],
  );
  const upcoming = useMemo(
    () =>
      getUpcomingFamilyEvents({
        members: filtered,
        from: today,
        limit: filtered.filter((person) => person.anniversary).length,
      }),
    [filtered, today],
  );

  useEffect(() => {
    const event = upcoming.find(
      (item) => item.event.person?.id === params.get('person'),
    );
    if (event) {
      setMonth(event.date);
      setSelected(event.date);
    }
  }, [params, upcoming]);

  const info = getLunarDayInfo(selected);
  const events = getFamilyEventsForDate(filtered, selected);
  const monthEvents = upcoming.filter((event) =>
    isSameMonth(event.date, month),
  );
  const lunarYear = info.supported ? info.lunar.year : month.getFullYear();

  return (
    <main id="main">
      <div className="container page-space">
        <div className="page-heading">
          <div>
            <div className="eyebrow">GHI NHỚ NGÀY GIỖ TỔ TIÊN</div>
            <h1>Lịch âm & ngày giỗ</h1>
            <p>Năm {getLunarYearCanChi(lunarYear)} · Giờ Việt Nam</p>
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
              onSelect={(date) => date && setSelected(date)}
              className="lunar-calendar"
              startMonth={new Date(1800, 0, 1)}
              endMonth={new Date(2199, 11, 1)}
              today={today}
              fixedWeeks
              components={{
                DayButton: (props) => {
                  const dayInfo = getLunarDayInfo(props.day.date);
                  if (!dayInfo.supported)
                    return <CalendarDayButton {...props} />;
                  const dayEvents = getFamilyEventsForDate(
                    filtered,
                    props.day.date,
                  );
                  const hasTradition = dayInfo.traditional.festivals.length > 0;
                  return (
                    <CalendarDayButton
                      {...props}
                      className="lunar-day"
                      data-has-tradition={hasTradition || undefined}
                      aria-label={`${dateLabel(props.day.date)}, âm lịch ${dayInfo.lunar.day}/${dayInfo.lunar.month}${dayInfo.lunar.leapMonth ? ' nhuận' : ''}${dayEvents.length ? `, ${dayEvents.length} ngày giỗ` : ''}`}
                    >
                      <strong>{props.day.date.getDate()}</strong>
                      <span
                        className={
                          dayInfo.lunar.day === 1 || dayInfo.lunar.day === 15
                            ? 'lunar-special'
                            : ''
                        }
                      >
                        {dayInfo.lunar.day === 1
                          ? `${dayInfo.lunar.day}/${dayInfo.lunar.month}`
                          : dayInfo.lunar.day}
                        {dayInfo.lunar.leapMonth ? 'n' : ''}
                      </span>
                      {(dayEvents.length > 0 || hasTradition) && (
                        <i
                          className={
                            hasTradition && !dayEvents.length
                              ? 'event-dot traditional-dot'
                              : 'event-dot'
                          }
                        />
                      )}
                    </CalendarDayButton>
                  );
                },
              }}
            />
            {info.supported && (
              <div className="calendar-footnote">
                <span>
                  Ngày dương <b>{selected.getDate()}</b>
                </span>
                <span>
                  Ngày âm{' '}
                  <small>
                    {info.lunar.day}/{info.lunar.month}
                    {info.lunar.leapMonth ? ' nhuận' : ''}
                  </small>
                </span>
                <span>n: tháng nhuận</span>
              </div>
            )}
          </section>

          <aside className="day-panel">
            {info.supported ? (
              <>
                <div className="selected-date">
                  <span>{info.solar.weekday}</span>
                  <strong>{info.solar.day}</strong>
                  <p>
                    Tháng {info.solar.month}, {info.solar.year}
                  </p>
                  <div>
                    Ngày {info.lunar.day} tháng {info.lunar.month}
                    {info.lunar.leapMonth ? ' nhuận' : ''} âm lịch
                    <small>Năm {info.canChi.year}</small>
                  </div>
                </div>

                <section className="day-traditional">
                  <h3>
                    <Sparkles size={17} /> Lịch truyền thống
                  </h3>
                  <div className="trad-facts">
                    <div>
                      <span>Can Chi ngày</span>
                      <strong>{info.canChi.day}</strong>
                    </div>
                    <div>
                      <span>Tiết khí</span>
                      <strong>{info.solarTerm}</strong>
                    </div>
                    <div>
                      <span>Trực {info.truc}</span>
                      <strong>{info.dayClassification}</strong>
                    </div>
                    <div>
                      <span>28 Tú</span>
                      <strong>{info.traditional.twentyEightMansion}</strong>
                    </div>
                    <div>
                      <span>Ngũ hành ngày</span>
                      <strong>{info.element.name}</strong>
                    </div>
                    <div>
                      <span>Con giáp năm</span>
                      <strong>{info.zodiac}</strong>
                    </div>
                  </div>
                  <p className="truc-note">{info.traditional.trucMeaning}</p>

                  <div className="trad-subsection">
                    <h4>
                      <Clock3 size={15} /> Giờ Hoàng Đạo
                    </h4>
                    <div className="chip-row">
                      {info.goodHours.map((hour) => (
                        <span key={hour}>{hour}</span>
                      ))}
                    </div>
                    <h4 className="secondary-trad-heading">Giờ Hắc Đạo</h4>
                    <div className="chip-row chip-row-muted">
                      {info.badHours.map((hour) => (
                        <span key={hour}>{hour}</span>
                      ))}
                    </div>
                  </div>

                  <div className="trad-subsection">
                    <h4>
                      <Compass size={15} /> Hướng xuất hành
                    </h4>
                    <div className="direction-row">
                      <span>
                        Hỷ Thần: <b>{info.traditional.directions.hyThan}</b>
                      </span>
                      <span>
                        Tài Thần: <b>{info.traditional.directions.taiThan}</b>
                      </span>
                    </div>
                  </div>

                  <div className="trad-subsection star-grid">
                    <div>
                      <h4>Sao tốt</h4>
                      <p>
                        {info.traditional.stars.good.join(' · ') ||
                          'Chưa ghi nhận'}
                      </p>
                    </div>
                    <div>
                      <h4>Sao hạn chế</h4>
                      <p>
                        {info.traditional.stars.bad.join(' · ') ||
                          'Chưa ghi nhận'}
                      </p>
                    </div>
                  </div>

                  <div className="trad-subsection activity-grid">
                    <div>
                      <h4>Tốt cho</h4>
                      {info.traditional.activities.good.map((activity) => (
                        <span key={activity}>{activity}</span>
                      ))}
                    </div>
                    <div>
                      <h4>Hạn chế</h4>
                      {info.traditional.activities.bad.map((activity) => (
                        <span key={activity}>{activity}</span>
                      ))}
                    </div>
                  </div>

                  {info.traditional.festivals.length > 0 && (
                    <div className="trad-subsection festival-list">
                      <h4>
                        <Stars size={15} /> Ngày lễ
                      </h4>
                      {info.traditional.festivals.map((festival) => (
                        <span key={festival.id}>{festival.name}</span>
                      ))}
                    </div>
                  )}
                </section>

                <section className="day-events">
                  <h3>
                    <Flower2 size={18} /> Ngày giỗ{' '}
                    {events.length > 0 && `(${events.length})`}
                  </h3>
                  {events.length ? (
                    events.map(({ event, isApproximate }) =>
                      event.person ? (
                        <div className="day-event" key={event.id}>
                          <Avatar person={event.person} />
                          <Link href={`/members/${event.person.id}`}>
                            <strong>{event.person.name}</strong>
                            <small>
                              Đời {event.person.generation} ·{' '}
                              {branchName(event.person.branch)}
                              {isApproximate ? ' · Điều chỉnh tháng thiếu' : ''}
                            </small>
                          </Link>
                          <Link
                            title="Xem trên cây"
                            aria-label={`Xem ${event.person.name} trên cây`}
                            href={`/family-tree?person=${event.person.id}`}
                          >
                            <GitFork size={19} />
                          </Link>
                        </div>
                      ) : null,
                    )
                  ) : (
                    <p className="muted">
                      Không có ngày giỗ được ghi nhận trong ngày này.
                    </p>
                  )}
                </section>
              </>
            ) : (
              <div className="calendar-unsupported">{info.reason}</div>
            )}
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
            {upcoming
              .slice(0, 6)
              .flatMap(({ event, date, daysAway, isApproximate }) =>
                event.person
                  ? [
                      <button
                        className="upcoming-event"
                        key={event.id}
                        onClick={() => {
                          setSelected(date);
                          setMonth(date);
                          document
                            .querySelector('.calendar-layout')
                            ?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'start',
                            });
                        }}
                      >
                        <span className="date-block">
                          <strong>{event.lunarDay}</strong>
                          <small>Tháng {event.lunarMonth} âm</small>
                        </span>
                        <span>
                          <strong>{event.person.name}</strong>
                          <small>{dateLabel(date)} dương lịch</small>
                          <em>
                            {daysAway === 0
                              ? 'Hôm nay'
                              : `Còn ${daysAway} ngày`}
                            {isApproximate ? ' · Tháng thiếu' : ''}
                          </em>
                        </span>
                        <ChevronRight size={17} />
                      </button>,
                    ]
                  : [],
              )}
          </div>
          <p className="calendar-policy">
            Ngày giỗ lặp theo ngày âm không nhuận. Nếu ngày 30 gặp tháng thiếu,
            lịch sẽ ghi rõ là điều chỉnh sang ngày 29 thay vì tự đổi ngày âm.
          </p>
        </section>
      </div>
      <Footer />
    </main>
  );
}
