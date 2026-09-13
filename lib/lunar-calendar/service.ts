import type { Member } from '../family.ts';
import { familyLunarEventService } from './family-events.ts';
import { lichtaAdapter } from './lichta-adapter.ts';
import { getTraditionalInfo } from './traditional.ts';
import type {
  CalendarDayInfo,
  FamilyCalendarEvent,
  LunarDateInput,
  MonthCalendarCell,
} from './types.ts';

export function getLunarDayInfo(date: Date): CalendarDayInfo {
  const base = lichtaAdapter.getDayInfo(date);
  return base.supported
    ? { ...base, traditional: getTraditionalInfo(base) }
    : base;
}

export function solarToLunar(date: Date) {
  return lichtaAdapter.solarToLunar(date);
}

export function lunarToSolar(input: LunarDateInput) {
  return lichtaAdapter.lunarToSolar(input);
}

export function getMonthCalendar(
  year: number,
  month: number,
): MonthCalendarCell[] {
  const first = new Date(year, month - 1, 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month - 1, 1 - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + index,
    );
    return {
      date,
      inCurrentMonth: date.getMonth() === month - 1,
      day: getLunarDayInfo(date),
    };
  });
}

export function getGoodHours(date: Date) {
  const info = getLunarDayInfo(date);
  return info.supported ? info.goodHours : [];
}

export function getTraditionalInfoForDate(date: Date) {
  const info = getLunarDayInfo(date);
  return info.supported ? info.traditional : null;
}

export function getFamilyEventsForDate(
  members: Member[],
  date: Date,
  additionalEvents: FamilyCalendarEvent[] = [],
) {
  return familyLunarEventService.getFamilyEventsForDate(
    members,
    date,
    additionalEvents,
  );
}

export function getUpcomingFamilyEvents(options: {
  members: Member[];
  from?: Date;
  additionalEvents?: FamilyCalendarEvent[];
  limit?: number;
}) {
  return familyLunarEventService.getUpcomingFamilyEvents(options);
}

export function getMemorialEvents(options: {
  members: Member[];
  from?: Date;
}) {
  return familyLunarEventService.getMemorialEvents(options);
}

export function getLunarYearCanChi(year: number) {
  return lichtaAdapter.getYearCanChi(year);
}
