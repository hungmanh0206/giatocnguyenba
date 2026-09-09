import { MembersPage } from '@/components/genealogy/members';
import { Suspense } from 'react';
export default function Page() {
  return (
    <Suspense fallback={<main id="main" className="container page-space" />}>
      <MembersPage />
    </Suspense>
  );
}
