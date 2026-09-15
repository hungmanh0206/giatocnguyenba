import {
  memberBranchName,
  memberName,
  memberLifeStatus,
  parentRelationsOf,
  relatives,
  spouseRelationsOf,
  type Member,
} from '../../family.ts';
import { createGenealogyTools } from '../../genealogy/tools.ts';
import { getRelationship } from '../../genealogy/relationship-engine.ts';
import { getMemorialEvents } from '../../lunar-calendar/service.ts';
import { vietnamToday } from '../../lunar.ts';
import type {
  AIGenealogyContext,
  AIGenealogyPerson,
  AIPersonFact,
} from '../types.ts';

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

function contextualPerson(
  person: Member,
  members: Member[],
): AIGenealogyPerson {
  const family = relatives(members, person);
  const byId = new Map(members.map((member) => [member.id, member]));
  const parents = family.parents.map((relative) =>
    personFact(relative, members),
  );
  const spouses = family.spouses.map((relative) =>
    personFact(relative, members),
  );
  const children = family.children.map((relative) =>
    personFact(relative, members),
  );
  const siblings = family.siblings.map((relative) =>
    personFact(relative, members),
  );
  return {
    person: personFact(person, members),
    parents,
    spouses,
    children,
    siblings,
    parentRelations: parentRelationsOf(person).flatMap((relation) => {
      const parent = byId.get(relation.parentId);
      return parent
        ? [{ person: personFact(parent, members), kind: relation.kind }]
        : [];
    }),
    childRelations: family.children.flatMap((child) => {
      const relation = parentRelationsOf(child).find(
        (link) => link.parentId === person.id,
      );
      return relation
        ? [{ person: personFact(child, members), kind: relation.kind }]
        : [];
    }),
    siblingRelations: family.siblings.map((sibling) => {
      const result = getRelationship(sibling.id, person.id, members);
      return {
        person: personFact(sibling, members),
        ...(result?.relationshipCode
          ? { relationshipCode: result.relationshipCode }
          : {}),
        ...(result?.kinshipTermAtoB ? { term: result.kinshipTermAtoB } : {}),
      };
    }),
    spouseRelations: spouseRelationsOf(person).flatMap((relation) => {
      const spouse = byId.get(relation.spouseId);
      return spouse
        ? [
            {
              person: personFact(spouse, members),
              ...(relation.status ? { status: relation.status } : {}),
              ...(relation.order !== undefined
                ? { order: relation.order }
                : {}),
            },
          ]
        : [];
    }),
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

function clanFounder(members: Member[]) {
  const roots = members
    .filter((person) => person.isClanMember && person.parents.length === 0)
    .sort(
      (left, right) =>
        left.generation - right.generation || left.branch - right.branch,
    );
  return (
    roots.find((person) => person.branchOrigin || person.gender === 'male') ||
    roots[0]
  );
}

export function buildGenealogyContext({
  members,
  message,
  personId,
  referencePersonIds = [],
  includeMemorials = false,
}: {
  members: Member[];
  message: string;
  personId?: string;
  referencePersonIds?: string[];
  includeMemorials?: boolean;
}): AIGenealogyContext {
  const tools = createGenealogyTools(members);
  const selected = personId ? tools.getPerson(personId) : undefined;
  const references = referencePersonIds
    .map((id) => tools.getPerson(id))
    .filter((person): person is Member => Boolean(person));
  const resolutions = tools.resolvePerson(message);
  const ambiguities = resolutions
    .filter((resolution) => resolution.status === 'AMBIGUOUS')
    .map((resolution) => ({
      query: resolution.query,
      candidates: resolution.people.map((person) =>
        personFact(person, members),
      ),
    }));
  const resolvedPeople = resolutions
    .filter((resolution) => resolution.status === 'RESOLVED')
    .flatMap((resolution) => resolution.people);
  const people = [selected, ...resolvedPeople, ...references]
    .filter((person): person is Member => Boolean(person))
    .filter(
      (person, index, items) =>
        items.findIndex((item) => item.id === person.id) === index,
    )
    .slice(0, 2);
  const matched = matchedPeople(members, message);
  const founder = clanFounder(members);
  const relationship =
    ambiguities.length || people.length < 2
      ? undefined
      : tools.getRelationship(people[0].id, people[1].id);

  return {
    people: people.map((person) => contextualPerson(person, members)),
    ...(references.length
      ? {
          referencePeople: references.map((person) =>
            contextualPerson(person, members),
          ),
        }
      : {}),
    ...(founder ? { founder: contextualPerson(founder, members) } : {}),
    ...(matched.length
      ? { matches: matched.map((person) => personFact(person, members)) }
      : {}),
    ...(relationship ? { relationship } : {}),
    ...(ambiguities.length ? { ambiguities } : {}),
    ...(includeMemorials
      ? {
          upcomingMemorials: getMemorialEvents({
            members,
            from: vietnamToday(),
          })
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
