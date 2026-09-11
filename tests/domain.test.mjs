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
  memberBranchName,
  memberDeathLabel,
  memberLifeStatus,
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

test('seed stores the supplied five-generation genealogy', () => {
  assert.equal(seedMembers.length, 64);

  const founder = member('p1');
  const founderSpouse = member('p2');
  assert.equal(founder.name, 'Nguyễn Bá Linh');
  assert.equal(memberName(founder), 'Ông Tổ: Nguyễn Bá Linh');
  assert.equal(founder.tabooName, 'Sóc');
  assert.equal(founder.styleName, 'Thần Hy Phủ Quân');
  assert.deepEqual(founder.anniversary, { day: 27, month: 11 });
  assert.equal(founderSpouse.nameKnown, false);
  assert.equal(memberName(founderSpouse), 'Bà Tổ: Chưa biết tên');
  assert.equal(memberName(member('g2-khang')), 'Bà: Nguyễn Thị Khang');
  assert.equal(memberName(member('g2-an')), 'Ông: Nguyễn Bá Ân');
  assert.equal(memberBranchName(member('g2-khang'), seedMembers), 'Nhánh ngoại');
  assert.equal(memberBranchName(member('g2-an'), seedMembers), 'Chi trưởng');
  assert.equal(memberBranchName(member('g2-tang'), seedMembers), 'Chi hai');
  assert.equal(memberBranchName(member('g3-xum'), seedMembers), 'Nhánh ngoại');
  assert.equal(memberBranchName(member('g4-con'), seedMembers), 'Nhánh ngoại');
  assert.equal(founderSpouse.styleName, 'Tư Hòa');
  assert.deepEqual(founderSpouse.anniversary, { day: 17, month: 4 });

  assert.deepEqual(
    relatives(seedMembers, founder).children.map((person) => person.id),
    ['g2-khang', 'g2-bang', 'g2-an', 'g2-tang'],
  );
  assert.deepEqual(
    ['g2-khang', 'g2-bang', 'g2-an', 'g2-tang'].map(
      (id) => member(id).siblingOrder,
    ),
    [1, 2, 3, 4],
  );
  assert.deepEqual(
    [
      'g3-xum',
      'g3-liem',
      'g3-cham',
      'g3-ton',
      'g3-gian',
      'g3-sanh',
      'g3-giang',
      'g3-ut',
    ].map((id) => member(id).siblingOrder),
    [1, 2, 3, 4, 5, 6, 7, 8],
  );
  assert.equal(member('g2-tang').branch, 2);
  assert.deepEqual(
    relatives(seedMembers, member('g2-khang')).children.map((person) => person.id),
    ['g3-xum', 'g3-liem', 'g3-cham', 'g3-ton', 'g3-gian'],
  );
  assert.equal(member('g4-thap').biography, 'Nghề nghiệp: Giáo viên.');
  assert.deepEqual(member('g5-thong').parents, ['g4-con']);
  assert.deepEqual(member('g3-sanh').spouses, [
    'g3-sanh-vo-1',
    'g3-sanh-vo-2',
    'g3-sanh-vo-3',
  ]);
  assert.equal(memberName(member('g3-xum-vo')), 'Bà: Chưa biết tên');
  assert.deepEqual(member('g2-bang').spouses, []);
  assert.deepEqual(member('g5-xung').spouses, []);
  assert.ok(
    seedMembers.every((person) => memberLifeStatus(person) === 'deceased'),
    'all supplied historical records are marked as deceased',
  );
});

test('Vietnamese search includes supplied names and honorific data', () => {
  assert.deepEqual(
    searchMembers(seedMembers, 'nguyen linh').map((person) => person.id),
    ['p1'],
  );
  assert.deepEqual(
    searchMembers(seedMembers, 'than hy').map((person) => person.id),
    ['p1'],
  );
  assert.deepEqual(
    searchMembers(seedMembers, 'nguyen van sanh').map((person) => person.id),
    ['g3-sanh'],
  );
  assert.equal(searchMembers(seedMembers, 'khongtontai').length, 0);
});

test('seed genealogy is valid and spouse links are symmetric', () => {
  for (const person of seedMembers) {
    assert.equal(validateMember(person, seedMembers), null, person.name);
    if (seedMembers.some((candidate) => candidate.parents.includes(person.id))) {
      assert.ok(person.spouses.length, `${person.id} needs a recorded partner`);
    }
    for (const spouseId of person.spouses) {
      assert.ok(member(spouseId).spouses.includes(person.id));
    }
  }
});

