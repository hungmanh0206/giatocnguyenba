import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  type DocumentData,
  type Firestore,
  where,
  writeBatch,
} from 'firebase/firestore';
import { firebaseFamilyId } from './config';
import { isFamilyRole, type FamilyRole } from '@/lib/access';
import {
  UNKNOWN_MEMBER_NAME,
  compareSiblingOrder,
  type Member,
} from '@/lib/family';

const memberFields = [
  'id',
  'name',
  'displayName',
  'nameKnown',
  'tabooName',
  'styleName',
  'gender',
  'isClanMember',
  'lineageType',
  'generation',
  'branch',
  'branchOrigin',
  'sourceContextParentId',
  'siblingOrder',
  'born',
  'died',
  'diedText',
  'deathDate',
  'lifeStatus',
  'parents',
  'spouses',
  'anniversary',
  'biography',
  'hometown',
  'needsVerification',
  'sourceReference',
] as const;

function string(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function integer(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isInteger(value)
    ? value
    : fallback;
}

function ids(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function firestoreMember(id: string, raw: DocumentData): Member | null {
  const gender =
    raw.gender === 'female'
      ? 'female'
      : raw.gender === 'male'
        ? 'male'
        : raw.gender === 'unknown'
          ? 'unknown'
          : null;
  const nameKnown = raw.nameKnown !== false;
  const name = nameKnown
    ? string(raw.name).trim()
    : UNKNOWN_MEMBER_NAME;
  const born = integer(raw.born) || undefined;

  if (!gender || !name || (born !== undefined && born < 1600)) return null;

  const anniversary = raw.anniversary;
  const anniversaryDay =
    anniversary && typeof anniversary === 'object'
      ? integer(anniversary.day)
      : 0;
  const anniversaryMonth =
    anniversary && typeof anniversary === 'object'
      ? integer(anniversary.month)
      : 0;
  const deathDate = raw.deathDate;
  const deathDay =
    deathDate && typeof deathDate === 'object' ? integer(deathDate.day) : 0;
  const deathMonth =
    deathDate && typeof deathDate === 'object' ? integer(deathDate.month) : 0;
  const deathYear =
    deathDate && typeof deathDate === 'object' ? integer(deathDate.year) : 0;
  const died = integer(raw.died) || undefined;
  const legacyAnniversary =
    anniversaryDay >= 1 && anniversaryDay <= 30 &&
    anniversaryMonth >= 1 && anniversaryMonth <= 12
      ? { day: anniversaryDay, month: anniversaryMonth }
      : undefined;
  const normalizedDeathDate =
    deathDay >= 1 && deathDay <= 30 &&
    deathMonth >= 1 && deathMonth <= 12
      ? {
          day: deathDay,
          month: deathMonth,
          ...(deathYear >= 1600 && deathYear <= 3000 ? { year: deathYear } : {}),
        }
      : legacyAnniversary
        ? {
            ...legacyAnniversary,
            ...(died && died >= 1600 && died <= 3000 ? { year: died } : {}),
          }
        : undefined;
  const hasClanFamilyName = /^Nguyễn (Bá|Thị)(?:\s|$)/i.test(name);
  const isClanMember =
    typeof raw.isClanMember === 'boolean'
      ? raw.isClanMember
      : hasClanFamilyName;

  return {
    id,
    name,
    displayName: string(raw.displayName).trim() || undefined,
    nameKnown,
    tabooName: string(raw.tabooName).trim() || undefined,
    styleName: string(raw.styleName).trim() || undefined,
    gender,
    // Legacy records can be classified in the editor after this migration.
    isClanMember,
    lineageType:
      gender === 'female' && isClanMember
        ? 'maternal-terminal'
        : raw.lineageType === 'maternal-terminal'
            ? 'maternal-terminal'
            : 'direct',
    generation: integer(raw.generation, 1),
    branch: integer(raw.branch),
    branchOrigin: raw.branchOrigin === true || undefined,
    sourceContextParentId: string(raw.sourceContextParentId).trim() || undefined,
    siblingOrder: integer(raw.siblingOrder) || undefined,
    born,
    died,
    diedText: string(raw.diedText).trim() || undefined,
    deathDate: normalizedDeathDate,
    lifeStatus:
      raw.lifeStatus === 'living' ||
      raw.lifeStatus === 'deceased' ||
      raw.lifeStatus === 'unknown'
        ? raw.lifeStatus === 'unknown' && normalizedDeathDate
          ? 'deceased'
          : raw.lifeStatus
        : normalizedDeathDate
          ? 'deceased'
          : undefined,
    parents: ids(raw.parents),
    spouses: ids(raw.spouses),
    anniversary: normalizedDeathDate
      ? { day: normalizedDeathDate.day, month: normalizedDeathDate.month }
      : legacyAnniversary,
    biography: string(raw.biography) || undefined,
    hometown: string(raw.hometown) || undefined,
    needsVerification: raw.needsVerification === true || undefined,
    sourceReference: string(raw.sourceReference) || undefined,
  };
}

function memberData(person: Member) {
  const dateSource = person.deathDate || person.anniversary;
  const normalizedDeathDate =
    dateSource &&
    Number.isInteger(dateSource.day) &&
    Number.isInteger(dateSource.month)
      ? {
          day: dateSource.day,
          month: dateSource.month,
          ...(person.deathDate?.year !== undefined
            ? { year: person.deathDate.year }
            : person.died !== undefined
              ? { year: person.died }
              : {}),
        }
      : null;
  return {
    id: person.id,
    name:
      person.nameKnown === false
        ? UNKNOWN_MEMBER_NAME
        : person.name.trim(),
    displayName: person.displayName?.trim() || null,
    nameKnown: person.nameKnown !== false,
    tabooName: person.tabooName?.trim() || null,
    styleName: person.styleName?.trim() || null,
    gender: person.gender,
    isClanMember: person.isClanMember,
    lineageType: person.lineageType,
    generation: person.generation,
    branch: person.branch,
    branchOrigin: person.branchOrigin ?? false,
    sourceContextParentId: person.sourceContextParentId?.trim() || null,
    siblingOrder: person.siblingOrder ?? null,
    born: person.born ?? null,
    died: person.died ?? null,
    diedText: person.diedText?.trim() || null,
    deathDate: normalizedDeathDate,
    lifeStatus: person.lifeStatus ?? null,
    parents: [...new Set(person.parents)],
    spouses: [...new Set(person.spouses)],
    anniversary: normalizedDeathDate
      ? { day: normalizedDeathDate.day, month: normalizedDeathDate.month }
      : null,
    biography: person.biography?.trim() || null,
    hometown: person.hometown?.trim() || null,
    needsVerification: person.needsVerification ?? false,
    sourceReference: person.sourceReference?.trim() || null,
    updatedAt: serverTimestamp(),
  };
}

function memberRef(db: Firestore, memberId: string) {
  return doc(db, 'families', firebaseFamilyId, 'members', memberId);
}

function familyRef(db: Firestore) {
  return doc(db, 'families', firebaseFamilyId);
}

function membershipRef(db: Firestore, userId: string) {
  return doc(db, 'families', firebaseFamilyId, 'memberships', userId);
}

export function subscribeToFamilyRole(
  db: Firestore,
  userId: string,
  onRole: (role: FamilyRole | null) => void,
  onError: (error: unknown) => void,
) {
  return onSnapshot(
    membershipRef(db, userId),
    async (snapshot) => {
      const role = snapshot.exists() ? snapshot.data().role : null;
      if (!isFamilyRole(role)) {
        onRole(null);
        return;
      }
      try {
        const family = await getDoc(familyRef(db));
        onRole(
          family.exists() && family.data().superAdminUid === userId
            ? role
            : null,
        );
      } catch (error) {
        onError(error);
      }
    },
    onError,
  );
}

export function subscribeToFamilyMembers(
  db: Firestore,
  onMembers: (members: Member[]) => void,
  onError: (error: unknown) => void,
) {
  const members = collection(db, 'families', firebaseFamilyId, 'members');
  return onSnapshot(
    members,
    (snapshot) => {
      const data = snapshot.docs
        .map((snapshot) => firestoreMember(snapshot.id, snapshot.data()))
        .filter((member): member is Member => member !== null)
        .sort(
          (a, b) =>
            a.generation - b.generation ||
            compareSiblingOrder(a, b),
        );
      onMembers(data);
    },
    onError,
  );
}

export async function saveFirestoreMember(db: Firestore, person: Member) {
  await runTransaction(db, async (transaction) => {
    const target = memberRef(db, person.id);
    const current = await transaction.get(target);
    const oldSpouses = current.exists() ? ids(current.data().spouses) : [];
    const nextSpouses = [...new Set(person.spouses)];

    for (const spouseId of oldSpouses.filter(
      (id) => !nextSpouses.includes(id),
    )) {
      const spouse = await transaction.get(memberRef(db, spouseId));
      if (!spouse.exists()) continue;
      const spouseData = spouse.data();
      const normalized = firestoreMember(spouseId, spouseData);
      if (!normalized) continue;
      transaction.set(
        spouse.ref,
        {
          ...memberData({
            ...normalized,
            spouses: normalized.spouses.filter((id) => id !== person.id),
          }),
          createdAt: spouseData.createdAt ?? serverTimestamp(),
        },
        { merge: true },
      );
    }

    for (const spouseId of nextSpouses.filter(
      (id) => !oldSpouses.includes(id),
    )) {
      const spouse = await transaction.get(memberRef(db, spouseId));
      if (!spouse.exists()) continue;
      const spouseData = spouse.data();
      const normalized = firestoreMember(spouseId, spouseData);
      if (!normalized) continue;
      transaction.set(
        spouse.ref,
        {
          ...memberData({
            ...normalized,
            spouses: [...new Set([...normalized.spouses, person.id])],
          }),
          createdAt: spouseData.createdAt ?? serverTimestamp(),
        },
        { merge: true },
      );
    }

    transaction.set(
      target,
      {
        ...memberData(person),
        createdAt: current.exists() && current.data().createdAt
          ? current.data().createdAt
          : serverTimestamp(),
      },
      { merge: true },
    );
  });
}

export async function deleteFirestoreMember(db: Firestore, memberId: string) {
  const members = collection(db, 'families', firebaseFamilyId, 'members');
  const [parentSnapshots, spouseSnapshots] = await Promise.all([
    getDocs(query(members, where('parents', 'array-contains', memberId))),
    getDocs(query(members, where('spouses', 'array-contains', memberId))),
  ]);
  const related = new Map(
    [...parentSnapshots.docs, ...spouseSnapshots.docs].map((snapshot) => [
      snapshot.id,
      snapshot,
    ]),
  );
  const batch = writeBatch(db);

  for (const snapshot of related.values()) {
    const data = snapshot.data();
    const update: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (ids(data.parents).includes(memberId)) {
      update.parents = arrayRemove(memberId);
    }
    if (ids(data.spouses).includes(memberId)) {
      update.spouses = arrayRemove(memberId);
    }
    batch.update(snapshot.ref, update);
  }

  batch.delete(memberRef(db, memberId));
  await batch.commit();
}

export const firestoreMemberFieldNames = memberFields;
