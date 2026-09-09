# Firebase setup

The app uses Cloud Firestore for genealogy data and Firebase Authentication for access control. It does not allow public writes.

1. In the [Firebase console](https://console.firebase.google.com/), create a project, register a Web app, enable Cloud Firestore in production mode, and enable Google sign-in in Authentication.
2. Copy the web app configuration into `.env.local` from `.env.example`. In Vercel, create the same `NEXT_PUBLIC_FIREBASE_*` variables for Production, Preview, and Development.
3. Run `pnpm firebase:login`, copy `.firebaserc.example` to `.firebaserc`, replace its project ID, then run `pnpm firebase:deploy:rules` to deploy the Firestore rules and indexes.
4. Sign in once through the website with the Google account that will own the family. Find that account's UID in Firebase Authentication, then create a Firebase service-account JSON in Project settings > Service accounts.
5. Run `pnpm firebase:bootstrap` with `FIREBASE_PROJECT_ID`, `FIREBASE_OWNER_UID`, and `FIREBASE_SERVICE_ACCOUNT_JSON` set in the shell. This creates `families/nguyen-ba`, gives that UID the `owner` role, and imports the 38 sample records.
6. Add trusted relatives under `families/nguyen-ba/memberships/{uid}` with role `viewer` or `editor`. Only `owner` and `editor` can modify records.

Never store the service-account JSON or `.env.local` in Git or Vercel's browser-visible environment variables. The Web configuration is public by design; the service-account credential is not.

The Firestore schema is:

```
families/{familyId}
families/{familyId}/members/{memberId}
families/{familyId}/memberships/{uid}
```
