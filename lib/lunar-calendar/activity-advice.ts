import { getLunarDayInfo } from './service.ts';
import type { LunarCalendarDayInfo } from './types.ts';

export const calendarActivities = [
  { id: 'wedding', label: 'Cưới hỏi', description: 'Thành hôn, lễ cưới', icon: 'activity-wedding', favorable: ['Thành hôn'], caution: ['Cưới hỏi'] },
  { id: 'funeral', label: 'Ma chay', description: 'Tang lễ, an táng', icon: 'activity-funeral', favorable: ['Tế tự', 'Cầu an'], caution: ['An táng'] },
  { id: 'buy_car', label: 'Mua xe', description: 'Nhận xe, khởi hành', icon: 'activity-vehicle', favorable: ['Cầu tài', 'Ký kết'], caution: ['Di chuyển lớn'] },
  { id: 'build_house', label: 'Xây nhà', description: 'Động thổ, khởi công', icon: 'activity-construction', favorable: ['Khởi công'], caution: ['Động thổ', 'Khởi công'] },
  { id: 'grand_opening', label: 'Khai trương', description: 'Mở hàng, ký kết', icon: 'activity-opening', favorable: ['Khai trương', 'Mở hàng', 'Mở cửa hàng', 'Ký kết'], caution: ['Khai trương'] },
  { id: 'moving_house', label: 'Nhập trạch', description: 'An cư, về nhà mới', icon: 'activity-moving', favorable: ['An cư'], caution: ['Di chuyển lớn'] },
  { id: 'travel', label: 'Xuất hành', description: 'Đi xa, khởi hành', icon: 'activity-travel', favorable: ['Xuất hành'], caution: ['Xuất hành xa', 'Xuất hành'] },
] as const;

export type CalendarActivityId = (typeof calendarActivities)[number]['id'];
export type AlmanacActivity = CalendarActivityId | 'engagement' | 'burial' | 'exhumation' | 'buy_house' | 'buy_land' | 'sign_contract' | 'groundbreaking' | 'house_renovation' | 'start_job' | 'pray_for_wealth' | 'ancestor_worship' | 'other';
export type ActivityEvaluationLevel = 'excellent' | 'good' | 'neutral' | 'caution' | 'avoid';
export type CalendarActivityTone = 'favorable' | 'neutral' | 'caution';

type Factor = { code: string; label: string; description?: string };
type WarningFactor = Factor & { severity: 'low' | 'medium' | 'high' };
type HourWindow = { branch: string; from: string; to: string; reason?: string };

export type ActivityDayEvaluation = {
  activity: { id: AlmanacActivity; label: string };
  date: { solar: string; lunar: { day: number; month: number; year: number; isLeapMonth: boolean } };
  classification: ActivityEvaluationLevel;
  summaryReason: string;
  goodFactors: Factor[];
  warningFactors: WarningFactor[];
  goodHours: HourWindow[];
  badHours: HourWindow[];
  calendar: { canChiDay: string; dayOfficer: string; solarTerm: string; lunarMansion: string; dayType: string; element?: string; napAm?: string };
  directions: { joyGod: string; wealthGod: string };
  alternatives: Array<{ solarDate: string; lunarDate: string; classification: ActivityEvaluationLevel }>;
  rulesVersion: 'v1';
};

export type CalendarActivityAdvice = {
  activity: (typeof calendarActivities)[number];
  tone: CalendarActivityTone;
  label: string;
  summary: string;
  reasons: string[];
  goodHours: string[];
  directions: LunarCalendarDayInfo['traditional']['directions'];
};

const hourRanges: Record<string, Omit<HourWindow, 'reason'>> = {
  Tý: { branch: 'Tý', from: '23:00', to: '00:59' }, Sửu: { branch: 'Sửu', from: '01:00', to: '02:59' }, Dần: { branch: 'Dần', from: '03:00', to: '04:59' }, Mão: { branch: 'Mão', from: '05:00', to: '06:59' }, Thìn: { branch: 'Thìn', from: '07:00', to: '08:59' }, Tỵ: { branch: 'Tỵ', from: '09:00', to: '10:59' }, Ngọ: { branch: 'Ngọ', from: '11:00', to: '12:59' }, Mùi: { branch: 'Mùi', from: '13:00', to: '14:59' }, Thân: { branch: 'Thân', from: '15:00', to: '16:59' }, Dậu: { branch: 'Dậu', from: '17:00', to: '18:59' }, Tuất: { branch: 'Tuất', from: '19:00', to: '20:59' }, Hợi: { branch: 'Hợi', from: '21:00', to: '22:59' },
};

