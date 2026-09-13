'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { isSameMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar, CalendarDayButton } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFamily } from './provider';
import { Footer } from './header';
import { HeritageIcon } from './heritage-icon';
import { Avatar } from './member-avatar';
import {
  MemorialDetailDialog,
  memorialRelationship,
} from './memorial-detail-dialog';
import { Choice, branchOptions, ResultsPagination } from './common';
import {
  memberBranchName,
  memberName,
  type Member,
} from '@/lib/family';
import { dateLabel, vietnamToday } from '@/lib/lunar';
import {
  getFamilyEventsForDate,
  getLunarDayInfo,
  getLunarYearCanChi,
  getMemorialEvents,
  getUpcomingFamilyEvents,
} from '@/lib/lunar-calendar/service';
import type { UpcomingFamilyEvent } from '@/lib/lunar-calendar/types';

function LunarCalendarView() {
  const { members } = useFamily();
  const params = useSearchParams();
  const [today] = useState(vietnamToday);
  const [month, setMonth] = useState(today);
  const [selected, setSelected] = useState(today);
  const [branch, setBranch] = useState('all');
  const [activeEvent, setActiveEvent] = useState<UpcomingFamilyEvent | null>(
    null,
  );
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
        <div className="page-heading lunar-page-heading">
          <div>
            <div className="eyebrow">GHI NHỚ NGÀY GIỖ TỔ TIÊN</div>
            <h1>Lịch âm & ngày giỗ</h1>
            <p>Năm {getLunarYearCanChi(lunarYear)} · Giờ Việt Nam</p>
          </div>
          <Button
            variant="outline"
            className="action-button calendar-today-button"
            onClick={() => {
              setMonth(today);
              setSelected(today);
            }}
          >
            <HeritageIcon name="today" size={20} />
            Hôm nay
          </Button>
        </div>

        <div className="calendar-layout">
          <section className="calendar-main">
            <div className="calendar-filter">
              <span className="calendar-memorial-key">
                <i /> Ngày giỗ
              </span>
              <Choice
                label="Lọc ngày giỗ theo chi"
                value={branch}
                onChange={setBranch}
                options={branchOptions}
              />
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
                  return (
                    <CalendarDayButton
                      {...props}
                      className="lunar-day"
                      data-has-memorial={dayEvents.length > 0 || undefined}
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
                      {dayEvents.length > 0 && <i className="event-dot" />}
                    </CalendarDayButton>
                  );
                },
              }}
            />
            {info.supported && (
              <div className="calendar-footnote" aria-label="Thông tin ngày đã chọn">
                <span className="calendar-footnote-item">
                  <small>Ngày dương</small>
                  <strong>{selected.getDate()}</strong>
                </span>
                <span className="calendar-footnote-item">
                  <small>Ngày âm</small>
                  <strong>
                    {info.lunar.day}/{info.lunar.month}
                    {info.lunar.leapMonth ? ' nhuận' : ''}
                  </strong>
                </span>
                <span className="calendar-footnote-key">
                  <b>n</b> tháng nhuận
                </span>
              </div>
            )}
          </section>

          <aside className="day-panel">
            {info.supported ? (
              <>
                <div className="selected-date">
                  <div className="solar-date">
                    <span>{info.solar.weekday}</span>
                    <strong>{info.solar.day}</strong>
                    <p>
                      Tháng {info.solar.month}, {info.solar.year}
                    </p>
                  </div>
                  <div className="lunar-date-summary">
                    <span>Âm lịch</span>
                    <strong>
                      {info.lunar.day} tháng {info.lunar.month}
                      {info.lunar.leapMonth ? ' nhuận' : ''}
                    </strong>
                    <small>Năm {info.canChi.year}</small>
                  </div>
                </div>

                <section className="day-events">
                  <h3>
                    <HeritageIcon name="memorial" size={18} /> Ngày giỗ{' '}
                    {events.length > 0 && `(${events.length})`}
                  </h3>
                  {events.length ? (
                    events.map(({ event, isApproximate }) => {
                      const nextOccurrence = getUpcomingFamilyEvents({
                        members: filtered,
                        from: today,
                        limit: filtered.length,
                      }).find((occurrence) => occurrence.event.id === event.id);
                      const occurrence = nextOccurrence || {
                        event,
                        date: selected,
                        isApproximate,
                        daysAway: 0,
                      };
                      return event.person ? (
                        <button
                          className="day-event"
                          key={event.id}
                          onClick={() => setActiveEvent(occurrence)}
                          type="button"
                        >
                          <Avatar person={event.person} />
                          <div className="day-event-copy">
                            <strong>{memberName(event.person)}</strong>
                            <small>
                              Đời {event.person.generation} ·{' '}
                              {memberBranchName(event.person, members)}
                            </small>
                            <small className="day-event-lunar">
                              {info.lunar.day} tháng {info.lunar.month} ÂL
                              {info.lunar.leapMonth ? ' nhuận' : ''}
                              {isApproximate ? ' · Điều chỉnh tháng thiếu' : ''}
                            </small>
                          </div>
                          <span className="day-event-link">
                            Chi tiết
                            <HeritageIcon name="next" size={15} />
                          </span>
                        </button>
                      ) : (
                        <button
                          className="day-event clan-memorial-event"
                          key={event.id}
                          onClick={() => setActiveEvent(occurrence)}
                          type="button"
                        >
                          <span className="clan-memorial-mark" aria-hidden="true">
                            <HeritageIcon name="memorial" size={20} />
                          </span>
                          <div className="day-event-copy">
                            <strong>{event.title}</strong>
                            <small>Ngày giỗ chung của dòng họ</small>
                            <small className="day-event-lunar">
                              {info.lunar.day} tháng {info.lunar.month} ÂL
                              {isApproximate ? ' · Điều chỉnh tháng thiếu' : ''}
                            </small>
                          </div>
                          <span className="day-event-link">
                            Chi tiết
                            <HeritageIcon name="next" size={15} />
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="muted">
                      Không có ngày giỗ được ghi nhận trong ngày này.
                    </p>
                  )}
                </section>

                <section className="day-traditional">
                  <h3>
                    <HeritageIcon name="family-record" size={17} /> Lịch truyền thống
                  </h3>
                  <Tabs
                    defaultValue="overview"
                    className="day-traditional-tabs"
                  >
                    <TabsList
                      className="day-traditional-tabs-list"
                      aria-label="Thông tin ngày"
                    >
                      <TabsTrigger value="overview">Trong ngày</TabsTrigger>
                      <TabsTrigger value="details">Việc nên biết</TabsTrigger>
                    </TabsList>

                    <TabsContent
                      value="overview"
                      className="day-traditional-content"
                    >
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
                          <span>Trực ngày</span>
                          <strong>
                            {info.truc} · {info.dayClassification}
                          </strong>
                        </div>
                        <div>
                          <span>28 Tú</span>
                          <strong>{info.traditional.twentyEightMansion}</strong>
                        </div>
                        <div>
                          <span>Ngũ hành</span>
                          <strong>{info.element.name}</strong>
                        </div>
                        <div>
                          <span>Con giáp năm</span>
                          <strong>{info.zodiac}</strong>
                        </div>
                      </div>
                      <p className="truc-note">
                        {info.traditional.trucMeaning}
                      </p>

                      <div className="hour-groups">
                        <div>
                          <h4>
                            <HeritageIcon
                              className="traditional-heading-icon"
                              name="auspicious-hour"
                              size={16}
                            />{' '}
                            Giờ Hoàng Đạo
                          </h4>
                          <div className="chip-row">
                            {info.goodHours.map((hour) => (
                              <span key={hour}>{hour}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4>
                            <HeritageIcon
                              className="traditional-heading-icon"
                              name="inauspicious-hour"
                              size={16}
                            />{' '}
                            Giờ Hắc Đạo
                          </h4>
                          <div className="chip-row chip-row-muted">
                            {info.badHours.map((hour) => (
                              <span key={hour}>{hour}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="trad-subsection direction-section">
                        <h4>
                          <HeritageIcon
                            className="traditional-heading-icon"
                            name="departure-direction"
                            size={16}
                          />{' '}
                          Hướng xuất hành
                        </h4>
                        <div className="direction-row">
                          <span>
                            Hỷ Thần: <b>{info.traditional.directions.hyThan}</b>
                          </span>
                          <span>
                            Tài Thần:{' '}
                            <b>{info.traditional.directions.taiThan}</b>
                          </span>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent
                      value="details"
                      className="day-traditional-content"
                    >
                      <div className="star-grid">
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

                      <div className="activity-grid">
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
                        <div className="festival-list">
                          <h4>
                            <HeritageIcon name="favorite" size={15} /> Ngày lễ
                          </h4>
                          {info.traditional.festivals.map((festival) => (
                            <span key={festival.id}>{festival.name}</span>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
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
            {upcoming.slice(0, 6).map(({ event, date, daysAway, isApproximate }) => (
              <button
                className={`upcoming-event ${event.person ? '' : 'is-clan-memorial'}`}
                key={event.id}
                onClick={() =>
                  setActiveEvent({ event, date, daysAway, isApproximate })
                }
                type="button"
              >
                <span className="date-block">
                  <strong>{event.lunarDay}</strong>
                  <small>Tháng {event.lunarMonth} âm</small>
                </span>
                <span>
                  <strong>{event.person ? memberName(event.person) : event.title}</strong>
                  <small>
                    {event.person
                      ? `${dateLabel(date)} dương lịch`
                      : 'Ngày giỗ chung của dòng họ'}
                  </small>
                  <em>
                    {daysAway === 0 ? 'Hôm nay' : `Còn ${daysAway} ngày`}
                    {isApproximate ? ' · Tháng thiếu' : ''}
                  </em>
                </span>
                <HeritageIcon name="next" size={17} />
              </button>
            ))}
          </div>
          <p className="calendar-policy">
            <span className="calendar-policy-info" aria-hidden="true">
              i
            </span>
            <span>
              <strong>Cách tính ngày giỗ:</strong> Ngày giỗ lặp theo ngày âm
              không nhuận. Nếu ngày 30 gặp tháng thiếu, lịch sẽ ghi rõ là điều
              chỉnh sang ngày 29 thay vì tự đổi ngày âm.
            </span>
          </p>
        </section>
      </div>
      <MemorialDetailDialog
        activeEvent={activeEvent}
        members={members}
        onOpenChange={(open) => !open && setActiveEvent(null)}
      />
      <Footer />
    </main>
  );
}

function MemorialsView() {
  const { members } = useFamily();
  const [today] = useState(vietnamToday);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [pageSize, setPageSize] = useState('10');
  const [page, setPage] = useState(1);
  const [activeEvent, setActiveEvent] = useState<UpcomingFamilyEvent | null>(
    null,
  );
  const { clanMemorial, memberMemorials } = useMemo(() => {
    const events = getMemorialEvents({ members, from: today });
    return {
      clanMemorial: events.find((occurrence) => !occurrence.event.person) ?? null,
      memberMemorials: events.filter((occurrence) => Boolean(occurrence.event.person)),
    };
  }, [members, today]);
  const size =
    pageSize === 'all' ? Math.max(1, memberMemorials.length) : Number(pageSize);
  const total = Math.max(1, Math.ceil(memberMemorials.length / size));
  const currentPage = Math.min(page, total);
  const pageEvents = memberMemorials.slice(
    (currentPage - 1) * size,
    currentPage * size,
  );

  return (
    <main id="main" className="memorial-page">
      <div className="container page-space">
        <div className="page-heading memorial-page-heading">
          <div>
            <div className="eyebrow">THÀNH KÍNH TƯỞNG NHỚ</div>
            <h1>Ngày giỗ</h1>
            <p>
              {memberMemorials.length} ngày giỗ thành viên được ghi nhận trong gia phả
            </p>
          </div>
        </div>

        <div className="results-summary memorial-results-summary">
          <span>{memberMemorials.length} ngày giỗ thành viên</span>
          <div className="view-toggle" aria-label="Kiểu hiển thị">
            <span className="view-toggle-label">Hiển thị</span>
            <Button
              variant="ghost"
              className="view-toggle-button"
              data-active={view === 'grid'}
              aria-label="Dạng thẻ"
              aria-pressed={view === 'grid'}
              title="Dạng thẻ"
              onClick={() => {
                setView('grid');
                setPage(1);
              }}
            >
              <HeritageIcon name="grid" size={18} />
            </Button>
            <Button
              variant="ghost"
              className="view-toggle-button"
              data-active={view === 'list'}
              aria-label="Danh sách"
              aria-pressed={view === 'list'}
              title="Danh sách"
              onClick={() => {
                setView('list');
                setPage(1);
              }}
            >
              <HeritageIcon name="list" size={18} />
            </Button>
          </div>
        </div>

        {clanMemorial && (
          <button
            className="clan-memorial-feature"
            type="button"
            aria-label={`Xem chi tiết ${clanMemorial.event.title}`}
            onClick={() => setActiveEvent(clanMemorial)}
          >
            <span className="clan-memorial-feature-icon" aria-hidden="true">
              <HeritageIcon name="memorial" size={27} />
            </span>
            <span className="clan-memorial-feature-copy">
              <span className="eyebrow">NGÀY GIỖ HỌ</span>
              <strong>{clanMemorial.event.title}</strong>
              <small>
                {clanMemorial.event.lunarDay} tháng {clanMemorial.event.lunarMonth} âm lịch
                {' · '}
                {dateLabel(clanMemorial.date)} dương lịch
              </small>
            </span>
            <span className="clan-memorial-feature-action">
              {clanMemorial.daysAway === 0
                ? 'Hôm nay'
                : `Còn ${clanMemorial.daysAway} ngày`}
              <HeritageIcon name="next" size={18} />
            </span>
          </button>
        )}

        {view === 'grid' ? (
          <section className="memorial-card-grid" aria-label="Thẻ ngày giỗ">
            {pageEvents.map((occurrence) => {
              const { event, date, daysAway, isApproximate } = occurrence;
              return (
                <button
                  className={`memorial-event-card${event.person ? '' : ' is-clan-memorial'}`}
                  key={event.id}
                  aria-label={`Xem chi tiết ngày giỗ ${event.person ? memberName(event.person) : event.title}`}
                  onClick={() => setActiveEvent(occurrence)}
                  type="button"
                >
                  <span className="memorial-date-block">
                    <strong>{event.lunarDay}</strong>
                    <small>Tháng {event.lunarMonth} âm</small>
                  </span>
                  <span className="memorial-card-copy">
                    <span className="memorial-card-person">
                      {event.person ? (
                        <Avatar person={event.person} />
                      ) : (
                        <span className="memorial-clan-mark" aria-hidden="true">
                          <HeritageIcon name="memorial" size={20} />
                        </span>
                      )}
                      <span>
                        <strong>{event.person ? memberName(event.person) : event.title}</strong>
                        <small>{memorialRelationship(occurrence, members)}</small>
                      </span>
                    </span>
                    <span className="memorial-card-footer">
                      <small>
                        {dateLabel(date)} dương lịch
                        {isApproximate ? ' · Tháng thiếu' : ''}
                      </small>
                      <em>
                        {daysAway === 0 ? 'Hôm nay' : `Còn ${daysAway} ngày`}
                      </em>
                      <HeritageIcon name="next" size={17} />
                    </span>
                  </span>
                </button>
              );
            })}
          </section>
        ) : (
          <section className="memorial-directory" aria-label="Danh sách ngày giỗ">
            <div className="memorial-directory-heading" aria-hidden="true">
              <span>Ngày âm</span>
              <span>Người được tưởng niệm</span>
              <span>Quan hệ gia phả</span>
              <span>Ngày dương</span>
              <span />
            </div>
            {pageEvents.map((occurrence) => {
              const { event, date, isApproximate } = occurrence;
              return (
                <button
                  className={`memorial-list-row${event.person ? '' : ' is-clan-memorial'}`}
                  key={event.id}
                  onClick={() => setActiveEvent(occurrence)}
                  type="button"
                >
                  <span className="memorial-list-date">
                    <strong>{event.lunarDay}</strong>
                    <small>Tháng {event.lunarMonth} âm</small>
                  </span>
                  <span className="memorial-list-person">
                    {event.person ? (
                      <Avatar person={event.person} />
                    ) : (
                      <span className="memorial-clan-mark" aria-hidden="true">
                        <HeritageIcon name="memorial" size={19} />
                      </span>
                    )}
                    <span>
                      <strong>{event.person ? memberName(event.person) : event.title}</strong>
                      <small>
                        {event.person
                          ? `Đời ${event.person.generation} · ${memberBranchName(event.person, members)}`
                          : 'Lễ giỗ chung của dòng họ'}
                      </small>
                    </span>
                  </span>
                  <span className="memorial-list-relation">
                    {memorialRelationship(occurrence, members)}
                  </span>
                  <span className="memorial-list-solar">
                    {dateLabel(date)}
                    {isApproximate ? ' · Tháng thiếu' : ''}
                  </span>
                  <HeritageIcon name="next" size={17} />
                </button>
              );
            })}
          </section>
        )}

        <ResultsPagination
          page={currentPage}
          total={total}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
          variant={view === 'grid' ? 'cards' : 'standard'}
        />
      </div>

      <MemorialDetailDialog
        activeEvent={activeEvent}
        members={members}
        onOpenChange={(open) => !open && setActiveEvent(null)}
      />
      <Footer />
    </main>
  );
}

export function LunarPage() {
  const params = useSearchParams();
  const activeTab = params.get('tab') === 'memorials' ? 'memorials' : 'calendar';

  return (
    <>
      <div className="family-tree-tabs-band lunar-tabs-band">
        <div className="container">
          <nav className="family-tree-tabs" aria-label="Xem lịch gia phả">
            <Link
              className={activeTab === 'calendar' ? 'is-active' : ''}
              href="/lunar-calendar"
            >
              <HeritageIcon name="calendar" size={18} />
              Lịch âm
            </Link>
            <Link
              className={activeTab === 'memorials' ? 'is-active' : ''}
              href="/lunar-calendar?tab=memorials"
            >
              <HeritageIcon name="memorial" size={18} />
              Ngày giỗ
            </Link>
          </nav>
        </div>
      </div>
      {activeTab === 'memorials' ? <MemorialsView /> : <LunarCalendarView />}
    </>
  );
}
