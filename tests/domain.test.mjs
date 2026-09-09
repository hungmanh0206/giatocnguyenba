import test from 'node:test';
import assert from 'node:assert/strict';
import {
  seedMembers,
  searchMembers,
  validateMember,
  relatives,
} from '../lib/family.ts';
import { layoutFamily } from '../lib/tree-layout.ts';
import {
  lunarOf,
  anniversariesOn,
  upcomingAnniversaries,
} from '../lib/lunar.ts';
import {
  canEditFamily,
  canManageFamily,
  isFamilyRole,
} from '../lib/access.ts';
test('only super admin is a valid management role', () => {
  assert.equal(isFamilyRole('super_admin'), true);
  assert.equal(isFamilyRole('viewer'), false);
  assert.equal(canEditFamily('super_admin'), true);
  assert.equal(canEditFamily(null), false);
  assert.equal(canManageFamily('super_admin'), true);
  assert.equal(canManageFamily(null), false);
});
test('Vietnamese search supports accents, case and nonadjacent tokens', () => {
  assert.deepEqual(
    searchMembers(seedMembers, 'NGUYEN hung').map((p) => p.id),
    ['p19'],
  );
  assert.equal(searchMembers(seedMembers, 'nguyễn bá đức').length, 2);
  assert.equal(searchMembers(seedMembers, 'khongtontai').length, 0);
});
test('seed genealogy is valid and spouse links are symmetric', () => {
  for (const p of seedMembers) {
    assert.equal(validateMember(p, seedMembers), null, p.name);
    for (const id of p.spouses)
      assert.ok(seedMembers.find((m) => m.id === id).spouses.includes(p.id));
  }
  assert.deepEqual(
    relatives(
      seedMembers,
      seedMembers.find((p) => p.id === 'p7'),
    ).children.map((p) => p.id),
    ['p16', 'p18'],
  );
});
test('validation rejects cycles, self-parenting and inconsistent edits to a parent', () => {
  const root = seedMembers[0];
  assert.ok(validateMember({ ...root, parents: ['p19'] }, seedMembers));
  assert.ok(validateMember({ ...root, parents: [root.id] }, seedMembers));
  assert.ok(validateMember({ ...root, born: 1910 }, seedMembers));
  assert.ok(
    validateMember({ ...seedMembers[18], spouses: ['p10'] }, seedMembers),
  );
});
test('multiple marriages retain exact parent pairs and groups never overlap', () => {
  const model = layoutFamily(seedMembers);
  assert.deepEqual(model.links.find((l) => l.childId === 'p16').parentIds, [
    'p7',
    'p8',
  ]);
  assert.deepEqual(model.links.find((l) => l.childId === 'p18').parentIds, [
    'p7',
    'p9',
  ]);
  assert.equal(
    new Set(model.groups.flatMap((g) => g.people.map((p) => p.id))).size,
    seedMembers.length,
  );
  for (const a of model.groups)
    for (const b of model.groups)
      if (a.id !== b.id && a.generation === b.generation)
        assert.ok(
          a.x + a.width <= b.x || b.x + b.width <= a.x,
          `${a.id} overlaps ${b.id}`,
        );
});
test('layout accepts a 511-member genealogy without missing nodes', () => {
  const people = Array.from({ length: 511 }, (_, i) => ({
    id: `s${i}`,
    name: `Person ${i}`,
    gender: 'male',
    generation: Math.floor(Math.log2(i + 1)) + 1,
    branch: 1,
    born: 1700 + Math.floor(Math.log2(i + 1)) * 25,
    parents: i ? [`s${Math.floor((i - 1) / 2)}`] : [],
    spouses: [],
  }));
  const model = layoutFamily(people);
  assert.equal(model.groups.length, 511);
  assert.equal(model.links.length, 510);
  assert.ok(
    model.groups.every((g) => Number.isFinite(g.x) && Number.isFinite(g.y)),
  );
});
test('Vietnamese lunar conversion handles Tet and the 2023 leap month', () => {
  const tet = lunarOf(new Date(2024, 1, 10));
  assert.deepEqual(
    [tet.day, tet.month, tet.year, tet.leap],
    [1, 1, 2024, false],
  );
  const leap = lunarOf(new Date(2023, 2, 22));
  assert.deepEqual(
    [leap.day, leap.month, leap.year, leap.leap],
    [1, 2, 2023, true],
  );
  const end = lunarOf(new Date(2024, 1, 9));
  assert.deepEqual([end.day, end.month, end.year], [30, 12, 2023]);
});
test('anniversaries skip leap duplicates and cross solar years', () => {
  const p = { ...seedMembers[0], anniversary: { day: 1, month: 2 } };
  assert.equal(anniversariesOn([p], new Date(2023, 2, 22)).length, 0);
  const upcoming = upcomingAnniversaries(seedMembers, new Date(2026, 11, 31));
  assert.equal(
    upcoming.length,
    seedMembers.filter((p) => p.anniversary).length,
  );
  assert.ok(upcoming.every((e) => e.date >= new Date(2026, 11, 31)));
  assert.ok(
    upcoming.every((e, i) => i === 0 || e.daysAway >= upcoming[i - 1].daysAway),
  );
});
