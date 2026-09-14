import type { CalendarActivityId } from '@/lib/lunar-calendar/activity-advice';

export const aiModes = ['general', 'genealogy', 'calendar', 'horoscope'] as const;

export type AIMode = (typeof aiModes)[number];
export const aiModelPreferences = ['auto', 'gemini', 'openai'] as const;
export type AIModelPreference = (typeof aiModelPreferences)[number];

export type AISource =
  | 'global'
  | 'family-tree'
  | 'member'
  | 'calendar'
  | 'activity'
  | 'fortune';

export type AIHistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AIClientContext = {
  source?: AISource;
  personId?: string;
  selectedDate?: string;
  activity?: CalendarActivityId;
  birthYear?: number;
  birthDate?: string;
  dateRange?: {
    from: string;
    to: string;
  };
};

export type AIChatRequest = {
  message: string;
  mode: AIMode;
  context: AIClientContext;
  history: AIHistoryMessage[];
};

export type AIPersonFact = {
  id: string;
  name: string;
  generation: number;
  branch: string;
  birthYear?: number;
  lifeStatus?: 'living' | 'deceased' | 'unknown';
  deathDate?: string;
  memorialDate?: string;
  needsVerification: boolean;
};

export type AIGenealogyPerson = {
  person: AIPersonFact;
  parents: AIPersonFact[];
  spouses: AIPersonFact[];
  children: AIPersonFact[];
  siblings: AIPersonFact[];
};

export type AIGenealogyContext = {
  people: AIGenealogyPerson[];
  matches?: AIPersonFact[];
  relationship?: {
    first: string;
    second: string;
    description: string;
  };
  upcomingMemorials?: Array<{
    title: string;
    lunarDate: string;
    solarDate: string;
    daysAway: number;
  }>;
};

export type AICalendarContext = {
  solarDate: string;
  lunarDate?: string;
  canChi?: {
    day: string;
    month: string;
    year: string;
  };
  solarTerm?: string;
  dayClassification?: string;
  truc?: string;
  trucMeaning?: string;
  goodHours?: string[];
  badHours?: string[];
  directions?: {
    hyThan: string;
    taiThan: string;
  };
  stars?: {
    good: string[];
    bad: string[];
  };
  activities?: {
    good: string[];
    bad: string[];
  };
  selectedActivity?: {
    label: string;
    summary: string;
    classification: string;
    reasons: string[];
  };
  unavailableReason?: string;
  dateRangeStatus?: string;
};

export type AIHoroscopeContext = {
  person?: AIPersonFact;
  birthYear?: number;
  birthDate?: string;
  canChiYear?: string;
  note: string;
};

export type AIAppFeature = {
  id: string;
  name: string;
  description: string;
  route: string;
  keywords: string[];
};

export type AIResolvedContext = {
  mode: AIMode;
  source: AISource;
  appFeatures: AIAppFeature[];
  genealogy?: AIGenealogyContext;
  calendar?: AICalendarContext;
  horoscope?: AIHoroscopeContext;
  warnings: string[];
};

export type AIProviderRequest = {
  message: string;
  history: AIHistoryMessage[];
  context: AIResolvedContext;
  systemInstruction: string;
  responseMimeType?: 'application/json';
};

export type AIProviderResponse = {
  answer: string;
  provider: 'gemini' | 'openai' | 'mock';
};

export type AIChatResponse = {
  answer: string;
  provider: 'gemini' | 'openai' | 'mock';
  contextUsed: {
    personId?: string;
    selectedDate?: string;
    activity?: string;
  };
  warnings?: string[];
};

export class AIProviderError extends Error {
  public readonly code:
    | 'configuration'
    | 'quota'
    | 'unavailable'
    | 'invalid_response';

  constructor(code: AIProviderError['code']) {
    super(code);
    this.code = code;
  }
}
