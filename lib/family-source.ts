import normalizedRecords from '../data/gia-pha-nguyen-ba.json' with { type: 'json' };
import type { Member } from './family';

type SourceRecord = {
  id: string;
  full_name: string;
  gender: string;
  father_id: string;
  mother_id: string;
  spouse_ids: string;
  doi: number;
  doi_source: string;
  chi: string;
  birth_date: string;
  death_date: string;
  memorial_date: string;
  calendar_note: string;
  origin: string;
  residence: string;
  role: string;
  notes: string;
  needs_verification: string | boolean;
  source_lines: string;
};

const records = normalizedRecords as SourceRecord[];
const sourceById = new Map(records.map((record) => [record.id, record]));

// These four second-generation records define the two branches that the source
// document identifies only through their descendants.
const ROOT_BRANCHES: Record<string, number> = {
  P003: 1,
  P004: 2,
  P005: 1,
  P006: 2,
};
const DISCONNECTED_SOURCE_ROOTS = new Set(['P001']);
const KHANG_HUSBAND_ID = 'CONTEXT-P003-HUSBAND';
const KHANG_SECOND_WIFE_ID = 'CONTEXT-P003-SECOND-WIFE';
const KHANG_FIRST_WIFE_CHILDREN = new Set(['P012', 'P013', 'P014', 'P015', 'P016']);
const KHANG_SECOND_WIFE_CHILDREN = new Set(['P017', 'P018', 'P019']);

function ids(value: string) {
  return value
    .split('|')
    .map((id) => id.trim())
    .filter((id) => sourceById.has(id));
}

function sourceGender(record: SourceRecord): Member['gender'] {
  if (record.gender === 'M') return 'male';
  if (record.gender === 'F') return 'female';
  return 'unknown';
}

function sourceBranch(record: SourceRecord) {
  if (record.doi === 1) return 0;
  if (record.chi === 'Chi 1') return 1;
  if (record.chi === 'Chi 2') return 2;
  return ROOT_BRANCHES[record.id];
}

function sourceYear(value: string) {
  const match = value.trim().match(/(?:^|\/)(\d{4})$/);
  return match ? Number(match[1]) : undefined;
}

function sourceDeathDate(value: string) {
  const parts = value.trim().split('/');
  if (parts.length < 2 || parts.length > 3) return undefined;
  const [day, month, year] = parts.map(Number);
  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    day < 1 ||
    day > 30 ||
    month < 1 ||
    month > 12
  )
    return undefined;
  if (parts.length === 2) return { day, month };
  return Number.isInteger(year) && year >= 1600 && year <= 3000
    ? { day, month, year }
    : undefined;
}

function sourceAnniversary(value: string) {
  const parts = value.trim().split('/');
  if (parts.length < 2 || parts.length > 3) return undefined;
  const [day, month] = parts.map(Number);
  return Number.isInteger(day) && Number.isInteger(month) && day >= 1 && day <= 30 && month >= 1 && month <= 12
    ? { day, month }
    : undefined;
}

function displayName(record: SourceRecord) {
  return record.full_name.trim();
}

function sourceBiography(record: SourceRecord, name: string) {
  const details = [
    name !== record.full_name ? `Tên theo gia phả: ${record.full_name}.` : '',
    record.role ? `Vai trò: ${record.role}.` : '',
    record.birth_date ? `Ngày sinh theo gia phả: ${record.birth_date}.` : '',
    record.death_date ? `Ngày mất theo gia phả: ${record.death_date}.` : '',
    record.memorial_date
      ? `${record.calendar_note || 'Ngày giỗ'}: ${record.memorial_date}.`
      : '',
    record.origin ? `Nguyên quán: ${record.origin}.` : '',
    record.residence ? `Cư trú: ${record.residence}.` : '',
    record.notes || '',
    String(record.needs_verification) === 'true'
      ? 'Dữ liệu này cần được đối chiếu lại với gia phả gốc.'
      : '',
  ].filter(Boolean);

  return details.length ? details.join('\n\n') : undefined;
}

function siblingOrders(members: Member[]) {
  const peopleById = new Map(members.map((person) => [person.id, person]));
  const countByHousehold = new Map<string, number>();

  return members.map((person) => {
    if (!person.parents.length) return person;

    const parents = person.parents
      .map((id) => peopleById.get(id))
      .filter((parent): parent is Member => !!parent);
    const father = parents.find((parent) => parent.gender === 'male');
    const mother = parents.find((parent) => parent.gender === 'female');
    const householdKey = father
      ? `father:${father.id}`
      : mother
        ? `mother:${mother.id}`
        : `parents:${[...person.parents].sort().join('|')}`;
    const siblingOrder = (countByHousehold.get(householdKey) || 0) + 1;
    countByHousehold.set(householdKey, siblingOrder);
    return { ...person, siblingOrder };
  });
}

