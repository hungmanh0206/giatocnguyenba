export type AstrologyCalendarType = 'solar' | 'lunar';
export type AstrologyGender = 'male' | 'female';
export type BirthTimeAccuracy = 'exact' | 'approximate' | 'unknown';

export type AstrologyInput = {
  fullName: string;
  gender: AstrologyGender;
  birthDate: {
    day: number;
    month: number;
    year: number;
    calendar: AstrologyCalendarType;
    isLeapMonth?: boolean;
  };
  birthTime: {
    hour: number;
    minute: number;
    accuracy: Exclude<BirthTimeAccuracy, 'unknown'>;
  } | null;
  unknownBirthTime: boolean;
};

export type NormalizedBirthData = {
  fullName: string;
  gender: AstrologyGender;
  solarBirthDate: {
    day: number;
    month: number;
    year: number;
  };
  lunarBirthDate: {
    day: number;
    month: number;
    year: number;
    isLeapMonth: boolean;
  };
  birthTime: {
    hour: number;
    minute: number;
  } | null;
  birthTimeAccuracy: BirthTimeAccuracy;
  birthHourBranch: string | null;
};

export type AstrologyProfile = {
  identity: {
    fullName: string;
    gender: AstrologyGender;
  };
  birth: {
    solarDate: string;
    lunarDate: {
      day: number;
      month: number;
      year: number;
      isLeapMonth: boolean;
    };
    birthTime: string | null;
    birthTimeAccuracy: BirthTimeAccuracy;
    birthHourBranch: string | null;
  };
  canChi: {
    year: string;
    month: string;
    day: string;
    hour: string | null;
  };
  fiveElements: {
    yearElement: string | null;
    napAm: string | null;
    yinYang: string | null;
  };
  completeness: {
    hasBirthDate: true;
    hasBirthTime: boolean;
    hasGender: true;
    hasFullChart: false;
  };
};

export type AstrologyInterpretationSection = {
  summary: string;
  strengths?: string[];
  opportunities?: string[];
  considerations?: string[];
};

export type AstrologyInterpretation = {
  overview: {
    title: string;
    summary: string;
  };
  personality: AstrologyInterpretationSection;
  career: AstrologyInterpretationSection;
  wealth: AstrologyInterpretationSection;
  love: AstrologyInterpretationSection;
  family: AstrologyInterpretationSection;
  relationships: AstrologyInterpretationSection;
  currentYear: {
    year: number;
    summary: string;
    opportunities: string[];
    considerations: string[];
  };
  suggestions: string[];
  disclaimer: string;
};

export const astrologyFocuses = [
  { id: 'overall', label: 'Tổng quan', description: 'Nhịp sống và điều nên ưu tiên' },
  { id: 'love', label: 'Tình cảm', description: 'Gắn kết và lắng nghe' },
  { id: 'career', label: 'Công việc', description: 'Kế hoạch và cộng tác' },
  { id: 'finance', label: 'Tài chính', description: 'Kỷ luật và cân nhắc' },
] as const;

export type AstrologyFocus = (typeof astrologyFocuses)[number]['id'];

export type AstrologyProfileResult =
  | { profile: AstrologyProfile; normalized: NormalizedBirthData; error?: never }
  | { profile?: never; normalized?: never; error: string };
