import test from 'node:test';
import assert from 'node:assert/strict';
import { seedMembers } from '../lib/family.ts';
import {
  getFamilyEventsForDate,
  getLunarDayInfo,
  getMonthCalendar,
  getUpcomingFamilyEvents,
  lunarToSolar,
  solarToLunar,
} from '../lib/lunar-calendar/service.ts';

const solarParts = (date) => [
  date.getDate(),
  date.getMonth() + 1,
  date.getFullYear(),
];

test('LichTa service converts solar and lunar dates through one calendar engine', () => {
  const tet = getLunarDayInfo(new Date(2024, 1, 10));
  assert.equal(tet.supported, true);
  assert.deepEqual(
    [tet.lunar.day, tet.lunar.month, tet.lunar.year, tet.lunar.leapMonth],
    [1, 1, 2024, false],
  );
  assert.deepEqual(
    solarParts(lunarToSolar({ day: 1, month: 1, year: 2024 })),
    [10, 2, 2024],
  );

  const ramThangGieng = lunarToSolar({ day: 15, month: 1, year: 2024 });
  const trungThu = lunarToSolar({ day: 15, month: 8, year: 2024 });
  assert.deepEqual(solarParts(ramThangGieng), [24, 2, 2024]);
  assert.deepEqual(solarParts(trungThu), [17, 9, 2024]);
});

test('solar to lunar to solar round trips across Tet and leap months', () => {
  for (const date of [
    new Date(2024, 1, 10),
    new Date(2024, 1, 24),
    new Date(2024, 8, 17),
    new Date(2023, 2, 22),
  ]) {
    const lunar = solarToLunar(date);
    assert.ok(lunar);
    const back = lunarToSolar(lunar);
    assert.ok(back);
    assert.deepEqual(solarParts(back), solarParts(date));
  }

  const leap = getLunarDayInfo(new Date(2023, 2, 22));
  assert.equal(leap.supported, true);
  assert.equal(leap.lunar.leapMonth, true);
  assert.deepEqual(
    solarParts(lunarToSolar({ day: 1, month: 2, year: 2023, leapMonth: true })),
    [22, 3, 2023],
  );
});

test('calendar day information includes Can Chi, solar terms, Trực, and hours', () => {
  const info = getLunarDayInfo(new Date(2024, 1, 10));
  assert.equal(info.supported, true);
  assert.equal(info.canChi.day, 'Giáp Thìn');
  assert.equal(info.solarTerm, 'Lập Xuân');
  assert.equal(info.truc, 'Mãn');
  assert.equal(info.goodHours.length, 6);
  assert.equal(info.badHours.length, 6);
  assert.equal(info.traditional.twentyEightMansion.length > 0, true);
  assert.ok(
    info.traditional.festivals.some((festival) => festival.id === 'tet'),
  );
});

test('lunar month length reports both 29-day and 30-day months', () => {
  const dayThirty = getLunarDayInfo(new Date(2024, 1, 9));
  const dayTwentyNine = getLunarDayInfo(new Date(2024, 1, 8));
  assert.equal(dayThirty.supported, true);
  assert.equal(dayTwentyNine.supported, true);
  assert.equal(dayThirty.lunar.day, 30);
  assert.equal(dayThirty.lunar.monthLength, 30);
  assert.equal(dayTwentyNine.lunar.day, 29);
});

test('family lunar events recur yearly and explicitly mark 30th-day adjustments', () => {
  const midAutumnEvent = {
    id: 'family-mid-autumn',
    title: 'Lễ họ tháng Tám',
    kind: 'family-ceremony',
    calendarType: 'lunar',
    lunarDay: 15,
    lunarMonth: 8,
    leapMonth: false,
    repeat: 'yearly',
    originalDate: '15/8 âm lịch',
    source: 'Gia phả',
  };
  const occurrence = getFamilyEventsForDate([], new Date(2024, 8, 17), [
    midAutumnEvent,
  ]);
  assert.equal(occurrence.length, 1);
  assert.equal(occurrence[0].isApproximate, false);

  const shortMonthDay = Array.from({ length: 366 }, (_, index) => {
    const date = new Date(2025, 0, 1 + index);
    return { date, info: getLunarDayInfo(date) };
  }).find(
    ({ info }) =>
      info.supported &&
      info.lunar.day === 29 &&
      info.lunar.monthLength === 29 &&
      !info.lunar.leapMonth,
  );
  assert.ok(shortMonthDay);
  const dayThirtyEvent = {
    ...midAutumnEvent,
    id: 'family-day-30',
    lunarDay: 30,
    lunarMonth: shortMonthDay.info.lunar.month,
    originalDate: `30/${shortMonthDay.info.lunar.month} âm lịch`,
  };
  const adjusted = getFamilyEventsForDate([], shortMonthDay.date, [
    dayThirtyEvent,
  ]);
  assert.equal(adjusted.length, 1);
  assert.equal(adjusted[0].isApproximate, true);

  const upcoming = getUpcomingFamilyEvents({
    members: seedMembers,
    from: new Date(2026, 11, 31),
    limit: seedMembers.filter((person) => person.anniversary).length,
  });
  assert.equal(
    upcoming.filter((item) => item.event.kind === 'anniversary').length,
    seedMembers.filter((person) => person.anniversary).length,
  );
});

test('month calendar exposes a stable six-week grid', () => {
  const calendar = getMonthCalendar(2024, 2);
  assert.equal(calendar.length, 42);
  assert.equal(calendar.filter((cell) => cell.inCurrentMonth).length, 29);
});
