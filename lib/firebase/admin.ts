import {
  cert,
  getApps,
  initializeApp,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const projectId =
  process.env.FIREBASE_PROJECT_ID?.trim() ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();

function serviceAccount() {
  const value = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!value) {
    throw new Error('Firebase Admin chưa được cấu hình.');
  }

  try {
    return JSON.parse(value) as ServiceAccount;
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON không hợp lệ.');
  }
}

export function getFirebaseAdminServices() {
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID chưa được cấu hình.');
  }

  const app =
    getApps()[0] ||
    initializeApp({
      credential: cert(serviceAccount()),
      projectId,
    });

  return {
    auth: getAuth(app),
    db: getFirestore(app),
  };
}
