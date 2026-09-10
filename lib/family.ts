export type Member = {
  id: string;
  name: string;
  gender: 'male' | 'female';
  isClanMember: boolean;
  lineageType: 'direct' | 'maternal-terminal';
  generation: number;
  branch: number;
  born: number;
  died?: number;
  parents: string[];
  spouses: string[];
  anniversary?: { day: number; month: number };
  biography?: string;
  hometown?: string;
};
const rows: [
  string,
  string,
  'male' | 'female',
  number,
  number,
  number,
  number | undefined,
  string[],
  string[],
  number?,
  number?,
][] = [
  ['p1', 'Nguyễn Bá Khởi', 'male', 1, 0, 1872, 1948, [], ['p2'], 12, 8],
  ['p2', 'Trần Thị Tâm', 'female', 1, 0, 1876, 1955, [], ['p1'], 18, 9],
  ['p3', 'Nguyễn Bá An', 'male', 2, 1, 1898, 1974, ['p1', 'p2'], ['p4'], 22, 8],
  ['p4', 'Phạm Thị Hiền', 'female', 2, 1, 1903, 1981, [], ['p3'], 5, 10],
  [
    'p5',
    'Nguyễn Bá Bình',
    'male',
    2,
    2,
    1902,
    1980,
    ['p1', 'p2'],
    ['p6'],
    15,
    7,
  ],
  ['p6', 'Lê Thị Huệ', 'female', 2, 2, 1905, 1989, [], ['p5'], 3, 9],
  [
    'p7',
    'Nguyễn Bá Chính',
    'male',
    2,
    3,
    1907,
    1988,
    ['p1', 'p2'],
    ['p8', 'p9'],
    9,
    11,
  ],
  ['p8', 'Đỗ Thị Lan', 'female', 2, 3, 1910, 1941, [], ['p7'], 20, 2],
  ['p9', 'Vũ Thị Liên', 'female', 2, 3, 1915, 1996, [], ['p7'], 7, 12],
  [
    'p10',
    'Nguyễn Bá Đức',
    'male',
    3,
    1,
    1927,
    2004,
    ['p3', 'p4'],
    ['p11'],
    10,
    8,
  ],
  ['p11', 'Hoàng Thị Thu', 'female', 3, 1, 1930, 2015, [], ['p10'], 24, 9],
  [
    'p12',
    'Nguyễn Thị Hạnh',
    'female',
    3,
    1,
    1932,
    undefined,
    ['p3', 'p4'],
    ['p13'],
  ],
  ['p13', 'Trần Văn Phúc', 'male', 3, 1, 1930, 2018, [], ['p12'], 6, 5],
  [
    'p14',
    'Nguyễn Bá Dũng',
    'male',
    3,
    2,
    1930,
    2010,
    ['p5', 'p6'],
    ['p15'],
    16,
    8,
  ],
  ['p15', 'Bùi Thị Mai', 'female', 3, 2, 1935, undefined, [], ['p14']],
  [
    'p16',
    'Nguyễn Bá Cường',
    'male',
    3,
    3,
    1936,
    2019,
    ['p7', 'p8'],
    ['p17'],
    27,
    7,
  ],
  ['p17', 'Ngô Thị Vân', 'female', 3, 3, 1940, undefined, [], ['p16']],
  [
    'p18',
    'Nguyễn Thị Thanh',
    'female',
    3,
    3,
    1948,
    undefined,
    ['p7', 'p9'],
    ['p39'],
  ],
  [
    'p19',
    'Nguyễn Bá Hùng',
    'male',
    4,
    1,
    1955,
    undefined,
    ['p10', 'p11'],
    ['p20'],
  ],
  ['p20', 'Lê Thị Hoa', 'female', 4, 1, 1958, undefined, [], ['p19']],
  [
    'p21',
    'Nguyễn Bá Minh',
    'male',
    4,
    1,
    1960,
    undefined,
    ['p10', 'p11'],
    ['p22'],
  ],
  ['p22', 'Phạm Thị Ngọc', 'female', 4, 1, 1964, undefined, [], ['p21']],
  ['p23', 'Trần Thu Hà', 'female', 4, 1, 1960, undefined, ['p12', 'p13'], []],
  [
    'p24',
    'Nguyễn Bá Hải',
    'male',
    4,
    2,
    1961,
    undefined,
    ['p14', 'p15'],
    ['p25'],
  ],
  ['p25', 'Võ Thị Hương', 'female', 4, 2, 1965, undefined, [], ['p24']],
  [
    'p26',
    'Nguyễn Thị Thảo',
    'female',
    4,
    2,
    1967,
    undefined,
    ['p14', 'p15'],
    [],
  ],
  [
    'p27',
    'Nguyễn Bá Quang',
    'male',
    4,
    3,
    1964,
    undefined,
    ['p16', 'p17'],
    ['p28'],
  ],
  ['p28', 'Đặng Thị Duyên', 'female', 4, 3, 1968, undefined, [], ['p27']],
  [
    'p29',
    'Nguyễn Bá Tuấn',
    'male',
    4,
    3,
    1973,
    undefined,
    ['p18', 'p39'],
    [],
  ],
  [
    'p30',
    'Nguyễn Bá Hoàng',
    'male',
    5,
    1,
    1985,
    undefined,
    ['p19', 'p20'],
    ['p31'],
  ],
  ['p31', 'Trần Khánh Linh', 'female', 5, 1, 1988, undefined, [], ['p30']],
  [
    'p32',
    'Nguyễn Thị Anh Thư',
    'female',
    5,
    1,
    1990,
    undefined,
    ['p19', 'p20'],
    [],
  ],
  ['p33', 'Nguyễn Bá Thành', 'male', 5, 1, 1992, undefined, ['p21', 'p22'], []],
  [
    'p34',
    'Nguyễn Bá Nhật Minh',
    'male',
    5,
    2,
    1990,
    undefined,
    ['p24', 'p25'],
    [],
  ],
  [
    'p35',
    'Nguyễn Thị Phương Anh',
    'female',
    5,
    2,
    1994,
    undefined,
    ['p24', 'p25'],
    [],
  ],
  [
    'p36',
    'Nguyễn Bá Gia Bảo',
    'male',
    5,
    3,
    1995,
    undefined,
    ['p27', 'p28'],
    [],
  ],
  [
    'p37',
    'Nguyễn Thị Bảo Ngọc',
    'female',
    5,
    3,
    1999,
    undefined,
    ['p27', 'p28'],
    [],
  ],
  ['p39', 'Trần Văn Thành', 'male', 3, 3, 1943, undefined, [], ['p18']],
];
const clanMemberIds = new Set([
  'p1',
  'p3',
  'p5',
  'p7',
  'p10',
  'p12',
  'p14',
  'p16',
  'p18',
  'p19',
  'p21',
  'p24',
  'p26',
  'p27',
  'p30',
  'p32',
  'p33',
  'p34',
  'p35',
  'p36',
  'p37',
]);
const maternalTerminalIds = new Set([
  'p12',
  'p18',
  'p26',
  'p32',
  'p35',
  'p37',
]);
export const seedMembers: Member[] = rows.map(
  ([
    id,
    name,
    gender,
    generation,
    branch,
    born,
    died,
    parents,
    spouses,
    day,
    month,
  ]) => ({
    id,
    name,
    gender,
    isClanMember: clanMemberIds.has(id),
    lineageType: maternalTerminalIds.has(id)
      ? 'maternal-terminal'
      : 'direct',
    generation,
    branch,
    born,
    died,
    parents,
    spouses,
    anniversary: day && month ? { day, month } : undefined,
    hometown: 'Thôn Quảng Trường, xã Quảng Chính, tỉnh Thanh Hóa',
    biography:
      id === 'p1'
        ? 'Cụ Nguyễn Bá Khởi là vị khởi tổ được ghi nhận trong bản gia phả minh họa. Cụ cùng phu nhân Trần Thị Tâm có ba người con, hình thành ba chi của dòng họ. Các thông tin này là dữ liệu mẫu, cần được đối chiếu với gia phả gốc trước khi sử dụng.'
        : undefined,
  }),
);
export const branchName = (branch: number) =>
  branch ? `Chi ${['', 'trưởng', 'hai', 'ba'][branch] || branch}` : 'Thủy tổ';
