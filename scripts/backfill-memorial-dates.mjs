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
  (person) => person.deathDate && person.deathDate.year === undefined,
);

if (!targets.length) {
  console.log('Không có ngày húy kỵ ngày/tháng cần đồng bộ.');
  process.exit(0);
}

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert(JSON.parse(credentials)),
      projectId,
    });
const db = getFirestore(app);
const members = db.collection('families').doc(familyId).collection('members');
const snapshots = await Promise.all(targets.map((person) => members.doc(person.id).get()));
const missing = snapshots
  .filter((snapshot) => !snapshot.exists)
  .map((snapshot) => snapshot.id);

console.log(
  `Đã kiểm tra ${targets.length} hồ sơ; cập nhật ngày húy kỵ cho ${targets.length - missing.length} hồ sơ hiện có.`,
);
if (missing.length) console.log(`Không chạm tới hồ sơ không tồn tại: ${missing.join(', ')}.`);
if (dryRun) process.exit(0);

const now = Timestamp.now();
const batch = db.batch();
for (const person of targets) {
  const snapshot = snapshots.find((item) => item.id === person.id);
  if (!snapshot?.exists || !person.deathDate) continue;
  batch.update(snapshot.ref, {
    deathDate: person.deathDate,
    anniversary: {
      day: person.deathDate.day,
      month: person.deathDate.month,
    },
    lifeStatus: 'deceased',
    updatedAt: now,
  });
}
await batch.commit();
console.log('Đã cập nhật an toàn các hồ sơ hiện có; không tạo hay xóa thành viên.');
