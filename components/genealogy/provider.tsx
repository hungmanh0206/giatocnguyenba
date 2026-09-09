'use client';

import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { seedMembers, validateMember, type Member } from '@/lib/family';
import {
  firebaseConfigurationError,
  isFirebaseConfigured,
} from '@/lib/firebase/config';
import {
  getFirebaseServices,
  signInWithGoogle,
  signOutFromFirebase,
} from '@/lib/firebase/client';
import {
  saveFirestoreMember,
  subscribeToFamilyMembers,
} from '@/lib/firebase/firestore';

export type FamilyConnection = {
  mode: 'demo' | 'auth-required' | 'loading' | 'connected' | 'error';
  message?: string;
  user: Pick<User, 'uid' | 'displayName' | 'email'> | null;
};

type FamilyContextValue = {
  members: Member[];
  connection: FamilyConnection;
  save: (person: Member) => Promise<string | null>;
  reset: () => void;
  signIn: () => Promise<string | null>;
  signOut: () => Promise<void>;
};

const demoConnection: FamilyConnection = { mode: 'demo', user: null };

const FamilyContext = createContext<FamilyContextValue>({
  members: seedMembers,
  connection: demoConnection,
  save: async () => null,
  reset: () => {},
  signIn: async () => null,
  signOut: async () => {},
});

function messageFor(error: unknown) {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String(error.code)
      : '';
  if (code.includes('permission-denied')) {
    return 'Tài khoản này chưa được cấp quyền xem hoặc sửa gia phả.';
  }
  if (code.includes('popup-closed-by-user')) {
    return 'Đăng nhập đã được đóng trước khi hoàn tất.';
  }
  if (code.includes('unauthorized-domain')) {
    return 'Tên miền này chưa được thêm vào danh sách miền được phép của Firebase Authentication.';
  }
  return 'Không thể kết nối Firebase. Kiểm tra cấu hình, quyền truy cập và kết nối mạng.';
}

export function FamilyProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>(() =>
    isFirebaseConfigured ? [] : seedMembers,
  );
  const [user, setUser] = useState<FamilyConnection['user']>(null);
  const [connection, setConnection] = useState<FamilyConnection>(() => {
    if (firebaseConfigurationError) {
      return { mode: 'error', message: firebaseConfigurationError, user: null };
    }
    return isFirebaseConfigured
      ? { mode: 'loading', user: null }
      : demoConnection;
  });

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    try {
      const { auth } = getFirebaseServices();
      return onAuthStateChanged(auth, (nextUser) => {
        const safeUser = nextUser
          ? {
              uid: nextUser.uid,
              displayName: nextUser.displayName,
              email: nextUser.email,
            }
          : null;
        setUser(safeUser);
        if (!safeUser) {
          setMembers([]);
          setConnection({ mode: 'auth-required', user: null });
        }
      });
    } catch (error) {
      setConnection({ mode: 'error', message: messageFor(error), user: null });
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !user) return;

    try {
      const { db } = getFirebaseServices();
      setConnection({ mode: 'loading', user });
      return subscribeToFamilyMembers(
        db,
        (nextMembers) => {
          setMembers(nextMembers);
          setConnection({ mode: 'connected', user });
        },
        (error) => {
          setMembers([]);
          setConnection({ mode: 'error', message: messageFor(error), user });
        },
      );
    } catch (error) {
      setConnection({ mode: 'error', message: messageFor(error), user });
    }
  }, [user]);

  async function save(person: Member) {
    const error = validateMember(person, members);
    if (error) return error;

    if (firebaseConfigurationError) return firebaseConfigurationError;
    if (!isFirebaseConfigured) {
      setMembers((current) => [
        ...current
          .filter((member) => member.id !== person.id)
          .map((member) => ({
            ...member,
            spouses: person.spouses.includes(member.id)
              ? [...new Set([...member.spouses, person.id])]
              : member.spouses.filter((id) => id !== person.id),
          })),
        person,
      ]);
      return null;
    }

    if (!user) return 'Hãy đăng nhập trước khi cập nhật gia phả.';
    if (connection.mode !== 'connected') {
      return (
        connection.message ||
        'Firestore đang đồng bộ. Vui lòng thử lại sau ít phút.'
      );
    }

    try {
      const { db } = getFirebaseServices();
      await saveFirestoreMember(db, person);
      return null;
    } catch (error) {
      return messageFor(error);
    }
  }

  async function signIn() {
    if (!isFirebaseConfigured) {
      return 'Firebase chưa được cấu hình trên môi trường này.';
    }
    try {
      await signInWithGoogle();
      return null;
    } catch (error) {
      const message = messageFor(error);
      setConnection({ mode: 'auth-required', message, user: null });
      return message;
    }
  }

  async function signOut() {
    if (!isFirebaseConfigured) return;
    await signOutFromFirebase();
  }

  return (
    <FamilyContext.Provider
      value={{
        members,
        connection,
        save,
        reset: () => setMembers(seedMembers),
        signIn,
        signOut,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
}

export const useFamily = () => useContext(FamilyContext);
