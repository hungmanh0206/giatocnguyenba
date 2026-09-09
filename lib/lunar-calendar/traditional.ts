import type {
  Festival,
  LunarCalendarBase,
  TraditionalCalendarInfo,
} from './types.ts';

// Adapted from the MIT-licensed Can Chi project's offline day-lore datasets.
const CAN = [
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
];
const NHI_THAP_BAT_TU = [
  'Giác',
  'Cang',
  'Đê',
  'Phòng',
  'Tâm',
  'Vĩ',
  'Cơ',
  'Đẩu',
  'Ngưu',
  'Nữ',
  'Hư',
  'Nguy',
  'Thất',
  'Bích',
  'Khuê',
  'Lâu',
  'Vị',
  'Mão',
  'Tất',
  'Chủy',
  'Sâm',
  'Tỉnh',
  'Quỷ',
  'Liễu',
  'Tinh',
  'Trương',
  'Dực',
  'Chẩn',
] as const;

const TAI_THAN_BY_CAN = [
  'Đông Nam',
  'Đông Nam',
  'Đông',
  'Đông',
  'Bắc',
  'Bắc',
  'Tây Nam',
  'Tây Nam',
  'Nam',
  'Nam',
];
const HY_THAN_BY_CAN = [
  'Đông Bắc',
  'Tây Bắc',
  'Tây Nam',
  'Đông Nam',
  'Đông Nam',
  'Đông Bắc',
  'Tây Bắc',
  'Tây Nam',
  'Đông Nam',
  'Đông Bắc',
];

const TRUC_GUIDANCE: Record<
  string,
  { meaning: string; good: string[]; bad: string[] }
> = {
  Kiến: {
    meaning: 'Tốt cho khởi sự, xuất hành',
    good: ['Khởi công', 'Xuất hành', 'Cầu tài'],
    bad: ['Động thổ lớn', 'An táng'],
  },
  Trừ: {
    meaning: 'Tốt trừ bệnh, phá bỏ',
    good: ['Trừ bệnh', 'Phá dỡ', 'Thanh lọc'],
    bad: ['Khai trương', 'Cưới hỏi'],
  },
  Mãn: {
    meaning: 'Tốt cầu tài, tế tự',
    good: ['Tế tự', 'Cầu phúc', 'Nhập học'],
    bad: ['Kiện tụng', 'Xuất quân'],
  },
  Bình: {
    meaning: 'Ngày bình thường, hợp việc nhỏ',
    good: ['Việc thường ngày', 'Gặp gỡ'],
    bad: ['Khởi sự lớn'],
  },
  Định: {
    meaning: 'Tốt an cư, mở hàng',
    good: ['An cư', 'Mở hàng', 'Ký kết'],
    bad: ['Di chuyển lớn'],
  },
  Chấp: {
    meaning: 'Tốt thu hoạch, bắt đầu học',
    good: ['Thu hoạch', 'Bắt đầu học', 'Nhập kho'],
    bad: ['Xuất hành xa'],
  },
  Phá: {
    meaning: 'Nên tránh khởi công lớn',
    good: ['Phá dỡ', 'Sửa chữa'],
    bad: ['Cưới hỏi', 'Khai trương', 'Động thổ'],
  },
  Nguy: {
    meaning: 'Cẩn trọng, tránh rủi ro',
    good: ['Cầu an', 'Tu tập'],
    bad: ['Xuất hành', 'Phẫu thuật', 'Kiện tụng'],
  },
  Thành: {
    meaning: 'Tốt thành hôn, khai trương',
    good: ['Thành hôn', 'Khai trương', 'Ký kết'],
    bad: ['Phá dỡ', 'Khiếu kiện'],
  },
  Thu: {
    meaning: 'Tốt thu hoạch, nhập kho',
    good: ['Thu hoạch', 'Nhập kho', 'Thanh toán'],
    bad: ['Cho vay lớn'],
  },
  Khai: {
    meaning: 'Tốt khai trương, xuất hành',
    good: ['Khai trương', 'Xuất hành', 'Mở cửa hàng'],
    bad: ['An táng', 'Đóng cửa'],
  },
  Bế: {
    meaning: 'Nên đóng, tránh khởi sự',
    good: ['Đóng cửa', 'Tu sửa nội thất'],
    bad: ['Khởi công', 'Khai trương', 'Xuất hành'],
  },
};

type FestivalRule = Festival & {
  lunarDay?: number;
  lunarMonth?: number;
  solarDay?: number;
  solarMonth?: number;
};