export const initials = (name: string) =>
  name
    .split(' ')
    .slice(-2)
    .map((x) => x[0])
    .join('');
export const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
export function searchMembers(members: Member[], query: string) {
  const tokens = normalize(query).trim().split(/\s+/).filter(Boolean);
  return members.filter((p) =>
    tokens.every((t) => normalize(p.name).includes(t)),
  );
}
export function relatives(members: Member[], person: Member) {
  return {
    parents: members.filter((p) => person.parents.includes(p.id)),
    spouses: members.filter((p) => person.spouses.includes(p.id)),
    children: members.filter((p) => p.parents.includes(person.id)),
    siblings: members.filter(
      (p) =>
        p.id !== person.id &&
        p.parents.some((id) => person.parents.includes(id)),
    ),
  };
}

export function removeMemberAndLinks(members: Member[], memberId: string) {
  return members
    .filter((member) => member.id !== memberId)
    .map((member) => ({
      ...member,
      parents: member.parents.filter((id) => id !== memberId),
      spouses: member.spouses.filter((id) => id !== memberId),
    }));
}

function sameIds(left: string[], right: string[]) {
  return left.length === right.length && left.every((id) => right.includes(id));
}

function linkedSpouseIds(person: Member, members: Member[]) {
  return [
    ...new Set([
      ...person.spouses,
      ...members
        .filter((member) => member.spouses.includes(person.id))
        .map((member) => member.id),
    ]),
  ];
}

