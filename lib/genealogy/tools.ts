import {
  memberBranchName,
  memberName,
  parentRelationsOf,
  spouseRelationsOf,
  type Member,
} from '../family.ts';
import {
  findCommonAncestor,
  getRelationship,
  resolvePeople,
  type PersonResolution,
} from './relationship-engine.ts';

function peopleById(members: Member[]) {
  return new Map(members.map((person) => [person.id, person]));
}

function parentPeople(person: Member, members: Member[]) {
  const byId = peopleById(members);
  return parentRelationsOf(person)
    .map((relation) => byId.get(relation.parentId))
    .filter((parent): parent is Member => Boolean(parent));
}

function descendantPeople(person: Member, members: Member[], depth: number) {
  const result: Member[] = [];
  const visited = new Set<string>([person.id]);
  let frontier = [person.id];
  for (let level = 0; level < depth && frontier.length; level += 1) {
    const next = members.filter((candidate) =>
      candidate.parents.some((parentId) => frontier.includes(parentId)),
    );
    next.forEach((candidate) => {
      if (!visited.has(candidate.id)) result.push(candidate);
      visited.add(candidate.id);
    });
    frontier = next.map((candidate) => candidate.id);
  }
  return result;
}

function ancestorPeople(person: Member, members: Member[], depth: number) {
  const byId = peopleById(members);
  const result: Member[] = [];
  const visited = new Set<string>([person.id]);
  let frontier = [person];
  for (let level = 0; level < depth && frontier.length; level += 1) {
    const next = frontier.flatMap((candidate) => parentRelationsOf(candidate)
      .map((relation) => byId.get(relation.parentId))
      .filter((parent): parent is Member => Boolean(parent)));
    next.forEach((candidate) => {
      if (!visited.has(candidate.id)) result.push(candidate);
      visited.add(candidate.id);
    });
    frontier = next;
  }
  return result;
}

/**
 * The AI route uses this narrow service surface instead of handing the family
 * graph to an LLM. Each lookup is deterministic and scoped to loaded members.
 */
export function createGenealogyTools(members: Member[]) {
  const byId = peopleById(members);
  return {
    resolvePerson(message: string): PersonResolution[] {
      return resolvePeople(members, message);
    },
    searchPerson(query: string) {
      const normalized = query.trim();
      return resolvePeople(members, normalized).flatMap((result) => result.people);
    },
    getPerson(personId: string) {
      return byId.get(personId);
    },
    getParents(personId: string) {
      const person = byId.get(personId);
      return person ? parentPeople(person, members) : [];
    },
    getChildren(personId: string) {
      return members.filter((person) => person.parents.includes(personId));
    },
    getSpouses(personId: string) {
      const person = byId.get(personId);
      return person
        ? spouseRelationsOf(person)
          .map((relation) => byId.get(relation.spouseId))
          .filter((spouse): spouse is Member => Boolean(spouse))
        : [];
    },
    getSiblings(personId: string) {
      const person = byId.get(personId);
      return person
        ? members.filter((candidate) =>
          candidate.id !== person.id && candidate.parents.some((parentId) => person.parents.includes(parentId)),
        )
        : [];
    },
    getAncestors(personId: string, depth = 4) {
      const person = byId.get(personId);
      return person ? ancestorPeople(person, members, depth) : [];
    },
    getDescendants(personId: string, depth = 4) {
      const person = byId.get(personId);
      return person ? descendantPeople(person, members, depth) : [];
    },
    getRelationship(personAId: string, personBId: string) {
      return getRelationship(personAId, personBId, members);
    },
    getRelationshipPath(personAId: string, personBId: string) {
      return getRelationship(personAId, personBId, members)?.path || [];
    },
    findCommonAncestor(personAId: string, personBId: string) {
      return findCommonAncestor(personAId, personBId, members);
    },
    getGeneration(personId: string) {
      return byId.get(personId)?.generation;
    },
    getFamilyBranch(personId: string) {
      const person = byId.get(personId);
      return person ? memberBranchName(person, members) : undefined;
    },
    searchFamily(query: string) {
      const value = query.toLocaleLowerCase('vi').trim();
      return members.filter((person) =>
        [memberName(person), person.biography, person.hometown]
          .filter(Boolean)
          .some((field) => field!.toLocaleLowerCase('vi').includes(value)),
      );
    },
  };
}
