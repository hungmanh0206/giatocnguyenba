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

export type FortuneReading = {
  title: string;
  overview: string;
  notes: { heading: string; text: string }[];
};

export type FortuneRequest = {
  birthYear: number;
  birthDate?: string;
  focus: FortuneFocus;
  date?: string;
};

export function isFortuneFocus(value: unknown): value is FortuneFocus {
  return fortuneFocuses.some((focus) => focus.id === value);
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
  const birthCanChi = getLunarYearCanChi(input.birthYear);
  const focusNote = focusCopy(input.focus);
  const dayContext = info.supported
    ? `Ngày ${info.solar.day}/${info.solar.month}/${info.solar.year} là ${info.canChi.day}, Trực ${info.truc}, tiết ${info.solarTerm}.`
    : `Ngày ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} đang ngoài phạm vi dữ liệu lịch âm.`;

  return {
    title: `${focus?.label ?? 'Tổng quan'} cho tuổi ${birthCanChi}`,
    overview: `Bản tham khảo dựa trên Can Chi năm sinh và lịch truyền thống. ${dayContext}`,
    notes: [
      focusNote,
      {
        heading: 'Luận theo ngày sinh',
        text: input.birthDate
          ? 'Ngày sinh đã được dùng để cá nhân hóa câu trả lời ở mức tham khảo; không có giờ sinh nên không lập lá số chi tiết.'
          : 'Bạn có thể thêm ngày sinh để luận giải cá nhân hóa hơn. Không có giờ sinh nên hệ thống không lập lá số chi tiết.',
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
