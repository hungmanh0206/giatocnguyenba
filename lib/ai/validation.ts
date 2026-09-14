import { calendarActivities, type CalendarActivityId } from '../lunar-calendar/activity-advice.ts';
import { aiModelPreferences, aiModes, type AIChatRequest, type AIClientContext, type AIHistoryMessage, type AIMode, type AIModelPreference, type AISource } from './types.ts';

const sources = ['global', 'family-tree', 'member', 'calendar', 'activity', 'fortune'] as const;
const maxMessageLength = 1_200;
const maxHistoryMessages = 8;
const maxHistoryMessageLength = 1_000;

export function parseIsoDate(value: string) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) return null;
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null;
}

function validPersonId(value: unknown) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(value)
    ? value
    : undefined;
}

function parseContext(value: unknown): AIClientContext | null {
  if (value !== undefined && (typeof value !== 'object' || value === null)) return null;
  const input = (value || {}) as Record<string, unknown>;
  const source = sources.includes(input.source as AISource)
    ? (input.source as AISource)
    : 'global';
  const selectedDate =
    typeof input.selectedDate === 'string' && parseIsoDate(input.selectedDate)
      ? input.selectedDate
      : undefined;
  const birthDate =
    typeof input.birthDate === 'string' && parseIsoDate(input.birthDate)
      ? input.birthDate
      : undefined;
  const activity = calendarActivities.some((item) => item.id === input.activity)
    ? (input.activity as CalendarActivityId)
    : undefined;
  const birthYear = Number(input.birthYear);
  const dateRange = input.dateRange as Record<string, unknown> | undefined;
  const rangeFrom = typeof dateRange?.from === 'string' ? dateRange.from : undefined;
  const rangeTo = typeof dateRange?.to === 'string' ? dateRange.to : undefined;
  const validRange =
    rangeFrom && rangeTo && parseIsoDate(rangeFrom) && parseIsoDate(rangeTo)
      ? { from: rangeFrom, to: rangeTo }
      : undefined;

  return {
    source,
    personId: validPersonId(input.personId),
    selectedDate,
    activity,
    birthYear:
      Number.isInteger(birthYear) && birthYear >= 1800 && birthYear <= new Date().getFullYear()
        ? birthYear
        : undefined,
    birthDate,
    dateRange: validRange,
  };
}

function parseHistory(value: unknown): AIHistoryMessage[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  return value
    .slice(-maxHistoryMessages)
    .flatMap((item) => {
      if (typeof item !== 'object' || item === null) return [];
      const message = item as Record<string, unknown>;
      if (
        (message.role !== 'user' && message.role !== 'assistant') ||
        typeof message.content !== 'string'
      ) {
        return [];
      }
      const content = message.content.trim().slice(0, maxHistoryMessageLength);
      return content ? [{ role: message.role, content }] : [];
    });
}

export function parseAIChatRequest(value: unknown): AIChatRequest | null {
  if (typeof value !== 'object' || value === null) return null;
  const input = value as Record<string, unknown>;
  const message = typeof input.message === 'string' ? input.message.trim() : '';
  const mode = input.mode as AIMode;
  const context = parseContext(input.context);
  const history = parseHistory(input.history);

  if (!message || message.length > maxMessageLength || !aiModes.includes(mode) || !context || !history) {
    return null;
  }
  return { message, mode, context, history };
}

export function parseAIModelPreference(value: unknown): AIModelPreference {
  return aiModelPreferences.includes(value as AIModelPreference)
    ? value as AIModelPreference
    : 'auto';
}
