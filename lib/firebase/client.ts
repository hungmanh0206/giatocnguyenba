import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  getAuth,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
  updatePassword,
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

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<User> {
  const { auth } = getFirebaseServices();
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function requestPasswordReset(email: string) {
  const { auth } = getFirebaseServices();
  auth.languageCode = 'vi';
  await sendPasswordResetEmail(auth, email);
}

export async function changeFirebasePassword(
  currentPassword: string,
  nextPassword: string,
) {
  const { auth } = getFirebaseServices();
  const user = auth.currentUser;

  if (!user?.email) {
    throw new Error('Tài khoản hiện tại không có địa chỉ email để đổi mật khẩu.');
  }

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, nextPassword);
}

export async function signOutFromFirebase() {
  const { auth } = getFirebaseServices();
  await signOut(auth);
}
