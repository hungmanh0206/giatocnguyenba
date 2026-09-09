import {
  LichTa,
  getAuspiciousHours,
  getDayElement,
  getInauspiciousHours,
  getSolarTerm,
  getTruc,
  getTrucIndex,
  getTrucQuality,
  getYearDetails,
  getZodiacAnimal,
} from '@lichta/core';
import type {
  LunarCalendarBase,
  LunarDateInput,
  SolarDate,
  UnsupportedCalendarDay,
} from './types.ts';

const MIN_YEAR = 1800;
const MAX_YEAR = 2199;

function solarDate(date: Date): SolarDate {
  return {
    date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    day: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
    weekday: date.toLocaleDateString('vi-VN', { weekday: 'long' }),
  };
}

function isSameLunarMonth(
  lunar: { month: number; year: number; isLeap: boolean },
  expected: { month: number; year: number; isLeap: boolean },
) {
  return (
    lunar.month === expected.month &&
    lunar.year === expected.year &&
    lunar.isLeap === expected.isLeap
  );
}

function lunarMonthLength(lunar: {
  month: number;
  year: number;
  isLeap: boolean;
}) {
  const first = LichTa.toSolar(1, lunar.month, lunar.year, lunar.isLeap);
  const thirtiethSolar = new Date(first.year, first.month - 1, first.day + 29);
  const thirtieth = LichTa.toLunar(
    thirtiethSolar.getDate(),
    thirtiethSolar.getMonth() + 1,
    thirtiethSolar.getFullYear(),
  );
  return isSameLunarMonth(thirtieth, lunar) ? 30 : 29;
}

export class LichTaAdapter {
  getDayInfo(date: Date): LunarCalendarBase | UnsupportedCalendarDay {
    const solar = solarDate(date);
    if (solar.year < MIN_YEAR || solar.year > MAX_YEAR) {
      return {
        supported: false,
        solar,
        reason: `LichTa chỉ hỗ trợ ngày từ năm ${MIN_YEAR} đến ${MAX_YEAR}.`,
      };
    }

    try {
      const lunar = LichTa.toLunar(solar.day, solar.month, solar.year);
      const yearDetails = getYearDetails(lunar.year);
      const truc = getTruc(lunar.jd);
      return {
        supported: true,
        solar,
        lunar: {
          day: lunar.day,
          month: lunar.month,
          year: lunar.year,
          leapMonth: lunar.isLeap,
          monthLength: lunarMonthLength(lunar),
        },
        canChi: {
          day: lunar.dayCanChi ?? '',
          month: lunar.monthCanChi ?? '',
          year: lunar.yearCanChi ?? '',
        },
        zodiac: getZodiacAnimal((lunar.year + 8) % 12),
        element: {
          name: getDayElement(lunar.jd),
          napAm: yearDetails.menh,
        },
        solarTerm: getSolarTerm(solar.day, solar.month, solar.year).name,
        dayClassification: getTrucQuality(getTrucIndex(lunar.jd)),
        goodHours: getAuspiciousHours(lunar.jd),
        badHours: getInauspiciousHours(lunar.jd),
        truc,
        dayJd: lunar.jd,
      };
    } catch {
      return {
        supported: false,
        solar,
        reason: 'Không thể chuyển đổi ngày này bằng LichTa.',
      };
    }
  }

  solarToLunar(date: Date) {
    const info = this.getDayInfo(date);
    return info.supported ? info.lunar : null;
  }

  lunarToSolar(input: LunarDateInput): Date | null {
    if (input.year < MIN_YEAR || input.year > MAX_YEAR) return null;
    try {
      const solar = LichTa.toSolar(
        input.day,
        input.month,
        input.year,
        input.leapMonth ?? false,
      );
      return new Date(solar.year, solar.month - 1, solar.day);
    } catch {
      return null;
    }
  }

  getYearCanChi(year: number) {
    return getYearDetails(year).fullString.split(' - ')[0];
  }
}

export const lichtaAdapter = new LichTaAdapter();
