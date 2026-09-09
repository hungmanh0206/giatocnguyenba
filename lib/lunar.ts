import { getLunarDate, getYearCanChi } from '@dqcai/vn-lunar';
import { addDays, startOfDay } from 'date-fns';
import type { Member } from './family';
export { getYearCanChi };
export function vietnamToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  return new Date(value('year'), value('month') - 1, value('day'));
}
export const lunarOf = (date: Date) =>
  getLunarDate(date.getDate(), date.getMonth() + 1, date.getFullYear());
export const dateLabel = (date: Date) =>
  date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
export function anniversariesOn(members: Member[], date: Date) {
  const lunar = lunarOf(date);
  if (lunar.leap) return [];
  const next = lunarOf(addDays(date, 1));
  return members.filter(
    (p) =>
      p.anniversary &&
      p.anniversary.month === lunar.month &&
      (p.anniversary.day === lunar.day ||
        (p.anniversary.day === 30 && lunar.day === 29 && next.day === 1)),
  );
}
export function upcomingAnniversaries(
  members: Member[],
  from: Date = vietnamToday(),
) {
  const result: { person: Member; date: Date; daysAway: number }[] = [];
  const found = new Set<string>();
  for (let i = 0; i < 400; i++) {
    const date = addDays(startOfDay(from), i);
    for (const person of anniversariesOn(members, date)) {
      if (!found.has(person.id)) {
        result.push({ person, date, daysAway: i });
        found.add(person.id);
      }
    }
    if (found.size === members.filter((p) => p.anniversary).length) break;
  }
  return result;
}
