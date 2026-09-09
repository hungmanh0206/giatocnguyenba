import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import { firebaseFamilyId } from './config';
import { type Member } from '@/lib/family';

const memberFields = [
  'id',
  'name',
  'gender',
  'generation',
  'branch',
  'born',
  'died',
  'parents',
  'spouses',
  'anniversary',
  'biography',
  'hometown',
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
    raw.gender === 'female' ? 'female' : raw.gender === 'male' ? 'male' : null;
  const name = string(raw.name).trim();
  const born = integer(raw.born);

  if (!gender || !name || born < 1600) return null;

  const anniversary = raw.anniversary;
  const day =
    anniversary && typeof anniversary === 'object'
      ? integer(anniversary.day)
      : 0;
  const month =
    anniversary && typeof anniversary === 'object'
      ? integer(anniversary.month)
      : 0;

  return {
    id,
    name,
    gender,
    generation: integer(raw.generation, 1),
    branch: integer(raw.branch),
    born,
    died: integer(raw.died) || undefined,
    parents: ids(raw.parents),
    spouses: ids(raw.spouses),
    anniversary:
      day >= 1 && day <= 30 && month >= 1 && month <= 12
        ? { day, month }
        : undefined,
    biography: string(raw.biography) || undefined,
    hometown: string(raw.hometown) || undefined,
  };
}

function memberData(person: Member) {
  return {
    id: person.id,
    name: person.name.trim(),
    gender: person.gender,
    generation: person.generation,
    branch: person.branch,
    born: person.born,
    died: person.died ?? null,
    parents: [...new Set(person.parents)],
    spouses: [...new Set(person.spouses)],
    anniversary: person.anniversary ?? null,
    biography: person.biography?.trim() || null,
    hometown: person.hometown?.trim() || null,
    updatedAt: serverTimestamp(),
  };
}

function memberRef(db: Firestore, memberId: string) {
  return doc(db, 'families', firebaseFamilyId, 'members', memberId);
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
            a.born - b.born ||
            a.name.localeCompare(b.name, 'vi'),
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
      transaction.update(memberRef(db, spouseId), {
        spouses: arrayRemove(person.id),
        updatedAt: serverTimestamp(),
      });
    }

    for (const spouseId of nextSpouses.filter(
      (id) => !oldSpouses.includes(id),
    )) {
      transaction.update(memberRef(db, spouseId), {
        spouses: arrayUnion(person.id),
        updatedAt: serverTimestamp(),
      });
    }

    transaction.set(
      target,
      {
        ...memberData(person),
        createdAt: current.exists()
          ? current.data().createdAt
          : serverTimestamp(),
      },
      { merge: true },
    );
  });
}

export const firestoreMemberFieldNames = memberFields;
