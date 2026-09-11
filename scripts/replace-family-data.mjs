import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { createRequire } from 'node:module';

const projectId =
  process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const familyId =
  process.env.FIREBASE_FAMILY_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_FAMILY_ID ||
  'nguyen-ba';
const credentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const dryRun = process.argv.includes('--dry-run');
const { seedMembers, validateMember } = await import('../lib/family.ts');

if (!projectId) {
  throw new Error('Set FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID.');
}

const invalidMembers = seedMembers
  .map((person) => [person.id, validateMember(person, seedMembers)])
  .filter(([, error]) => error);

if (invalidMembers.length) {
  throw new Error(`Dữ liệu nguồn chưa hợp lệ: ${JSON.stringify(invalidMembers)}.`);
}

if (dryRun) {
  console.log(`Validated ${seedMembers.length} replacement members for families/${familyId}.`);
  process.exit(0);
}

function memberData(person, timestamp) {
  return {
    id: person.id,
    name: person.name,
    nameKnown: person.nameKnown ?? true,
    tabooName: person.tabooName ?? null,
    styleName: person.styleName ?? null,
    gender: person.gender,
    isClanMember: person.isClanMember,
    lineageType: person.lineageType,
    generation: person.generation,
    branch: person.branch,
    siblingOrder: person.siblingOrder ?? null,
    born: person.born ?? null,
    died: person.died ?? null,
    diedText: person.diedText ?? null,
    lifeStatus: person.lifeStatus ?? null,
    parents: [...new Set(person.parents)],
    spouses: [...new Set(person.spouses)],
    anniversary: person.anniversary ?? null,
    biography: person.biography ?? null,
    hometown: person.hometown ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function assertAtomicWriteSize(currentIds) {
  const replacementIds = new Set(seedMembers.map((person) => person.id));
  const deletes = [...currentIds].filter((id) => !replacementIds.has(id)).length;
  const writes = deletes + seedMembers.length;
  if (writes > 500) {
    throw new Error(
      `Thay thế cần ${writes} ghi, vượt giới hạn batch nguyên tử Firestore.`,
    );
  }
}

async function replaceWithServiceAccount() {
  const serviceAccount = JSON.parse(credentials);
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: cert(serviceAccount), projectId });
  const db = getFirestore(app);
  const family = db.collection('families').doc(familyId);
  const members = family.collection('members');
  const current = await members.get();
  const currentIds = current.docs.map((snapshot) => snapshot.id);
  assertAtomicWriteSize(currentIds);

  const now = Timestamp.now();
  const batch = db.batch();
  const replacementIds = new Set(seedMembers.map((person) => person.id));
  for (const snapshot of current.docs) {
    if (!replacementIds.has(snapshot.id)) batch.delete(snapshot.ref);
  }
  for (const person of seedMembers) {
    batch.set(members.doc(person.id), memberData(person, now));
  }
  await batch.commit();

  const verified = await members.get();
  verifyMemberIds(currentIds.length, verified.docs.map((snapshot) => snapshot.id));
}

function firestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(firestoreValue) } };
  }
  return {
    mapValue: {
      fields: Object.fromEntries(
        Object.entries(value).map(([key, nestedValue]) => [
          key,
          firestoreValue(nestedValue),
        ]),
      ),
    },
  };
}

async function listFirestoreDocuments(base, headers) {
  const documents = [];
  let pageToken = '';
  do {
    const query = new URLSearchParams({ pageSize: '500' });
    if (pageToken) query.set('pageToken', pageToken);
    const response = await fetch(
      `${base}/families/${familyId}/members?${query}`,
      { headers },
    );
    if (!response.ok) {
      throw new Error(`Không thể đọc hồ sơ hiện tại (${response.status}).`);
    }
    const data = await response.json();
    documents.push(...(data.documents || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return documents;
}

async function replaceWithFirebaseCli() {
  const require = createRequire(import.meta.url);
  const auth = require('firebase-tools/lib/auth');
  const api = require('firebase-tools/lib/apiv2');
  const account = auth.getProjectDefaultAccount(process.cwd());

  if (!account) {
    throw new Error('Firebase CLI chưa đăng nhập. Hãy chạy `pnpm firebase:login`.');
  }

  auth.setActiveAccount({}, account);
  const accessToken = await api.getAccessToken();
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
  const current = await listFirestoreDocuments(base, headers);
  const currentIds = current.map((document) => document.name.split('/').at(-1));
  assertAtomicWriteSize(currentIds);

  const familyPath = `projects/${projectId}/databases/(default)/documents/families/${familyId}`;
  const replacementIds = new Set(seedMembers.map((person) => person.id));
  const now = new Date().toISOString();
  const writes = [
    ...current
      .filter((document) => !replacementIds.has(document.name.split('/').at(-1)))
      .map((document) => ({ delete: document.name })),
    ...seedMembers.map((person) => ({
      update: {
        name: `${familyPath}/members/${person.id}`,
        fields: Object.fromEntries(
          Object.entries(memberData(person, now)).map(([key, value]) => [
            key,
            key === 'createdAt' || key === 'updatedAt'
              ? { timestampValue: value }
              : firestoreValue(value),
          ]),
        ),
      },
    })),
  ];
  const commit = await fetch(`${base}:commit`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ writes }),
  });
  if (!commit.ok) {
    throw new Error(`Không thể thay dữ liệu Firestore (${commit.status}).`);
  }

  const verified = await listFirestoreDocuments(base, headers);
  verifyMemberIds(currentIds.length, verified.map((document) => document.name.split('/').at(-1)));
}

function verifyMemberIds(previousCount, nextIds) {
  const expectedIds = new Set(seedMembers.map((person) => person.id));
  const actualIds = new Set(nextIds);
  if (
    actualIds.size !== expectedIds.size ||
    [...expectedIds].some((id) => !actualIds.has(id))
  ) {
    throw new Error('Không thể xác minh đầy đủ dữ liệu sau khi thay thế.');
  }
  console.log(
    `Replaced ${previousCount} existing members with ${actualIds.size} members in families/${familyId}.`,
  );
}

if (credentials) await replaceWithServiceAccount();
else await replaceWithFirebaseCli();
