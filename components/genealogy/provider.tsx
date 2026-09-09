'use client';

import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { canEditFamily, type FamilyRole } from '@/lib/access';
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
  subscribeToFamilyRole,
} from '@/lib/firebase/firestore';

export type FamilyConnection = {
  mode: 'demo' | 'loading' | 'connected' | 'error';
  message?: string;
  user: Pick<User, 'uid' | 'displayName' | 'email'> | null;
  role: FamilyRole | null;
  roleLoading: boolean;
  roleMessage?: string;
};

type FamilyContextValue = {
  members: Member[];
  connection: FamilyConnection;
  save: (person: Member) => Promise<string | null>;
  reset: () => void;
  signIn: () => Promise<string | null>;
  signOut: () => Promise<void>;
};

const demoConnection: FamilyConnection = {
  mode: 'demo',
  user: null,
  role: null,
  roleLoading: false,
};

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
    return 'Tài khoản này chưa được cấp quyền quản trị gia phả.';
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
  const [role, setRole] = useState<FamilyRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleMessage, setRoleMessage] = useState<string | undefined>();
  const [dataStatus, setDataStatus] = useState<
    Pick<FamilyConnection, 'mode' | 'message'>
  >(() => {
    if (firebaseConfigurationError) {
      return { mode: 'error', message: firebaseConfigurationError };
    }
    return isFirebaseConfigured ? { mode: 'loading' } : { mode: 'demo' };
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
        setRole(null);
        setRoleMessage(undefined);
        setRoleLoading(Boolean(safeUser));
      });
    } catch (error) {
      setDataStatus({ mode: 'error', message: messageFor(error) });
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    try {
      const { db } = getFirebaseServices();
      return subscribeToFamilyMembers(
        db,
        (nextMembers) => {
          setMembers(nextMembers);
          setDataStatus({ mode: 'connected' });
        },
        (error) => {
          setMembers([]);
          setDataStatus({ mode: 'error', message: messageFor(error) });
        },
      );
    } catch (error) {
      setDataStatus({ mode: 'error', message: messageFor(error) });
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !user) return;

    try {
      const { db } = getFirebaseServices();
      setRoleLoading(true);
      return subscribeToFamilyRole(
        db,
        user.uid,
        (nextRole) => {
          setRole(nextRole);
          setRoleLoading(false);
          setRoleMessage(
            nextRole
              ? undefined
              : 'Tài khoản này chưa được cấp quyền quản trị gia phả.',
          );
        },
        (error) => {
          setRole(null);
          setRoleLoading(false);
          setRoleMessage(messageFor(error));
        },
      );
    } catch (error) {
      setRole(null);
      setRoleLoading(false);
      setRoleMessage(messageFor(error));
    }
  }, [user]);

  const connection: FamilyConnection = {
    ...dataStatus,
    user,
    role,
    roleLoading,
    roleMessage,
  };

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

    if (!user) return 'Hãy đăng nhập tài khoản quản trị trước khi cập nhật.';
    if (!canEditFamily(role)) {
      return 'Tài khoản này không có quyền chỉnh sửa gia phả.';
    }
    if (connection.mode !== 'connected') {
      return connection.message || 'Dữ liệu đang tải. Vui lòng thử lại sau ít phút.';
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
      return messageFor(error);
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
