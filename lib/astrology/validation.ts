import { astrologyFocuses, type AstrologyFocus, type AstrologyInput } from './types.ts';

function integer(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

export function parseAstrologyInput(value: unknown): AstrologyInput | null {
  if (typeof value !== 'object' || value === null) return null;
  const input = value as Record<string, unknown>;
  const birthDate = input.birthDate as Record<string, unknown> | undefined;
  const birthTime = input.birthTime as Record<string, unknown> | null | undefined;
  const fullName = typeof input.fullName === 'string' ? input.fullName.trim().replace(/\s+/g, ' ') : '';
  const gender = input.gender;
  const calendar = birthDate?.calendar;
  const day = integer(birthDate?.day);
  const month = integer(birthDate?.month);
  const year = integer(birthDate?.year);
  const unknownBirthTime = input.unknownBirthTime === true;

  if (!fullName || fullName.length > 100 || (gender !== 'male' && gender !== 'female') || (calendar !== 'solar' && calendar !== 'lunar') || day === null || month === null || year === null) {
    return null;
  }

  if (unknownBirthTime) {
    return {
      fullName,
      gender,
      birthDate: { day, month, year, calendar, ...(birthDate?.isLeapMonth === true ? { isLeapMonth: true } : {}) },
      birthTime: null,
      unknownBirthTime: true,
    };
  }

  const hour = integer(birthTime?.hour);
  const minute = integer(birthTime?.minute);
  const accuracy = birthTime?.accuracy;
  if (hour === null || minute === null || (accuracy !== 'exact' && accuracy !== 'approximate')) return null;

  return {
    fullName,
    gender,
    birthDate: { day, month, year, calendar, ...(birthDate?.isLeapMonth === true ? { isLeapMonth: true } : {}) },
    birthTime: { hour, minute, accuracy },
    unknownBirthTime: false,
  };
}

export function parseAstrologyFocus(value: unknown): AstrologyFocus {
  return astrologyFocuses.some((focus) => focus.id === value)
    ? value as AstrologyFocus
    : 'overall';
}

export function parseFollowUpQuestion(value: unknown) {
  const question = typeof value === 'string' ? value.trim() : '';
  return question && question.length <= 800 ? question : null;
}
