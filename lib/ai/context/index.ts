import type { Member } from '@/lib/family';
import type { AIChatRequest, AIResolvedContext } from '../types';
import { buildCalendarContext } from './build-calendar-context';
import { buildGeneralContext } from './build-general-context';
import { buildGenealogyContext } from './build-genealogy-context';
import { buildHoroscopeContext } from './build-horoscope-context';
import { loadFamilyMembers } from './load-family-members';
import { vietnamToday } from '../../lunar.ts';

function requiresGenealogy(request: AIChatRequest) {
  if (request.context.personId || request.mode === 'genealogy') return true;
  return /gia phả|con ai|cha mẹ|cha\b|mẹ|vợ|chồng|phối ngẫu|anh chị em|ngày giỗ|húy kỵ|tổ tiên|thủy tổ|thuy to|khai tổ|ông tổ|bà tổ|chi họ|thành viên|mối quan hệ|quan hệ|là ai|la ai|thông tin/i.test(
    request.message,
  );
}

function asksForMemorials(request: AIChatRequest) {
  return /ngày giỗ|húy kỵ|tưởng niệm|cúng giỗ/i.test(request.message);
}

async function membersFor(request: AIChatRequest) {
  return requiresGenealogy(request) || request.mode === 'horoscope'
    ? loadFamilyMembers()
    : ([] as Member[]);
}

function dateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calendarClientContext(request: AIChatRequest) {
  if (request.context.selectedDate) return request.context;
  const question = request.message.toLocaleLowerCase('vi');
  if (!/hôm nay|ngày mai/.test(question)) return request.context;
  const date = vietnamToday();
  if (question.includes('ngày mai')) date.setDate(date.getDate() + 1);
  return { ...request.context, selectedDate: dateInput(date) };
}

export async function buildAIContext(request: AIChatRequest): Promise<AIResolvedContext> {
  const members = await membersFor(request);
  const general = buildGeneralContext();
  const warnings: string[] = [];
  const calendarContext = calendarClientContext(request);
  const calendar =
    request.mode === 'calendar' || calendarContext.selectedDate || calendarContext.dateRange
      ? buildCalendarContext(calendarContext)
      : undefined;

  if (calendar?.dateRangeStatus) warnings.push(calendar.dateRangeStatus);

  return {
    mode: request.mode,
    source: request.context.source || 'global',
    appFeatures: general.appFeatures,
    ...(requiresGenealogy(request)
      ? {
          genealogy: buildGenealogyContext({
            members,
            message: request.message,
            personId: request.context.personId,
            includeMemorials: asksForMemorials(request),
          }),
        }
      : {}),
    ...(calendar ? { calendar } : {}),
    ...(request.mode === 'horoscope'
      ? { horoscope: buildHoroscopeContext({ context: request.context, members }) }
      : {}),
    warnings,
  };
}