function supplementKhangHousehold(members: Member[]) {
  const documentedMembers = members.map((person) => {
    if (person.id === 'P003') {
      return {
        ...person,
        spouses: [...new Set([...person.spouses, KHANG_HUSBAND_ID])],
      };
    }
    if (KHANG_FIRST_WIFE_CHILDREN.has(person.id)) {
      return {
        ...person,
        parents: [...new Set([...person.parents, KHANG_HUSBAND_ID])],
      };
    }
    if (KHANG_SECOND_WIFE_CHILDREN.has(person.id)) {
      return {
        ...person,
        isClanMember: true,
        lineageType:
          person.gender === 'female' ? 'maternal-terminal' : person.lineageType,
        sourceContextParentId: undefined,
        parents: [KHANG_HUSBAND_ID, KHANG_SECOND_WIFE_ID],
      };
    }
    return person;
  });

  return [
    ...documentedMembers,
    {
      id: KHANG_HUSBAND_ID,
      name: 'Chồng bà Nguyễn Thị Khang (chưa rõ tên)',
      displayName: 'Chồng bà Nguyễn Thị Khang (chưa rõ tên)',
      nameKnown: false,
      gender: 'male' as const,
      isClanMember: false,
      lineageType: 'direct' as const,
      generation: 2,
      branch: 1,
      lifeStatus: 'deceased' as const,
      parents: [],
      spouses: ['P003', KHANG_SECOND_WIFE_ID],
      biography:
        'Chồng của bà Nguyễn Thị Khang (Mền). Gia phả ghi nhận ông có người vợ thứ hai; tên của hai người chưa rõ.',
      sourceReference: 'Bổ sung quan hệ hộ gia đình theo gia phả',
    },
    {
      id: KHANG_SECOND_WIFE_ID,
      name: 'Vợ thứ hai của chồng bà Khang (chưa rõ tên)',
      displayName: 'Vợ thứ hai của chồng bà Khang (chưa rõ tên)',
      nameKnown: false,
      gender: 'female' as const,
      isClanMember: false,
      lineageType: 'direct' as const,
      generation: 2,
      branch: 1,
      lifeStatus: 'deceased' as const,
      parents: [],
      spouses: [KHANG_HUSBAND_ID],
      biography:
        'Người vợ thứ hai của chồng bà Nguyễn Thị Khang (Mền); mẹ của ông Nguyễn Văn Sanh, bà Nguyễn Thị Giàng và bà Nguyễn Thị Út.',
      sourceReference: 'Bổ sung quan hệ hộ gia đình theo gia phả',
    },
  ];
}

const branches = new Map<string, number>();
for (const record of records) {
  const branch = sourceBranch(record);
  if (branch !== undefined) branches.set(record.id, branch);
}

const spouses = new Map(records.map((record) => [record.id, new Set<string>()]));
for (const record of records) {
  for (const spouseId of ids(record.spouse_ids)) {
    spouses.get(record.id)!.add(spouseId);
    spouses.get(spouseId)!.add(record.id);
  }
}

// Branches omitted from a record inherit from a known parent or spouse.
for (let pass = 0; pass < records.length; pass += 1) {
  let changed = false;
  for (const record of records) {
    if (branches.has(record.id)) continue;
    const related = [
      ...ids(record.father_id),
      ...ids(record.mother_id),
      ...(spouses.get(record.id) || []),
    ];
    const inherited = related
      .map((id) => branches.get(id))
      .find((branch): branch is number => branch !== undefined && branch > 0);
    if (inherited === undefined) continue;
    branches.set(record.id, inherited);
    changed = true;
  }
  if (!changed) break;
}

export const familySeedMembers: Member[] = siblingOrders(
  supplementKhangHousehold(records.map((record) => {
    const name = displayName(record);
    const gender = sourceGender(record);
    const parents = [...ids(record.father_id), ...ids(record.mother_id)];
    // The source records several maternal descendants under their recorded
    // parent, even when their personal surname is not Nguyễn Bá/Nguyễn Thị.
    // Membership here governs tree placement, so use explicit parentage rather
    // than inferring it from a name.
    const isClanMember =
      parents.length > 0 ||
      DISCONNECTED_SOURCE_ROOTS.has(record.id);
    const role = record.role || '';
    const tabooName = role.match(/húy\s+([^;]+)/iu)?.[1]?.trim();
    const styleName = role.match(/hiệu\s+([^;]+)/iu)?.[1]?.trim();
    const memorial = sourceAnniversary(record.memorial_date);
    // In the supplied records, a full lunar death date can be stored either
    // in `death_date` or alongside the húy kỵ date.
    const deathDate =
      sourceDeathDate(record.death_date) || sourceDeathDate(record.memorial_date);
    const died = deathDate?.year || sourceYear(record.death_date) || sourceYear(record.memorial_date);
    const branch = branches.get(record.id) ?? (record.doi === 1 ? 0 : 1);
    const branchOrigin =
      !!record.chi &&
      parents.some((parentId) => {
        const parentBranch = branches.get(parentId);
        return parentBranch !== undefined && parentBranch !== branch;
      });

    return {
      id: record.id,
      name,
      displayName: record.full_name || undefined,
      nameKnown: record.id === 'P002' ? false : undefined,
      tabooName,
      styleName,
      gender,
      isClanMember,
      lineageType:
        isClanMember && gender === 'female' ? 'maternal-terminal' : 'direct',
      generation: record.doi,
      branch,
      branchOrigin: branchOrigin || undefined,
      born: sourceYear(record.birth_date),
      died,
      diedText: record.death_date && !died ? record.death_date : undefined,
      deathDate,
      lifeStatus:
        record.doi === 2 || record.doi === 3 || record.death_date || record.memorial_date
          ? 'deceased'
          : 'unknown',
      parents,
      spouses: [...(spouses.get(record.id) || [])],
      // Húy kỵ records the lunar day of death. It is also the family's
      // recurring memorial day, even when the source stored it in death_date.
      anniversary:
        memorial ||
        (deathDate ? { day: deathDate.day, month: deathDate.month } : undefined),
      biography: sourceBiography(record, name),
      hometown: [record.origin, record.residence].filter(Boolean).join(' · ') || undefined,
      needsVerification: String(record.needs_verification) === 'true' || undefined,
      sourceReference: record.source_lines || undefined,
    };
  })),
);
