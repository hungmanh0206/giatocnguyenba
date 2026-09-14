import test from 'node:test';
import assert from 'node:assert/strict';
import { createAstrologyProfile } from '../lib/astrology/engine.ts';
import { parseAstrologyInput } from '../lib/astrology/validation.ts';

function solarInput(overrides = {}) {
  return {
    fullName: 'Nguyễn Văn Minh',
    gender: 'male',
    birthDate: { day: 10, month: 2, year: 2024, calendar: 'solar' },
    birthTime: { hour: 9, minute: 30, accuracy: 'exact' },
    unknownBirthTime: false,
    ...overrides,
  };
}

test('astrology engine creates a normalized profile for a person outside the genealogy', () => {
  const result = createAstrologyProfile(solarInput());
  assert.equal('error' in result, false);
  assert.equal(result.profile.identity.fullName, 'Nguyễn Văn Minh');
  assert.equal(result.profile.birth.solarDate, '2024-02-10');
  assert.deepEqual(result.profile.birth.lunarDate, {
    day: 1,
    month: 1,
    year: 2024,
    isLeapMonth: false,
  });
  assert.equal(result.profile.canChi.year, 'Giáp Thìn');
  assert.equal(result.profile.birth.birthHourBranch, 'Tỵ');
  assert.equal(result.profile.completeness.hasFullChart, false);
});

test('astrology engine keeps unknown birth time unknown instead of inventing it', () => {
  const result = createAstrologyProfile(solarInput({ birthTime: null, unknownBirthTime: true }));
  assert.equal('error' in result, false);
  assert.equal(result.profile.birth.birthTime, null);
  assert.equal(result.profile.birth.birthHourBranch, null);
  assert.equal(result.profile.canChi.hour, null);
  assert.equal(result.profile.completeness.hasBirthTime, false);
});

test('astrology engine rejects invalid solar dates and supports lunar conversions including leap months', () => {
  const invalid = createAstrologyProfile(solarInput({
    birthDate: { day: 31, month: 2, year: 2000, calendar: 'solar' },
  }));
  assert.equal('error' in invalid, true);
  assert.match(invalid.error, /không tồn tại/i);

  const lunar = createAstrologyProfile(solarInput({
    birthDate: { day: 1, month: 1, year: 2024, calendar: 'lunar' },
  }));
  assert.equal('error' in lunar, false);
  assert.equal(lunar.profile.birth.solarDate, '2024-02-10');

  const leap = createAstrologyProfile(solarInput({
    birthDate: { day: 1, month: 2, year: 2023, calendar: 'lunar', isLeapMonth: true },
  }));
  assert.equal('error' in leap, false);
  assert.equal(leap.profile.birth.solarDate, '2023-03-22');
  assert.equal(leap.profile.birth.lunarDate.isLeapMonth, true);
});

test('astrology request validation requires a trimmed name and does not guess gender', () => {
  assert.equal(parseAstrologyInput(solarInput({ fullName: '   ' })), null);
  assert.equal(parseAstrologyInput(solarInput({ gender: 'other' })), null);
  assert.equal(parseAstrologyInput(solarInput())?.fullName, 'Nguyễn Văn Minh');
});
