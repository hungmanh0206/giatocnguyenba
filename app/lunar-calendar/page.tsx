import { LunarPage } from '@/components/genealogy/lunar-calendar';
import { Suspense } from 'react';
export default function Page() {
  return (
    <Suspense fallback={<main id="main" className="container page-space" />}>
      <LunarPage />
    </Suspense>
  );
}
