import { compareSiblingOrder, type Member } from './family.ts';

export const FAMILY_UNIT_WIDTH = 248;
export const FAMILY_UNIT_HEIGHT = 164;
export const ROOT_FAMILY_WIDTH = 310;
export const ROOT_FAMILY_HEIGHT = 202;
export const TERMINAL_NODE_WIDTH = 212;
export const TERMINAL_NODE_HEIGHT = 118;
// Kept for consumers that only need a typical tree-card measurement.
export const PERSON_WIDTH = FAMILY_UNIT_WIDTH;
export const PERSON_HEIGHT = FAMILY_UNIT_HEIGHT;
export const PERSON_GAP = 48;
const SIBLING_GAP = 76;
const ROOT_GAP = 168;
const GENERATION_GAP = 148;

export type Household = {
  id: string;
  clanMember: Member;
  spouses: Member[];
  people: Member[];
  wifeRoles: Record<string, string>;
  parentageLabel?: string;
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
  return (person.gender === 'female' &&
    (person.isClanMember || legacyClanMember(person))) ||
    person.lineageType === 'maternal-terminal'
    ? 'maternal-terminal'
    : 'direct';
}

function orderedPeople(members: Member[], indexOf: Map<string, number>) {
  return [...members].sort((a, b) => {
    const sourceOrder = indexOf.get(a.id)! - indexOf.get(b.id)!;
    return a.generation - b.generation || compareSiblingOrder(a, b) || sourceOrder;
  });
}

function compareGroups(
  a: Household,
  b: Household,
  indexOf: Map<string, number>,
) {
  return (
    compareSiblingOrder(a.clanMember, b.clanMember) ||
    indexOf.get(a.clanMember.id)! - indexOf.get(b.clanMember.id)!
  );
}

