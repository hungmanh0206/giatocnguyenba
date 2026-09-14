import 'server-only';

import { seedMembers, type Member } from '@/lib/family';
import { getFirebaseAdminServices } from '@/lib/firebase/admin';
import { firebaseFamilyId } from '@/lib/firebase/config';
import { firestoreMember } from '@/lib/firebase/firestore';

async function withinTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Firebase Admin timed out.')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function loadFamilyMembers(): Promise<Member[]> {
  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await withinTimeout(
      db
        .collection('families')
        .doc(process.env.FIREBASE_FAMILY_ID?.trim() || firebaseFamilyId)
        .collection('members')
        .get(),
      5_000,
    );
    const members = snapshot.docs
      .map((document) => firestoreMember(document.id, document.data() as never))
      .filter((member): member is Member => Boolean(member));
    return members.length ? members : seedMembers;
  } catch {
    // The demo data remains the server-side fallback when Admin Firebase is unavailable.
    return seedMembers;
  }
}
