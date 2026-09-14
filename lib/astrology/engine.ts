import {
  getLunarDayInfo,
  lunarToSolar,
} from '../lunar-calendar/service.ts';
import type {
  AstrologyInput,
  AstrologyProfile,
  AstrologyProfileResult,
  NormalizedBirthData,
} from './types.ts';

const heavenlyStems = [
  'Giáp',
  'Ất',
  'Bính',
  'Đinh',
  'Mậu',
  'Kỷ',
  'Canh',
  'Tân',
  'Nhâm',
  'Quý',
] as const;

const earthlyBranches = [
  'Tý',
  'Sửu',
  'Dần',
  'Mão',
  'Thìn',
  'Tỵ',
  'Ngọ',
  'Mùi',
  'Thân',
  'Dậu',
  'Tuất',
  'Hợi',
] as const;

function isValidSolarDate(day: number, month: number, year: number) {
  const value = new Date(year, month - 1, day, 12);
  return value.getFullYear() === year && value.getMonth() === month - 1 && value.getDate() === day;
}

function sameCalendarDate(
  value: { day: number; month: number; year: number; leapMonth: boolean },
  input: AstrologyInput['birthDate'],
) {
  return value.day === input.day &&
    value.month === input.month &&
    value.year === input.year &&
    value.leapMonth === Boolean(input.isLeapMonth);
}

function dateText(value: { day: number; month: number; year: number }) {
  return `${String(value.year).padStart(4, '0')}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
}

function birthHourBranch(hour: number) {
  return earthlyBranches[Math.floor(((hour + 1) % 24) / 2)];
}

function hourCanChi(dayCanChi: string, hour: number) {
  const dayStem = dayCanChi.split(' ')[0];
  const dayStemIndex = heavenlyStems.indexOf(dayStem as (typeof heavenlyStems)[number]);
  if (dayStemIndex < 0) return null;
  const branchIndex = Math.floor(((hour + 1) % 24) / 2);
  const stemIndex = ((dayStemIndex % 5) * 2 + branchIndex) % heavenlyStems.length;
  return `${heavenlyStems[stemIndex]} ${earthlyBranches[branchIndex]}`;
}

function yinYang(canChi: string) {
  const stem = canChi.split(' ')[0];
  const stemIndex = heavenlyStems.indexOf(stem as (typeof heavenlyStems)[number]);
  return stemIndex < 0 ? null : stemIndex % 2 === 0 ? 'Dương' : 'Âm';
}

function normalize(input: AstrologyInput): NormalizedBirthData | { error: string } {
  const { birthDate } = input;
  if (!Number.isInteger(birthDate.year) || birthDate.year < 1800 || birthDate.year > new Date().getFullYear()) {
    return { error: 'Năm sinh cần nằm trong phạm vi từ 1800 đến năm hiện tại.' };
  }
  if (!Number.isInteger(birthDate.day) || !Number.isInteger(birthDate.month) || birthDate.day < 1 || birthDate.month < 1 || birthDate.month > 12) {
    return { error: 'Ngày hoặc tháng sinh chưa hợp lệ.' };
  }

  let solarDate: Date;
  if (birthDate.calendar === 'solar') {
    if (!isValidSolarDate(birthDate.day, birthDate.month, birthDate.year)) {
      return { error: 'Ngày sinh dương lịch không tồn tại.' };
    }
    solarDate = new Date(birthDate.year, birthDate.month - 1, birthDate.day, 12);
  } else {
    const converted = lunarToSolar({
      day: birthDate.day,
      month: birthDate.month,
      year: birthDate.year,
      leapMonth: Boolean(birthDate.isLeapMonth),
    });
    if (!converted) return { error: 'Ngày hoặc tháng nhuận âm lịch không hợp lệ.' };
    const confirmed = getLunarDayInfo(converted);
    if (!confirmed.supported || !sameCalendarDate(confirmed.lunar, birthDate)) {
      return { error: 'Ngày hoặc tháng nhuận âm lịch không hợp lệ.' };
    }
    solarDate = converted;
  }

  const info = getLunarDayInfo(solarDate);
  if (!info.supported) return { error: info.reason };
  if (solarDate.getTime() > new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 23, 59, 59).getTime()) {
    return { error: 'Ngày sinh không thể ở tương lai.' };
  }

  const birthTime = input.unknownBirthTime ? null : input.birthTime;
  if (!input.unknownBirthTime && !birthTime) return { error: 'Vui lòng nhập giờ sinh hoặc chọn không rõ giờ sinh.' };
  if (birthTime && (!Number.isInteger(birthTime.hour) || !Number.isInteger(birthTime.minute) || birthTime.hour < 0 || birthTime.hour > 23 || birthTime.minute < 0 || birthTime.minute > 59)) {
    return { error: 'Giờ sinh chưa hợp lệ.' };
  }

  return {
    fullName: input.fullName,
    gender: input.gender,
    solarBirthDate: {
      day: info.solar.day,
      month: info.solar.month,
      year: info.solar.year,
    },
    lunarBirthDate: {
      day: info.lunar.day,
      month: info.lunar.month,
      year: info.lunar.year,
      isLeapMonth: info.lunar.leapMonth,
    },
    birthTime: birthTime ? { hour: birthTime.hour, minute: birthTime.minute } : null,
    birthTimeAccuracy: birthTime ? birthTime.accuracy : 'unknown',
    birthHourBranch: birthTime ? birthHourBranch(birthTime.hour) : null,
  };
}

export function createAstrologyProfile(input: AstrologyInput): AstrologyProfileResult {
  const normalized = normalize(input);
  if ('error' in normalized) return normalized;

  const info = getLunarDayInfo(new Date(
    normalized.solarBirthDate.year,
    normalized.solarBirthDate.month - 1,
    normalized.solarBirthDate.day,
    12,
  ));
  if (!info.supported) return { error: info.reason };

  const profile: AstrologyProfile = {
    identity: { fullName: normalized.fullName, gender: normalized.gender },
    birth: {
      solarDate: dateText(normalized.solarBirthDate),
      lunarDate: normalized.lunarBirthDate,
      birthTime: normalized.birthTime
        ? `${String(normalized.birthTime.hour).padStart(2, '0')}:${String(normalized.birthTime.minute).padStart(2, '0')}`
        : null,
      birthTimeAccuracy: normalized.birthTimeAccuracy,
      birthHourBranch: normalized.birthHourBranch,
    },
    canChi: {
      year: info.canChi.year,
      month: info.canChi.month,
      day: info.canChi.day,
      hour: normalized.birthTime ? hourCanChi(info.canChi.day, normalized.birthTime.hour) : null,
    },
    fiveElements: {
      yearElement: info.element.name || null,
      napAm: info.element.napAm || null,
      yinYang: yinYang(info.canChi.year),
    },
    completeness: {
      hasBirthDate: true,
      hasBirthTime: Boolean(normalized.birthTime),
      hasGender: true,
      hasFullChart: false,
    },
  };

  return { profile, normalized };
}
