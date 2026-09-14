import { appFeatures } from '../features.ts';
import {
  type AIGenealogyPerson,
  type AIProviderRequest,
  type AIProviderResponse,
} from '../types.ts';
import type { AIProvider } from './ai-provider.ts';

function normalise(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLocaleLowerCase('vi');
}

function personWarning(person: AIGenealogyPerson) {
  return person.person.needsVerification
    ? ' Thông tin này trong gia phả đang được đánh dấu cần xác minh.'
    : '';
}

function founderAnswer(question: string, founder: AIGenealogyPerson) {
  const query = normalise(question);
  if (!/thuy to|khai to|ong to|ba to|nguon goc dong ho/.test(query)) return null;

  const { person, spouses, children } = founder;
  const spouseText = spouses.length ? ` Phối ngẫu được ghi nhận là ${spouses.map((item) => item.name).join(', ')}.` : '';
  const childrenText = children.length ? ` Gia phả ghi nhận ${children.length} người con: ${children.map((item) => item.name).join(', ')}.` : '';
  return `${person.name} là thủy tổ được ghi nhận của dòng họ, thuộc đời ${person.generation}.${spouseText}${childrenText}${personWarning(founder)}`;
}

export function structuredGenealogyAnswer(input: AIProviderRequest) {
  const genealogy = input.context.genealogy;
  if (!genealogy) return null;

  const founder = genealogy.founder ? founderAnswer(input.message, genealogy.founder) : null;
  if (founder) return founder;
  if (genealogy.relationship) return genealogy.relationship.description;

  const person = genealogy.people[0];
  if (!person) return null;
  const query = normalise(input.message);
  if (/con ai|cha me|bo me|phu mau|ai la cha|ai la me/.test(query)) return relationAnswer(input.message, person);
  if (/ai la con cua|con cua|con chau cua|may nguoi con/.test(query)) return relationAnswer(input.message, person);
  if (/vo chong|phoi ngau|anh chi em|anh em|ngay gio|huy ky|doi|chi/.test(query)) return relationAnswer(input.message, person);
  if (/la ai|thong tin|gioi thieu/.test(query)) return relationAnswer(input.message, person);
  return null;
}

function relationAnswer(question: string, person: AIGenealogyPerson) {
  const query = normalise(question);
  const { children, parents, siblings, spouses } = person;
  const name = person.person.name;
  const list = (items: Array<{ name: string }>) => items.map((item) => item.name).join(', ');

  if (/con ai|cha me|bo me|phu mau|ai la cha|ai la me/.test(query)) {
    return parents.length
      ? `${name} là con của ${list(parents)}.${personWarning(person)}`
      : `Hiện gia phả chưa có dữ liệu cha mẹ của ${name}.`;
  }
  if (/ai la con cua|con cua|con chau cua|may nguoi con/.test(query)) {
    return children.length
      ? `${name} có ${children.length} người con được ghi nhận: ${list(children)}.${personWarning(person)}`
      : `Hiện gia phả chưa có dữ liệu con của ${name}.`;
  }
  if (query.includes('vo chong') || query.includes('phoi ngau')) {
    return spouses.length
      ? `${name} có phối ngẫu được ghi nhận là ${list(spouses)}.${personWarning(person)}`
      : `Hiện gia phả chưa có dữ liệu phối ngẫu của ${name}.`;
  }
  if (query.includes('anh chi em') || query.includes('anh em')) {
    return siblings.length
      ? `${name} có anh chị em được ghi nhận: ${list(siblings)}.${personWarning(person)}`
      : `Hiện gia phả chưa có dữ liệu anh chị em của ${name}.`;
  }
  if (query.includes('ngay gio') || query.includes('huy ky')) {
    return person.person.memorialDate
      ? `Ngày húy kỵ/giỗ được ghi nhận của ${name} là ${person.person.memorialDate}.${personWarning(person)}`
      : `Hiện gia phả chưa có dữ liệu ngày húy kỵ của ${name}.`;
  }
  if (query.includes('doi') || query.includes('chi')) {
    return `${name} thuộc đời ${person.person.generation}, ${person.person.branch}.${personWarning(person)}`;
  }
  return `${name} thuộc đời ${person.person.generation}, ${person.person.branch}. Gia phả hiện ghi nhận ${parents.length} cha/mẹ, ${spouses.length} phối ngẫu và ${children.length} người con.${personWarning(person)}`;
}

