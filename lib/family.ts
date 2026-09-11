export type Member = {
  id: string;
  name: string;
  nameKnown?: boolean;
  tabooName?: string;
  styleName?: string;
  gender: 'male' | 'female';
  isClanMember: boolean;
  lineageType: 'direct' | 'maternal-terminal';
  generation: number;
  branch: number;
  born?: number;
  died?: number;
  diedText?: string;
  lifeStatus?: 'living' | 'deceased' | 'unknown';
  parents: string[];
  spouses: string[];
  anniversary?: { day: number; month: number };
  biography?: string;
  hometown?: string;
};

export const UNKNOWN_MEMBER_NAME = 'Chưa biết tên';

export function memberName(person: Member) {
  const name = person.nameKnown === false || !person.name.trim()
    ? UNKNOWN_MEMBER_NAME
    : person.name;

  const honorific =
    person.generation === 1 && person.parents.length === 0
      ? person.gender === 'male'
        ? 'Ông Tổ:'
        : 'Bà Tổ:'
      : person.gender === 'male'
        ? 'Ông:'
        : 'Bà:';

  return `${honorific} ${name}`;
}

export function memberLifeStatus(person: Member) {
  if (person.lifeStatus) return person.lifeStatus;
  return person.died !== undefined || !!person.diedText || !!person.anniversary
    ? 'deceased'
    : 'living';
}

export function memberDeathLabel(person: Member) {
  if (person.died !== undefined) return String(person.died);
  if (person.diedText) return person.diedText;
  return memberLifeStatus(person) === 'living' ? 'nay' : 'Chưa rõ';
}

export function memberYearRange(person: Member) {
  const birth = person.born === undefined ? 'Chưa rõ' : String(person.born);
  const death = memberDeathLabel(person);
  return birth === 'Chưa rõ' && death === 'Chưa rõ'
    ? 'Chưa rõ niên đại'
    : `${birth} – ${death}`;
}

export function memberBirthLabel(person: Member) {
  return person.born === undefined ? 'Chưa rõ' : String(person.born);
}

export function memberSortYear(person: Member) {
  return person.born ?? Number.MAX_SAFE_INTEGER;
}
type SeedDetails = Partial<
  Omit<
    Member,
    | 'id'
    | 'name'
    | 'gender'
    | 'generation'
    | 'branch'
    | 'isClanMember'
    | 'lineageType'
    | 'parents'
    | 'spouses'
  >
> & {
  isClanMember?: boolean;
  lineageType?: Member['lineageType'];
  parents?: string[];
  spouses?: string[];
};

function seedMember(
  id: string,
  name: string,
  gender: Member['gender'],
  generation: number,
  branch: number,
  details: SeedDetails = {},
): Member {
  const isClanMember = details.isClanMember ?? true;
  return {
    id,
    name: details.nameKnown === false ? UNKNOWN_MEMBER_NAME : name,
    nameKnown: details.nameKnown,
    tabooName: details.tabooName,
    styleName: details.styleName,
    gender,
    isClanMember,
    lineageType:
      details.lineageType ??
      (isClanMember && gender === 'female' ? 'maternal-terminal' : 'direct'),
    generation,
    branch,
    born: details.born,
    died: details.died,
    diedText: details.diedText,
    // All supplied genealogy records are historical. Missing dates remain unknown,
    // but their status is still recorded as deceased.
    lifeStatus: details.lifeStatus ?? 'deceased',
    parents: details.parents ?? [],
    spouses: details.spouses ?? [],
    anniversary: details.anniversary,
    biography: details.biography,
    hometown: details.hometown,
  };
}

