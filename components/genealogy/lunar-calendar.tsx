'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { isSameMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar, CalendarDayButton } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFamily } from './provider';
import { Footer } from './header';
import { HeritageIcon } from './heritage-icon';
import { AIButtonIcon } from '@/components/ai/ai-button-icon';
import { AIAssistantButton } from '@/components/ai/ai-assistant-button';
import { Avatar } from './member-avatar';
import {
  MemorialDetailDialog,
  memorialRelationship,
} from './memorial-detail-dialog';
import { Choice, branchOptions, ResultsPagination } from './common';
import {
  memberBranchName,
  memberName,
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
import {
  calendarActivities,
  labelForActivityLevel,
  labelForAlmanacActivity,
  resolveCustomActivity,
  type ActivityDayEvaluation,
  type AlmanacActivity,
  type CalendarActivityId,
} from '@/lib/lunar-calendar/activity-advice';
import type {
  AstrologyGender,
  AstrologyInput,
  AstrologyInterpretation,
  AstrologyProfile,
  BirthTimeAccuracy,
} from '@/lib/astrology/types';
import { astrologyFocuses, type AstrologyFocus } from '@/lib/astrology/types';
import type { AIModelPreference } from '@/lib/ai/types';

const calendarMonthOptions = Array.from({ length: 12 }, (_, month) => ({
  value: String(month),
  label: `Tháng ${month + 1}`,
}));

const calendarYearOptions = Array.from({ length: 400 }, (_, offset) => {
  const year = 1800 + offset;
  return { value: String(year), label: `Năm ${year}` };
});

const astrologyEnabled = process.env.NEXT_PUBLIC_ASTROLOGY_ENABLED !== 'false';
const aiModelOptions = [
  { value: 'auto', label: 'Tự động (Gemini → OpenAI)' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'openai', label: 'OpenAI GPT-5 mini' },
];

function inputDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function inputDateToDate(value: string, fallback: Date) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function formatBirthDateInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)]
    .filter(Boolean)
    .join('/');
}

function parseBirthDateInput(value: string) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(formatBirthDateInput(value));
  if (!match) return null;
  const [, day, month, year] = match;
  return { day: Number(day), month: Number(month), year: Number(year) };
}

type ActivityAIInterpretation = {
  shortSummary: string;
  detailedExplanation: string;
  practicalSuggestion?: string;
};

type ActivityAnalysis = {
  evaluation: ActivityDayEvaluation;
  interpretation: ActivityAIInterpretation | null;
  source: 'ai' | 'engine';
};

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

  function changeCalendarPeriod(nextMonth: number, nextYear: number) {
    const day = Math.min(
      selected.getDate(),
      new Date(nextYear, nextMonth + 1, 0).getDate(),
    );
    const nextDate = new Date(nextYear, nextMonth, day);
    setMonth(nextDate);
    setSelected(nextDate);
  }

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
              <div className="calendar-filter-controls">
                <Choice
                  label="Chọn tháng dương lịch"
                  value={String(month.getMonth())}
                  onChange={(value) =>
                    changeCalendarPeriod(Number(value), month.getFullYear())
                  }
                  options={calendarMonthOptions}
                />
                <Choice
                  label="Chọn năm dương lịch"
                  value={String(month.getFullYear())}
                  onChange={(value) =>
                    changeCalendarPeriod(month.getMonth(), Number(value))
                  }
                  options={calendarYearOptions}
                />
                <Choice
                  label="Lọc ngày giỗ theo chi"
                  value={branch}
                  onChange={setBranch}
                  options={branchOptions}
                />
              </div>
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
                <AIAssistantButton
                  className="calendar-day-ai-entry"
                  context={{ source: 'calendar', selectedDate: inputDateValue(selected) }}
                  contextLabel={`Đang xem ngày ${dateLabel(selected)}`}
                  label="Luận giải ngày này"
                  mode="calendar"
                />

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

