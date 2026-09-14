import type { Member, ParentageKind } from '../family.ts';

export type FamilySide = 'paternal' | 'maternal' | 'both' | 'unknown';
export type RelativeAge = 'older' | 'younger' | 'unknown';

function byGender(
  gender: Member['gender'],
  male: string,
  female: string,
  unknown: string,
) {
  return gender === 'male' ? male : gender === 'female' ? female : unknown;
}

export function parentTerm(gender: Member['gender'], kind: ParentageKind) {
  if (kind === 'adoptive') return byGender(gender, 'cha nuôi', 'mẹ nuôi', 'cha/mẹ nuôi');
  if (kind === 'step') return byGender(gender, 'cha dượng', 'mẹ kế', 'cha/mẹ kế');
  return byGender(gender, 'cha', 'mẹ', 'cha/mẹ');
}

export function childTerm(gender: Member['gender'], kind: ParentageKind) {
  if (kind === 'adoptive') return byGender(gender, 'con nuôi', 'con nuôi', 'con nuôi');
  if (kind === 'step') return byGender(gender, 'con riêng', 'con riêng', 'con riêng');
  return byGender(gender, 'con trai', 'con gái', 'con');
}

export function ancestorTerm(
  gender: Member['gender'],
  distance: number,
  side: FamilySide,
) {
  if (distance === 1) return parentTerm(gender, 'biological');
  if (distance === 2) {
    if (side === 'paternal') return byGender(gender, 'ông nội', 'bà nội', 'ông/bà nội');
    if (side === 'maternal') return byGender(gender, 'ông ngoại', 'bà ngoại', 'ông/bà ngoại');
    return byGender(gender, 'ông', 'bà', 'ông/bà');
  }
  const prefix = distance === 3 ? 'cụ' : `tổ tiên cách ${distance} đời`;
  if (prefix.startsWith('tổ tiên')) return prefix;
  return byGender(gender, `${prefix} ông`, `${prefix} bà`, prefix);
}

export function descendantTerm(
  gender: Member['gender'],
  distance: number,
  side: FamilySide,
) {
  if (distance === 1) return childTerm(gender, 'biological');
  if (distance === 2) {
    if (side === 'paternal') return byGender(gender, 'cháu nội trai', 'cháu nội gái', 'cháu nội');
    if (side === 'maternal') return byGender(gender, 'cháu ngoại trai', 'cháu ngoại gái', 'cháu ngoại');
    return byGender(gender, 'cháu trai', 'cháu gái', 'cháu');
  }
  return `hậu duệ cách ${distance} đời`;
}

export function siblingTerm(
  gender: Member['gender'],
  age: RelativeAge,
  kind: 'full' | 'paternal-half' | 'maternal-half' | 'step',
) {
  const core = age === 'older'
    ? byGender(gender, 'anh', 'chị', 'anh/chị')
    : age === 'younger'
      ? byGender(gender, 'em trai', 'em gái', 'em')
      : 'anh/chị/em';
  const qualifier = kind === 'full'
    ? ' ruột'
    : kind === 'paternal-half'
      ? ' cùng cha khác mẹ'
      : kind === 'maternal-half'
        ? ' cùng mẹ khác cha'
        : ' kế';
  return `${core}${qualifier}`;
}

export function auntOrUncleTerm({
  gender,
  side,
  age,
}: {
  gender: Member['gender'];
  side: Exclude<FamilySide, 'both' | 'unknown'>;
  age: RelativeAge;
}) {
  if (age === 'older') {
    return { term: 'bác', code: 'PARENT_OLDER_SIBLING' };
  }
  if (side === 'paternal') {
    if (gender === 'male') return { term: 'chú', code: 'PATERNAL_YOUNGER_UNCLE' };
    if (gender === 'female') return { term: 'cô', code: 'PATERNAL_AUNT' };
    return { term: 'cô/chú', code: 'PATERNAL_YOUNGER_SIBLING' };
  }
  if (gender === 'male') return { term: 'cậu', code: 'MATERNAL_UNCLE' };
  if (gender === 'female') return { term: 'dì', code: 'MATERNAL_AUNT' };
  return { term: 'cậu/dì', code: 'MATERNAL_YOUNGER_SIBLING' };
}

export function possibleAuntOrUncleTerms(
  gender: Member['gender'],
  side: Exclude<FamilySide, 'both' | 'unknown'>,
) {
  if (side === 'paternal') {
    return gender === 'male' ? ['bác', 'chú'] : gender === 'female' ? ['bác', 'cô'] : ['bác', 'cô/chú'];
  }
  return gender === 'male' ? ['bác', 'cậu'] : gender === 'female' ? ['bác', 'dì'] : ['bác', 'cậu/dì'];
}