function wifeOrdinal(index: number) {
  const names = ['cả', 'hai', 'ba', 'tư', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười'];
  return `Bà ${names[index] || `thứ ${index + 1}`}`;
}

function wivesOf(husband: Member, lookup: Map<string, Member>) {
  return husband.spouses
    .map((id) => lookup.get(id))
    .filter((person): person is Member => !!person && person.gender === 'female');
}

function wifeRolesFor(people: Member[], lookup: Map<string, Member>) {
  const wifeRoles: Record<string, string> = {};

  for (const husband of people.filter((person) => person.gender === 'male')) {
    const wives = wivesOf(husband, lookup);
    if (wives.length < 2) continue;
    wives.forEach((wife, index) => {
      wifeRoles[wife.id] = wifeOrdinal(index);
    });
  }

  return wifeRoles;
}

function parentageLabelFor(person: Member, lookup: Map<string, Member>) {
  const parents = person.parents
    .map((id) => lookup.get(id))
    .filter((parent): parent is Member => !!parent);
  const father = parents.find((parent) => parent.gender === 'male');
  if (!father) return undefined;

  const wives = wivesOf(father, lookup);
  if (wives.length < 2) return undefined;

  const mother = parents.find((parent) => parent.gender === 'female');
  const wifeIndex = mother ? wives.findIndex((wife) => wife.id === mother.id) : -1;
  return wifeIndex >= 0 ? `Con của ${wifeOrdinal(wifeIndex)}` : 'Chưa ghi nhận mẹ';
}

function familyHeight(
  spouseCount: number,
  root: boolean,
  hasParentageLabel = false,
) {
  const base = root ? ROOT_FAMILY_HEIGHT : FAMILY_UNIT_HEIGHT;
  return base + Math.max(0, spouseCount - 1) * 52 + (hasParentageLabel ? 18 : 0);
}

export function layoutFamily(
  members: Member[],
  collapsed: Iterable<string> = [],
) {
  const lookup = new Map(members.map((person) => [person.id, person]));
  const indexOf = new Map(members.map((person, index) => [person.id, index]));
  const collapsedGroups = new Set(collapsed);
  const clanPeople = orderedPeople(clanPeopleForTree(members), indexOf);
  const childrenByParent = new Map<string, Member[]>();
  for (const person of members) {
    for (const parentId of person.parents) {
      const children = childrenByParent.get(parentId) || [];
      children.push(person);
      childrenByParent.set(parentId, children);
    }
  }
  const maternalChildIds = new Set<string>();
  const maternalDescendantIds = new Set<string>();
  for (const daughter of clanPeople.filter(
    (person) => lineageType(person) === 'maternal-terminal',
  )) {
    const directChildren = childrenByParent.get(daughter.id) || [];
    // A maternal branch stays expandable when the recorded data continues
    // beyond its direct children; otherwise it remains a compact terminal branch.
    if (
      directChildren.some(
        (child) => (childrenByParent.get(child.id) || []).length > 0,
      )
    ) {
      continue;
    }
    for (const child of directChildren) {
      maternalChildIds.add(child.id);
      const descendants = [...(childrenByParent.get(child.id) || [])];
      while (descendants.length) {
        const descendant = descendants.pop()!;
        if (maternalDescendantIds.has(descendant.id)) continue;
        maternalDescendantIds.add(descendant.id);
        descendants.push(...(childrenByParent.get(descendant.id) || []));
      }
    }
  }
  const treeClanPeople = clanPeople.filter(
    (person) =>
      !maternalChildIds.has(person.id) &&
      !maternalDescendantIds.has(person.id),
  );
  const minimumGeneration = Math.min(
    ...treeClanPeople.map((person) => person.generation),
    1,
  );
  const groups: Household[] = [];
  const groupOf = new Map<string, string>();

  for (const clanMember of treeClanPeople) {
    if (groupOf.has(clanMember.id)) continue;

    const spouses = clanMember.spouses
      .map((id) => lookup.get(id))
      .filter((person): person is Member => !!person)
      .filter((person) => !groupOf.has(person.id));
    // Keep each recorded spouse in the same household, including a co-spouse
    // connected through the direct partner. This preserves multi-wife families.
    for (const spouse of [...spouses]) {
      for (const coSpouseId of spouse.spouses) {
        const coSpouse = lookup.get(coSpouseId);
        if (
          !coSpouse ||
          coSpouse.id === clanMember.id ||
          groupOf.has(coSpouse.id) ||
          spouses.some((person) => person.id === coSpouse.id)
        ) {
          continue;
        }
        spouses.push(coSpouse);
      }
    }
    const root =
      clanMember.generation === minimumGeneration &&
      clanMember.parents.length === 0;
    const id = `family-${clanMember.id}`;
    const people = [clanMember, ...spouses];
    const parentageLabel = parentageLabelFor(clanMember, lookup);
    const group: Household = {
      id,
      clanMember,
      spouses,
      people,
      wifeRoles: wifeRolesFor(people, lookup),
      parentageLabel,
      generation: clanMember.generation,
      lineageType: lineageType(clanMember),
      kind: 'family',
      root,
      width: root ? ROOT_FAMILY_WIDTH : FAMILY_UNIT_WIDTH,
      height: familyHeight(spouses.length, root, !!parentageLabel),
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
      const parentageLabel = parentageLabelFor(child, lookup);
      groups.push({
        id,
        clanMember: child,
        spouses: [],
        people: [child],
        wifeRoles: {},
        parentageLabel,
        generation: child.generation,
        lineageType: 'maternal-terminal',
        kind: 'terminal',
        root: false,
        width: TERMINAL_NODE_WIDTH,
        height: TERMINAL_NODE_HEIGHT + (parentageLabel ? 18 : 0),
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

  // Give every descendant branch its own horizontal span. A parent is centred in
  // that span, so sibling branches remain ordered and their connectors cannot cross.
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const childrenByGroup = new Map<string, Household[]>();
  const parentGroups = new Set<string>();
  for (const link of links) {
    const child = groupById.get(link.target);
    if (!child) continue;
    const children = childrenByGroup.get(link.source) || [];
    children.push(child);
    childrenByGroup.set(link.source, children);
    parentGroups.add(link.target);
  }
  for (const children of childrenByGroup.values()) {
    children.sort((a, b) => compareGroups(a, b, indexOf));
  }

  const subtreeWidth = new Map<string, number>();
  function measureSubtree(group: Household): number {
    const cached = subtreeWidth.get(group.id);
    if (cached) return cached;
    const children = collapsedGroups.has(group.id)
      ? []
      : (childrenByGroup.get(group.id) || []);
    const childrenWidth = children.length
      ? children.reduce((total, child) => total + measureSubtree(child), 0) +
        (children.length - 1) * SIBLING_GAP
      : 0;
    const width = Math.max(group.width, childrenWidth);
    subtreeWidth.set(group.id, width);
    return width;
  }

  function placeSubtree(group: Household, left: number) {
    const width = measureSubtree(group);
    const children = collapsedGroups.has(group.id)
      ? []
      : (childrenByGroup.get(group.id) || []);
    const childrenWidth = children.length
      ? children.reduce((total, child) => total + measureSubtree(child), 0) +
        (children.length - 1) * SIBLING_GAP
      : 0;
    let childLeft = left + (width - childrenWidth) / 2;
    for (const child of children) {
      placeSubtree(child, childLeft);
      childLeft += measureSubtree(child) + SIBLING_GAP;
    }
    group.x = left + (width - group.width) / 2;
  }

  const roots = groups
    .filter((group) => !parentGroups.has(group.id))
    .sort((a, b) =>
      a.generation - b.generation || compareGroups(a, b, indexOf),
    );
  const forestWidth = roots.length
    ? roots.reduce((total, group) => total + measureSubtree(group), 0) +
      (roots.length - 1) * ROOT_GAP
    : 0;
  let forestLeft = -forestWidth / 2;
  for (const root of roots) {
    placeSubtree(root, forestLeft);
    forestLeft += measureSubtree(root) + ROOT_GAP;
  }

  // Invalid imported relationships should not hide a person from the canvas.
  for (const group of groups) {
    if (!subtreeWidth.has(group.id)) {
      placeSubtree(group, forestLeft);
      forestLeft += measureSubtree(group) + ROOT_GAP;
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
      .sort((a, b) => a.x - b.x);
    for (const group of lane) {
      group.y = laneY;
    }
    generationLanes.push({ generation, y: laneY });
    laneY += Math.max(...lane.map((group) => group.height)) + GENERATION_GAP;
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