export function memberDeletionError(person: Member, members: Member[]) {
  const children = members.filter((member) => member.parents.includes(person.id));
  const spouses = linkedSpouseIds(person, members);

  if (person.generation === 1 && person.isClanMember && person.gender === 'male') {
    return 'Không thể xóa hồ sơ Thủy tổ. Gia phả cần giữ lại người khởi nguồn.';
  }
  if (children.length) {
    return `Không thể xóa vì hồ sơ này đang là cha/mẹ của ${children.length} người. Hãy điều chỉnh các quan hệ con trước.`;
  }
  if (spouses.length) {
    return 'Không thể xóa khi vẫn còn quan hệ vợ/chồng. Hãy gỡ quan hệ này trong hồ sơ trước.';
  }
  return null;
}

export function memberPositionLockMessage(person: Member, members: Member[]) {
  const children = members.filter((member) => member.parents.includes(person.id));

  if (person.generation === 1 && person.isClanMember && person.gender === 'male') {
    return 'Hồ sơ Thủy tổ giữ cố định vị trí khởi nguồn của gia phả.';
  }
  if (children.length) {
    return 'Hồ sơ đã có con nên không thể đổi giới tính, vai trò, đời, chi hoặc cha mẹ.';
  }
  if (linkedSpouseIds(person, members).length) {
    return 'Hồ sơ đang có quan hệ vợ/chồng nên không thể đổi vị trí trong cây. Hãy gỡ quan hệ trước nếu cần điều chỉnh.';
  }
  return null;
}

export function memberChangeError(person: Member, members: Member[]) {
  const current = members.find((member) => member.id === person.id);
  if (!current) return null;

  const positionChanged =
    current.gender !== person.gender ||
    current.isClanMember !== person.isClanMember ||
    current.lineageType !== person.lineageType ||
    current.generation !== person.generation ||
    current.branch !== person.branch ||
    !sameIds(current.parents, person.parents);
  const positionLock = memberPositionLockMessage(current, members);

  if (positionChanged && positionLock) return positionLock;
  if (
    !sameIds(current.spouses, person.spouses) &&
    members.some((member) => member.parents.includes(person.id))
  ) {
    return 'Không thể thay đổi quan hệ vợ/chồng của người đã có con. Hãy điều chỉnh quan hệ cha mẹ của các con trước.';
  }
  return null;
}

