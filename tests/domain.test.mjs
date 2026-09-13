import test from 'node:test';
import assert from 'node:assert/strict';
import {
  seedMembers,
  searchMembers,
  validateMember,
  relatives,
  removeMemberAndLinks,
  upsertMemberAndLinks,
  eligibleBranches,
  eligibleParents,
  eligibleSpouses,
  memberChangeError,
  memberDeletionError,
  memberDeathLabel,
  memberLifeStatus,
  memberName,
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

function member(id) {
  const person = seedMembers.find((candidate) => candidate.id === id);
  assert.ok(person, `missing seeded member ${id}`);
  return person;
}

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

test('only super admin is a valid management role', () => {
  assert.equal(isFamilyRole('super_admin'), true);
  assert.equal(isFamilyRole('viewer'), false);
  assert.equal(canEditFamily('super_admin'), true);
  assert.equal(canEditFamily(null), false);
  assert.equal(canManageFamily('super_admin'), true);
  assert.equal(canManageFamily(null), false);
});

test('active seed preserves the normalized genealogy and contextual spouses', () => {
  assert.equal(seedMembers.length, 160);

  const founder = member('P001');
  const founderSpouse = member('P002');
  const branchFounder = member('P050');

  assert.equal(memberName(founder), 'Nguyễn Bá Linh');
  assert.equal(founder.tabooName, 'Sóc');
  assert.equal(founder.styleName, 'Thần Hy Phủ Quân');
  assert.deepEqual(founder.anniversary, { day: 27, month: 11 });
  assert.deepEqual(member('P057').deathDate, { day: 14, month: 5, year: 1985 });
  assert.deepEqual(member('P057').anniversary, { day: 14, month: 5 });
  assert.deepEqual(member('P048').deathDate, { day: 29, month: 9, year: 1959 });
  assert.deepEqual(member('P048').anniversary, { day: 29, month: 9 });
  assert.deepEqual(member('P054').deathDate, { day: 22, month: 5, year: 1968 });
  assert.deepEqual(member('P056').deathDate, { day: 12, month: 2, year: 2009 });
  assert.deepEqual(member('P058').deathDate, { day: 16, month: 12, year: 2017 });
  assert.equal(member('P062').deathDate, undefined);
  assert.equal(memberName(founderSpouse), 'Bà tổ (chưa rõ tên)');
  assert.deepEqual(founderSpouse.anniversary, { day: 17, month: 4 });
  assert.equal(memberName(member('P024')), 'Ông Khiết');
  assert.equal(memberName(member('P012')), 'Nguyễn Văn Xum');
  assert.equal(branchFounder.branch, 2);
  assert.equal(branchFounder.branchOrigin, true);
  assert.equal(member('P047').gender, 'male');
  assert.equal(memberName(member('P081')), 'Nguyễn Thị Kiều Hà');
  assert.equal(
    seedMembers
      .filter((person) => person.generation === 2 || person.generation === 3)
      .every((person) => person.lifeStatus === 'deceased'),
    true,
  );
  assert.equal(memberLifeStatus(member('P105')), 'unknown');
  assert.equal(
    seedMembers.filter((person) => person.needsVerification).length,
    6,
  );
  assert.deepEqual(
    relatives(seedMembers, founder).children.map((person) => person.id),
    ['P003', 'P004', 'P005', 'P006'],
  );
});

test('search uses source names without injecting honorifics', () => {
  assert.deepEqual(
    searchMembers(seedMembers, 'nguyen ba linh').map((person) => person.id),
    ['P001'],
  );
  assert.deepEqual(
    searchMembers(seedMembers, 'ong khiet').map((person) => person.id),
    ['P024'],
  );
  assert.deepEqual(
    searchMembers(seedMembers, 'than hy').map((person) => person.id),
    ['P001'],
  );
  assert.equal(searchMembers(seedMembers, 'khongtontai').length, 0);
});

test('normalized relationships are valid and spouse links are symmetric', () => {
  for (const person of seedMembers) {
    assert.equal(validateMember(person, seedMembers), null, person.id);
    for (const spouseId of person.spouses) {
      assert.ok(member(spouseId).spouses.includes(person.id));
    }
  }
});

test('source gender and source branch origin remain editable states', () => {
  const recordedGender = member('P047');
  const sourceBranchOrigin = member('P050');

  assert.equal(validateMember(recordedGender, seedMembers), null);
  assert.equal(validateMember(sourceBranchOrigin, seedMembers), null);
  assert.equal(
    validateMember({ ...sourceBranchOrigin, branchOrigin: false }, seedMembers),
    'Chi cần khớp với đời và cha mẹ đã chọn.',
  );
});

test('removing a member clears every recorded relationship', () => {
  const nextMembers = removeMemberAndLinks(seedMembers, 'P048');

  assert.equal(nextMembers.some((person) => person.id === 'P048'), false);
  assert.deepEqual(
    nextMembers.find((person) => person.id === 'P053')?.spouses,
    [],
  );
  assert.deepEqual(
    nextMembers.find((person) => person.id === 'P055')?.parents,
    ['P053'],
  );
  const model = assertRenderableTree(nextMembers);
  assert.equal(model.groupOf.get('P055'), 'family-P055');
  assert.equal(
    model.links.some((link) => link.source === 'family-P048'),
    false,
  );
});

test('validation protects genealogy constraints and supports known branch starts', () => {
  const founder = member('P001');
  const daughter = member('P003');

  assert.equal(
    validateMember({ ...founder, gender: '' }, seedMembers),
    'Vui lòng chọn giới tính.',
  );
  assert.equal(
    validateMember({ ...founder, generation: 0 }, seedMembers),
    'Vui lòng chọn đời và chi.',
  );
  assert.ok(validateMember({ ...founder, parents: ['P105'] }, seedMembers));
  assert.ok(validateMember({ ...founder, parents: [founder.id] }, seedMembers));
  assert.equal(
    validateMember({ ...daughter, lineageType: 'direct' }, seedMembers),
    'Con gái trong dòng họ được ghi là nhánh ngoại.',
  );
  assert.deepEqual(eligibleBranches(member('P050'), seedMembers), [2]);
});

test('member editor choices respect recorded parents, branches, and spouses', () => {
  const secondGenerationChild = {
    id: 'editor-child',
    name: 'Nguyễn Bá Biên Tập',
    gender: 'male',
    isClanMember: true,
    lineageType: 'direct',
    generation: 2,
    branch: 1,
    parents: [],
    spouses: [],
  };
  assert.deepEqual(
    eligibleParents(secondGenerationChild, seedMembers, 0)
      .map((person) => person.id)
      .sort(),
    ['P001', 'P002'],
  );
  assert.deepEqual(
    eligibleParents(
      { ...secondGenerationChild, parents: ['P001'] },
      seedMembers,
      1,
    ).map((person) => person.id),
    ['P002'],
  );

  const eligiblePartner = {
    id: 'eligible-partner',
    name: 'Đinh Thị An',
    gender: 'female',
    isClanMember: false,
    lineageType: 'direct',
    generation: 3,
    branch: 1,
    parents: [],
    spouses: [],
  };
  assert.equal(
    eligibleSpouses(member('P049'), [...seedMembers, eligiblePartner]).some(
      (person) => person.id === eligiblePartner.id,
    ),
    true,
  );
});

test('destructive operations preserve the documented relationships', () => {
  assert.match(memberDeletionError(member('P001'), seedMembers), /Thủy tổ/);
  assert.match(memberDeletionError(member('P048'), seedMembers), /cha\/mẹ của/);
  assert.equal(memberDeletionError(member('P004'), seedMembers), null);
  assert.match(
    memberChangeError({ ...member('P048'), branch: 2 }, seedMembers),
    /đã có con/,
  );
  assert.equal(
    memberChangeError({ ...member('P004'), hometown: 'Hà Nội' }, seedMembers),
    null,
  );
});

test('tree stays renderable through add, edit, spouse changes, and deletion', () => {
  let members = seedMembers.map((person) => ({
    ...person,
    parents: [...person.parents],
    spouses: [...person.spouses],
  }));
  const parent = {
    id: 'case-parent',
    name: 'Nguyễn Bá Kiểm Thử',
    gender: 'male',
    isClanMember: true,
    lineageType: 'direct',
    generation: 8,
    branch: 1,
    parents: [],
    spouses: [],
  };
  assert.equal(validateMember(parent, members), null);
  members = upsertMemberAndLinks(members, parent);

  const spouse = {
    id: 'case-spouse',
    name: 'Ngô Thị Mai',
    gender: 'female',
    isClanMember: false,
    lineageType: 'direct',
    generation: 8,
    branch: 1,
    parents: [],
    spouses: ['case-parent'],
  };
  assert.equal(validateMember(spouse, members), null);
  members = upsertMemberAndLinks(members, spouse);

  const son = {
    id: 'case-son',
    name: 'Nguyễn Bá Quốc Bảo',
    gender: 'male',
    isClanMember: true,
    lineageType: 'direct',
    generation: 9,
    branch: 1,
    parents: ['case-parent', 'case-spouse'],
    spouses: [],
  };
  assert.equal(validateMember(son, members), null);
  members = upsertMemberAndLinks(members, son);
  assert.equal(assertRenderableTree(members).groupOf.get('case-son'), 'family-case-son');

  members = removeMemberAndLinks(members, 'case-spouse');
  assert.deepEqual(
    members.find((person) => person.id === 'case-son')?.parents,
    ['case-parent'],
  );
});

test('tree renders all seven generations and bà Khang\'s two-wife household', () => {
  const model = assertRenderableTree(seedMembers);
  const root = model.groups.find((group) => group.root);
  const household = model.groups.find((group) => group.id === 'family-P005');

  assert.equal(root?.id, 'family-P001');
  assert.deepEqual(
    model.groups
      .filter((group) => group.generation === 2 && group.kind === 'family')
      .map((group) => group.clanMember.id),
    ['P003', 'P004', 'P005', 'P006'],
  );
  assert.deepEqual(household?.people.map((person) => person.id), ['P005', 'P007', 'P008']);
  assert.equal(household?.wifeRoles.P007, 'Bà cả');
  assert.equal(household?.wifeRoles.P008, 'Bà hai');
  assert.equal(model.groupOf.get('P055'), 'family-P055');
  assert.equal(model.groups.find((group) => group.id === 'family-P048')?.parentageLabel, 'Con của Bà cả');
  assert.equal(model.groups.find((group) => group.id === 'family-P049')?.parentageLabel, 'Con của Bà hai');
  const khangHousehold = model.groups.find((group) => group.id === 'family-P003');
  assert.deepEqual(
    khangHousehold?.people.map((person) => person.id),
    ['P003', 'CONTEXT-P003-HUSBAND', 'CONTEXT-P003-SECOND-WIFE'],
  );
  assert.equal(khangHousehold?.wifeRoles.P003, 'Bà cả');
  assert.equal(khangHousehold?.wifeRoles['CONTEXT-P003-SECOND-WIFE'], 'Bà hai');
  assert.deepEqual(
    model.links
      .filter((link) => link.source === 'family-P003')
      .map((link) => link.childId)
      .sort(),
    ['P012', 'P013', 'P014', 'P015', 'P016', 'P017', 'P018', 'P019'],
  );
  assert.equal(model.visibleMemberIds.size, seedMembers.length);
});

test('tree cards compact households without a recorded spouse', () => {
  const model = assertRenderableTree(seedMembers);
  const withSpouses = model.groups.find((group) => group.id === 'family-P003');
  const withoutSpouse = model.groups.find((group) => group.id === 'family-P004');

  assert.ok(withSpouses);
  assert.ok(withoutSpouse);
  assert.equal(withoutSpouse.spouses.length, 0);
  assert.ok(withoutSpouse.height < withSpouses.height);
});

test('a lunar death day and month are valid when the death year is unknown', () => {
  const founder = member('P001');

  assert.deepEqual(founder.deathDate, { day: 27, month: 11 });
  assert.deepEqual(founder.anniversary, { day: 27, month: 11 });
  assert.equal(memberDeathLabel(founder), '27/11 âm lịch');
  assert.equal(validateMember(founder, seedMembers), null);
});

test('only deceased members with no recorded year show an unknown death year', () => {
  const living = { ...member('P004'), lifeStatus: 'unknown', died: undefined };
  const deceased = {
    ...living,
    id: 'deceased-without-death-year',
    lifeStatus: 'deceased',
  };

  assert.equal(memberDeathLabel(living), 'Nay');
  assert.equal(memberDeathLabel(deceased), 'Chưa rõ năm mất');
});

test('tree positions source siblings by recorded order', () => {
  const model = assertRenderableTree([...seedMembers].reverse());
  const generationTwo = model.groups
    .filter((group) => group.generation === 2 && group.kind === 'family')
    .sort((left, right) => left.x - right.x)
    .map((group) => group.clanMember.id);

  assert.deepEqual(generationTwo, ['P003', 'P004', 'P005', 'P006']);

  const children = model.links
    .filter((link) => link.source === 'family-P005')
    .map((link) => model.groups.find((group) => group.id === link.target))
    .filter(Boolean)
    .sort((left, right) => left.x - right.x)
    .map((group) => group.clanMember.id);
  assert.deepEqual(children, ['P048', 'P049', 'P050', 'P051', 'P052']);
});

test('collapsed groups hide source descendants without hiding the group itself', () => {
  const model = layoutFamily(seedMembers);
  const branchGroup = model.groupOf.get('P005');
  const childGroup = model.groupOf.get('P048');
  const grandchildGroup = model.groupOf.get('P055');
  const hidden = collapsedDescendantGroups(model.links, [branchGroup]);

  assert.equal(hidden.has(branchGroup), false);
  assert.equal(hidden.has(childGroup), true);
  assert.equal(hidden.has(grandchildGroup), true);
  assert.equal(collapsedDescendantGroups(model.links, []).size, 0);
});

test('layout accepts a 511-member genealogy without missing nodes', () => {
  const people = Array.from({ length: 511 }, (_, index) => ({
    id: `s${index}`,
    name: `Person ${index}`,
    gender: 'male',
    generation: Math.floor(Math.log2(index + 1)) + 1,
    branch: 1,
    born: 1700 + Math.floor(Math.log2(index + 1)) * 25,
    parents: index ? [`s${Math.floor((index - 1) / 2)}`] : [],
    spouses: [],
  }));
  const model = layoutFamily(people);
  assert.equal(model.groups.length, 511);
  assert.equal(model.links.length, 510);
  assert.ok(
    model.groups.every((group) => Number.isFinite(group.x) && Number.isFinite(group.y)),
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
  const founder = { ...member('P001'), anniversary: { day: 1, month: 2 } };
  assert.equal(anniversariesOn([founder], new Date(2023, 2, 22)).length, 0);
  const upcoming = upcomingAnniversaries(seedMembers, new Date(2026, 11, 31));
  assert.equal(
    upcoming.length,
    seedMembers.filter((person) => person.anniversary).length,
  );
  assert.ok(upcoming.every((event) => event.date >= new Date(2026, 11, 31)));
  assert.ok(
    upcoming.every(
      (event, index) => index === 0 || event.daysAway >= upcoming[index - 1].daysAway,
    ),
  );
});