const FESTIVALS: FestivalRule[] = [
  {
    id: 'tet',
    name: 'Tết Nguyên Đán',
    description: 'Mùng 1 Tết - đón năm mới Âm lịch',
    category: 'tet',
    lunarDay: 1,
    lunarMonth: 1,
  },
  {
    id: 'ram-thang-gieng',
    name: 'Rằm tháng Giêng',
    description: 'Tết Nguyên Tiêu',
    category: 'ram',
    lunarDay: 15,
    lunarMonth: 1,
  },
  {
    id: 'han-thuc',
    name: 'Tết Hàn Thực',
    category: 'le',
    lunarDay: 3,
    lunarMonth: 3,
  },
  {
    id: 'gio-to-hung-vuong',
    name: 'Giỗ Tổ Hùng Vương',
    category: 'le',
    lunarDay: 10,
    lunarMonth: 3,
  },
  {
    id: 'phat-dan',
    name: 'Lễ Phật Đản',
    category: 'le',
    lunarDay: 15,
    lunarMonth: 4,
  },
  {
    id: 'doan-ngo',
    name: 'Tết Đoan Ngọ',
    category: 'le',
    lunarDay: 5,
    lunarMonth: 5,
  },
  {
    id: 'vu-lan',
    name: 'Lễ Vu Lan',
    category: 'le',
    lunarDay: 15,
    lunarMonth: 7,
  },
  {
    id: 'trung-thu',
    name: 'Tết Trung Thu',
    category: 'le',
    lunarDay: 15,
    lunarMonth: 8,
  },
  {
    id: 'ong-tao',
    name: 'Ông Táo về trời',
    category: 'le',
    lunarDay: 23,
    lunarMonth: 12,
  },
  {
    id: 'tet-duong-lich',
    name: 'Tết Dương lịch',
    category: 'quoc-gia',
    solarDay: 1,
    solarMonth: 1,
  },
  {
    id: 'giai-phong',
    name: 'Ngày Giải phóng miền Nam',
    category: 'quoc-gia',
    solarDay: 30,
    solarMonth: 4,
  },
  {
    id: 'quoc-te-lao-dong',
    name: 'Quốc tế Lao động',
    category: 'quoc-gia',
    solarDay: 1,
    solarMonth: 5,
  },
  {
    id: 'quoc-khanh',
    name: 'Quốc khánh',
    category: 'quoc-gia',
    solarDay: 2,
    solarMonth: 9,
  },
  {
    id: 'ngay-phu-nu-vn',
    name: 'Ngày Phụ nữ Việt Nam',
    category: 'quoc-gia',
    solarDay: 20,
    solarMonth: 10,
  },
  {
    id: 'ngay-nha-giao',
    name: 'Ngày Nhà giáo Việt Nam',
    category: 'quoc-gia',
    solarDay: 20,
    solarMonth: 11,
  },
];

function festivalsFor(base: LunarCalendarBase) {
  const matches = FESTIVALS.filter(
    (festival) =>
      (festival.solarDay === base.solar.day &&
        festival.solarMonth === base.solar.month) ||
      (!base.lunar.leapMonth &&
        festival.lunarDay === base.lunar.day &&
        festival.lunarMonth === base.lunar.month),
  );
  if (
    base.lunar.month === 12 &&
    !base.lunar.leapMonth &&
    base.lunar.day === base.lunar.monthLength
  ) {
    matches.push({
      id: 'tat-nien',
      name: 'Giao thừa / Tất niên',
      category: 'tet',
    });
  }
  if (
    base.lunar.day === 1 &&
    !matches.some((festival) => festival.lunarDay === 1)
  ) {
    matches.push({
      id: `mung-1-${base.lunar.month}`,
      name: `Mùng 1 tháng ${base.lunar.month}`,
      category: 'ram',
    });
  }
  if (
    base.lunar.day === 15 &&
    !matches.some((festival) => festival.lunarDay === 15)
  ) {
    matches.push({
      id: `ram-${base.lunar.month}`,
      name: `Rằm tháng ${base.lunar.month}`,
      category: 'ram',
    });
  }
  return matches;
}

export function getTraditionalInfo(
  base: LunarCalendarBase,
): TraditionalCalendarInfo {
  const can = base.canChi.day.split(' ')[0];
  const canIndex = Math.max(0, CAN.indexOf(can));
  const chiIndex = (base.dayJd + 1) % 12;
  const guidance = TRUC_GUIDANCE[base.truc] ?? {
    meaning: 'Thông tin phong tục được tham khảo theo lịch truyền thống.',
    good: [],
    bad: [],
  };

  return {
    twentyEightMansion: NHI_THAP_BAT_TU[(base.dayJd + 12) % 28],
    directions: {
      hyThan: HY_THAN_BY_CAN[canIndex],
      taiThan: TAI_THAN_BY_CAN[canIndex],
    },
    stars: {
      good: [
        'Thiên Đức',
        'Nguyệt Đức',
        'Thiên Hỷ',
        'Thiên Quý',
        'Sinh Khí',
        'Thiên Phú',
      ]
        .filter((_, index) => (canIndex + index) % 3 !== 0)
        .slice(0, 3),
      bad: [
        'Tam Nương',
        'Nguyệt Kỵ',
        'Thiên Cương',
        'Thụ Tử',
        'Hoang Vu',
        'Sát Chủ',
      ]
        .filter((_, index) => (chiIndex + index) % 4 === 0)
        .slice(0, 2),
    },
    activities: {
      good: guidance.good,
      bad: guidance.bad,
    },
    festivals: festivalsFor(base),
    trucMeaning: guidance.meaning,
  };
}