export function upsertMemberAndLinks(members: Member[], person: Member) {
  const spouses = [...new Set(person.spouses)];
  return [
    ...members
      .filter((member) => member.id !== person.id)
      .map((member) => ({
        ...member,
        spouses: spouses.includes(member.id)
          ? [...new Set([...member.spouses, person.id])]
          : member.spouses.filter((id) => id !== person.id),
      })),
    { ...person, parents: [...new Set(person.parents)], spouses },
  ];
}

function isDescendantOf(
  members: Member[],
  ancestorId: string,
  personId: string,
) {
  const pending = [ancestorId];
  const visited = new Set<string>();

  while (pending.length) {
    const current = pending.pop()!;
    if (current === personId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const member of members) {
      if (member.parents.includes(current)) pending.push(member.id);
    }
  }

  return false;
}

export function eligibleParents(
  person: Member,
  members: Member[],
  parentIndex: number,
) {
  if (person.generation <= 1 || !person.born) return [];
  const selectedInSlot = person.parents[parentIndex];

  return members.filter(
    (candidate) =>
      candidate.id !== person.id &&
      (!person.parents.includes(candidate.id) || candidate.id === selectedInSlot) &&
      !person.spouses.includes(candidate.id) &&
      candidate.generation === person.generation - 1 &&
      (candidate.branch === 0 ||
        person.branch === 0 ||
        candidate.branch === person.branch) &&
      candidate.born < person.born &&
      !isDescendantOf(members, person.id, candidate.id),
  );
}

export function eligibleSpouses(person: Member, members: Member[]) {
  return members.filter(
    (candidate) =>
      candidate.id !== person.id &&
      !person.spouses.includes(candidate.id) &&
      !person.parents.includes(candidate.id) &&
      candidate.generation === person.generation &&
      candidate.branch === person.branch &&
      !candidate.parents.some((id) => person.parents.includes(id)) &&
      !candidate.spouses.some((id) =>
        members.some(
          (sibling) =>
            sibling.id === id &&
            sibling.parents.some((parentId) => person.parents.includes(parentId)),
        ),
      ) &&
      !isDescendantOf(members, person.id, candidate.id) &&
      !isDescendantOf(members, candidate.id, person.id),
  );
}

export function eligibleGenerations(person: Member, members: Member[]) {
  const parentGenerations = person.parents
    .map((id) => members.find((member) => member.id === id)?.generation)
    .filter((generation): generation is number => Number.isInteger(generation));
  const minimum = parentGenerations.length
    ? Math.max(...parentGenerations) + 1
    : 1;

  return Array.from(
    { length: Math.max(0, 50 - minimum + 1) },
    (_, index) => minimum + index,
  );
}

export function eligibleBranches(person: Member, members: Member[]) {
  if (person.generation < 1) return [];
  if (person.generation === 1) return [0];

  const parentBranches = new Set(
    person.parents
      .map((id) => members.find((member) => member.id === id)?.branch)
      .filter(
        (branch): branch is number =>
          typeof branch === 'number' && Number.isInteger(branch) && branch > 0,
      ),
  );
  return parentBranches.size === 1 ? [...parentBranches] : [1, 2, 3];
}

export function eligibleBirthYears(person: Member, members: Member[]) {
  const parentYears = person.parents
    .map((id) => members.find((member) => member.id === id)?.born)
    .filter((born): born is number => Number.isInteger(born));
  const childYears = members
    .filter((member) => member.parents.includes(person.id))
    .map((member) => member.born);

  return {
    min: Math.max(1600, ...(parentYears.length ? parentYears.map((born) => born + 1) : [1600])),
    max: Math.min(
      new Date().getFullYear(),
      ...(childYears.length ? childYears.map((born) => born - 1) : [new Date().getFullYear()]),
    ),
  };
}