test('incomplete historical records retain unknown names and flexible death dates', () => {
  const unknownMember = {
    ...member('p2'),
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
  assert.equal(memberName(unknownMember), 'Bà Tổ: Chưa biết tên');
  assert.equal(memberDeathLabel(unknownMember), 'Mất vào tháng Chạp, chưa rõ năm');
  assert.equal(memberYearRange(unknownMember), 'Chưa rõ – Mất vào tháng Chạp, chưa rõ năm');
  assert.equal(searchMembers([unknownMember], 'tĩnh trai').length, 1);
  assert.equal(
    validateMember({ ...unknownMember, lifeStatus: 'unknown' }, seedMembers),
    'Hồ sơ có thông tin mất cần được ghi là Đã mất.',
  );
});

test('removing a member clears every recorded relationship', () => {
  const nextMembers = removeMemberAndLinks(seedMembers, 'g2-khang');

  assert.equal(nextMembers.some((person) => person.id === 'g2-khang'), false);
  assert.deepEqual(
    nextMembers.find((person) => person.id === 'g2-khang-chong')?.spouses,
    ['g2-ba-ke'],
  );
  assert.deepEqual(
    nextMembers.find((person) => person.id === 'g3-xum')?.parents,
    ['g2-khang-chong'],
  );
  const model = assertRenderableTree(nextMembers);
  assert.equal(model.groupOf.get('g3-xum'), 'family-g3-xum');
  assert.equal(
    model.links.some((link) => link.source === 'family-g2-khang'),
    false,
  );
});

test('validation protects branch positions and kinship constraints', () => {
  const founder = member('p1');
  assert.equal(
    validateMember({ ...founder, gender: '' }, seedMembers),
    'Vui lòng chọn giới tính.',
  );
  assert.equal(
    validateMember({ ...founder, generation: 0 }, seedMembers),
    'Vui lòng chọn đời và chi.',
  );
  assert.ok(validateMember({ ...founder, parents: ['g5-thong'] }, seedMembers));
  assert.ok(validateMember({ ...founder, parents: [founder.id] }, seedMembers));
  assert.equal(
    validateMember({ ...member('g2-khang'), lineageType: 'direct' }, seedMembers),
    'Con gái trong dòng họ được ghi là nhánh ngoại.',
  );
  assert.equal(validateMember(member('g2-tang'), seedMembers), null);
});

test('member editor only offers parent and branch choices that fit the tree', () => {
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
    ['p1', 'p2'],
  );
  assert.deepEqual(
    eligibleParents(
      { ...secondGenerationChild, parents: ['p1'] },
      seedMembers,
      1,
    ).map((person) => person.id),
    ['p2'],
  );
  assert.ok(eligibleBranches(secondGenerationChild, seedMembers).includes(4));

  const khangChild = {
    ...secondGenerationChild,
    generation: 3,
    parents: ['g2-khang', 'g2-khang-chong'],
  };
  assert.deepEqual(eligibleBranches(khangChild, seedMembers), [1]);
  assert.equal(validateMember(khangChild, seedMembers), null);
  assert.equal(
    validateMember({ ...khangChild, branch: 2 }, seedMembers),
    'Chi cần khớp với đời và cha mẹ đã chọn.',
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
    eligibleSpouses(member('g3-xum'), [...seedMembers, eligiblePartner]).some(
      (person) => person.id === eligiblePartner.id,
    ),
    true,
  );
});

test('destructive member operations preserve the recorded genealogy', () => {
  assert.match(memberDeletionError(member('p1'), seedMembers), /Thủy tổ/);
  assert.match(memberDeletionError(member('g3-xum'), seedMembers), /cha\/mẹ của 3 người/);
  assert.match(memberDeletionError(member('g2-khang-chong'), seedMembers), /cha\/mẹ của 8 người/);
  assert.equal(memberDeletionError(member('g2-bang'), seedMembers), null);
  assert.match(
    memberChangeError({ ...member('g3-xum'), branch: 2 }, seedMembers),
    /đã có con/,
  );
  assert.match(
    memberChangeError({ ...member('g2-khang-chong'), generation: 3 }, seedMembers),
    /đã có con/,
  );
  assert.equal(
    memberChangeError({ ...member('g2-bang'), hometown: 'Hà Nội' }, seedMembers),
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
    generation: 6,
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
    generation: 6,
    branch: 1,
    parents: [],
    spouses: ['case-parent'],
  };
  assert.equal(validateMember(spouse, members), null);
  members = upsertMemberAndLinks(members, spouse);
  let model = assertRenderableTree(members);
  assert.deepEqual(
    model.groups.find((group) => group.id === 'family-case-parent')?.people.map((person) => person.id),
    ['case-parent', 'case-spouse'],
  );

  const son = {
    id: 'case-son',
    name: 'Nguyễn Bá Quốc Bảo',
    gender: 'male',
    isClanMember: true,
    lineageType: 'direct',
    generation: 7,
    branch: 1,
    parents: ['case-parent', 'case-spouse'],
    spouses: [],
  };
  assert.equal(validateMember(son, members), null);
  members = upsertMemberAndLinks(members, son);
  model = assertRenderableTree(members);
  assert.equal(model.groupOf.get('case-son'), 'family-case-son');
  assert.equal(
    model.links.some(
      (link) => link.source === 'family-case-parent' && link.target === 'family-case-son',
    ),
    true,
  );

  const editedSon = { ...son, name: 'Nguyễn Bá Quốc Khánh' };
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
    model.groups.find((group) => group.id === 'family-case-parent')?.people.map((person) => person.id),
    ['case-parent'],
  );
  assert.deepEqual(
    members.find((person) => person.id === 'case-son')?.parents,
    ['case-parent'],
  );
});

