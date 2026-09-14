import { memberLifeStatus, memberName, type Member } from '../../family.ts';
import { getLunarYearCanChi } from '../../lunar-calendar/service.ts';
import type { AIClientContext, AIHoroscopeContext, AIPersonFact } from '../types.ts';

function compactPerson(person: Member): AIPersonFact {
  return {
    id: person.id,
    name: memberName(person),
    generation: person.generation,
    branch: String(person.branch),
    birthYear: person.born,
    lifeStatus: memberLifeStatus(person),
    needsVerification: Boolean(person.needsVerification),
  };
}

export function buildHoroscopeContext({
  context,
  members,
}: {
  context: AIClientContext;
  members: Member[];
}): AIHoroscopeContext {
  const member = context.personId
    ? members.find((person) => person.id === context.personId)
    : undefined;
  const birthYear = context.birthYear || member?.born;

  return {
    ...(member ? { person: compactPerson(member) } : {}),
    ...(birthYear ? { birthYear, canChiYear: getLunarYearCanChi(birthYear) } : {}),
    ...(context.birthDate ? { birthDate: context.birthDate } : {}),
    note:
      'Chưa có giờ sinh nên hệ thống chỉ luận giải tham khảo theo năm sinh, Can Chi và lịch truyền thống.',
  };
}