export function validateMember(
  person: Member,
  members: Member[],
): string | null {
  if (person.gender !== 'male' && person.gender !== 'female') {
    return 'Vui lòng chọn giới tính.';
  }
  if (
    !Number.isInteger(person.generation) ||
    person.generation < 1 ||
    person.generation > 50 ||
    !Number.isInteger(person.branch) ||
    person.branch < 0 ||
    person.branch > 3
  )
    return 'Vui lòng chọn đời và chi.';
  if (!person.name.trim()) return 'Vui lòng nhập họ và tên.';
  if (person.isClanMember && person.gender === 'female' && person.lineageType !== 'maternal-terminal') {
    return 'Con gái trong dòng họ được ghi là nhánh ngoại.';
  }
  if (person.isClanMember && person.gender === 'male' && person.lineageType !== 'direct') {
    return 'Con trai trong dòng họ được ghi là nhánh chính.';
  }
  if (!eligibleBranches(person, members).includes(person.branch)) {
    return person.generation === 1
      ? 'Đời thứ nhất cần thuộc nhánh Thủy tổ.'
      : 'Chi cần khớp với đời và cha mẹ đã chọn.';
  }
  if (
    !Number.isInteger(person.born) ||
    person.born < 1600 ||
    person.born > new Date().getFullYear()
  )
    return 'Năm sinh chưa hợp lệ.';
  if (
    person.died &&
    (person.died < person.born || person.died > new Date().getFullYear())
  )
    return 'Năm mất chưa hợp lệ.';
  if (person.parents.includes(person.id) || person.spouses.includes(person.id))
    return 'Không thể tạo quan hệ với chính mình.';
  if (
    person.parents.length > 2 ||
    new Set(person.parents).size !== person.parents.length
  )
    return 'Vui lòng chọn tối đa hai cha mẹ khác nhau.';
  if (person.parents.some((id) => person.spouses.includes(id)))
    return 'Cha mẹ không thể đồng thời là vợ hoặc chồng.';
  const lookup = new Map(
    [...members.filter((p) => p.id !== person.id), person].map((p) => [
      p.id,
      p,
    ]),
  );
  const visit = (id: string, chain: Set<string>): boolean => {
    if (chain.has(id)) return true;
    const next = new Set(chain).add(id);
    return (lookup.get(id)?.parents || []).some((p) => visit(p, next));
  };
  if (visit(person.id, new Set()))
    return 'Quan hệ này tạo vòng lặp trong cây gia phả.';
  if ([...person.parents, ...person.spouses].some((id) => !lookup.has(id)))
    return 'Không tìm thấy người thân được chọn.';
  if (
    person.parents.some(
      (id, index) =>
        !eligibleParents(person, members, index).some(
          (candidate) => candidate.id === id,
        ),
    )
  )
    return 'Cha mẹ cần ở đời liền trước và thuộc đúng chi.';
  if (person.parents.some((id) => lookup.get(id)!.born >= person.born))
    return 'Năm sinh của con phải sau năm sinh của cha mẹ.';
  if (
    person.parents.some((id) => lookup.get(id)!.generation >= person.generation)
  )
    return 'Đời của con phải sau đời của cha mẹ.';
  if (
    person.spouses.some(
      (id) => lookup.get(id)!.generation !== person.generation,
    )
  )
    return 'Vợ chồng cần được ghi nhận cùng đời.';
  if (
    members.some(
      (p) =>
        p.parents.includes(person.id) &&
        (p.born <= person.born || p.generation <= person.generation),
    )
  )
    return 'Năm sinh hoặc đời không phù hợp với hồ sơ con đã có.';
  const birthYears = eligibleBirthYears(person, members);
  if (person.born < birthYears.min || person.born > birthYears.max)
    return 'Năm sinh cần phù hợp với cha mẹ và con đã ghi nhận.';
  if (person.spouses.some((id) => lookup.get(id)!.parents.includes(person.id)))
    return 'Không thể tạo quan hệ vợ chồng với con.';
  if (person.spouses.some((id) => lookup.get(id)!.branch !== person.branch))
    return 'Vợ chồng cần được ghi nhận trong cùng chi.';
  if (
    person.anniversary &&
    (!person.died ||
      person.anniversary.day < 1 ||
      person.anniversary.day > 30 ||
      person.anniversary.month < 1 ||
      person.anniversary.month > 12)
  )
    return 'Ngày giỗ âm lịch chưa hợp lệ.';
  return null;
}
