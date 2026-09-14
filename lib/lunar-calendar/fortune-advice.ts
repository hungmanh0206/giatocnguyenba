import { getLunarDayInfo, getLunarYearCanChi } from './service.ts';

export const fortuneFocuses = [
  {
    id: 'overall',
    label: 'Tổng quan',
    description: 'Nhịp sống và điều nên ưu tiên',
  },
  {
    id: 'love',
    label: 'Tình cảm',
    description: 'Gắn kết và lắng nghe',
  },
  {
    id: 'career',
    label: 'Công việc',
    description: 'Kế hoạch và cộng tác',
  },
  {
    id: 'finance',
    label: 'Tài chính',
    description: 'Kỷ luật và cân nhắc',
  },
] as const;

export type FortuneFocus = (typeof fortuneFocuses)[number]['id'];

export const fortuneGenders = [
  { id: 'male', label: 'Nam' },
  { id: 'female', label: 'Nữ' },
  { id: 'other', label: 'Khác' },
] as const;

export type FortuneGender = (typeof fortuneGenders)[number]['id'];

export const fortuneBirthHours = [
  { id: 'ty', label: 'Giờ Tý (23:00 - 00:59)' },
  { id: 'suu', label: 'Giờ Sửu (01:00 - 02:59)' },
  { id: 'dan', label: 'Giờ Dần (03:00 - 04:59)' },
  { id: 'mao', label: 'Giờ Mão (05:00 - 06:59)' },
  { id: 'thin', label: 'Giờ Thìn (07:00 - 08:59)' },
  { id: 'ty2', label: 'Giờ Tỵ (09:00 - 10:59)' },
  { id: 'ngo', label: 'Giờ Ngọ (11:00 - 12:59)' },
  { id: 'mui', label: 'Giờ Mùi (13:00 - 14:59)' },
  { id: 'than', label: 'Giờ Thân (15:00 - 16:59)' },
  { id: 'dau', label: 'Giờ Dậu (17:00 - 18:59)' },
  { id: 'tuat', label: 'Giờ Tuất (19:00 - 20:59)' },
  { id: 'hoi', label: 'Giờ Hợi (21:00 - 22:59)' },
] as const;

export type FortuneBirthHour = (typeof fortuneBirthHours)[number]['id'];

export type FortuneReading = {
  title: string;
  overview: string;
  notes: { heading: string; text: string }[];
};

export type FortuneRequest = {
  birthYear: number;
  birthDate: string;
  gender: FortuneGender;
  birthHour: FortuneBirthHour;
  focus: FortuneFocus;
  date?: string;
};

export function isFortuneFocus(value: unknown): value is FortuneFocus {
  return fortuneFocuses.some((focus) => focus.id === value);
}

export function isFortuneGender(value: unknown): value is FortuneGender {
  return fortuneGenders.some((gender) => gender.id === value);
}

export function isFortuneBirthHour(value: unknown): value is FortuneBirthHour {
  return fortuneBirthHours.some((hour) => hour.id === value);
}

export function parseCalendarDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null;
}

function focusCopy(focus: FortuneFocus) {
  switch (focus) {
    case 'love':
      return {
        heading: 'Tình cảm',
        text: 'Ưu tiên một cuộc trò chuyện rõ ràng, lắng nghe thêm trước khi kết luận và dành thời gian cho người thân.',
      };
    case 'career':
      return {
        heading: 'Công việc',
        text: 'Chọn một việc quan trọng để hoàn tất trước, sau đó trao đổi kỳ vọng với người cùng làm thay vì ôm quá nhiều đầu việc.',
      };
    case 'finance':
      return {
        heading: 'Tài chính',
        text: 'Rà lại ngân sách, ưu tiên khoản cần thiết và tránh quyết định chi tiêu vội vàng. Đây không phải khuyến nghị đầu tư.',
      };
    default:
      return {
        heading: 'Nhịp sống',
        text: 'Giữ nhịp vừa phải: sắp xếp việc cần làm, nghỉ ngơi đủ và dành một khoảng thời gian kết nối với gia đình.',
      };
  }
}

export function buildFortuneFallback(input: FortuneRequest): FortuneReading {
  const date = parseCalendarDate(input.date) ?? new Date();
  const info = getLunarDayInfo(date);
  const focus = fortuneFocuses.find((item) => item.id === input.focus);
  const gender = fortuneGenders.find((item) => item.id === input.gender);
  const birthHour = fortuneBirthHours.find((item) => item.id === input.birthHour);
  const birthCanChi = getLunarYearCanChi(input.birthYear);
  const focusNote = focusCopy(input.focus);
  const dayContext = info.supported
    ? `Ngày ${info.solar.day}/${info.solar.month}/${info.solar.year} là ${info.canChi.day}, Trực ${info.truc}, tiết ${info.solarTerm}.`
    : `Ngày ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} đang ngoài phạm vi dữ liệu lịch âm.`;

  return {
    title: `${focus?.label ?? 'Tổng quan'} cho tuổi ${birthCanChi}`,
    overview: `Bản tham khảo dựa trên Can Chi năm sinh, ngày sinh${gender ? `, giới tính ${gender.label.toLocaleLowerCase('vi')}` : ''} và lịch truyền thống. ${dayContext}`,
    notes: [
      focusNote,
      {
        heading: 'Luận theo ngày và giờ sinh',
        text: `Ngày sinh và ${birthHour?.label.toLocaleLowerCase('vi') || 'giờ sinh đã chọn'} được dùng để cá nhân hóa ở mức tham khảo. Hệ thống không lập lá số chi tiết hoặc đưa ra kết luận chắc chắn.`,
      },
      {
        heading: 'Gợi ý trong ngày',
        text: info.supported
          ? `Giờ Hoàng đạo được lịch ghi nhận: ${info.goodHours.slice(0, 3).join(' · ')}. Hướng Hỷ Thần: ${info.traditional.directions.hyThan}.`
          : 'Hãy ưu tiên lịch trình rõ ràng và các quyết định đã có đủ thông tin.',
      },
    ],
  };
}
