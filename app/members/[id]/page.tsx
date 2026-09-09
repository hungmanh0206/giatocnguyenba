import { MemberDetail } from '@/components/genealogy/members';
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MemberDetail id={id} />;
}
