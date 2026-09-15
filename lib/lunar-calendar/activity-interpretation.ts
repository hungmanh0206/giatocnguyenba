import {
  labelForActivityLevel,
  type ActivityDayEvaluation,
} from './activity-advice.ts';

export type ActivityAIInterpretation = {
  shortSummary: string;
  detailedExplanation: string;
  practicalSuggestion?: string;
};

function labels<T extends { label: string }>(items: T[]) {
  return items.map((item) => item.label).join(', ');
}

export function buildEngineActivityInterpretation(
  evaluation: ActivityDayEvaluation,
): ActivityAIInterpretation {
  const lunar = evaluation.date.lunar;
  const lunarDate = `${lunar.day}/${lunar.month}/${lunar.year} âm lịch${
    lunar.isLeapMonth ? ' nhuận' : ''
  }`;
  const activity = evaluation.activity.label.toLocaleLowerCase('vi');
  const good = labels(evaluation.goodFactors);
  const caution = labels(evaluation.warningFactors);
  const details = [
    `Ngày ${evaluation.date.solar} tương ứng ${lunarDate}, Can Chi ngày ${evaluation.calendar.canChiDay}, Trực ${evaluation.calendar.dayOfficer} và tiết khí ${evaluation.calendar.solarTerm}.`,
    `Theo bộ quy tắc lịch truyền thống, ngày này được đánh giá ${labelForActivityLevel(evaluation.classification).toLocaleLowerCase('vi')} cho việc ${activity}.`,
    good
      ? `Các yếu tố được ghi nhận là thuận gồm ${good}.`
      : 'Ngày này không có yếu tố thuận nổi bật được engine ghi nhận riêng cho công việc đã chọn.',
    caution
      ? `Điểm cần cân nhắc là ${caution}.`
      : 'Không có yếu tố cần lưu ý nổi bật trong bộ quy tắc hiện có.',
    evaluation.activity.supportNote,
  ].filter(Boolean);
  const preferredHours = evaluation.goodHours
    .map((hour) => `${hour.branch} (${hour.from}-${hour.to})`)
    .join(', ');
  const alternative = evaluation.alternatives[0];

  return {
    shortSummary: evaluation.summaryReason,
    detailedExplanation: details.join(' '),
    ...(preferredHours
      ? {
          practicalSuggestion: `Nếu cần sắp xếp thời điểm, có thể ưu tiên các giờ Hoàng đạo: ${preferredHours}.`,
        }
      : alternative
        ? {
            practicalSuggestion: `Bạn cũng có thể tham khảo ngày ${alternative.solarDate} (${alternative.lunarDate}) được engine ghi nhận ${labelForActivityLevel(alternative.classification).toLocaleLowerCase('vi')}.`,
          }
        : {}),
  };
}
