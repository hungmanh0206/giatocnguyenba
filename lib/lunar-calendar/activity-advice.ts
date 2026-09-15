import { getLunarDayInfo } from './service.ts';
import type { LunarCalendarDayInfo } from './types.ts';

export const calendarActivities = [
  { id: 'wedding', label: 'Cưới hỏi', description: 'Thành hôn, lễ cưới', icon: 'activity-wedding', favorable: ['Thành hôn'], caution: ['Cưới hỏi'] },
  { id: 'buy_house', label: 'Mua nhà', description: 'Ký kết, nhận nhà', icon: 'activity-house-purchase', favorable: ['An cư', 'Ký kết'], caution: ['Di chuyển lớn'] },
  { id: 'build_house', label: 'Xây nhà', description: 'Động thổ, khởi công', icon: 'activity-construction', favorable: ['Khởi công'], caution: ['Động thổ', 'Khởi công'] },
  { id: 'moving_house', label: 'Nhập trạch', description: 'An cư, về nhà mới', icon: 'activity-moving', favorable: ['An cư'], caution: ['Di chuyển lớn'] },
  { id: 'buy_car', label: 'Mua xe', description: 'Nhận xe, khởi hành', icon: 'activity-vehicle', favorable: ['Cầu tài', 'Ký kết'], caution: ['Di chuyển lớn'] },
  { id: 'grand_opening', label: 'Khai trương', description: 'Mở hàng, ký kết', icon: 'activity-opening', favorable: ['Khai trương', 'Mở hàng', 'Mở cửa hàng', 'Ký kết'], caution: ['Khai trương'] },
  { id: 'travel', label: 'Xuất hành', description: 'Đi xa, khởi hành', icon: 'activity-travel', favorable: ['Xuất hành'], caution: ['Xuất hành xa', 'Xuất hành'] },
  { id: 'funeral', label: 'Ma chay', description: 'Tang lễ, an táng', icon: 'activity-funeral', favorable: ['Tế tự', 'Cầu an'], caution: ['An táng'] },
] as const;

export type CalendarActivityId = (typeof calendarActivities)[number]['id'];
export type AlmanacActivity = CalendarActivityId | 'engagement' | 'burial' | 'exhumation' | 'buy_house' | 'buy_land' | 'sign_contract' | 'groundbreaking' | 'house_renovation' | 'start_job' | 'pray_for_wealth' | 'ancestor_worship' | 'exam_interview' | 'paperwork' | 'move_altar' | 'setup_altar' | 'star_ritual' | 'house_blessing' | 'pray_for_peace' | 'other';
export type ActivityEvaluationLevel = 'excellent' | 'good' | 'neutral' | 'caution' | 'avoid';
export type CalendarActivityTone = 'favorable' | 'neutral' | 'caution';
export type ActivitySupportLevel = 'full' | 'partial' | 'unsupported';

type Factor = { code: string; label: string; description?: string };
type WarningFactor = Factor & { severity: 'low' | 'medium' | 'high' };
type HourWindow = { branch: string; from: string; to: string; reason?: string };