const customActivityRules: Array<{ id: AlmanacActivity; label: string; base: CalendarActivityId | 'other'; matches: string[] }> = [
  { id: 'engagement', label: 'Ăn hỏi', base: 'wedding', matches: ['an hoi', 'dinh hon'] },
  { id: 'exhumation', label: 'Cải táng', base: 'funeral', matches: ['cai tang', 'sang cat'] },
  { id: 'burial', label: 'An táng', base: 'funeral', matches: ['an tang', 'mai tang'] },
  { id: 'buy_house', label: 'Mua nhà', base: 'moving_house', matches: ['mua nha', 'hop dong mua nha'] },
  { id: 'buy_land', label: 'Mua đất', base: 'moving_house', matches: ['mua dat'] },
  { id: 'sign_contract', label: 'Ký hợp đồng', base: 'grand_opening', matches: ['ky hop dong', 'ky ket'] },
  { id: 'groundbreaking', label: 'Động thổ', base: 'build_house', matches: ['dong tho'] },
  { id: 'house_renovation', label: 'Sửa nhà', base: 'build_house', matches: ['sua nha', 'cai tao nha', 'dat bep'] },
  { id: 'start_job', label: 'Nhận việc', base: 'grand_opening', matches: ['nhan viec', 'bat dau cong viec', 'mo van phong', 'khai may'] },
  { id: 'pray_for_wealth', label: 'Cầu tài', base: 'grand_opening', matches: ['cau tai'] },
  { id: 'ancestor_worship', label: 'Cúng tổ tiên', base: 'funeral', matches: ['cung to tien', 'te to', 'tho cung'] },
];

function normalise(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLocaleLowerCase('vi'); }
function matchesOne(values: string[], phrases: readonly string[]) { const combined = normalise(values.join(' | ')); return phrases.some((phrase) => combined.includes(normalise(phrase))); }
function baseFor(activity: AlmanacActivity) { if (calendarActivities.some((item) => item.id === activity)) return activity as CalendarActivityId; return customActivityRules.find((rule) => rule.id === activity)?.base || 'other'; }
export function labelForAlmanacActivity(activity: AlmanacActivity) { return calendarActivities.find((item) => item.id === activity)?.label || customActivityRules.find((item) => item.id === activity)?.label || 'Việc khác'; }
function asHours(hours: string[], reason: string) { return hours.flatMap((branch) => hourRanges[branch] ? [{ ...hourRanges[branch], reason }] : []); }
export function labelForActivityLevel(level: ActivityEvaluationLevel) { return ({ excellent: 'Rất phù hợp', good: 'Phù hợp', neutral: 'Trung tính', caution: 'Nên cân nhắc', avoid: 'Không thuận' })[level]; }

function evaluateLevel(info: LunarCalendarDayInfo, activity: AlmanacActivity) {
  const base = baseFor(activity);
  if (base === 'other') return 'neutral' as const;
  const definition = calendarActivities.find((item) => item.id === base)!;
  const favorable = matchesOne(info.traditional.activities.good, definition.favorable);
  const caution = matchesOne(info.traditional.activities.bad, definition.caution);
  if (caution && ['Phá', 'Nguy', 'Bế'].includes(info.truc)) return 'avoid' as const;
  if (caution) return 'caution' as const;
  if (favorable && info.traditional.stars.good.length >= 2) return 'excellent' as const;
  if (favorable) return 'good' as const;
  return 'neutral' as const;
}

