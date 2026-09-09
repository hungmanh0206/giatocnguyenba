export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
};

const publicEnvironment = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_FAMILY_ID: process.env.NEXT_PUBLIC_FIREBASE_FAMILY_ID,
};

const requiredKeys = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

const read = (key: keyof typeof publicEnvironment) =>
  publicEnvironment[key]?.trim() || undefined;
const present = requiredKeys.filter((key) => Boolean(read(key)));

export const firebaseConfigurationError =
  present.length > 0 && present.length < requiredKeys.length
    ? `Thiếu ${requiredKeys.filter((key) => !read(key)).join(', ')}`
    : null;

export const isFirebaseConfigured =
  present.length === requiredKeys.length && !firebaseConfigurationError;

export const firebaseConfig: FirebaseWebConfig | null = isFirebaseConfigured
  ? {
      apiKey: read('NEXT_PUBLIC_FIREBASE_API_KEY')!,
      authDomain: read('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN')!,
      projectId: read('NEXT_PUBLIC_FIREBASE_PROJECT_ID')!,
      appId: read('NEXT_PUBLIC_FIREBASE_APP_ID')!,
      storageBucket: read('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: read('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    }
  : null;

export const firebaseFamilyId =
  read('NEXT_PUBLIC_FIREBASE_FAMILY_ID') || 'nguyen-ba';
