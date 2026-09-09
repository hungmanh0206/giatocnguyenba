import type { Member } from '../family.ts';

export type SolarDate = {
  date: Date;
  day: number;
  month: number;
  year: number;
  weekday: string;
};

export type LunarDate = {
  day: number;
  month: number;
  year: number;
  leapMonth: boolean;
  monthLength: 29 | 30;
};

export type Festival = {
  id: string;
  name: string;
  description?: string;
  category: 'tet' | 'le' | 'ram' | 'quoc-gia';
};

export type TraditionalCalendarInfo = {
  twentyEightMansion: string;
  directions: {
    hyThan: string;
    taiThan: string;
  };
  stars: {
    good: string[];
    bad: string[];
  };
  activities: {
    good: string[];
    bad: string[];
  };
  festivals: Festival[];
  trucMeaning: string;
};

export type LunarCalendarBase = {
  supported: true;
  solar: SolarDate;
  lunar: LunarDate;
  canChi: {
    day: string;
    month: string;
    year: string;
  };
  zodiac: string;
  element: {
    name: string;
    napAm?: string;
  };
  solarTerm: string;
  dayClassification: string;
  goodHours: string[];
  badHours: string[];
  truc: string;
  dayJd: number;
};

export type UnsupportedCalendarDay = {
  supported: false;
  solar: SolarDate;
  reason: string;
};

export type LunarCalendarDayInfo = LunarCalendarBase & {
  traditional: TraditionalCalendarInfo;
};

export type CalendarDayInfo = LunarCalendarDayInfo | UnsupportedCalendarDay;

export type LunarDateInput = {
  day: number;
  month: number;
  year: number;
  leapMonth?: boolean;
};

export type FamilyEventKind =
  | 'anniversary'
  | 'lunar-birthday'
  | 'death'
  | 'wedding'
  | 'family-ceremony'
  | 'family-meeting';

export type FamilyCalendarEvent = {
  id: string;
  title: string;
  kind: FamilyEventKind;
  calendarType: 'solar' | 'lunar';
  solarDay?: number;
  solarMonth?: number;
  lunarDay?: number;
  lunarMonth?: number;
  leapMonth?: boolean;
  repeat: 'yearly';
  isApproximate?: boolean;
  originalDate: string;
  source: string;
  person?: Member;
};

export type FamilyEventOccurrence = {
  event: FamilyCalendarEvent;
  date: Date;
  isApproximate: boolean;
};

export type UpcomingFamilyEvent = FamilyEventOccurrence & {
  daysAway: number;
};

export type MonthCalendarCell = {
  date: Date;
  inCurrentMonth: boolean;
  day: CalendarDayInfo;
};
