import type { Member } from './family';

export const FAMILY_UNIT_WIDTH = 280;
export const FAMILY_UNIT_HEIGHT = 196;
export const ROOT_FAMILY_WIDTH = 360;
export const ROOT_FAMILY_HEIGHT = 258;
export const TERMINAL_NODE_WIDTH = 236;
export const TERMINAL_NODE_HEIGHT = 142;
// Kept for consumers that only need a typical tree-card measurement.
export const PERSON_WIDTH = FAMILY_UNIT_WIDTH;
export const PERSON_HEIGHT = FAMILY_UNIT_HEIGHT;
export const PERSON_GAP = 48;

export type Household = {
  id: string;
  clanMember: Member;
  spouses: Member[];
  people: Member[];
  generation: number;
  lineageType: 'direct' | 'maternal-terminal';
  kind: 'family' | 'terminal';
  root: boolean;
  width: number;
  height: number;
  x: number;
  y: number;
};

export type FamilyLink = {
  id: string;
  source: string;
  target: string;
  childId: string;
  branchType: 'direct' | 'maternal-terminal';
};

export type GenerationLane = {
  generation: number;
  y: number;
};

export function collapsedDescendantGroups(
  links: FamilyLink[],
  collapsed: Iterable<string>,
) {
  const hidden = new Set<string>();
  const stack = [...collapsed];

  while (stack.length) {
    const parent = stack.pop()!;
    for (const link of links) {
      if (link.source === parent && !hidden.has(link.target)) {
        hidden.add(link.target);
        stack.push(link.target);
      }
    }
  }

  return hidden;
}

function legacyClanMember(person: Member) {
  return /^Nguyễn (Bá|Thị)(?:\s|$)/i.test(person.name);
}

function clanPeopleForTree(members: Member[]) {
  const marked = members.filter((person) => person.isClanMember);
  const legacy = members.filter(legacyClanMember);
  // Some existing Firestore records were created before membership was modelled.
  return marked.length ? marked : legacy.length ? legacy : members;
}

function lineageType(person: Member) {
  return person.lineageType === 'maternal-terminal'
    ? 'maternal-terminal'
    : 'direct';
}

function orderedPeople(members: Member[], indexOf: Map<string, number>) {
  return [...members].sort((a, b) => {
    const sourceOrder = indexOf.get(a.id)! - indexOf.get(b.id)!;
    return a.generation - b.generation || sourceOrder;
  });
}

function familyHeight(spouseCount: number, root: boolean) {
  if (root) return ROOT_FAMILY_HEIGHT + Math.max(0, spouseCount - 1) * 52;
  return FAMILY_UNIT_HEIGHT + Math.max(0, spouseCount - 1) * 52;
}

export function layoutFamily(members: Member[]) {
  const lookup = new Map(members.map((person) => [person.id, person]));
  const indexOf = new Map(members.map((person, index) => [person.id, index]));
  const clanPeople = orderedPeople(clanPeopleForTree(members), indexOf);
  const minimumGeneration = Math.min(
    ...clanPeople.map((person) => person.generation),
    1,
  );
  const groups: Household[] = [];
  const groupOf = new Map<string, string>();

  for (const clanMember of clanPeople) {
    if (groupOf.has(clanMember.id)) continue;

    const spouses = clanMember.spouses
      .map((id) => lookup.get(id))
      .filter((person): person is Member => !!person)
      .filter((person) => !groupOf.has(person.id));
    const root =
      clanMember.generation === minimumGeneration &&
      clanMember.parents.length === 0;
    const id = `family-${clanMember.id}`;
    const group: Household = {
      id,
      clanMember,
      spouses,
      people: [clanMember, ...spouses],
      generation: clanMember.generation,
      lineageType: lineageType(clanMember),
      kind: 'family',
      root,
      width: root ? ROOT_FAMILY_WIDTH : FAMILY_UNIT_WIDTH,
      height: familyHeight(spouses.length, root),
      x: 0,
      y: 0,
    };
    groups.push(group);
    groupOf.set(clanMember.id, id);
    spouses.forEach((spouse) => groupOf.set(spouse.id, id));
  }

  function childrenOf(group: Household) {
    const parentIds = new Set(group.people.map((person) => person.id));
    return members.filter((person) =>
      person.parents.some((parentId) => parentIds.has(parentId)),
    );
  }

  // Direct children outside the clan remain visible, but never become a new family unit.
  for (const family of groups.filter((group) => group.kind === 'family')) {
    for (const child of childrenOf(family)) {
      if (groupOf.has(child.id)) continue;
      const id = `terminal-${child.id}`;
      groups.push({
        id,
        clanMember: child,
        spouses: [],
        people: [child],
        generation: child.generation,
        lineageType: 'maternal-terminal',
        kind: 'terminal',
        root: false,
        width: TERMINAL_NODE_WIDTH,
        height: TERMINAL_NODE_HEIGHT,
        x: 0,
        y: 0,
      });
      groupOf.set(child.id, id);
    }
  }

  const links: FamilyLink[] = [];
  const linkIds = new Set<string>();
  for (const family of groups.filter((group) => group.kind === 'family')) {
    for (const child of childrenOf(family)) {
      const target = groupOf.get(child.id);
      if (!target || target === family.id) continue;
      const id = `${family.id}-${target}`;
      if (linkIds.has(id)) continue;
      linkIds.add(id);
      links.push({
        id,
        source: family.id,
        target,
        childId: child.id,
        branchType:
          family.lineageType === 'maternal-terminal'
            ? 'maternal-terminal'
            : 'direct',
      });
    }
  }

  const generations = [...new Set(groups.map((group) => group.generation))].sort(
    (a, b) => a - b,
  );
  const generationLanes: GenerationLane[] = [];
  let laneY = 42;
  for (const generation of generations) {
    const lane = groups
      .filter((group) => group.generation === generation)
      .sort(
        (a, b) =>
          indexOf.get(a.clanMember.id)! - indexOf.get(b.clanMember.id)!,
      );
    const laneWidth =
      lane.reduce((total, group) => total + group.width, 0) +
      Math.max(0, lane.length - 1) * 56;
    let left = -laneWidth / 2;
    for (const group of lane) {
      group.x = left;
      group.y = laneY;
      left += group.width + 56;
    }
    generationLanes.push({ generation, y: laneY });
    laneY += Math.max(...lane.map((group) => group.height)) + 132;
  }

  return {
    groups,
    links,
    groupOf,
    generationLanes,
    visibleMemberIds: new Set(
      groups.flatMap((group) => group.people.map((person) => person.id)),
    ),
  };
}