test('tree preserves the full Bà Khang branch and compact empty maternal branches', () => {
  const model = assertRenderableTree(seedMembers);
  const root = model.groups.find((group) => group.root);
  const khangHousehold = model.groups.find((group) => group.id === 'family-g2-khang');

  assert.equal(root?.id, 'family-p1');
  assert.deepEqual(
    model.groups
      .filter((group) => group.generation === 2 && group.kind === 'family')
      .map((group) => group.clanMember.id),
    ['g2-khang', 'g2-bang', 'g2-an', 'g2-tang'],
  );
  assert.deepEqual(
    khangHousehold?.people.map((person) => person.id),
    ['g2-khang', 'g2-khang-chong', 'g2-ba-ke'],
  );
  assert.equal(khangHousehold?.lineageType, 'maternal-terminal');
  assert.equal(model.groupOf.get('g3-xum'), 'family-g3-xum');
  assert.equal(model.groupOf.get('g4-nghiem'), 'family-g4-nghiem');
  assert.equal(model.groupOf.get('g5-thong'), 'family-g5-thong');
  assert.equal(
    model.groups.find((group) => group.id === 'family-g4-con')?.parentageLabel,
    'Con của Bà: Nguyễn Thị Giàng',
  );
  assert.equal(
    model.groups.find((group) => group.id === 'terminal-g4-thap')?.parentageLabel,
    'Con của Bà: Nguyễn Thị Út',
  );
  assert.equal(model.visibleMemberIds.size, seedMembers.length);
  assert.equal(
    model.links.some(
      (link) => link.source === 'family-g2-khang' && link.target === 'family-g3-xum',
    ),
    true,
  );
});

test('tree positions siblings by recorded order instead of branch label', () => {
  const model = assertRenderableTree([...seedMembers].reverse());
  const generationTwo = model.groups
    .filter((group) => group.generation === 2 && group.kind === 'family')
    .sort((left, right) => left.x - right.x)
    .map((group) => group.clanMember.id);

  assert.deepEqual(generationTwo, ['g2-khang', 'g2-bang', 'g2-an', 'g2-tang']);

  const khangChildren = model.links
    .filter((link) => link.source === 'family-g2-khang')
    .map((link) => model.groups.find((group) => group.id === link.target))
    .filter(Boolean)
    .sort((left, right) => left.x - right.x)
    .map((group) => group.clanMember.id);
  assert.deepEqual(khangChildren, [
    'g3-xum',
    'g3-liem',
    'g3-cham',
    'g3-ton',
    'g3-gian',
    'g3-sanh',
    'g3-giang',
    'g3-ut',
  ]);
});

test('tree distinguishes wives and children in recorded multi-wife households', () => {
  const model = assertRenderableTree(seedMembers);
  const khangHousehold = model.groups.find((group) => group.id === 'family-g2-khang');

  assert.equal(khangHousehold?.wifeRoles['g2-khang'], 'Bà cả');
  assert.equal(khangHousehold?.wifeRoles['g2-ba-ke'], 'Bà hai');
  assert.equal(
    model.groups.find((group) => group.id === 'family-g3-xum')?.parentageLabel,
    'Con của Bà cả',
  );
  assert.equal(
    model.groups.find((group) => group.id === 'family-g3-sanh')?.parentageLabel,
    'Con của Bà hai',
  );
  assert.equal(
    model.groups.find((group) => group.id === 'family-g4-nguyen')?.parentageLabel,
    'Chưa ghi nhận mẹ',
  );
});

test('collapsed tree groups hide every descendant and never the collapsed group', () => {
  const model = layoutFamily(seedMembers);
  const rootGroup = model.groupOf.get('p1');
  const childGroup = model.groupOf.get('g2-khang');
  const grandchildGroup = model.groupOf.get('g3-xum');
  const hidden = collapsedDescendantGroups(model.links, [rootGroup]);

  assert.equal(hidden.has(rootGroup), false);
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
  const founder = { ...seedMembers[0], anniversary: { day: 1, month: 2 } };
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