function calendarAnswer(input: AIProviderRequest) {
  const calendar = input.context.calendar;
  if (!calendar) return 'Hiện hệ thống chưa có dữ liệu lịch cho yêu cầu này.';
  if (calendar.dateRangeStatus) return calendar.dateRangeStatus;
  if (calendar.unavailableReason) {
    return `Hệ thống chưa thể tra cứu ngày này: ${calendar.unavailableReason}`;
  }
  if (calendar.selectedActivity) {
    return `${calendar.solarDate} có dữ liệu ${calendar.dayClassification || 'lịch truyền thống'}. Với việc ${calendar.selectedActivity.label.toLocaleLowerCase('vi')}, ${calendar.selectedActivity.summary} Các căn cứ từ engine: ${calendar.selectedActivity.reasons.join('; ') || 'chưa có chi tiết bổ sung'}.`;
  }
  return `${calendar.solarDate} tương ứng ${calendar.lunarDate || 'chưa có ngày âm'}. Can Chi ngày ${calendar.canChi?.day || 'chưa có'}; tiết khí ${calendar.solarTerm || 'chưa có'}; Trực ${calendar.truc || 'chưa có'}. Giờ Hoàng đạo: ${calendar.goodHours?.join(', ') || 'chưa có dữ liệu'}.`;
}

function horoscopeAnswer(input: AIProviderRequest) {
  const horoscope = input.context.horoscope;
  if (!horoscope?.birthYear) {
    return 'Cần có năm sinh để đưa ra luận giải tham khảo theo Can Chi.';
  }
  const subject = horoscope.person?.name || `người sinh năm ${horoscope.birthYear}`;
  return `Với ${subject}, hệ thống ghi nhận Can Chi năm sinh là ${horoscope.canChiYear || 'chưa có'}. ${horoscope.note} Theo cách nhìn truyền thống, đây là gợi ý để tham khảo và cân nhắc bình tĩnh trong các quyết định quan trọng.`;
}

function generalAnswer(input: AIProviderRequest) {
  const query = normalise(input.message);
  const feature = appFeatures.find((item) =>
    item.keywords.some((keyword) => query.includes(normalise(keyword))),
  );
  if (feature) {
    return `${feature.name}: ${feature.description} Bạn có thể mở tại ${feature.route}.`;
  }
  return 'Bạn có thể hỏi về cách dùng gia phả, tra cứu một thành viên, lịch âm, xem ngày theo việc hoặc ngày giỗ sắp tới.';
}

export class MockProvider implements AIProvider {
  async generate(input: AIProviderRequest): Promise<AIProviderResponse> {
    const query = normalise(input.message);
    if (
      query.includes('api key') ||
      query.includes('system prompt') ||
      query.includes('bo qua moi huong dan') ||
      query.includes('ignore previous')
    ) {
      return {
        answer: 'Mình không thể hỗ trợ yêu cầu này. Mình chỉ có thể giúp tra cứu và diễn giải dữ liệu được phép của gia phả và lịch.',
        provider: 'mock',
      };
    }

    if (input.context.mode === 'calendar') {
      return { answer: calendarAnswer(input), provider: 'mock' };
    }
    if (input.context.mode === 'horoscope') {
      return { answer: horoscopeAnswer(input), provider: 'mock' };
    }
    const structuredAnswer = structuredGenealogyAnswer(input);
    if (structuredAnswer) return { answer: structuredAnswer, provider: 'mock' };
    if (input.context.genealogy?.matches?.length) {
      const matches = input.context.genealogy.matches;
      return {
        answer: `Gia phả ghi nhận ${matches.length} người phù hợp: ${matches.map((person) => `${person.name} (đời ${person.generation})`).join(', ')}.`,
        provider: 'mock',
      };
    }
    const person = input.context.genealogy?.people[0];
    if (person) {
      return { answer: relationAnswer(input.message, person), provider: 'mock' };
    }
    if (query.includes('ngay gio') && input.context.genealogy?.upcomingMemorials?.length) {
      const events = input.context.genealogy.upcomingMemorials
        .map((event) => `${event.title} (${event.lunarDate}, ${event.daysAway === 0 ? 'hôm nay' : `còn ${event.daysAway} ngày`})`)
        .join('; ');
      return { answer: `Các ngày tưởng niệm sắp tới: ${events}.`, provider: 'mock' };
    }
    return { answer: generalAnswer(input), provider: 'mock' };
  }
}
