import { getCalendarActivityAdvice, calendarActivities } from '../../lunar-calendar/activity-advice.ts';
import { getLunarDayInfo } from '../../lunar-calendar/service.ts';
import type { AICalendarContext, AIClientContext } from '../types.ts';
import { parseIsoDate } from '../validation.ts';

function formatSolarDate(date: Date) {
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function buildCalendarContext(context: AIClientContext): AICalendarContext | undefined {
  if (!context.selectedDate) {
    return context.dateRange
      ? {
          solarDate: 'Chưa chọn một ngày cụ thể',
          dateRangeStatus:
            'Hệ thống chưa có bộ xếp hạng ngày tốt theo cả khoảng ngày; chỉ có thể đánh giá từng ngày đang chọn.',
        }
      : undefined;
  }
  const date = parseIsoDate(context.selectedDate);
  if (!date) return undefined;

  const day = getLunarDayInfo(date);
  if (!day.supported) {
    return {
      solarDate: formatSolarDate(date),
      unavailableReason: day.reason,
      ...(context.dateRange
        ? {
            dateRangeStatus:
              'Hệ thống chưa có bộ xếp hạng ngày tốt theo cả khoảng ngày; chỉ có thể đánh giá từng ngày đang chọn.',
          }
        : {}),
    };
  }

  const selectedActivity = context.activity
    ? getCalendarActivityAdvice(day, context.activity)
    : undefined;
  const activityLabel = selectedActivity
    ? calendarActivities.find((activity) => activity.id === context.activity)?.label
    : undefined;

  return {
    solarDate: formatSolarDate(date),
    lunarDate: `${day.lunar.day}/${day.lunar.month}/${day.lunar.year} âm lịch${day.lunar.leapMonth ? ' (tháng nhuận)' : ''}`,
    canChi: day.canChi,
    solarTerm: day.solarTerm,
    dayClassification: day.dayClassification,
    truc: day.truc,
    trucMeaning: day.traditional.trucMeaning,
    goodHours: day.goodHours,
    badHours: day.badHours,
    directions: day.traditional.directions,
    stars: day.traditional.stars,
    activities: day.traditional.activities,
    ...(selectedActivity
      ? {
          selectedActivity: {
            label: activityLabel || selectedActivity.activity.label,
            summary: selectedActivity.summary,
            classification: selectedActivity.label,
            reasons: selectedActivity.reasons,
          },
        }
      : {}),
    ...(context.dateRange
      ? {
          dateRangeStatus:
            'Hệ thống chưa có bộ xếp hạng ngày tốt theo cả khoảng ngày; chỉ có thể đánh giá từng ngày đang chọn.',
        }
      : {}),
  };
}
