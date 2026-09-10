import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { createRequire } from 'node:module';

const projectId =
  process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const superAdminUid =
  process.argv.slice(2).find((argument) => argument !== '--') ||
  process.env.FIREBASE_SUPER_ADMIN_UID;
const familyId =
  process.env.FIREBASE_FAMILY_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_FAMILY_ID ||
  'nguyen-ba';
const credentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!projectId || !superAdminUid) {
  throw new Error(
    'Set FIREBASE_PROJECT_ID and provide FIREBASE_SUPER_ADMIN_UID (or pass it as the first argument).',
  );
}

async function grantWithServiceAccount() {
  const serviceAccount = JSON.parse(credentials);
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: cert(serviceAccount), projectId });
  const db = getFirestore(app);
  const now = Timestamp.now();
  const family = db.collection('families').doc(familyId);
  const current = await family.get();
  const previousAdminUid = current.exists
    ? String(current.data().superAdminUid || '')
    : '';
  const batch = db.batch();

  batch.set(
    family,
    {
      ...(current.exists
        ? {}
        : {
            name: 'Họ Nguyễn Bá',
            slug: familyId,
            createdAt: now,
          }),
      superAdminUid,
      updatedAt: now,
    },
    { merge: true },
  );
  batch.set(
    family.collection('memberships').doc(superAdminUid),
    { role: 'super_admin', createdAt: now, updatedAt: now },
    { merge: true },
  );

  if (previousAdminUid && previousAdminUid !== superAdminUid) {
    batch.delete(family.collection('memberships').doc(previousAdminUid));
  }

  await batch.commit();
  const [updatedFamily, updatedMembership] = await Promise.all([
    family.get(),
    family.collection('memberships').doc(superAdminUid).get(),
  ]);
  if (
    updatedFamily.data()?.superAdminUid !== superAdminUid ||
    updatedMembership.data()?.role !== 'super_admin'
  ) {
    throw new Error('Không thể xác minh quyền super admin sau khi cập nhật.');
  }
}

async function grantWithFirebaseCli() {
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
  const familyName = `projects/${projectId}/databases/(default)/documents/families/${familyId}`;
  const familyResponse = await fetch(`${base}/families/${familyId}`, { headers });
  const current = familyResponse.ok ? await familyResponse.json() : null;
  if (!familyResponse.ok && familyResponse.status !== 404) {
    throw new Error(`Không thể đọc gia phả (${familyResponse.status}).`);
  }

  const now = new Date().toISOString();
  const previousAdminUid = current?.fields?.superAdminUid?.stringValue || '';
  const writes = [
    {
      update: {
        name: familyName,
        fields: {
          superAdminUid: { stringValue: superAdminUid },
          updatedAt: { timestampValue: now },
        },
      },
      updateMask: { fieldPaths: ['superAdminUid', 'updatedAt'] },
    },
    {
      update: {
        name: `${familyName}/memberships/${superAdminUid}`,
        fields: {
          role: { stringValue: 'super_admin' },
          createdAt: { timestampValue: now },
          updatedAt: { timestampValue: now },
        },
      },
      updateMask: { fieldPaths: ['role', 'createdAt', 'updatedAt'] },
    },
  ];

  if (previousAdminUid && previousAdminUid !== superAdminUid) {
    writes.push({ delete: `${familyName}/memberships/${previousAdminUid}` });
  }

  const commit = await fetch(`${base}:commit`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ writes }),
  });
  if (!commit.ok) {
    throw new Error(`Không thể cấp quyền quản trị (${commit.status}).`);
  }
  const [updatedFamily, updatedMembership] = await Promise.all([
    fetch(`${base}/families/${familyId}`, { headers }),
    fetch(`${base}/families/${familyId}/memberships/${superAdminUid}`, {
      headers,
    }),
  ]);
  if (!updatedFamily.ok || !updatedMembership.ok) {
    throw new Error('Không thể xác minh quyền super admin sau khi cập nhật.');
  }
  const [familyData, membershipData] = await Promise.all([
    updatedFamily.json(),
    updatedMembership.json(),
  ]);
  if (
    familyData.fields?.superAdminUid?.stringValue !== superAdminUid ||
    membershipData.fields?.role?.stringValue !== 'super_admin'
  ) {
    throw new Error('Không thể xác minh quyền super admin sau khi cập nhật.');
  }
}

if (credentials) await grantWithServiceAccount();
else await grantWithFirebaseCli();
console.log(`Granted super admin access for families/${familyId}.`);
