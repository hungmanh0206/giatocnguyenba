import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID;
const superAdminUid = process.env.FIREBASE_SUPER_ADMIN_UID;
const familyId = process.env.FIREBASE_FAMILY_ID || 'nguyen-ba';
const credentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!projectId || !superAdminUid || !credentials) {
  throw new Error(
    'Set FIREBASE_PROJECT_ID, FIREBASE_SUPER_ADMIN_UID and FIREBASE_SERVICE_ACCOUNT_JSON before bootstrapping.',
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
    superAdminUid,
    createdAt: now,
    updatedAt: now,
  },
  { merge: true },
);

batch.set(
  family.collection('memberships').doc(superAdminUid),
  {
    role: 'super_admin',
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
      nameKnown: person.nameKnown ?? true,
      tabooName: person.tabooName ?? null,
      styleName: person.styleName ?? null,
      siblingOrder: person.siblingOrder ?? null,
      born: person.born ?? null,
      died: person.died ?? null,
      diedText: person.diedText ?? null,
      lifeStatus: person.lifeStatus ?? null,
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
console.log(
  `Seeded ${seedMembers.length} members in families/${familyId} for super admin ${superAdminUid}.`,
);