export type ActivityDayEvaluation = {
  activity: { id: AlmanacActivity; label: string; supportLevel: ActivitySupportLevel; supportNote?: string };
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
  rulesVersion: 'v2';
  provenance: {
    calendar: 'Calendar Core (@lichta/core)';
    activityRules: 'CanChi activity catalog, adapted';
  };
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

const customActivityRules: Array<{ id: Exclude<AlmanacActivity, 'other'>; label: string; base: CalendarActivityId | 'other'; matches: string[]; preferredTruc: string[]; supportLevel?: ActivitySupportLevel; supportNote?: string }> = [
  { id: 'funeral', label: 'Ma chay', base: 'funeral', matches: ['ma chay', 'tang le'], preferredTruc: [], supportLevel: 'partial', supportNote: 'Ma chay và cải táng là hai việc khác nhau. Kết quả này không áp dụng quy tắc cải táng, sang cát.' },
  { id: 'engagement', label: 'Ăn hỏi', base: 'wedding', matches: ['an hoi', 'dam ngo', 'dinh hon'], preferredTruc: ['Thành', 'Định', 'Khai'] },
  { id: 'exhumation', label: 'Cải táng, sang cát', base: 'funeral', matches: ['cai tang', 'sang cat'], preferredTruc: ['Định', 'Thành', 'Bình'] },
  { id: 'burial', label: 'An táng', base: 'funeral', matches: ['an tang', 'mai tang'], preferredTruc: [], supportLevel: 'partial', supportNote: 'Dữ kiện lịch chỉ dùng để tham khảo; nghi thức tang lễ cần theo phong tục, tôn giáo và người phụ trách tại địa phương.' },
  { id: 'buy_house', label: 'Mua nhà', base: 'buy_house', matches: ['mua nha', 'hop dong mua nha'], preferredTruc: ['Định', 'Thành', 'Khai'] },
  { id: 'buy_land', label: 'Mua đất', base: 'moving_house', matches: ['mua dat'], preferredTruc: ['Định', 'Thành', 'Khai'] },
  { id: 'sign_contract', label: 'Ký hợp đồng', base: 'grand_opening', matches: ['ky hop dong', 'ky ket', 'giao dich'], preferredTruc: ['Định', 'Thành', 'Chấp'] },
  { id: 'groundbreaking', label: 'Động thổ', base: 'build_house', matches: ['dong tho'], preferredTruc: ['Kiến', 'Thành', 'Định'] },
  { id: 'house_renovation', label: 'Sửa nhà', base: 'build_house', matches: ['sua nha', 'cai tao nha', 'dat bep'], preferredTruc: ['Kiến', 'Thành', 'Định'] },
  { id: 'start_job', label: 'Nhận công việc mới', base: 'grand_opening', matches: ['nhan viec', 'bat dau cong viec', 'mo van phong', 'khai may'], preferredTruc: ['Khai', 'Thành', 'Định'] },
  { id: 'pray_for_wealth', label: 'Cầu tài', base: 'grand_opening', matches: ['cau tai'], preferredTruc: ['Thành', 'Khai', 'Định'] },
  { id: 'ancestor_worship', label: 'Cúng tổ tiên', base: 'funeral', matches: ['cung to tien', 'te to', 'tho cung'], preferredTruc: ['Thành', 'Khai', 'Định'], supportLevel: 'partial', supportNote: 'Phần này chỉ tham khảo dữ kiện lịch; việc cúng lễ nên theo nề nếp gia đình và phong tục địa phương.' },
  { id: 'exam_interview', label: 'Thi cử, phỏng vấn', base: 'grand_opening', matches: ['thi cu', 'phong van', 'xet tuyen'], preferredTruc: ['Thành', 'Khai', 'Định'] },
  { id: 'paperwork', label: 'Làm giấy tờ', base: 'grand_opening', matches: ['lam giay to', 'thu tuc hanh chinh'], preferredTruc: ['Định', 'Thành', 'Chấp'] },
  { id: 'move_altar', label: 'Dời ban thờ', base: 'moving_house', matches: ['doi ban tho', 'di chuyen ban tho'], preferredTruc: ['Định', 'Thành', 'Khai'], supportLevel: 'partial', supportNote: 'Đây là gợi ý lịch tham khảo; nghi thức thờ cúng nên theo nề nếp gia đình và phong tục địa phương.' },
  { id: 'setup_altar', label: 'Lập bàn thờ', base: 'moving_house', matches: ['lap ban tho', 'dung ban tho'], preferredTruc: ['Thành', 'Định', 'Khai'], supportLevel: 'partial', supportNote: 'Đây là gợi ý lịch tham khảo; nghi thức thờ cúng nên theo nề nếp gia đình và phong tục địa phương.' },
  { id: 'star_ritual', label: 'Cúng sao giải hạn', base: 'other', matches: ['cung sao', 'giai han'], preferredTruc: ['Trừ', 'Bình', 'Định'], supportLevel: 'partial', supportNote: 'Dữ kiện lịch chỉ có giá trị tham khảo văn hóa, không thay thế nghi lễ hoặc hướng dẫn tôn giáo.' },
  { id: 'house_blessing', label: 'Trấn trạch', base: 'moving_house', matches: ['tran trach', 'yem trach'], preferredTruc: ['Định', 'Thành', 'Kiến'], supportLevel: 'partial', supportNote: 'Dữ kiện lịch chỉ có giá trị tham khảo văn hóa, không thay thế nghi lễ hoặc hướng dẫn chuyên môn.' },
  { id: 'pray_for_peace', label: 'Cầu an, làm phúc', base: 'other', matches: ['cau an', 'phong sinh', 'lam phuc'], preferredTruc: ['Thành', 'Khai', 'Định'], supportLevel: 'partial', supportNote: 'Dữ kiện lịch chỉ có giá trị tham khảo văn hóa, không thay thế nghi lễ hoặc hướng dẫn tôn giáo.' },
];

const preferredTrucByActivity: Partial<Record<CalendarActivityId, string[]>> = {
  wedding: ['Thành', 'Định', 'Khai'],
  buy_house: ['Định', 'Thành', 'Khai'],
  buy_car: ['Thành', 'Định', 'Khai'],
  build_house: ['Kiến', 'Thành', 'Định'],
  grand_opening: ['Khai', 'Thành', 'Định'],
  moving_house: ['Định', 'Thành', 'Khai'],
  travel: ['Kiến', 'Khai', 'Thành'],
};

function normalise(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLocaleLowerCase('vi'); }
function matchesOne(values: string[], phrases: readonly string[]) { const combined = normalise(values.join(' | ')); return phrases.some((phrase) => combined.includes(normalise(phrase))); }
function baseFor(activity: AlmanacActivity) { if (calendarActivities.some((item) => item.id === activity)) return activity as CalendarActivityId; return customActivityRules.find((rule) => rule.id === activity)?.base || 'other'; }
export function labelForAlmanacActivity(activity: AlmanacActivity) { return calendarActivities.find((item) => item.id === activity)?.label || customActivityRules.find((item) => item.id === activity)?.label || 'Việc khác'; }
function supportFor(activity: AlmanacActivity): Pick<ActivityDayEvaluation['activity'], 'supportLevel' | 'supportNote'> {
  if (activity === 'other') return { supportLevel: 'unsupported', supportNote: 'Engine chưa có bộ quy tắc riêng cho công việc này; chỉ hiển thị dữ kiện lịch trong ngày.' };
  if (activity === 'funeral') return { supportLevel: 'partial', supportNote: 'Ma chay và cải táng là hai việc khác nhau. Kết quả này không áp dụng quy tắc cải táng, sang cát.' };
  const custom = customActivityRules.find((rule) => rule.id === activity);
  return { supportLevel: custom?.supportLevel || 'full', ...(custom?.supportNote ? { supportNote: custom.supportNote } : {}) };
}
function preferredTrucFor(activity: AlmanacActivity) {
  if (calendarActivities.some((item) => item.id === activity)) return preferredTrucByActivity[activity as CalendarActivityId] || [];
  return customActivityRules.find((rule) => rule.id === activity)?.preferredTruc || [];
}
function asHours(hours: string[], reason: string) { return hours.flatMap((branch) => hourRanges[branch] ? [{ ...hourRanges[branch], reason }] : []); }
export function labelForActivityLevel(level: ActivityEvaluationLevel) { return ({ excellent: 'Rất phù hợp', good: 'Phù hợp', neutral: 'Trung tính', caution: 'Nên cân nhắc', avoid: 'Không thuận' })[level]; }

function evaluateLevel(info: LunarCalendarDayInfo, activity: AlmanacActivity) {
  const base = baseFor(activity);
  const definition = base === 'other' ? null : calendarActivities.find((item) => item.id === base)!;
  const favorable = definition ? matchesOne(info.traditional.activities.good, definition.favorable) : false;
  const caution = definition ? matchesOne(info.traditional.activities.bad, definition.caution) : false;
  const preferredTruc = preferredTrucFor(activity).includes(info.truc);
  if (['Phá', 'Nguy', 'Bế'].includes(info.truc) && preferredTrucFor(activity).length) return 'avoid' as const;
  if (caution && ['Phá', 'Nguy', 'Bế'].includes(info.truc)) return 'avoid' as const;
  if (caution) return 'caution' as const;
  if ((favorable || preferredTruc) && info.traditional.stars.good.length >= 2) return 'excellent' as const;
  if (favorable || preferredTruc) return 'good' as const;
  return 'neutral' as const;
}

export function evaluateActivityDay(info: LunarCalendarDayInfo, activity: AlmanacActivity, includeAlternatives = true): ActivityDayEvaluation {
  const classification = evaluateLevel(info, activity);
  const base = baseFor(activity);
  const definition = base === 'other' ? null : calendarActivities.find((item) => item.id === base)!;
  const support = supportFor(activity);
  const preferredTruc = preferredTrucFor(activity);
  const goodFactors: Factor[] = [
    ...info.traditional.stars.good.map((label) => ({ code: `star-${normalise(label)}`, label })),
    ...(preferredTruc.includes(info.truc) ? [{ code: `preferred-truc-${info.truc}`, label: `Trực ${info.truc} thuộc nhóm thuận cho ${labelForAlmanacActivity(activity).toLocaleLowerCase('vi')}` }] : []),
    ...(definition && matchesOne(info.traditional.activities.good, definition.favorable) ? [{ code: `activity-${definition.id}`, label: `Trực ${info.truc} có ghi nhận phù hợp cho ${labelForAlmanacActivity(activity).toLocaleLowerCase('vi')}` }] : []),
  ].slice(0, 4);
  const warningFactors: WarningFactor[] = [
    ...(definition && matchesOne(info.traditional.activities.bad, definition.caution) ? [{ code: `officer-${info.truc}`, label: `Trực ${info.truc}: ${info.traditional.trucMeaning}`, severity: ['Phá', 'Nguy', 'Bế'].includes(info.truc) ? 'high' as const : 'medium' as const }] : []),
    ...info.traditional.stars.bad.map((label) => ({ code: `star-${normalise(label)}`, label, severity: 'low' as const })),
  ].slice(0, 4);
  const summaryReason = support.supportLevel === 'unsupported'
    ? `Engine chưa có bộ quy tắc riêng cho ${labelForAlmanacActivity(activity).toLocaleLowerCase('vi')}; kết quả chỉ cung cấp dữ kiện lịch trong ngày.`
    : `${labelForActivityLevel(classification)} cho ${labelForAlmanacActivity(activity).toLocaleLowerCase('vi')} theo các quy tắc lịch truyền thống hiện có.`;
  const evaluation: ActivityDayEvaluation = {
    activity: { id: activity, label: labelForAlmanacActivity(activity), ...support },
    date: { solar: `${String(info.solar.day).padStart(2, '0')}/${String(info.solar.month).padStart(2, '0')}/${info.solar.year}`, lunar: { day: info.lunar.day, month: info.lunar.month, year: info.lunar.year, isLeapMonth: info.lunar.leapMonth } },
    classification, summaryReason, goodFactors, warningFactors,
    goodHours: asHours(info.goodHours.slice(0, 3), 'Giờ Hoàng đạo do Calendar Engine ghi nhận'),
    badHours: asHours(info.badHours.slice(0, 3), 'Giờ Hắc đạo do Calendar Engine ghi nhận'),
    calendar: { canChiDay: info.canChi.day, dayOfficer: info.truc, solarTerm: info.solarTerm, lunarMansion: info.traditional.twentyEightMansion, dayType: info.dayClassification, ...(info.element.name ? { element: info.element.name } : {}), ...(info.element.napAm ? { napAm: info.element.napAm } : {}) },
    directions: { joyGod: info.traditional.directions.hyThan, wealthGod: info.traditional.directions.taiThan }, alternatives: [], rulesVersion: 'v2',
    provenance: { calendar: 'Calendar Core (@lichta/core)', activityRules: 'CanChi activity catalog, adapted' },
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
