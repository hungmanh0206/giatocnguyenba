import { addDays, startOfDay } from 'date-fns';
import type { Member } from './family.ts';
import {
  getFamilyEventsForDate,
  getLunarDayInfo,
  getLunarYearCanChi,
  getUpcomingFamilyEvents,
} from './lunar-calendar/service.ts';

export { getLunarYearCanChi as getYearCanChi };

export function vietnamToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  return new Date(value('year'), value('month') - 1, value('day'));
}

export function lunarOf(date: Date) {
  const info = getLunarDayInfo(date);
  if (!info.supported) throw new RangeError(info.reason);
  return {
    day: info.lunar.day,
    month: info.lunar.month,
    year: info.lunar.year,
    leap: info.lunar.leapMonth,
  };
}

export const dateLabel = (date: Date) =>
  date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export function anniversariesOn(members: Member[], date: Date) {
  return getFamilyEventsForDate(members, date)
    .filter((occurrence) => occurrence.event.kind === 'anniversary')
    .flatMap((occurrence) =>
      occurrence.event.person ? [occurrence.event.person] : [],
    );
}

export function upcomingAnniversaries(
  members: Member[],
  from: Date = vietnamToday(),
) {
  return getUpcomingFamilyEvents({
    members,
    from: startOfDay(from),
    limit: members.filter((member) => member.anniversary).length,
  })
    .filter((occurrence) => occurrence.event.kind === 'anniversary')
    .flatMap((occurrence) =>
      occurrence.event.person
        ? [
            {
              person: occurrence.event.person,
              date: occurrence.date,
              daysAway: occurrence.daysAway,
              isApproximate: occurrence.isApproximate,
            },
          ]
        : [],
    )
    .sort((a, b) => a.daysAway - b.daysAway);
}

export function nextLunarDay(date: Date) {
  return lunarOf(addDays(date, 1));
}
