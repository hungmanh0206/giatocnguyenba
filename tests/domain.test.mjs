import test from 'node:test';
import assert from 'node:assert/strict';
import {
  seedMembers,
  searchMembers,
  validateMember,
  relatives,
  removeMemberAndLinks,
  upsertMemberAndLinks,
  eligibleBirthYears,
  eligibleBranches,
  eligibleGenerations,
  eligibleParents,
  eligibleSpouses,
  memberChangeError,
  memberDeletionError,
  memberDeathLabel,
  memberName,
  memberYearRange,
} from '../lib/family.ts';
import {
  collapsedDescendantGroups,
  layoutFamily,
} from '../lib/tree-layout.ts';
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
  assert.equal(searchMembers(seedMembers, 'nguyễn bá đức').length, 1);
  assert.equal(searchMembers(seedMembers, 'khongtontai').length, 0);
});

test('incomplete historical records retain unknown names and flexible death dates', () => {
  const unknownMember = {
    ...seedMembers.find((member) => member.id === 'p12'),
    name: '',
    nameKnown: false,
    tabooName: 'Ngọc',
    styleName: 'Tĩnh Trai',
    born: undefined,
    died: undefined,
    diedText: 'Mất vào tháng Chạp, chưa rõ năm',
    lifeStatus: 'deceased',
    anniversary: { day: 12, month: 8 },
  };

  assert.equal(validateMember(unknownMember, seedMembers), null);
  assert.equal(memberName(unknownMember), 'Chưa rõ tên');
  assert.equal(memberDeathLabel(unknownMember), 'Mất vào tháng Chạp, chưa rõ năm');
  assert.equal(memberYearRange(unknownMember), 'Chưa rõ – Mất vào tháng Chạp, chưa rõ năm');
  assert.equal(searchMembers([unknownMember], 'tĩnh trai').length, 1);
  assert.equal(
    validateMember({ ...unknownMember, lifeStatus: 'unknown' }, seedMembers),
    'Hồ sơ có thông tin mất cần được ghi là Đã mất.',
  );

  const yearOnly = {
    ...unknownMember,
    name: 'Nguyễn Thị Vô Danh',
    nameKnown: true,
    died: 1948,
    diedText: undefined,
    anniversary: undefined,
  };
  assert.equal(validateMember(yearOnly, seedMembers), null);
  assert.equal(memberDeathLabel(yearOnly), '1948');
  assert.equal(
    eligibleParents({ ...seedMembers.find((member) => member.id === 'p19'), born: undefined }, seedMembers, 0)
      .some((member) => member.id === 'p10'),
    true,
  );
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
test('removing a member also clears parent and spouse links', () => {
  const nextMembers = removeMemberAndLinks(seedMembers, 'p3');

  assert.equal(nextMembers.some((member) => member.id === 'p3'), false);
  assert.deepEqual(
    nextMembers.find((member) => member.id === 'p4')?.spouses,
    [],
  );
  assert.deepEqual(
    nextMembers.find((member) => member.id === 'p10')?.parents,
    ['p4'],
  );
  assert.deepEqual(
    nextMembers.find((member) => member.id === 'p12')?.parents,
    ['p4'],
  );
  const model = assertRenderableTree(nextMembers);
  assert.equal(model.groupOf.get('p10'), 'family-p10');
  assert.equal(
    model.links.some(
      (link) => link.source === 'family-p3' || link.target === 'family-p3',
    ),
    false,
  );
});
test('validation rejects cycles, self-parenting and inconsistent edits to a parent', () => {
  const root = seedMembers[0];
  assert.equal(
    validateMember({ ...root, gender: '' }, seedMembers),
    'Vui lòng chọn giới tính.',
  );
  assert.equal(
    validateMember({ ...root, generation: 0 }, seedMembers),
    'Vui lòng chọn đời và chi.',
  );
  assert.ok(validateMember({ ...root, parents: ['p19'] }, seedMembers));
  assert.ok(validateMember({ ...root, parents: [root.id] }, seedMembers));
  assert.ok(validateMember({ ...root, born: 1910 }, seedMembers));
  assert.ok(
    validateMember({ ...seedMembers[18], spouses: ['p10'] }, seedMembers),
  );
  assert.equal(
    validateMember(
      { ...seedMembers.find((member) => member.id === 'p12'), lineageType: 'direct' },
      seedMembers,
    ),
    'Con gái trong dòng họ được ghi là nhánh ngoại.',
  );
});

test('member editor only offers relationships, generations, branches, and years that fit the tree', () => {
  const newChild = {
    id: 'editor-child',
    name: 'Nguyễn Bá Editor',
    gender: 'male',
    isClanMember: true,
    lineageType: 'direct',
    generation: 4,
    branch: 1,
    born: 1962,
    parents: ['p10'],
    spouses: [],
  };
  assert.deepEqual(
    eligibleParents(newChild, seedMembers, 0).map((member) => member.id),
    ['p10', 'p11', 'p12', 'p13'],
  );
  assert.deepEqual(
    eligibleParents(newChild, seedMembers, 1).map((member) => member.id),
    ['p11'],
  );
  assert.equal(
    validateMember({ ...newChild, parents: ['p10', 'p12'] }, seedMembers),
    'Hai cha mẹ cần được ghi nhận là vợ chồng trước khi cùng đứng trong một hộ gia đình.',
  );
  assert.equal(eligibleParents({ ...newChild, generation: 1 }, seedMembers, 0).length, 0);
  assert.deepEqual(eligibleBranches(newChild, seedMembers), [1]);
  assert.deepEqual(eligibleBranches({ ...newChild, generation: 1 }, seedMembers), [0]);
  assert.equal(eligibleGenerations(newChild, seedMembers).includes(3), false);
  assert.equal(eligibleGenerations(newChild, seedMembers).includes(4), true);
  assert.deepEqual(eligibleBirthYears({ ...seedMembers.find((member) => member.id === 'p10') }, seedMembers), {
    min: 1904,
    max: 1954,
  });

  const p10 = seedMembers.find((member) => member.id === 'p10');
  const spouseIds = eligibleSpouses(p10, seedMembers).map((member) => member.id);
  assert.equal(spouseIds.includes('p11'), false);
  assert.equal(spouseIds.includes('p19'), false);
  assert.equal(spouseIds.includes('p5'), false);
  assert.equal(spouseIds.includes('p21'), false);
  assert.equal(spouseIds.includes('p14'), false);
  assert.deepEqual(spouseIds, []);
  const eligiblePartner = {
    id: 'eligible-partner',
    name: 'Đinh Thị An',
    gender: 'female',
    isClanMember: false,
    lineageType: 'direct',
    generation: 3,
    branch: 1,
    born: 1931,
    parents: [],
    spouses: [],
  };
  assert.equal(
    eligibleSpouses(p10, [...seedMembers, eligiblePartner]).some(
      (member) => member.id === eligiblePartner.id,
    ),
    true,
  );
  assert.equal(
    validateMember({ ...newChild, branch: 2 }, seedMembers),
    'Chi cần khớp với đời và cha mẹ đã chọn.',
  );
});

test('destructive member operations preserve the recorded genealogy', () => {
  const p1 = seedMembers.find((member) => member.id === 'p1');
  const p10 = seedMembers.find((member) => member.id === 'p10');
  const p29 = seedMembers.find((member) => member.id === 'p29');
  const p31 = seedMembers.find((member) => member.id === 'p31');

  assert.match(memberDeletionError(p1, seedMembers), /Thủy tổ/);
  assert.match(memberDeletionError(p10, seedMembers), /cha\/mẹ của 2 người/);
  assert.match(memberDeletionError(p31, seedMembers), /vợ\/chồng/);
  assert.equal(memberDeletionError(p29, seedMembers), null);
  assert.match(
    memberChangeError({ ...p10, branch: 2 }, seedMembers),
    /đã có con/,
  );
  assert.match(
    memberChangeError({ ...p31, generation: 4 }, seedMembers),
    /vợ\/chồng/,
  );
  assert.equal(
    memberChangeError({ ...p29, hometown: 'Hà Nội' }, seedMembers),
    null,
  );
});

function assertRenderableTree(members) {
  const model = layoutFamily(members);
  const groups = new Map(model.groups.map((group) => [group.id, group]));

  for (const link of model.links) {
    assert.ok(groups.has(link.source), `missing source ${link.source}`);
    assert.ok(groups.has(link.target), `missing target ${link.target}`);
  }
  for (const a of model.groups)
    for (const b of model.groups)
      if (a.id !== b.id && a.generation === b.generation)
        assert.ok(
          a.x + a.width <= b.x || b.x + b.width <= a.x,
          `${a.id} overlaps ${b.id}`,
        );

  return model;
}

test('tree stays renderable through add, edit, spouse changes, and deletion', () => {
  let members = seedMembers.map((member) => ({
    ...member,
    parents: [...member.parents],
    spouses: [...member.spouses],
  }));

  const spouse = {
    id: 'case-spouse',
    name: 'Ngô Thị Mai',
    gender: 'female',
    isClanMember: false,
    lineageType: 'direct',
    generation: 5,
    branch: 1,
    born: 1995,
    parents: [],
    spouses: ['p33'],
  };
  assert.equal(validateMember(spouse, members), null);
  members = upsertMemberAndLinks(members, spouse);
  let model = assertRenderableTree(members);
  assert.deepEqual(
    model.groups.find((group) => group.id === 'family-p33')?.people.map((person) => person.id),
    ['p33', 'case-spouse'],
  );

  const son = {
    id: 'case-son',
    name: 'Nguyễn Bá Quốc Bảo',
    gender: 'male',
    isClanMember: true,
    lineageType: 'direct',
    generation: 6,
    branch: 1,
    born: 2006,
    parents: ['p33', 'case-spouse'],
    spouses: [],
  };
  assert.equal(validateMember(son, members), null);
  members = upsertMemberAndLinks(members, son);
  model = assertRenderableTree(members);
  assert.equal(model.groupOf.get('case-son'), 'family-case-son');
  assert.equal(
    model.links.some(
      (link) => link.source === 'family-p33' && link.target === 'family-case-son',
    ),
    true,
  );

  const daughter = {
    id: 'case-daughter',
    name: 'Nguyễn Thị Minh Anh',
    gender: 'female',
    isClanMember: true,
    lineageType: 'maternal-terminal',
    generation: 6,
    branch: 1,
    born: 2008,
    parents: ['p33', 'case-spouse'],
    spouses: [],
  };
  assert.equal(validateMember(daughter, members), null);
  members = upsertMemberAndLinks(members, daughter);

  const sonInLaw = {
    id: 'case-son-in-law',
    name: 'Trần Quốc Nam',
    gender: 'male',
    isClanMember: false,
    lineageType: 'direct',
    generation: 6,
    branch: 1,
    born: 2005,
    parents: [],
    spouses: ['case-daughter'],
  };
  assert.equal(validateMember(sonInLaw, members), null);
  members = upsertMemberAndLinks(members, sonInLaw);

  const maternalChild = {
    id: 'case-maternal-child',
    name: 'Trần Gia Hân',
    gender: 'female',
    isClanMember: false,
    lineageType: 'direct',
    generation: 7,
    branch: 1,
    born: 2024,
    parents: ['case-daughter', 'case-son-in-law'],
    spouses: [],
  };
  assert.equal(validateMember(maternalChild, members), null);
  members = upsertMemberAndLinks(members, maternalChild);

  const maternalGrandchild = {
    id: 'case-maternal-grandchild',
    name: 'Trần Hải Đăng',
    gender: 'male',
    isClanMember: false,
    lineageType: 'direct',
    generation: 8,
    branch: 1,
    born: 2025,
    parents: ['case-maternal-child'],
    spouses: [],
  };
  assert.equal(validateMember(maternalGrandchild, members), null);
  members = upsertMemberAndLinks(members, maternalGrandchild);

  model = assertRenderableTree(members);
  assert.equal(model.groupOf.get('case-daughter'), 'family-case-daughter');
  assert.equal(model.groupOf.get('case-son-in-law'), 'family-case-daughter');
  assert.equal(model.groupOf.get('case-maternal-child'), 'terminal-case-maternal-child');
  assert.equal(model.groupOf.has('case-maternal-grandchild'), false);
  assert.equal(model.visibleMemberIds.has('case-maternal-grandchild'), false);
  assert.equal(
    model.links.some((link) => link.source === 'terminal-case-maternal-child'),
    false,
  );

  const editedDaughter = {
    ...members.find((member) => member.id === 'case-daughter'),
    name: 'Nguyễn Thị Gia Linh',
    spouses: [],
  };
  assert.equal(validateMember(editedDaughter, members), null);
  members = upsertMemberAndLinks(members, editedDaughter);
  model = assertRenderableTree(members);
  assert.equal(
    model.groups.find((group) => group.id === 'family-case-daughter')?.clanMember.name,
    'Nguyễn Thị Gia Linh',
  );
  assert.deepEqual(
    members.find((member) => member.id === 'case-son-in-law')?.spouses,
    [],
  );

  const editedSon = {
    ...members.find((member) => member.id === 'case-son'),
    name: 'Nguyễn Bá Quốc Khánh',
  };
  assert.equal(validateMember(editedSon, members), null);
  members = upsertMemberAndLinks(members, editedSon);
  model = assertRenderableTree(members);
  assert.equal(
    model.groups.find((group) => group.id === 'family-case-son')?.clanMember.name,
    'Nguyễn Bá Quốc Khánh',
  );

  members = removeMemberAndLinks(members, 'case-spouse');
  model = assertRenderableTree(members);
  assert.deepEqual(
    model.groups.find((group) => group.id === 'family-p33')?.people.map((person) => person.id),
    ['p33'],
  );
  assert.deepEqual(
    members.find((member) => member.id === 'case-daughter')?.parents,
    ['p33'],
  );

  members = removeMemberAndLinks(members, 'case-son');
  model = assertRenderableTree(members);
  assert.equal(model.groupOf.has('case-son'), false);
  assert.equal(model.links.some((link) => link.childId === 'case-son'), false);

  members = removeMemberAndLinks(members, 'case-daughter');
  model = assertRenderableTree(members);
  assert.equal(model.groupOf.has('case-daughter'), false);
  assert.equal(model.groupOf.has('case-maternal-child'), false);
  assert.equal(
    model.links.some((link) => link.childId === 'case-daughter'),
    false,
  );
});
test('family-unit layout keeps daughters, spouses, and maternal terminal children', () => {
  const model = layoutFamily(seedMembers);
  const root = model.groups.find((group) => group.root);
  const daughterFamily = model.groups.find(
    (group) => group.id === model.groupOf.get('p12'),
  );
  const maternalChild = model.groups.find(
    (group) => group.id === model.groupOf.get('p23'),
  );

  assert.equal(root?.id, 'family-p1');
  assert.ok(root.width > daughterFamily.width);
  assert.deepEqual(
    model.groups
      .filter((group) => group.generation === 2 && group.kind === 'family')
      .map((group) => group.clanMember.id),
    ['p3', 'p5', 'p7'],
  );
  assert.deepEqual(daughterFamily?.people.map((person) => person.id), [
    'p12',
    'p13',
  ]);
  assert.equal(daughterFamily?.lineageType, 'maternal-terminal');
  assert.deepEqual(
    model.groups
      .find((group) => group.id === model.groupOf.get('p18'))
      ?.spouses.map((person) => person.id),
    ['p39'],
  );
  assert.equal(maternalChild?.kind, 'terminal');
  assert.equal(model.visibleMemberIds.has('p12'), true);
  assert.equal(model.visibleMemberIds.has('p13'), true);
  assert.equal(model.visibleMemberIds.has('p23'), true);
  assert.equal(model.visibleMemberIds.has('p29'), true);
  assert.equal(
    model.links.find((link) => link.childId === 'p23')?.branchType,
    'maternal-terminal',
  );
  assert.equal(model.links.some((link) => link.source === 'terminal-p23'), false);
  assert.equal(model.links.some((link) => link.source === 'terminal-p29'), false);
  assert.equal(model.visibleMemberIds.has('p38'), false);
  const legacyModel = layoutFamily(
    seedMembers.map((person) => ({
      ...person,
      isClanMember: false,
      lineageType: 'direct',
    })),
  );
  assert.equal(legacyModel.groupOf.has('p29'), true);
  assert.equal(legacyModel.groupOf.get('p29'), 'terminal-p29');
  assert.equal(legacyModel.visibleMemberIds.has('p38'), false);
  assert.equal(
    legacyModel.links.some((link) => link.source === 'terminal-p29'),
    false,
  );
  for (const parent of model.groups) {
    const children = model.links
      .filter((link) => link.source === parent.id)
      .map((link) => model.groups.find((group) => group.id === link.target))
      .filter(Boolean);
    if (!children.length) continue;
    const left = Math.min(...children.map((child) => child.x));
    const right = Math.max(...children.map((child) => child.x + child.width));
    const parentCenter = parent.x + parent.width / 2;
    assert.ok(
      parentCenter >= left && parentCenter <= right,
      `${parent.id} is centred over its child branch`,
    );
  }
  assert.equal(
    new Set(model.groups.flatMap((g) => g.people.map((p) => p.id))).size,
    model.visibleMemberIds.size,
  );
  for (const a of model.groups)
    for (const b of model.groups)
      if (a.id !== b.id && a.generation === b.generation)
        assert.ok(
          a.x + a.width <= b.x || b.x + b.width <= a.x,
          `${a.id} overlaps ${b.id}`,
        );
});
test('collapsed tree groups hide every descendant and never the collapsed group', () => {
  const model = layoutFamily(seedMembers);
  const rootGroup = model.groupOf.get('p1');
  const childGroup = model.groupOf.get('p3');
  const grandchildGroup = model.groupOf.get('p10');
  const hidden = collapsedDescendantGroups(model.links, [rootGroup]);

  assert.equal(hidden.has(rootGroup), false);
  assert.equal(hidden.has(childGroup), true);
  assert.equal(hidden.has(grandchildGroup), true);
  assert.equal(collapsedDescendantGroups(model.links, []).size, 0);
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