export const seedMembers: Member[] = [
  seedMember('p1', 'Nguyễn Bá Linh', 'male', 1, 0, {
    tabooName: 'Sóc',
    styleName: 'Thần Hy Phủ Quân',
    lifeStatus: 'deceased',
    spouses: ['p2'],
    anniversary: { day: 27, month: 11 },
    biography:
      'Ông Tổ Nguyễn Bá Linh là khởi nguồn của dòng họ. Ông cùng Bà Tổ sinh hạ bốn người con, gồm hai con trai và hai con gái.',
  }),
  seedMember('p2', UNKNOWN_MEMBER_NAME, 'female', 1, 0, {
    nameKnown: false,
    isClanMember: false,
    styleName: 'Tư Hòa',
    lifeStatus: 'deceased',
    spouses: ['p1'],
    anniversary: { day: 17, month: 4 },
    biography:
      'Bà Tổ là phu nhân của Ông Tổ Nguyễn Bá Linh, cùng gây dựng khởi nguồn dòng họ.',
  }),

  seedMember('g2-khang', 'Nguyễn Thị Khang', 'female', 2, 1, {
    parents: ['p1', 'p2'],
    spouses: ['g2-khang-chong'],
    lifeStatus: 'deceased',
    anniversary: { day: 29, month: 6 },
    biography:
      'Tên gọi khác: Mền. Bà lấy chồng; gia đình có hai bà. Bà Cả sinh năm người con trai, Bà Kế sinh ba người con gồm một trai và hai gái.',
  }),
  seedMember('g2-bang', 'Nguyễn Thị Bang', 'female', 2, 2, {
    parents: ['p1', 'p2'],
    biography:
      'Tên gọi khác: Hàn Song. Chưa rõ ngày húy kỵ, chồng, con và hậu duệ; nhánh này sẽ được bổ sung khi có thêm tư liệu.',
  }),
  seedMember('g2-an', 'Nguyễn Bá Ân', 'male', 2, 1, {
    parents: ['p1', 'p2'],
    lifeStatus: 'deceased',
    anniversary: { day: 13, month: 2 },
    biography:
      'Ngày húy kỵ: 13 tháng 2 âm lịch. Chưa có tư liệu đầy đủ về vợ, con và hậu duệ.',
  }),
  seedMember('g2-tang', 'Nguyễn Bá Tăng', 'male', 2, 2, {
    parents: ['p1', 'p2'],
    lifeStatus: 'deceased',
    anniversary: { day: 3, month: 2 },
    biography:
      'Ngày húy kỵ: 03 tháng 2 âm lịch. Chưa có thông tin chi tiết về gia đình và hậu duệ.',
  }),
  seedMember('g2-khang-chong', UNKNOWN_MEMBER_NAME, 'male', 2, 1, {
    nameKnown: false,
    isClanMember: false,
    spouses: ['g2-khang', 'g2-ba-ke'],
    biography:
      'Chồng của Bà Nguyễn Thị Khang. Gia đình ghi nhận Bà Cả và Bà Kế.',
  }),
  seedMember('g2-ba-ke', UNKNOWN_MEMBER_NAME, 'female', 2, 1, {
    nameKnown: false,
    isClanMember: false,
    spouses: ['g2-khang-chong'],
    biography:
      'Bà Kế trong gia đình của chồng Bà Nguyễn Thị Khang; chưa biết tên.',
  }),

  seedMember('g3-xum', 'Nguyễn Văn Xum', 'male', 3, 1, {
    parents: ['g2-khang', 'g2-khang-chong'],
    spouses: ['g3-xum-vo'],
  }),
  seedMember('g3-liem', 'Nguyễn Văn Liêm', 'male', 3, 1, {
    parents: ['g2-khang', 'g2-khang-chong'],
    spouses: ['g3-liem-vo'],
  }),
  seedMember('g3-cham', 'Nguyễn Văn Châm', 'male', 3, 1, {
    parents: ['g2-khang', 'g2-khang-chong'],
    spouses: ['g3-cham-vo'],
  }),
  seedMember('g3-ton', 'Nguyễn Văn Tốn', 'male', 3, 1, {
    parents: ['g2-khang', 'g2-khang-chong'],
    spouses: ['g3-ton-vo'],
  }),
  seedMember('g3-gian', 'Nguyễn Văn Giản', 'male', 3, 1, {
    parents: ['g2-khang', 'g2-khang-chong'],
    spouses: ['g3-gian-vo'],
  }),
  seedMember('g3-sanh', 'Nguyễn Văn Sanh', 'male', 3, 1, {
    parents: ['g2-khang-chong', 'g2-ba-ke'],
    spouses: ['g3-sanh-vo-1', 'g3-sanh-vo-2', 'g3-sanh-vo-3'],
    biography: 'Ông có ba người vợ.',
  }),
  seedMember('g3-giang', 'Nguyễn Thị Giàng', 'female', 3, 1, {
    parents: ['g2-khang-chong', 'g2-ba-ke'],
    spouses: ['g3-giang-chong'],
  }),
  seedMember('g3-ut', 'Nguyễn Thị Út', 'female', 3, 1, {
    parents: ['g2-khang-chong', 'g2-ba-ke'],
    spouses: ['g3-ut-chong'],
  }),

  seedMember('g3-xum-vo', UNKNOWN_MEMBER_NAME, 'female', 3, 1, {
    nameKnown: false,
    isClanMember: false,
    spouses: ['g3-xum'],
  }),
  seedMember('g3-liem-vo', UNKNOWN_MEMBER_NAME, 'female', 3, 1, {
    nameKnown: false,
    isClanMember: false,
    spouses: ['g3-liem'],
  }),
  seedMember('g3-cham-vo', UNKNOWN_MEMBER_NAME, 'female', 3, 1, {
    nameKnown: false,
    isClanMember: false,
    spouses: ['g3-cham'],
  }),
  seedMember('g3-ton-vo', UNKNOWN_MEMBER_NAME, 'female', 3, 1, {
    nameKnown: false,
    isClanMember: false,
    spouses: ['g3-ton'],
  }),
  seedMember('g3-gian-vo', UNKNOWN_MEMBER_NAME, 'female', 3, 1, {
    nameKnown: false,
    isClanMember: false,
    spouses: ['g3-gian'],
  }),
  seedMember('g3-sanh-vo-1', UNKNOWN_MEMBER_NAME, 'female', 3, 1, {
    nameKnown: false,
    isClanMember: false,
    spouses: ['g3-sanh'],
  }),
  seedMember('g3-sanh-vo-2', UNKNOWN_MEMBER_NAME, 'female', 3, 1, {
    nameKnown: false,
    isClanMember: false,
    spouses: ['g3-sanh'],
  }),
  seedMember('g3-sanh-vo-3', UNKNOWN_MEMBER_NAME, 'female', 3, 1, {
    nameKnown: false,
    isClanMember: false,
    spouses: ['g3-sanh'],
  }),
  seedMember('g3-giang-chong', UNKNOWN_MEMBER_NAME, 'male', 3, 1, {
    nameKnown: false,
    isClanMember: false,
    spouses: ['g3-giang'],
  }),
  seedMember('g3-ut-chong', UNKNOWN_MEMBER_NAME, 'male', 3, 1, {
    nameKnown: false,
    isClanMember: false,
    spouses: ['g3-ut'],
  }),

  seedMember('g4-nghiem', 'Nguyễn Nghiễm', 'male', 4, 1, {
    parents: ['g3-xum'],
    spouses: ['g4-nghiem-vo'],
    biography: 'Thân phụ của anh Xứng, anh Hy và các con khác.',
  }),
  seedMember('g4-nhan', 'Nhàn', 'female', 4, 1, {
    parents: ['g3-xum'],
    spouses: ['g4-nhan-chong'],
    biography: 'Thân mẫu của anh Pháo, anh Đùng và các con khác.',
  }),
  seedMember('g4-nha', 'Nhạ', 'female', 4, 1, {
    parents: ['g3-xum'],
    spouses: ['g4-nha-chong'],
    biography: 'Thân mẫu của anh Hướng, chị Lan và các con khác.',
  }),
  seedMember('g4-han', 'Hàn', 'female', 4, 1, {
    parents: ['g3-liem'],
  }),
  seedMember('g4-khiet', 'Khiết', 'male', 4, 1, {
    parents: ['g3-liem'],
  }),
  seedMember('g4-dam', 'Đạm', 'male', 4, 1, {
    parents: ['g3-liem'],
  }),
  seedMember('g4-lang', 'Lặng', 'male', 4, 1, {
    parents: ['g3-liem'],
  }),
  seedMember('g4-a', 'Ả', 'female', 4, 1, {
    parents: ['g3-liem'],
  }),
  seedMember('g4-nghien', 'Nghiên', 'female', 4, 1, {
    parents: ['g3-cham'],
  }),
  seedMember('g4-huan', 'Nguyễn Huấn', 'male', 4, 1, {
    parents: ['g3-cham'],
  }),
  seedMember('g4-ve', 'Vẻ', 'male', 4, 1, {
    parents: ['g3-ton'],
  }),
  seedMember('g4-kien', 'Kiện', 'male', 4, 1, {
    parents: ['g3-ton'],
  }),
  seedMember('g4-tuong', 'Tương', 'female', 4, 1, {
    parents: ['g3-ton'],
  }),
  seedMember('g4-doi', 'Dợi', 'male', 4, 1, {
    parents: ['g3-gian'],
  }),
  seedMember('g4-du', 'Dụ', 'male', 4, 1, {
    parents: ['g3-gian'],
  }),
  seedMember('g4-thac', 'Thắc', 'female', 4, 1, {
    parents: ['g3-gian'],
  }),
  seedMember('g4-chuc', 'Chức', 'female', 4, 1, {
    parents: ['g3-gian'],
  }),
  seedMember('g4-luc', 'Lực', 'female', 4, 1, {
    parents: ['g3-gian'],
  }),
  seedMember('g4-luyen', 'Luyên', 'female', 4, 1, {
    parents: ['g3-sanh'],
  }),
  seedMember('g4-nguyen', 'Nguyên', 'male', 4, 1, {
    parents: ['g3-sanh'],
  }),
  seedMember('g4-xao', 'Xảo', 'female', 4, 1, {
    parents: ['g3-sanh'],
  }),
  seedMember('g4-luyen-2', 'Luyến', 'female', 4, 1, {
    parents: ['g3-sanh'],
  }),
  seedMember('g4-diec', 'Điếc', 'female', 4, 1, {
    parents: ['g3-sanh'],
  }),
  seedMember('g4-ngoan', 'Ngoan', 'male', 4, 1, {
    parents: ['g3-sanh'],
  }),
  seedMember('g4-som', 'Sớm', 'female', 4, 1, {
    parents: ['g3-sanh'],
  }),
  seedMember('g4-con', 'Cớn', 'male', 4, 1, {
    parents: ['g3-giang'],
    spouses: ['g4-con-vo'],
  }),
  seedMember('g4-thap', 'Tháp', 'male', 4, 1, {
    parents: ['g3-ut'],
    biography: 'Nghề nghiệp: Giáo viên.',
  }),

  seedMember('g4-nghiem-vo', UNKNOWN_MEMBER_NAME, 'female', 4, 1, {
    nameKnown: false,
    isClanMember: false,
    spouses: ['g4-nghiem'],
  }),
  seedMember('g4-nhan-chong', UNKNOWN_MEMBER_NAME, 'male', 4, 1, {
    nameKnown: false,
    isClanMember: false,
    spouses: ['g4-nhan'],
  }),
  seedMember('g4-nha-chong', UNKNOWN_MEMBER_NAME, 'male', 4, 1, {
    nameKnown: false,
    isClanMember: false,
    spouses: ['g4-nha'],
  }),
  seedMember('g4-con-vo', UNKNOWN_MEMBER_NAME, 'female', 4, 1, {
    nameKnown: false,
    isClanMember: false,
    spouses: ['g4-con'],
  }),

  seedMember('g5-xung', 'Xứng', 'male', 5, 1, {
    parents: ['g4-nghiem'],
  }),
  seedMember('g5-hy', 'Hy', 'male', 5, 1, {
    parents: ['g4-nghiem'],
  }),
  seedMember('g5-phao', 'Pháo', 'male', 5, 1, {
    parents: ['g4-nhan'],
  }),
  seedMember('g5-dung', 'Đùng', 'male', 5, 1, {
    parents: ['g4-nhan'],
  }),
  seedMember('g5-huong', 'Hướng', 'male', 5, 1, {
    parents: ['g4-nha'],
  }),
  seedMember('g5-lan', 'Lan', 'female', 5, 1, {
    parents: ['g4-nha'],
  }),
  seedMember('g5-thong', 'Thống', 'male', 5, 1, {
    parents: ['g4-con'],
  }),
];

