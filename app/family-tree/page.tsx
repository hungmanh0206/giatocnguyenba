import { TreePage } from '@/components/genealogy/tree';
import { Suspense } from 'react';
export default function Page() {
  return (
    <Suspense fallback={<main id="main" className="tree-page" />}>
      <TreePage />
    </Suspense>
  );
}