export function evaluateActivityDay(info: LunarCalendarDayInfo, activity: AlmanacActivity, includeAlternatives = true): ActivityDayEvaluation {
  const classification = evaluateLevel(info, activity);
  const base = baseFor(activity);
  const definition = base === 'other' ? null : calendarActivities.find((item) => item.id === base)!;
  const goodFactors: Factor[] = [
    ...info.traditional.stars.good.map((label) => ({ code: `star-${normalise(label)}`, label })),
    ...(definition && matchesOne(info.traditional.activities.good, definition.favorable) ? [{ code: `activity-${definition.id}`, label: `Trực ${info.truc} có ghi nhận phù hợp cho ${labelForAlmanacActivity(activity).toLocaleLowerCase('vi')}` }] : []),
  ].slice(0, 4);
  const warningFactors: WarningFactor[] = [
    ...(definition && matchesOne(info.traditional.activities.bad, definition.caution) ? [{ code: `officer-${info.truc}`, label: `Trực ${info.truc}: ${info.traditional.trucMeaning}`, severity: ['Phá', 'Nguy', 'Bế'].includes(info.truc) ? 'high' as const : 'medium' as const }] : []),
    ...info.traditional.stars.bad.map((label) => ({ code: `star-${normalise(label)}`, label, severity: 'low' as const })),
  ].slice(0, 4);
  const summaryReason = classification === 'neutral' && base === 'other'
    ? `Engine chưa có bộ quy tắc riêng cho ${labelForAlmanacActivity(activity).toLocaleLowerCase('vi')}; kết quả chỉ cung cấp dữ kiện lịch trong ngày.`
    : `${labelForActivityLevel(classification)} cho ${labelForAlmanacActivity(activity).toLocaleLowerCase('vi')} theo các quy tắc lịch truyền thống hiện có.`;
  const evaluation: ActivityDayEvaluation = {
    activity: { id: activity, label: labelForAlmanacActivity(activity) },
    date: { solar: `${String(info.solar.day).padStart(2, '0')}/${String(info.solar.month).padStart(2, '0')}/${info.solar.year}`, lunar: { day: info.lunar.day, month: info.lunar.month, year: info.lunar.year, isLeapMonth: info.lunar.leapMonth } },
    classification, summaryReason, goodFactors, warningFactors,
    goodHours: asHours(info.goodHours.slice(0, 3), 'Giờ Hoàng đạo do Calendar Engine ghi nhận'),
    badHours: asHours(info.badHours.slice(0, 3), 'Giờ Hắc đạo do Calendar Engine ghi nhận'),
    calendar: { canChiDay: info.canChi.day, dayOfficer: info.truc, solarTerm: info.solarTerm, lunarMansion: info.traditional.twentyEightMansion, dayType: info.dayClassification, ...(info.element.name ? { element: info.element.name } : {}), ...(info.element.napAm ? { napAm: info.element.napAm } : {}) },
    directions: { joyGod: info.traditional.directions.hyThan, wealthGod: info.traditional.directions.taiThan }, alternatives: [], rulesVersion: 'v1',
  };
  return includeAlternatives ? { ...evaluation, alternatives: findAlternativeActivityDays(info.solar.date, activity) } : evaluation;
}

export function findAlternativeActivityDays(date: Date, activity: AlmanacActivity) {
  const candidates = Array.from({ length: 30 }, (_, index) => index - 15).filter((offset) => offset !== 0).flatMap((offset) => {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset, 12);
    const info = getLunarDayInfo(next);
    if (!info.supported) return [];
    const evaluation = evaluateActivityDay(info, activity, false);
    return evaluation.classification === 'excellent' || evaluation.classification === 'good' ? [{ distance: Math.abs(offset), evaluation }] : [];
  }).sort((a, b) => a.evaluation.classification === b.evaluation.classification ? a.distance - b.distance : a.evaluation.classification === 'excellent' ? -1 : 1).slice(0, 3);
  return candidates.map(({ evaluation }) => ({ solarDate: evaluation.date.solar, lunarDate: `${evaluation.date.lunar.day}/${evaluation.date.lunar.month}/${evaluation.date.lunar.year} âm lịch${evaluation.date.lunar.isLeapMonth ? ' nhuận' : ''}`, classification: evaluation.classification }));
}

export function resolveCustomActivity(value: string): { kind: 'resolved'; activity: AlmanacActivity; label: string } | { kind: 'ambiguous'; suggestions: AlmanacActivity[] } | { kind: 'other'; activity: 'other'; label: string } | null {
  const label = value.trim().replace(/\s+/g, ' ');
  if (!label) return null;
  const normalized = normalise(label);
  const matches = customActivityRules
    .map((rule) => ({ rule, specificity: Math.max(...rule.matches.filter((phrase) => normalized.includes(phrase)).map((phrase) => phrase.length), 0) }))
    .filter((match) => match.specificity > 0)
    .sort((first, second) => second.specificity - first.specificity);
  if (matches.length && (matches.length === 1 || matches[0].specificity > matches[1].specificity)) {
    return { kind: 'resolved', activity: matches[0].rule.id, label };
  }
  if (matches.length > 1 || normalized === 'lam viec lon') return { kind: 'ambiguous', suggestions: ['sign_contract', 'grand_opening', 'travel', 'other'] };
  return { kind: 'other', activity: 'other', label };
}

export function getCalendarActivityAdvice(info: LunarCalendarDayInfo, activityId: CalendarActivityId): CalendarActivityAdvice {
  const activity = calendarActivities.find((item) => item.id === activityId);
  if (!activity) throw new Error('Công việc được chọn không hợp lệ.');
  const evaluation = evaluateActivityDay(info, activityId, false);
  const tone: CalendarActivityTone = evaluation.classification === 'excellent' || evaluation.classification === 'good' ? 'favorable' : evaluation.classification === 'caution' || evaluation.classification === 'avoid' ? 'caution' : 'neutral';
  return { activity, tone, label: labelForActivityLevel(evaluation.classification), summary: evaluation.summaryReason, reasons: [...evaluation.goodFactors, ...evaluation.warningFactors].map((factor) => factor.label).slice(0, 3), goodHours: evaluation.goodHours.map((hour) => hour.branch), directions: info.traditional.directions };
}