function ActivityDayView() {
  const [today] = useState(vietnamToday);
  const [selectedDate, setSelectedDate] = useState(today);
  const [activityId, setActivityId] = useState<CalendarActivityId | null>(null);
  const [otherActivityInput, setOtherActivityInput] = useState('');
  const [modelPreference, setModelPreference] = useState<AIModelPreference>('auto');
  const [analysis, setAnalysis] = useState<ActivityAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const analysisController = useRef<AbortController | null>(null);
  const customResolution = useMemo(
    () => resolveCustomActivity(otherActivityInput),
    [otherActivityInput],
  );
  const canAnalyze = Boolean(
    activityId || (customResolution && customResolution.kind !== 'ambiguous'),
  );

  useEffect(
    () => () => {
      analysisController.current?.abort();
    },
    [],
  );

  function clearAnalysis() {
    analysisController.current?.abort();
    analysisController.current = null;
    setAnalysis(null);
    setAnalysisError(null);
    setIsAnalyzing(false);
  }

  async function requestAnalysis() {
    analysisController.current?.abort();
    const controller = new AbortController();
    analysisController.current = controller;
    setAnalysis(null);
    setAnalysisError(null);
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/almanac/interpretation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          selectedDate: inputDateValue(selectedDate),
          ...(activityId ? { activityId } : { customActivity: otherActivityInput.trim() }),
          modelPreference,
        }),
      });
      const data = (await response.json()) as ActivityAnalysis & {
        message?: string;
        suggestions?: AlmanacActivity[];
      };
      if (response.status === 422 && data.suggestions) {
        throw new Error('Bạn muốn xem theo việc nào? Hãy chọn một gợi ý ở block bên trái.');
      }
      if (!response.ok || !data.evaluation) throw new Error(data.message || 'Chưa thể phân tích ngày này.');
      if (!controller.signal.aborted) {
        setAnalysis({
          evaluation: data.evaluation,
          interpretation: data.interpretation || null,
          source: data.source,
        });
      }
    } catch (requestError) {
      if (controller.signal.aborted) return;
      setAnalysisError(
        requestError instanceof Error
          ? requestError.message
          : 'Chưa thể phân tích ngày này. Vui lòng thử lại.',
      );
    } finally {
      if (!controller.signal.aborted) setIsAnalyzing(false);
    }
  }

  function selectActivity(nextActivity: CalendarActivityId) {
    if (activityId === nextActivity) {
      setActivityId(null);
      clearAnalysis();
      return;
    }

    setActivityId(nextActivity);
    setOtherActivityInput('');
    clearAnalysis();
  }

  function selectDate(value: string) {
    const nextDate = inputDateToDate(value, today);
    setSelectedDate(nextDate);
    clearAnalysis();
  }

  function changeOtherActivity(value: string) {
    setOtherActivityInput(value);
    setActivityId(null);
    clearAnalysis();
  }

  function chooseSuggestedActivity(activity: AlmanacActivity) {
    if (calendarActivities.some((item) => item.id === activity)) {
      selectActivity(activity as CalendarActivityId);
      return;
    }
    setActivityId(null);
    setOtherActivityInput(labelForAlmanacActivity(activity));
    clearAnalysis();
  }

  return (
    <main id="main" className="calendar-tools-page">
      <div className="container page-space">
        <div className="page-heading calendar-tools-heading">
          <div>
            <div className="eyebrow">LỊCH TRUYỀN THỐNG</div>
            <h1>Xem ngày theo việc</h1>
            <p>Chọn một việc và ngày dương lịch để tham khảo Trực, sao, giờ và hướng.</p>
          </div>
        </div>

        <div className="activity-day-layout">
          <section className="activity-picker" aria-labelledby="activity-picker-title">
            <div className="calendar-tool-section-heading activity-picker-heading">
              <h2 id="activity-picker-title">Việc cần xem</h2>
              <label className="activity-date-field">
                <span>Ngày dương</span>
                <span className="tool-date-control">
                  <Input
                    aria-label="Chọn ngày dương lịch"
                    className="activity-date-input"
                    type="date"
                    value={inputDateValue(selectedDate)}
                    onChange={(event) => selectDate(event.target.value)}
                  />
                  <HeritageIcon className="tool-date-icon" name="today" size={18} />
                </span>
              </label>
            </div>

            <div className="activity-option-grid">
              {calendarActivities.map((activity) => (
                <button
                  className="activity-option"
                  data-active={activity.id === activityId}
                  key={activity.id}
                  type="button"
                  aria-pressed={activity.id === activityId}
                  onClick={() => selectActivity(activity.id)}
                >
                  <HeritageIcon name={activity.icon} size={20} />
                  <span>
                    <strong>{activity.label}</strong>
                    <small>{activity.description}</small>
                  </span>
                </button>
              ))}
            </div>

            <div className="activity-custom-form">
              <label htmlFor="other-activity">Việc khác</label>
              <Input
                aria-label="Nhập công việc khác"
                id="other-activity"
                maxLength={120}
                value={otherActivityInput}
                onChange={(event) => changeOtherActivity(event.target.value)}
              />
            </div>

            {customResolution?.kind === 'ambiguous' ? (
              <div className="activity-resolution" role="group" aria-label="Chọn loại việc cụ thể">
                <span>Bạn muốn xem theo việc nào?</span>
                <div>
                  {customResolution.suggestions.map((suggestion) => (
                    <button key={suggestion} onClick={() => chooseSuggestedActivity(suggestion)} type="button">
                      {labelForAlmanacActivity(suggestion)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <Button
              className="activity-analyze-button"
              disabled={!canAnalyze || isAnalyzing}
              onClick={() => void requestAnalysis()}
              type="button"
            >
                <AIButtonIcon variant="light" />
                {isAnalyzing ? 'Đang phân tích...' : 'Hỏi AI về ngày này'}
            </Button>
            <label className="ai-model-switch">
              <span>Mô hình AI</span>
              <Select
                items={aiModelOptions}
                value={modelPreference}
                onValueChange={(value) => setModelPreference(value as AIModelPreference)}
              >
                <SelectTrigger aria-label="Mô hình AI cho xem ngày" className="choice">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aiModelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </section>

          <section className="activity-result" aria-live="polite">
            {isAnalyzing ? (
              <AIProcessingLoader
                description="AI đang đối chiếu dữ kiện lịch truyền thống và chuẩn bị phần gợi ý cho công việc đã chọn."
                label="AI ĐANG XEM NGÀY"
                title="Đang chuẩn bị luận giải"
              />
            ) : analysis ? (
              <div className="tool-result-scroll">
                <div className="activity-result-heading">
                  <div>
                    <span className="eyebrow">KẾT QUẢ XEM NGÀY</span>
                    <h2>{analysis.evaluation.activity.label}</h2>
                    <p>
                      {analysis.evaluation.date.solar} dương lịch · {analysis.evaluation.date.lunar.day}/{analysis.evaluation.date.lunar.month} âm lịch
                    </p>
                  </div>
                  <span className={`activity-tone activity-tone-${analysis.evaluation.classification}`}>
                    {labelForActivityLevel(analysis.evaluation.classification)}
                  </span>
                </div>

                <section className="activity-result-summary activity-result-block">
                  <span className="activity-section-label">ĐÁNH GIÁ THEO LỊCH</span>
                  <p>{analysis.evaluation.summaryReason}</p>
                </section>
                {analysis.evaluation.activity.supportLevel !== 'full' ? <p className="activity-support-note">
                  <strong>{analysis.evaluation.activity.supportLevel === 'unsupported' ? 'Chưa có bộ quy tắc riêng.' : 'Phạm vi tham khảo.'}</strong>
                  {' '}{analysis.evaluation.activity.supportNote || 'Kết quả chỉ dùng các dữ kiện lịch đã có.'}
                </p> : null}

                <div className="activity-factor-grid">
                  <section className="activity-result-block">
                    <span className="activity-section-label">ĐIỂM THUẬN</span>
                    {analysis.evaluation.goodFactors.length ? <ul>{analysis.evaluation.goodFactors.map((factor) => <li key={factor.code}>{factor.label}</li>)}</ul> : <p>Chưa ghi nhận điểm thuận nổi bật từ dữ liệu hiện có.</p>}
                  </section>
                  <section className="activity-result-block">
                    <span className="activity-section-label">ĐIỂM CẦN LƯU Ý</span>
                    {analysis.evaluation.warningFactors.length ? <ul>{analysis.evaluation.warningFactors.map((factor) => <li data-severity={factor.severity} key={factor.code}>{factor.label}</li>)}</ul> : <p>Chưa ghi nhận cảnh báo riêng trong dữ liệu hiện có.</p>}
                  </section>
                </div>

                <div className="activity-hour-grid">
                  <section className="activity-result-block">
                    <span className="activity-section-label">GIỜ PHÙ HỢP</span>
                    <div>{analysis.evaluation.goodHours.map((hour) => <span key={hour.branch}>{hour.from}-{hour.to} · {hour.branch}</span>)}</div>
                  </section>
                  {analysis.evaluation.badHours.length ? <section className="activity-result-block">
                    <span className="activity-section-label">GIỜ NÊN TRÁNH</span>
                    <div>{analysis.evaluation.badHours.map((hour) => <span key={hour.branch}>{hour.from}-{hour.to} · {hour.branch}</span>)}</div>
                  </section> : null}
                </div>

                <section className="activity-result-block activity-facts-block">
                  <span className="activity-section-label">THÔNG TIN NGÀY</span>
                  <div className="activity-result-facts">
                    <div><span>Can Chi ngày</span><strong>{analysis.evaluation.calendar.canChiDay}</strong></div>
                    <div><span>Trực ngày</span><strong>{analysis.evaluation.calendar.dayOfficer}</strong></div>
                    <div><span>Tiết khí</span><strong>{analysis.evaluation.calendar.solarTerm}</strong></div>
                    <div><span>28 Tú</span><strong>{analysis.evaluation.calendar.lunarMansion}</strong></div>
                    <div><span>Loại ngày</span><strong>{analysis.evaluation.calendar.dayType}</strong></div>
                    {analysis.evaluation.calendar.element ? <div><span>Ngũ hành</span><strong>{analysis.evaluation.calendar.element}</strong></div> : null}
                    {analysis.evaluation.calendar.napAm ? <div><span>Nạp âm</span><strong>{analysis.evaluation.calendar.napAm}</strong></div> : null}
                  </div>
                </section>

                <section className="activity-directions activity-result-block">
                  <span className="activity-section-label">HƯỚNG XUẤT HÀNH</span>
                  <p>Hỷ Thần: <strong>{analysis.evaluation.directions.joyGod}</strong></p>
                  <p>Tài Thần: <strong>{analysis.evaluation.directions.wealthGod}</strong></p>
                </section>

                {analysis.evaluation.alternatives.length ? <section className="activity-alternatives activity-result-block">
                  <span className="activity-section-label">NGÀY PHÙ HỢP HƠN</span>
                  <div>{analysis.evaluation.alternatives.map((alternative) => <article key={alternative.solarDate}><strong>{alternative.solarDate}</strong><small>{alternative.lunarDate}</small><em>{labelForActivityLevel(alternative.classification)}</em></article>)}</div>
                </section> : null}

                <section className="activity-ai-analysis activity-result-block">
                  <span className="activity-section-label">PHÂN TÍCH AI</span>
                  {analysis.interpretation ? <div className="activity-ai-answer"><p>{analysis.interpretation.detailedExplanation}</p>{analysis.interpretation.practicalSuggestion ? <p><strong>Gợi ý:</strong> {analysis.interpretation.practicalSuggestion}</p> : null}</div> : <p className="activity-ai-placeholder">Phần gợi ý chi tiết đang được hoàn thiện. Bạn vẫn có thể tham khảo các thông tin ngày ở trên.</p>}
                </section>
                <section className="activity-ai-conclusion activity-result-block">
                  <span className="activity-section-label">KẾT LUẬN</span>
                  <p>{analysis.interpretation?.shortSummary || analysis.evaluation.summaryReason}</p>
                </section>
                <p className="calendar-policy activity-policy">
                  <span className="calendar-policy-info" aria-hidden="true">i</span>
                  <span>
                    Thông tin theo lịch truyền thống để tham khảo. Với việc hệ trọng,
                    gia đình nên cân nhắc hoàn cảnh thực tế và phong tục địa phương.
                  </span>
                </p>
              </div>
            ) : analysisError ? (
              <div className="activity-result-state activity-error-state" role="alert">
                <HeritageIcon name="info" size={25} />
                <span className="eyebrow">CHƯA CÓ KẾT QUẢ</span>
                <h2>Không thể phân tích ngày này</h2>
                <p>{analysisError}</p>
                <small>Kiểm tra lựa chọn ở block bên trái rồi bấm “Hỏi AI về ngày này” để thử lại.</small>
              </div>
            ) : (
              <div className="tool-empty-state activity-empty-state">
                <span className="eyebrow">KẾT QUẢ PHÂN TÍCH</span>
                <h2>Chưa có phân tích</h2>
                <p>Chọn một công việc và ngày ở block bên trái, sau đó bấm “Hỏi AI về ngày này”.</p>
              </div>
            )}
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}

function FortuneView() {
  const fortuneFormRef = useRef<HTMLFormElement>(null);
  const fortuneFollowUpRef = useRef<HTMLDivElement>(null);
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<AstrologyGender | ''>('');
  const [birthTime, setBirthTime] = useState('');
  const [unknownBirthTime, setUnknownBirthTime] = useState(false);
  const [birthTimeAccuracy, setBirthTimeAccuracy] = useState<BirthTimeAccuracy>('exact');
  const [focus, setFocus] = useState<AstrologyFocus>('overall');
  const [modelPreference, setModelPreference] = useState<AIModelPreference>('auto');
  const [submittedInput, setSubmittedInput] = useState<AstrologyInput | null>(null);
  const [profile, setProfile] = useState<AstrologyProfile | null>(null);
  const [reading, setReading] = useState<AstrologyInterpretation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<'calendar' | 'astrology' | 'ai' | null>(null);
  const [followUp, setFollowUp] = useState('');
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const [followUpAnswer, setFollowUpAnswer] = useState<string | null>(null);
  const [followUpHistory, setFollowUpHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [isFollowingUp, setIsFollowingUp] = useState(false);
  const [fortuneFormHeight, setFortuneFormHeight] = useState<number | null>(null);

  useEffect(() => {
    const form = fortuneFormRef.current;
    if (!form) return;

    const updateHeight = () => {
      setFortuneFormHeight(Math.ceil(form.getBoundingClientRect().height));
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(form);
    return () => observer.disconnect();
  }, []);

  const fortuneLayoutStyle = fortuneFormHeight
    ? ({ '--fortune-panel-height': `${fortuneFormHeight}px` } as CSSProperties)
    : undefined;

  const birthDatePreview = useMemo(() => {
    const birthday = parseBirthDateInput(birthDate);
    if (!birthday) return null;

    const solarDate = new Date(birthday.year, birthday.month - 1, birthday.day, 12);
    if (
      solarDate.getFullYear() !== birthday.year ||
      solarDate.getMonth() !== birthday.month - 1 ||
      solarDate.getDate() !== birthday.day
    ) {
      return null;
    }

    const lunarInfo = getLunarDayInfo(solarDate);
    if (!lunarInfo.supported) return null;

    return {
      solar: `${String(birthday.day).padStart(2, '0')}/${String(birthday.month).padStart(2, '0')}/${birthday.year}`,
      lunar: `${String(lunarInfo.lunar.day).padStart(2, '0')}/${String(lunarInfo.lunar.month).padStart(2, '0')}/${lunarInfo.lunar.year}`,
      isLeapMonth: lunarInfo.lunar.leapMonth,
    };
  }, [birthDate]);

  useEffect(() => {
    if (!isFollowingUp && !followUpAnswer && !followUpError) return;
    fortuneFollowUpRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [followUpAnswer, followUpError, isFollowingUp]);

  function inputFromForm(): AstrologyInput | null {
    const birthday = parseBirthDateInput(birthDate);
    const name = fullName.trim().replace(/\s+/g, ' ');
    if (!name || !gender || !birthday) {
      return null;
    }
    if (unknownBirthTime) {
      return {
        fullName: name,
        gender,
        birthDate: { ...birthday, calendar: 'solar' },
        birthTime: null,
        unknownBirthTime: true,
      };
    }
    const match = /^(\d{2}):(\d{2})$/.exec(birthTime);
    if (!match || (birthTimeAccuracy !== 'exact' && birthTimeAccuracy !== 'approximate')) return null;
    return {
      fullName: name,
      gender,
      birthDate: { ...birthday, calendar: 'solar' },
      birthTime: { hour: Number(match[1]), minute: Number(match[2]), accuracy: birthTimeAccuracy },
      unknownBirthTime: false,
    };
  }

  async function requestReading() {
    const input = inputFromForm();
    if (!input) {
      setError('Vui lòng nhập họ tên, ngày sinh, giới tính và giờ sinh hoặc chọn không rõ giờ sinh.');
      return;
    }
    setError(null);
    setProfile(null);
    setReading(null);
    setFollowUp('');
    setFollowUpAnswer(null);
    setFollowUpError(null);
    setFollowUpHistory([]);
    setSubmittedInput(input);
    setLoadingStage('calendar');
    try {
      const profileResponse = await fetch('/api/astrology/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      const profileData = (await profileResponse.json()) as {
        profile?: AstrologyProfile;
        message?: string;
      };
      if (!profileResponse.ok || !profileData.profile) {
        throw new Error(profileData.message || 'Không thể xử lý ngày sinh.');
      }
      setProfile(profileData.profile);
      setLoadingStage('astrology');
      await Promise.resolve();
      setLoadingStage('ai');

      const response = await fetch('/api/astrology/interpretation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, focus, modelPreference }),
      });
      const data = (await response.json()) as {
        interpretation?: AstrologyInterpretation;
        source?: 'ai' | 'engine';
        message?: string;
      };
      if (!response.ok || !data.interpretation) throw new Error(data.message || 'Chưa thể tạo luận giải AI.');
      setReading(data.interpretation);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Chưa thể tạo luận giải. Vui lòng thử lại.',
      );
    } finally {
      setLoadingStage(null);
    }
  }

  async function requestFollowUp(prompt = followUp) {
    const question = prompt.trim();
    if (isFollowingUp) return;
    if (!question) {
      setFollowUpError('Hãy nhập một câu hỏi để gửi AI.');
      return;
    }
    if (!submittedInput || !profile) {
      setFollowUpError('Hồ sơ này chưa sẵn sàng để hỏi thêm. Hãy luận giải lại trước.');
      return;
    }
    setFollowUpError(null);
    setFollowUpAnswer(null);
    setIsFollowingUp(true);
    try {
      const response = await fetch('/api/astrology/interpretation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: submittedInput, focus, question, interpretation: reading, history: followUpHistory, modelPreference }),
      });
      const data = (await response.json()) as { answer?: string; message?: string };
      if (!response.ok || !data.answer) throw new Error(data.message || 'Chưa thể nhận câu trả lời.');
      setFollowUpAnswer(data.answer);
      setFollowUpHistory((current) => [
        ...current,
        { role: 'user' as const, content: question },
        { role: 'assistant' as const, content: data.answer! },
      ].slice(-6));
      setFollowUp('');
    } catch (requestError) {
      setFollowUpError(requestError instanceof Error ? requestError.message : 'Chưa thể nhận câu trả lời.');
    } finally {
      setIsFollowingUp(false);
    }
  }

  const isLoading = loadingStage !== null;
  const fullNameLabel = profile?.identity.fullName || 'Luận giải của bạn';
  const dateLabel = profile
    ? `${String(profile.birth.solarDate).split('-').reverse().join('/')} dương lịch · ${String(profile.birth.lunarDate.day).padStart(2, '0')}/${String(profile.birth.lunarDate.month).padStart(2, '0')}/${profile.birth.lunarDate.year} âm lịch${profile.birth.lunarDate.isLeapMonth ? ' (tháng nhuận)' : ''}`
    : '';

  return (
    <main id="main" className="calendar-tools-page">
      <div className="container page-space">
        <div className="page-heading calendar-tools-heading">
          <div>
            <div className="eyebrow">THAM KHẢO CÁ NHÂN HÓA</div>
            <h1>Tử vi AI</h1>
            <p>Luận giải theo ngày giờ sinh do hệ thống tính từ lịch truyền thống.</p>
          </div>
        </div>

        <div className="fortune-layout" style={fortuneLayoutStyle}>
          <form
            className="fortune-form-panel"
            aria-labelledby="fortune-form-title"
            ref={fortuneFormRef}
            onSubmit={(event) => {
              event.preventDefault();
              void requestReading();
            }}
          >
            <div className="calendar-tool-section-heading">
              <div>
                <span className="eyebrow">THÔNG TIN</span>
                <h2 id="fortune-form-title">Xem tử vi</h2>
              </div>
            </div>

            <div className="fortune-fields">
              <label className="fortune-field fortune-field-name">
                <span>Họ và tên</span>
                <Input
                  aria-label="Họ và tên"
                  autoComplete="name"
                  maxLength={100}
                  onChange={(event) => {
                    setFullName(event.target.value);
                    setError(null);
                  }}
                  value={fullName}
                />
              </label>
              <div className="fortune-field fortune-birth-date fortune-date-field">
                <span>Ngày sinh dương lịch</span>
                <span className="tool-date-control">
                  <Input
                    aria-label="Ngày sinh, tháng sinh, năm sinh"
                    className="fortune-date-input"
                    inputMode="numeric"
                    maxLength={10}
                    onChange={(event) => {
                      setBirthDate(formatBirthDateInput(event.target.value));
                      setError(null);
                    }}
                    value={birthDate}
                  />
                  <HeritageIcon className="tool-date-icon" name="today" size={18} />
                </span>
              </div>
              {birthDatePreview ? (
                <div className="fortune-birth-calendar-preview" aria-live="polite">
                  <div>
                    <small>Dương lịch</small>
                    <strong>{birthDatePreview.solar}</strong>
                  </div>
                  <div>
                    <small>Âm lịch</small>
                    <strong>{birthDatePreview.lunar}</strong>
                    <em>{birthDatePreview.isLeapMonth ? 'Tháng nhuận' : 'Tháng thường'}</em>
                  </div>
                </div>
              ) : null}
              <label className="fortune-field">
                <span>Giới tính</span>
                <Select
                  items={[{ value: 'male', label: 'Nam' }, { value: 'female', label: 'Nữ' }]}
                  value={gender}
                  onValueChange={(value) => {
                    setGender(value as AstrologyGender);
                    setError(null);
                  }}
                >
                  <SelectTrigger aria-label="Giới tính" className="choice">
                    <SelectValue placeholder="Chọn giới tính" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Nam</SelectItem>
                    <SelectItem value="female">Nữ</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="fortune-field">
                <span>Giờ sinh</span>
                <Input aria-label="Giờ sinh" className="activity-date-input" disabled={unknownBirthTime} inputMode="numeric" maxLength={5} onChange={(event) => setBirthTime(event.target.value)} value={birthTime} />
              </label>
              <label className="fortune-field">
                <span>Độ chính xác giờ sinh</span>
                <Select items={[{ value: 'exact', label: 'Chính xác' }, { value: 'approximate', label: 'Ước chừng' }]} value={birthTimeAccuracy} onValueChange={(value) => setBirthTimeAccuracy(value as BirthTimeAccuracy)} disabled={unknownBirthTime}>
                  <SelectTrigger aria-label="Độ chính xác giờ sinh" className="choice"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="exact">Chính xác</SelectItem><SelectItem value="approximate">Ước chừng</SelectItem></SelectContent>
                </Select>
              </label>
            </div>
            <label className="fortune-unknown-time">
              <Checkbox checked={unknownBirthTime} onCheckedChange={(checked) => setUnknownBirthTime(checked === true)} />
              <span>Không rõ giờ sinh</span>
            </label>
            {unknownBirthTime ? <p className="fortune-time-note">Bạn vẫn có thể xem luận giải cơ bản. Các nội dung phụ thuộc giờ sinh sẽ không được tính.</p> : null}

            <div className="fortune-focus-group" aria-label="Chủ đề luận giải">
              <span>Chủ đề</span>
              <div>
                {astrologyFocuses.map((item) => (
                  <button
                    className="fortune-focus-option"
                    data-active={focus === item.id}
                    key={item.id}
                    type="button"
                    aria-pressed={focus === item.id}
                    onClick={() => setFocus(item.id)}
                  >
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="fortune-error" role="alert">{error}</p>}
            <Button
              className="action-button fortune-submit"
              disabled={isLoading}
              type="submit"
            >
              <AIButtonIcon size={19} variant="light" />
              {loadingStage === 'calendar' ? 'Đang tính dữ liệu ngày sinh...' : loadingStage === 'astrology' ? 'Đang lập dữ liệu tử vi...' : loadingStage === 'ai' ? 'Đang luận giải bằng AI...' : 'Luận giải tử vi'}
            </Button>
            <label className="ai-model-switch fortune-model-switch">
              <span>Mô hình AI</span>
              <Select
                items={aiModelOptions}
                value={modelPreference}
                onValueChange={(value) => setModelPreference(value as AIModelPreference)}
              >
                <SelectTrigger aria-label="Mô hình AI cho tử vi" className="choice">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aiModelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <p className="fortune-disclaimer">
              Nội dung mang tính tham khảo và giải trí, không thay thế tư vấn
              chuyên môn hay quyết định quan trọng.
            </p>
          </form>

          <section className="fortune-reading-panel" aria-live="polite">
            {loadingStage ? (
              <AIProcessingLoader
                description={loadingStage === 'calendar' ? 'AI đang chuẩn hóa ngày sinh và các dữ kiện lịch cần thiết.' : loadingStage === 'astrology' ? 'AI đang tổng hợp hồ sơ để chuẩn bị phần luận giải riêng.' : 'AI đang viết phần luận giải theo thông tin bạn đã cung cấp.'}
                label="TRỢ LÝ AI ĐANG LÀM VIỆC"
                title={loadingStage === 'calendar' ? 'Đang đọc dữ kiện ngày sinh' : loadingStage === 'astrology' ? 'Đang lập hồ sơ tử vi' : 'Đang viết luận giải'}
              />
            ) : profile ? (
              <div className="tool-result-scroll">
                <div className="fortune-reading-heading">
                  <div>
                    <span className="eyebrow">LUẬN GIẢI TỬ VI</span>
                    <h2>{fullNameLabel}</h2>
                    <p>{profile.identity.gender === 'male' ? 'Nam' : 'Nữ'} · {dateLabel}{profile.birth.birthTime ? ` · ${profile.birth.birthTime}${profile.birth.birthHourBranch ? `, giờ ${profile.birth.birthHourBranch}` : ''}` : ' · Chưa rõ giờ sinh'}</p>
                  </div>
                </div>
                {reading ? <section className="fortune-reading-summary">
                  <span className="activity-section-label">KẾT LUẬN</span>
                  <h3>{reading.overview.title}</h3>
                  <p>{reading.overview.summary}</p>
                </section> : null}
                <section className="fortune-profile-section">
                  <span className="activity-section-label">HỒ SƠ ĐÃ CHUẨN HÓA</span>
                  <dl className="fortune-profile-facts">
                    <div><dt>Âm lịch</dt><dd>{profile.birth.lunarDate.day}/{profile.birth.lunarDate.month}/{profile.birth.lunarDate.year}{profile.birth.lunarDate.isLeapMonth ? ' nhuận' : ''}</dd></div>
                    <div><dt>Can Chi năm</dt><dd>{profile.canChi.year}</dd></div>
                    <div><dt>Nạp âm</dt><dd>{profile.fiveElements.napAm || 'Đang cập nhật'}</dd></div>
                    <div><dt>Ngũ hành</dt><dd>{profile.fiveElements.yearElement || 'Đang cập nhật'}{profile.fiveElements.yinYang ? ` · ${profile.fiveElements.yinYang}` : ''}</dd></div>
                  </dl>
                </section>
                {reading ? <FortuneInterpretation reading={reading} /> : <p className="fortune-pending-reading">{loadingStage === 'astrology' ? 'Đang lập dữ liệu tử vi...' : 'Đang luận giải bằng AI...'}</p>}
                {reading ? (
                  <div className="fortune-follow-up" ref={fortuneFollowUpRef}>
                    <span className="eyebrow">HỎI THÊM VỀ HỒ SƠ NÀY</span>
                    <div className="fortune-quick-actions">
                      {['Công việc năm nay', 'Tài lộc', 'Tình duyên', 'Gia đạo', 'Điểm mạnh của tôi', '3 năm tới'].map((prompt) => <button disabled={isFollowingUp} key={prompt} onClick={() => void requestFollowUp(prompt)} type="button">{prompt}</button>)}
                    </div>
                    <form className="fortune-follow-up-form" onSubmit={(event) => { event.preventDefault(); void requestFollowUp(); }}>
                      <Input aria-label="Câu hỏi thêm về tử vi" disabled={isFollowingUp} onChange={(event) => setFollowUp(event.target.value)} value={followUp} />
                      <Button
                        aria-label={isFollowingUp ? 'Đang hỏi AI' : 'Hỏi AI'}
                        className="fortune-follow-up-send"
                        disabled={isFollowingUp || !followUp.trim()}
                        title={isFollowingUp ? 'Đang hỏi AI' : 'Hỏi AI'}
                        type="submit"
                      >
                        <Image alt="" aria-hidden="true" className="fortune-follow-up-send-icon" height={25} src="/app-icons/ai-send-paper-plane.png" width={25} />
                      </Button>
                    </form>
                    {isFollowingUp ? <p className="fortune-follow-up-status" role="status"><AIButtonIcon size={15} variant="light" /> AI đang chuẩn bị câu trả lời...</p> : null}
                    {followUpError ? <p className="fortune-error" role="alert">{followUpError}</p> : null}
                    {followUpAnswer ? <p className="fortune-follow-up-answer">{followUpAnswer}</p> : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="tool-empty-state fortune-empty-state">
                <span className="eyebrow">KẾT QUẢ LUẬN GIẢI</span>
                <h2>Luận giải của bạn</h2>
                <p>Nhập họ tên, ngày sinh, giới tính và giờ sinh để hệ thống tạo hồ sơ độc lập tại đây.</p>
              </div>
            )}
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}

function AIProcessingLoader({
  description,
  label,
  title,
}: {
  description: string;
  label: string;
  title: string;
}) {
  return (
    <div className="ai-processing-loader" role="status">
      <span className="ai-processing-mark" aria-hidden="true"><AIButtonIcon size={38} /></span>
      <span className="eyebrow">{label}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <span className="ai-processing-dots" aria-hidden="true"><i /><i /><i /></span>
    </div>
  );
}

function FortuneInterpretation({
  reading,
}: {
  reading: AstrologyInterpretation;
}) {
  const sections = [
    { id: 'personality', title: 'Tính cách', value: reading.personality },
    { id: 'career', title: 'Công danh', value: reading.career },
    { id: 'wealth', title: 'Tài lộc', value: reading.wealth },
    { id: 'love', title: 'Tình duyên', value: reading.love },
    { id: 'family', title: 'Gia đạo', value: reading.family },
    { id: 'relationships', title: 'Quan hệ xã hội', value: reading.relationships },
  ];
  return (
    <div className="fortune-interpretation">
      {sections.map((section) => (
        <details className="fortune-interpretation-section" key={section.id} open>
          <summary>{section.title}</summary>
          <p>{section.value.summary}</p>
          {section.value.strengths?.length ? <ul>{section.value.strengths.map((item) => <li key={item}>{item}</li>)}</ul> : null}
          {section.value.opportunities?.length ? <ul>{section.value.opportunities.map((item) => <li key={item}>{item}</li>)}</ul> : null}
          {section.value.considerations?.length ? <ul>{section.value.considerations.map((item) => <li key={item}>{item}</li>)}</ul> : null}
        </details>
      ))}
      <details className="fortune-interpretation-section" open>
        <summary>Vận năm {reading.currentYear.year}</summary>
        <p>{reading.currentYear.summary}</p>
        {reading.currentYear.opportunities.length ? <ul>{reading.currentYear.opportunities.map((item) => <li key={item}>{item}</li>)}</ul> : null}
        {reading.currentYear.considerations.length ? <ul>{reading.currentYear.considerations.map((item) => <li key={item}>{item}</li>)}</ul> : null}
      </details>
      {reading.suggestions.length ? <div className="fortune-suggestions"><strong>Gợi ý phát triển</strong><ul>{reading.suggestions.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
      <p className="fortune-disclaimer">{reading.disclaimer}</p>
    </div>
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
  const tab = params.get('tab');
  const activeTab =
    tab === 'activities' || (astrologyEnabled && tab === 'fortune') || tab === 'memorials'
      ? tab
      : 'calendar';

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
              className={activeTab === 'activities' ? 'is-active' : ''}
              href="/lunar-calendar?tab=activities"
            >
              <HeritageIcon name="activity-calendar" size={18} />
              Xem ngày
            </Link>
            {astrologyEnabled ? (
              <Link
                className={activeTab === 'fortune' ? 'is-active' : ''}
                href="/lunar-calendar?tab=fortune"
              >
                <HeritageIcon name="fortune-ai" size={18} />
                Tử vi AI
              </Link>
            ) : null}
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
      {activeTab === 'calendar' && <LunarCalendarView />}
      {activeTab === 'activities' && <ActivityDayView />}
      {astrologyEnabled && activeTab === 'fortune' && <FortuneView />}
      {activeTab === 'memorials' && <MemorialsView />}
    </>
  );
}
