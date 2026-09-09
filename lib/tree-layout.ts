import dagre from '@dagrejs/dagre';
import type { Member } from './family';
export const PERSON_WIDTH = 260;
export const PERSON_GAP = 26;
export const PERSON_HEIGHT = 176;
export type Household = {
  id: string;
  people: Member[];
  generation: number;
  width: number;
  x: number;
  y: number;
};
export type FamilyLink = {
  id: string;
  source: string;
  target: string;
  childId: string;
  parentIds: string[];
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

export function layoutFamily(members: Member[]) {
  const lookup = new Map(members.map((p) => [p.id, p]));
  const visited = new Set<string>();
  const groups: Household[] = [];
  const groupOf = new Map<string, string>();
  for (const p of members) {
    if (visited.has(p.id)) continue;
    const queue = [p.id];
    const people: Member[] = [];
    while (queue.length) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      const person = lookup.get(id);
      if (!person) continue;
      visited.add(id);
      people.push(person);
      queue.push(...person.spouses);
    }
    people.sort(
      (a, b) => b.parents.length - a.parents.length || a.born - b.born,
    );
    if (people.length === 3 && people[0].spouses.length === 2) {
      [people[0], people[1]] = [people[1], people[0]];
    }
    const id = people
      .map((p) => p.id)
      .sort()
      .join('-');
    people.forEach((p) => groupOf.set(p.id, id));
    groups.push({
      id,
      people,
      generation: Math.min(...people.map((p) => p.generation)),
      width: people.length * PERSON_WIDTH + (people.length - 1) * PERSON_GAP,
      x: 0,
      y: 0,
    });
  }
  const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: 'TB',
    nodesep: 55,
    ranksep: 95,
    marginx: 30,
    marginy: 35,
  });
  groups.forEach((g) =>
    graph.setNode(g.id, { width: g.width, height: PERSON_HEIGHT }),
  );
  const links: FamilyLink[] = [];
  for (const p of members) {
    const sources = [
      ...new Set(p.parents.map((id) => groupOf.get(id)).filter(Boolean)),
    ] as string[];
    for (const source of sources) {
      const target = groupOf.get(p.id)!;
      if (source === target) continue;
      links.push({
        id: `${source}-${p.id}`,
        source,
        target,
        childId: p.id,
        parentIds: p.parents.filter((id) => groupOf.get(id) === source),
      });
      graph.setEdge(source, target);
    }
  }
  dagre.layout(graph);
  for (const g of groups) {
    const pos = graph.node(g.id);
    g.x = pos.x - g.width / 2;
    g.y = (g.generation - 1) * 255 + 35;
  }
  // Keep incomplete and disconnected records from overlapping generation lanes.
  for (const generation of new Set(groups.map((g) => g.generation))) {
    let right = -Infinity;
    for (const group of groups
      .filter((g) => g.generation === generation)
      .sort((a, b) => a.x - b.x)) {
      group.x = Math.max(group.x, right + 55);
      right = group.x + group.width;
    }
  }
  return { groups, links, groupOf };
}
