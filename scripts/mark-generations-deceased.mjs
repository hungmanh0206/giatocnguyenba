import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const projectId =
  process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const familyId =
  process.env.FIREBASE_FAMILY_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_FAMILY_ID ||
  'nguyen-ba';
const credentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const dryRun = process.argv.includes('--dry-run');
const { seedMembers } = await import('../lib/family.ts');

if (!projectId || !credentials) {
  throw new Error('Firebase Admin chưa được cấu hình.');
}

const targets = seedMembers.filter(
  (person) => person.generation === 2 || person.generation === 3,
);
const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert(JSON.parse(credentials)),
      projectId,
    });
const db = getFirestore(app);
const members = db.collection('families').doc(familyId).collection('members');
const snapshots = await Promise.all(targets.map((person) => members.doc(person.id).get()));
const existing = snapshots.filter((snapshot) => snapshot.exists);
const missing = snapshots
  .filter((snapshot) => !snapshot.exists)
  .map((snapshot) => snapshot.id);

console.log(
  `Đã kiểm tra ${targets.length} hồ sơ đời 2 và 3; cập nhật trạng thái cho ${existing.length} hồ sơ hiện có.`,
);
if (missing.length) console.log(`Không chạm tới hồ sơ không tồn tại: ${missing.join(', ')}.`);
if (dryRun) process.exit(0);

const batch = db.batch();
const now = Timestamp.now();
for (const snapshot of existing) {
  batch.update(snapshot.ref, {
    lifeStatus: 'deceased',
    updatedAt: now,
  });
}
await batch.commit();
console.log('Đã đánh dấu Đã mất cho đời 2 và 3; ngày tháng năm mất giữ nguyên.');
