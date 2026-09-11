import { addDays, startOfDay } from 'date-fns';
import { memberName, type Member } from '../family.ts';
import { lichtaAdapter } from './lichta-adapter.ts';
import type {
  FamilyCalendarEvent,
  FamilyEventOccurrence,
  UpcomingFamilyEvent,
} from './types.ts';

export const clanMemorialEvent: FamilyCalendarEvent = {
  id: 'clan-memorial-nguyen-ba',
  title: 'Ngày giỗ Họ Nguyễn Bá',
  kind: 'family-ceremony',
  calendarType: 'lunar',
  lunarDay: 6,
  lunarMonth: 1,
  leapMonth: false,
  repeat: 'yearly',
  originalDate: '06/01 âm lịch',
  source: 'Gia phả họ Nguyễn Bá',
};

function memberAnniversaries(members: Member[]): FamilyCalendarEvent[] {
  return members.flatMap((person) =>
    person.anniversary
      ? [
          {
            id: `anniversary-${person.id}`,
            title: `Ngày giỗ ${memberName(person)}`,
            kind: 'anniversary' as const,
            calendarType: 'lunar' as const,
            lunarDay: person.anniversary.day,
            lunarMonth: person.anniversary.month,
            leapMonth: false,
            repeat: 'yearly' as const,
            originalDate: `${person.anniversary.day}/${person.anniversary.month} âm lịch`,
            source: 'Gia phả họ Nguyễn Bá',
            person,
          },
        ]
      : [],
  );
}

function isLunarOccurrence(
  event: FamilyCalendarEvent,
  date: Date,
): { matches: boolean; isApproximate: boolean } {
  const lunar = lichtaAdapter.solarToLunar(date);
  if (!lunar || lunar.leapMonth !== Boolean(event.leapMonth)) {
    return { matches: false, isApproximate: false };
  }
  if (lunar.day === event.lunarDay && lunar.month === event.lunarMonth) {
    return { matches: true, isApproximate: Boolean(event.isApproximate) };
  }

  // A lunar day 30 does not exist in a 29-day month. Surface the adjustment
  // explicitly instead of silently treating it as an ordinary recurrence.
  if (
    event.lunarDay === 30 &&
    lunar.day === 29 &&
    lunar.month === event.lunarMonth
  ) {
    const tomorrow = lichtaAdapter.solarToLunar(addDays(date, 1));
    if (tomorrow?.day === 1) return { matches: true, isApproximate: true };
  }
  return { matches: false, isApproximate: false };
}

function matchesEvent(event: FamilyCalendarEvent, date: Date) {
  if (event.calendarType === 'solar') {
    return {
      matches:
        event.solarDay === date.getDate() &&
        event.solarMonth === date.getMonth() + 1,
      isApproximate: Boolean(event.isApproximate),
    };
  }
  return isLunarOccurrence(event, date);
}

export class FamilyLunarEventService {
  getFamilyEventsForDate(
    members: Member[],
    date: Date,
    additionalEvents: FamilyCalendarEvent[] = [],
  ): FamilyEventOccurrence[] {
    return [
      clanMemorialEvent,
      ...memberAnniversaries(members),
      ...additionalEvents,
    ].flatMap(
      (event) => {
        const occurrence = matchesEvent(event, date);
        return occurrence.matches
          ? [{ event, date, isApproximate: occurrence.isApproximate }]
          : [];
      },
    );
  }

  getUpcomingFamilyEvents({
    members,
    from = new Date(),
    additionalEvents = [],
    limit = 24,
  }: {
    members: Member[];
    from?: Date;
    additionalEvents?: FamilyCalendarEvent[];
    limit?: number;
  }): UpcomingFamilyEvent[] {
    const upcoming: UpcomingFamilyEvent[] = [];
    const found = new Set<string>();
    const start = startOfDay(from);
    const maxMemberEvents = Math.max(0, limit);
    let memberEventCount = 0;

    for (
      let daysAway = 0;
      daysAway < 400 &&
      (memberEventCount < maxMemberEvents || !found.has(clanMemorialEvent.id));
      daysAway++
    ) {
      const date = addDays(start, daysAway);
      for (const occurrence of this.getFamilyEventsForDate(
        members,
        date,
        additionalEvents,
      )) {
        if (found.has(occurrence.event.id)) continue;
        const isClanMemorial = occurrence.event.id === clanMemorialEvent.id;
        if (!isClanMemorial && memberEventCount >= maxMemberEvents) continue;
        found.add(occurrence.event.id);
        upcoming.push({ ...occurrence, daysAway });
        if (!isClanMemorial) memberEventCount++;
      }
    }
    return upcoming;
  }
}

export const familyLunarEventService = new FamilyLunarEventService();
