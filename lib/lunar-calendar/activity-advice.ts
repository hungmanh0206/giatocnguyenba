import type { LunarCalendarDayInfo } from './types.ts';

export const calendarActivities = [
  {
    id: 'wedding',
    label: 'Cưới hỏi',
    description: 'Thành hôn, lễ cưới',
    icon: 'favorite',
    favorable: ['Thành hôn'],
    caution: ['Cưới hỏi'],
  },
  {
    id: 'funeral',
    label: 'Ma chay',
    description: 'Tang lễ, an táng',
    icon: 'memorial',
    favorable: ['Tế tự', 'Cầu an'],
    caution: ['An táng'],
  },
  {
    id: 'vehicle',
    label: 'Mua xe',
    description: 'Nhận xe, khởi hành',
    icon: 'today',
    favorable: ['Cầu tài', 'Ký kết'],
    caution: ['Di chuyển lớn'],
  },
  {
    id: 'construction',
    label: 'Xây nhà',
    description: 'Động thổ, khởi công',
    icon: 'home',
    favorable: ['Khởi công'],
    caution: ['Động thổ', 'Khởi công'],
  },
  {
    id: 'opening',
    label: 'Khai trương',
    description: 'Mở hàng, ký kết',
    icon: 'tree-cta',
    favorable: ['Khai trương', 'Mở hàng', 'Mở cửa hàng', 'Ký kết'],
    caution: ['Khai trương'],
  },
  {
    id: 'moving',
    label: 'Nhập trạch',
    description: 'An cư, về nhà mới',
    icon: 'home',
    favorable: ['An cư'],
    caution: ['Di chuyển lớn'],
  },
  {
    id: 'travel',
    label: 'Xuất hành',
    description: 'Đi xa, khởi hành',
    icon: 'departure-direction',
    favorable: ['Xuất hành'],
    caution: ['Xuất hành xa', 'Xuất hành'],
  },
] as const;

export type CalendarActivityId = (typeof calendarActivities)[number]['id'];
export type CalendarActivityTone = 'favorable' | 'neutral' | 'caution';

export type CalendarActivityAdvice = {
  activity: (typeof calendarActivities)[number];
  tone: CalendarActivityTone;
  label: string;
  summary: string;
  reasons: string[];
  goodHours: string[];
  directions: LunarCalendarDayInfo['traditional']['directions'];
};

function normalise(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi');
}

function matchesOne(values: string[], phrases: readonly string[]) {
  const combined = normalise(values.join(' | '));
  return phrases.some((phrase) => combined.includes(normalise(phrase)));
}

export function getCalendarActivityAdvice(
  info: LunarCalendarDayInfo,
  activityId: CalendarActivityId,
): CalendarActivityAdvice {
  const activity = calendarActivities.find((item) => item.id === activityId);
  if (!activity) {
    throw new Error('Công việc được chọn không hợp lệ.');
  }

  const isFavorable = matchesOne(
    info.traditional.activities.good,
    activity.favorable,
  );
  const needsCaution = matchesOne(
    info.traditional.activities.bad,
    activity.caution,
  );
  const tone: CalendarActivityTone = needsCaution
    ? 'caution'
    : isFavorable
      ? 'favorable'
      : 'neutral';
  const label =
    tone === 'favorable'
      ? 'Có thể cân nhắc'
      : tone === 'caution'
        ? 'Nên cân nhắc kỹ'
        : 'Thông tin tham khảo';
  const summary =
    tone === 'favorable'
      ? `Lịch truyền thống ghi nhận ${activity.label.toLocaleLowerCase('vi')} phù hợp với Trực ${info.truc} trong ngày này.`
      : tone === 'caution'
        ? `Lịch truyền thống xếp ${activity.label.toLocaleLowerCase('vi')} vào nhóm cần thận trọng trong ngày này.`
        : `Lịch truyền thống chưa có ghi chú trực tiếp cho ${activity.label.toLocaleLowerCase('vi')} trong ngày này.`;
  const reasons = [
    `Trực ${info.truc}: ${info.traditional.trucMeaning}`,
    info.traditional.stars.good.length
      ? `Sao tốt: ${info.traditional.stars.good.join(' · ')}`
      : 'Chưa ghi nhận sao tốt nổi bật.',
    info.traditional.stars.bad.length
      ? `Sao hạn chế: ${info.traditional.stars.bad.join(' · ')}`
      : 'Chưa ghi nhận sao hạn chế nổi bật.',
  ];

  return {
    activity,
    tone,
    label,
    summary,
    reasons,
    goodHours: info.goodHours.slice(0, 3),
    directions: info.traditional.directions,
  };
}
