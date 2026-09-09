import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig, isFirebaseConfigured } from './config';

function getFirebaseApp() {
  if (!isFirebaseConfigured || !firebaseConfig) {
    throw new Error('Firebase chưa được cấu hình đầy đủ.');
  }

  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseServices() {
  const app = getFirebaseApp();
  return { app, auth: getAuth(app), db: getFirestore(app) };
}

export async function signInWithGoogle(): Promise<User> {
  const { auth } = getFirebaseServices();
  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  return result.user;
}

export async function signOutFromFirebase() {
  const { auth } = getFirebaseServices();
  await signOut(auth);
}