export const branchName = (branch: number) =>
  branch
    ? `Chi ${['', 'trưởng', 'hai', 'ba', 'tư', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười'][branch] || branch}`
    : 'Thủy tổ';

function paternalBranch(
  person: Member,
  lookup: Map<string, Member>,
): number | undefined {
  const father = person.parents
    .map((id) => lookup.get(id))
    .find((parent): parent is Member => !!parent && parent.gender === 'male');

  if (!father) return person.parents.length ? undefined : person.branch || undefined;
  if (!father.isClanMember) return undefined;
  if (father.generation === 1 && father.parents.length === 0) {
    return person.branch || undefined;
  }
  return paternalBranch(father, lookup);
}

export function memberBranchName(
  person: Pick<Member, 'branch' | 'gender' | 'generation' | 'isClanMember'>,
  members?: Member[],
) {
  if (person.generation === 1) return 'Thủy tổ';
  if (person.gender !== 'male' || !person.isClanMember) return 'Nhánh ngoại';

  const branch = members
    ? paternalBranch(person as Member, new Map(members.map((member) => [member.id, member])))
    : person.branch;
  return branch ? branchName(branch) : 'Nhánh ngoại';
}
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
    tokens.every((t) =>
      normalize([memberName(p), p.tabooName, p.styleName].filter(Boolean).join(' ')).includes(t),
    ),
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

