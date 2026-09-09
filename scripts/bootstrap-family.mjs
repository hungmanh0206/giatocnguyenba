import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID;
const ownerUid = process.env.FIREBASE_OWNER_UID;
const familyId = process.env.FIREBASE_FAMILY_ID || 'nguyen-ba';
const credentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!projectId || !ownerUid || !credentials) {
  throw new Error(
    'Set FIREBASE_PROJECT_ID, FIREBASE_OWNER_UID and FIREBASE_SERVICE_ACCOUNT_JSON before bootstrapping.',
  );
}

const serviceAccount = JSON.parse(credentials);
const app = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: cert(serviceAccount), projectId });
const db = getFirestore(app);
const { seedMembers } = await import('../lib/family.ts');
const now = Timestamp.now();
const batch = db.batch();
const family = db.collection('families').doc(familyId);

batch.set(
  family,
  {
    name: 'Họ Nguyễn Bá',
    slug: familyId,
    createdAt: now,
    updatedAt: now,
  },
  { merge: true },
);

batch.set(
  family.collection('memberships').doc(ownerUid),
  {
    role: 'owner',
    createdAt: now,
    updatedAt: now,
  },
  { merge: true },
);

for (const person of seedMembers) {
  batch.set(
    family.collection('members').doc(person.id),
    {
      ...person,
      died: person.died ?? null,
      anniversary: person.anniversary ?? null,
      biography: person.biography ?? null,
      hometown: person.hometown ?? null,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );
}

await batch.commit();
console.log(`Seeded ${seedMembers.length} members in families/${familyId}.`);
