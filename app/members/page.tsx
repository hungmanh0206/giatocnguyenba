import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/family-tree?view=list');
}
