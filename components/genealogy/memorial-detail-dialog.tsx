'use client';

import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { dateLabel } from '@/lib/lunar';
import {
  memberBranchName,
  memberName,
  type Member,
} from '@/lib/family';
import type { UpcomingFamilyEvent } from '@/lib/lunar-calendar/types';
import { HeritageIcon } from './heritage-icon';
import { Avatar } from './member-avatar';

export function memorialRelationship(
  event: UpcomingFamilyEvent,
  members: Member[],
) {
  if (!event.event.person) {
    return 'Ngày tưởng niệm chung của toàn dòng họ Nguyễn Bá.';
  }

  const person = event.event.person;
  const parents = person.parents
    .map((id) => members.find((member) => member.id === id))
    .filter((parent): parent is Member => Boolean(parent));
  const spouses = person.spouses
    .map((id) => members.find((member) => member.id === id))
    .filter((spouse): spouse is Member => Boolean(spouse));
  const lineage = `Đời ${person.generation} · ${memberBranchName(person, members)}`;
  const parentLine = parents.length
    ? `Con của ${parents.map(memberName).join(' và ')}.`
    : `Thuộc ${lineage.toLowerCase()}.`;
  const spouseLine = spouses.length
    ? ` Phối ngẫu với ${spouses.map(memberName).join(' và ')}.`
    : '';

  return `${lineage}. ${parentLine}${spouseLine}`;
}

export function MemorialDetailDialog({
  activeEvent,
  members,
  onOpenChange,
}: {
  activeEvent: UpcomingFamilyEvent | null;
  members: Member[];
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(activeEvent)} onOpenChange={onOpenChange}>
      {activeEvent && (
        <DialogContent
          className="memorial-detail-dialog"
          closeIcon={<HeritageIcon name="close" size={18} />}
        >
          <DialogHeader className="memorial-detail-header">
            <div className="memorial-detail-icon" aria-hidden="true">
              {activeEvent.event.person ? (
                <Avatar person={activeEvent.event.person} large />
              ) : (
                <HeritageIcon name="memorial" size={28} />
              )}
            </div>
            <div>
              <span className="eyebrow">NGÀY GIỖ</span>
              <DialogTitle>
                {activeEvent.event.person
                  ? memberName(activeEvent.event.person)
                  : activeEvent.event.title}
              </DialogTitle>
              <DialogDescription>
                {activeEvent.event.person
                  ? `Ngày tưởng niệm của ${memberName(activeEvent.event.person)}.`
                  : 'Ngày tưởng niệm chung của dòng họ Nguyễn Bá.'}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="memorial-detail-date">
            <span>
              <small>Âm lịch</small>
              <strong>
                {activeEvent.event.lunarDay} tháng {activeEvent.event.lunarMonth}
              </strong>
            </span>
            <span>
              <small>Dương lịch năm nay</small>
              <strong>{dateLabel(activeEvent.date)}</strong>
            </span>
            <span>
              <small>Thời điểm</small>
              <strong>
                {activeEvent.daysAway === 0
                  ? 'Hôm nay'
                  : `Còn ${activeEvent.daysAway} ngày`}
              </strong>
            </span>
          </div>

          <section className="memorial-detail-relationship">
            <h3>
              <HeritageIcon name="tree" size={18} /> Quan hệ trong gia phả
            </h3>
            <p>{memorialRelationship(activeEvent, members)}</p>
            {activeEvent.isApproximate && (
              <p className="memorial-detail-note">
                Tháng âm lịch này thiếu ngày 30, ngày giỗ được tính vào ngày 29.
              </p>
            )}
          </section>

          {activeEvent.event.person && (
            <Link
              className="memorial-detail-profile-link"
              href={`/members/${activeEvent.event.person.id}`}
            >
              Xem hồ sơ thành viên
              <HeritageIcon name="next" size={17} />
            </Link>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