function areRegisteredSpouses(
  members: Member[],
  leftId: string,
  rightId: string,
) {
  const left = members.find((member) => member.id === leftId);
  return !!left && linkedSpouseIds(left, members).includes(rightId);
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
  if (person.generation <= 1) return [];
  const selectedInSlot = person.parents[parentIndex];
  const coParentId = person.parents[parentIndex === 0 ? 1 : 0];

  return members.filter(
    (candidate) =>
      candidate.id !== person.id &&
      (!person.parents.includes(candidate.id) || candidate.id === selectedInSlot) &&
      !person.spouses.includes(candidate.id) &&
      candidate.generation === person.generation - 1 &&
      (candidate.branch === 0 ||
        person.branch === 0 ||
        candidate.branch === person.branch) &&
      (person.born === undefined ||
        candidate.born === undefined ||
        candidate.born < person.born) &&
      (!coParentId ||
        areRegisteredSpouses(members, candidate.id, coParentId)) &&
      !isDescendantOf(members, person.id, candidate.id),
  );
}

function isEligibleSpouse(person: Member, candidate: Member, members: Member[]) {
  return (
    candidate.id !== person.id &&
    !person.parents.includes(candidate.id) &&
    candidate.generation === person.generation &&
    candidate.branch === person.branch &&
    !candidate.parents.some((id) => person.parents.includes(id)) &&
    !candidate.spouses.some((id) => person.parents.includes(id)) &&
    !candidate.spouses.some(
      (id) =>
        id !== person.id &&
        members.some(
          (sibling) =>
            sibling.id === id &&
            sibling.parents.some((parentId) => person.parents.includes(parentId)),
        ),
    ) &&
    !isDescendantOf(members, person.id, candidate.id) &&
    !isDescendantOf(members, candidate.id, person.id)
  );
}

