import {
  memberBranchName,
  memberName,
  memberLifeStatus,
  relatives,
  type Member,
} from '../../family.ts';
import { getMemorialEvents } from '../../lunar-calendar/service.ts';
import { vietnamToday } from '../../lunar.ts';
import type { AIGenealogyContext, AIGenealogyPerson, AIPersonFact } from '../types.ts';

function personFact(person: Member, members: Member[]): AIPersonFact {
  const deathDate = person.deathDate
    ? `${person.deathDate.day}/${person.deathDate.month}${person.deathDate.year ? `/${person.deathDate.year}` : ''} âm lịch`
    : person.died
      ? `năm ${person.died}`
      : undefined;
  return {
    id: person.id,
    name: memberName(person),
    generation: person.generation,
    branch: memberBranchName(person, members),
    birthYear: person.born,
    lifeStatus: memberLifeStatus(person),
    deathDate,
    memorialDate: person.anniversary
      ? `${person.anniversary.day}/${person.anniversary.month} âm lịch`
      : undefined,
    needsVerification: Boolean(person.needsVerification),
  };
}

function mentionedPeople(members: Member[], message: string) {
  const normalise = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLocaleLowerCase('vi');
  const normalisedQuestion = normalise(message);
  return members
    .filter((person) => {
      const names = [person.name, person.displayName, person.tabooName, person.styleName, memberName(person)]
        .filter((name): name is string => Boolean(name?.trim()))
        .map((name) => normalise(name.replace(/^(Ông|Bà|Anh|Chị)(?:\s+Tổ)?\s*:\s*/i, '')))
        .filter((name) => name.length >= 3);
      return names.some((name) => normalisedQuestion.includes(name));
    })
    .sort((left, right) => memberName(right).length - memberName(left).length)
    .slice(0, 2);
}

function contextualPerson(person: Member, members: Member[]): AIGenealogyPerson {
  const family = relatives(members, person);
  return {
    person: personFact(person, members),
    parents: family.parents.map((relative) => personFact(relative, members)),
    spouses: family.spouses.map((relative) => personFact(relative, members)),
    children: family.children.map((relative) => personFact(relative, members)),
    siblings: family.siblings.map((relative) => personFact(relative, members)),
  };
}

function matchedPeople(members: Member[], message: string) {
  const branchMatch = /chi\s*(?:thứ\s*)?(\d+)/i.exec(message);
  const birthYearMatch = /sinh\s+năm\s*(\d{4})/i.exec(message);
  if (branchMatch) {
    return members
      .filter((person) => person.branch === Number(branchMatch[1]))
      .slice(0, 16);
  }
  if (birthYearMatch) {
    return members
      .filter((person) => person.born === Number(birthYearMatch[1]))
      .slice(0, 16);
  }
  return [];
}

function ancestorDistance(ancestorId: string, descendant: Member, members: Member[]) {
  const peopleById = new Map(members.map((person) => [person.id, person]));
  const visited = new Set<string>();
  const queue = descendant.parents.map((parentId) => ({ id: parentId, distance: 1 }));

  while (queue.length) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    if (current.id === ancestorId) return current.distance;
    const person = peopleById.get(current.id);
    person?.parents.forEach((parentId) => queue.push({ id: parentId, distance: current.distance + 1 }));
  }

  return null;
}

function ancestorLabel(gender: Member['gender'], distance: number) {
  if (distance === 1) return gender === 'male' ? 'cha' : gender === 'female' ? 'mẹ' : 'cha/mẹ';
  if (distance === 2) return gender === 'male' ? 'ông' : gender === 'female' ? 'bà' : 'ông/bà';
  if (distance === 3) return gender === 'male' ? 'cụ ông' : gender === 'female' ? 'cụ bà' : 'cụ';
  return `tổ tiên cách ${distance} đời`;
}

function relationshipOf(people: Member[], members: Member[]): AIGenealogyContext['relationship'] {
  if (people.length < 2) return undefined;
  const [first, second] = people;
  const firstName = memberName(first);
  const secondName = memberName(second);
  const firstAncestorDistance = ancestorDistance(first.id, second, members);
  const secondAncestorDistance = ancestorDistance(second.id, first, members);
  const isSpouse = first.spouses.includes(second.id) || second.spouses.includes(first.id);
  const sharedParents = first.parents.filter((id) => second.parents.includes(id));

  let description = `Hiện gia phả chưa ghi nhận quan hệ trực tiếp giữa ${firstName} và ${secondName}.`;
  if (firstAncestorDistance) {
    description = `${firstName} là ${ancestorLabel(first.gender, firstAncestorDistance)} của ${secondName}.`;
  } else if (secondAncestorDistance) {
    description = `${secondName} là ${ancestorLabel(second.gender, secondAncestorDistance)} của ${firstName}.`;
  } else if (isSpouse) {
    description = `${firstName} và ${secondName} là phối ngẫu được ghi nhận trong gia phả.`;
  } else if (sharedParents.length) {
    description = `${firstName} và ${secondName} là anh/chị/em cùng cha/mẹ được ghi nhận trong gia phả.`;
  }
  return { first: firstName, second: secondName, description };
}

function clanFounder(members: Member[]) {
  const roots = members
    .filter((person) => person.isClanMember && person.parents.length === 0)
    .sort((left, right) => left.generation - right.generation || left.branch - right.branch);
  return roots.find((person) => person.branchOrigin || person.gender === 'male') || roots[0];
}

export function buildGenealogyContext({
  members,
  message,
  personId,
  includeMemorials = false,
}: {
  members: Member[];
  message: string;
  personId?: string;
  includeMemorials?: boolean;
}): AIGenealogyContext {
  const selected = personId ? members.find((person) => person.id === personId) : undefined;
  const people = [selected, ...mentionedPeople(members, message)]
    .filter((person): person is Member => Boolean(person))
    .filter((person, index, items) => items.findIndex((item) => item.id === person.id) === index)
    .slice(0, 2)
    .map((person) => contextualPerson(person, members));
  const matched = matchedPeople(members, message);
  const mentioned = people.map((item) => members.find((person) => person.id === item.person.id)).filter((person): person is Member => Boolean(person));
  const founder = clanFounder(members);

  return {
    people,
    ...(founder ? { founder: contextualPerson(founder, members) } : {}),
    ...(matched.length ? { matches: matched.map((person) => personFact(person, members)) } : {}),
    ...(relationshipOf(mentioned, members) ? { relationship: relationshipOf(mentioned, members) } : {}),
    ...(includeMemorials
      ? {
          upcomingMemorials: getMemorialEvents({ members, from: vietnamToday() })
            .slice(0, 5)
            .map((event) => ({
              title: event.event.title,
              lunarDate: `${event.event.lunarDay}/${event.event.lunarMonth} âm lịch`,
              solarDate: event.date.toLocaleDateString('vi-VN'),
              daysAway: event.daysAway,
            })),
        }
      : {}),
  };
}