export function eligibleSpouses(person: Member, members: Member[]) {
  return members.filter(
    (candidate) =>
      !person.spouses.includes(candidate.id) &&
      isEligibleSpouse(person, candidate, members),
  );
}

export function eligibleGenerations(person: Member, members: Member[]) {
  const parentGenerations = person.parents
    .map((id) => members.find((member) => member.id === id)?.generation)
    .filter((generation): generation is number => Number.isInteger(generation));
  if (parentGenerations.length) {
    const parentGeneration = parentGenerations[0];
    return parentGenerations.every((generation) => generation === parentGeneration)
      ? [parentGeneration + 1]
      : [];
  }

  return Array.from({ length: 50 }, (_, index) => index + 1);
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
  return parentBranches.size === 1
    ? [...parentBranches]
    : Array.from({ length: 20 }, (_, index) => index + 1);
}

export function eligibleBirthYears(person: Member, members: Member[]) {
  const parentYears = person.parents
    .map((id) => members.find((member) => member.id === id)?.born)
    .filter((born): born is number => Number.isInteger(born));
  const childYears = members
    .filter((member) => member.parents.includes(person.id))
    .map((member) => member.born)
    .filter((born): born is number => Number.isInteger(born));

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
    person.branch > 20
  )
    return 'Vui lòng chọn đời và chi.';
  if (person.nameKnown !== false && !person.name.trim())
    return 'Vui lòng nhập họ và tên hoặc chọn Chưa biết tên.';
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
    person.born !== undefined &&
    (!Number.isInteger(person.born) ||
      person.born < 1600 ||
      person.born > new Date().getFullYear())
  )
    return 'Năm sinh chưa hợp lệ.';
  if (
    person.died !== undefined &&
    (!Number.isInteger(person.died) ||
      (person.born !== undefined && person.died < person.born) ||
      person.died > new Date().getFullYear())
  )
    return 'Năm mất chưa hợp lệ.';
  if (person.diedText && person.diedText.trim().length > 100)
    return 'Thông tin năm mất không quá 100 ký tự.';
  if (
    memberLifeStatus(person) !== 'deceased' &&
    (person.died !== undefined || person.diedText || person.anniversary)
  )
    return 'Hồ sơ có thông tin mất cần được ghi là Đã mất.';
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
    person.parents.length === 2 &&
    !areRegisteredSpouses(members, person.parents[0], person.parents[1])
  )
    return 'Hai cha mẹ cần được ghi nhận là vợ chồng trước khi cùng đứng trong một hộ gia đình.';
  if (
    person.parents.some(
      (id, index) =>
        !eligibleParents(person, members, index).some(
          (candidate) => candidate.id === id,
        ),
    )
  )
    return 'Cha mẹ cần ở đời liền trước và thuộc đúng chi.';
  if (
    person.born !== undefined &&
    person.parents.some((id) => {
      const parentBorn = lookup.get(id)!.born;
      return parentBorn !== undefined && parentBorn >= person.born!;
    })
  )
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
    person.spouses.some(
      (id) => !isEligibleSpouse(person, lookup.get(id)!, members),
    )
  )
    return 'Quan hệ vợ chồng không phù hợp với các quan hệ gia đình đã ghi nhận.';
  if (
    members.some(
      (p) =>
        p.parents.includes(person.id) &&
        ((person.born !== undefined &&
          p.born !== undefined &&
          p.born <= person.born) ||
          p.generation <= person.generation),
    )
  )
    return 'Năm sinh hoặc đời không phù hợp với hồ sơ con đã có.';
  const birthYears = eligibleBirthYears(person, members);
  if (
    person.born !== undefined &&
    (person.born < birthYears.min || person.born > birthYears.max)
  )
    return 'Năm sinh cần phù hợp với cha mẹ và con đã ghi nhận.';
  if (person.spouses.some((id) => lookup.get(id)!.parents.includes(person.id)))
    return 'Không thể tạo quan hệ vợ chồng với con.';
  if (person.spouses.some((id) => lookup.get(id)!.branch !== person.branch))
    return 'Vợ chồng cần được ghi nhận trong cùng chi.';
  if (
    person.anniversary &&
    (person.anniversary.day < 1 ||
      person.anniversary.day > 30 ||
      person.anniversary.month < 1 ||
      person.anniversary.month > 12)
  )
    return 'Ngày giỗ âm lịch chưa hợp lệ.';
  return null;
}
