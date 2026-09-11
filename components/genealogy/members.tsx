'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFamily } from './provider';
import { Avatar, MemberTile } from './home';
import { Footer } from './header';
import { HeritageIcon } from './heritage-icon';
import {
  Choice,
  branchOptions,
  generationOptions,
  ResultsPagination,
  SearchBox,
  EmptyState,
} from './common';
import {
  memberBranchName,
  memberBirthLabel,
  memberDeathLabel,
  memberLifeStatus,
  memberName,
  memberSortYear,
  memberYearRange,
  relatives,
  searchMembers,
  type Member,
} from '@/lib/family';
export function MembersPage({ embedded = false }: { embedded?: boolean }) {
  const { members } = useFamily();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [branch, setBranch] = useState('all');
  const [generation, setGeneration] = useState('all');
  const [view, setView] = useState('grid');
  const [pageSize, setPageSize] = useState('10');
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [query, branch, generation, pageSize]);
  const filtered = searchMembers(members, query)
    .filter(
      (p) =>
        (branch === 'all' || p.branch === Number(branch)) &&
        (generation === 'all' || p.generation === Number(generation)),
    )
    .sort(
      (a, b) =>
        a.generation - b.generation || memberSortYear(a) - memberSortYear(b),
    );
  const generationCount = members.length
    ? Math.max(...members.map((member) => member.generation))
    : 0;
  const branchCount = new Set(
    members.filter((member) => member.branch > 0).map((member) => member.branch),
  ).size;
  const size = pageSize === 'all' ? Math.max(1, filtered.length) : Number(pageSize);
  const total = Math.max(1, Math.ceil(filtered.length / size));
  const currentPage = Math.min(page, total);
  const pageMembers = filtered.slice((currentPage - 1) * size, currentPage * size);
  const PageFrame = embedded ? 'section' : 'main';

  return (
    <PageFrame id={embedded ? undefined : 'main'} className={embedded ? 'members-tab' : undefined}>
      <div className="container page-space">
        <div className="page-heading">
          <div>
            <div className="eyebrow">NHỮNG NGƯỜI CHUNG CỘI NGUỒN</div>
            <h1>Thành viên dòng họ</h1>
            <p>{members.length} thành viên · {generationCount} thế hệ · {branchCount} chi</p>
          </div>
        </div>
        <div className="filter-bar">
          <SearchBox query={query} setQuery={setQuery} />
          <Choice
            label="Lọc theo chi"
            value={branch}
            onChange={setBranch}
            options={branchOptions}
          />
          <Choice
            label="Lọc theo đời"
            value={generation}
            onChange={setGeneration}
            options={generationOptions.filter(
              (o) => o.value === 'all' || Number(o.value) <= 5,
            )}
          />
        </div>
        <div className="results-summary">
          <span>
            {filtered.length} thành viên{query && ` cho “${query}”`}
          </span>
          <div className="view-toggle" role="group" aria-label="Kiểu hiển thị">
            <span className="view-toggle-label">Hiển thị</span>
            <Button
              variant="ghost"
              className="view-toggle-button"
              data-active={view === 'grid'}
              aria-label="Dạng thẻ"
              aria-pressed={view === 'grid'}
              title="Dạng thẻ"
              onClick={() => setView('grid')}
            >
              <HeritageIcon name="grid" size={18} />
            </Button>
            <Button
              variant="ghost"
              className="view-toggle-button"
              data-active={view === 'list'}
              aria-label="Danh sách"
              aria-pressed={view === 'list'}
              title="Danh sách"
              onClick={() => setView('list')}
            >
              <HeritageIcon name="list" size={18} />
            </Button>
          </div>
        </div>
        {!filtered.length ? (
          <EmptyState
            onReset={() => {
              setQuery('');
              setBranch('all');
              setGeneration('all');
            }}
          />
        ) : (
          view === 'list' ? (
            <div
              className="member-directory"
              key="member-directory"
              role="list"
              aria-label="Danh sách thành viên"
            >
              <div className="member-directory-heading" aria-hidden="true">
                <span>Thành viên</span>
                <span>Đời</span>
                <span>Nhánh</span>
                <span>Năm sinh</span>
                <span>Hồ sơ</span>
              </div>
              {pageMembers.map((p) => (
                <Link
                  href={`/members/${p.id}`}
                  className={`member-list-row branch-${p.branch}`}
                  key={p.id}
                  role="listitem"
                >
                  <span className="member-list-person">
                    <Avatar person={p} />
                    <span>
                      <strong>{memberName(p)}</strong>
                      <small>
                        Đời thứ {p.generation} · {memberBranchName(p, members)} ·{' '}
                        {memberYearRange(p)}
                      </small>
                    </span>
                  </span>
                  <span className="member-list-generation">Đời thứ {p.generation}</span>
                  <span className="member-list-branch">{memberBranchName(p, members)}</span>
                  <span className="member-list-born">{memberBirthLabel(p)}</span>
                  <span className="member-list-open">
                    <span>Xem hồ sơ</span>
                    <HeritageIcon name="next" size={16} />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="member-results" key="member-grid">
              {pageMembers.map((p) => (
                <Link
                  href={`/members/${p.id}`}
                  className={`person-card branch-${p.branch}`}
                  key={p.id}
                >
                  <div className="person-card-top">
                    <Avatar person={p} />
                    <span className="branch-badge">{memberBranchName(p, members)}</span>
                  </div>
                  <h3>{memberName(p)}</h3>
                  <p>{memberYearRange(p)}</p>
                  <div className="person-card-bottom">
                    <span>
                      <HeritageIcon name="profile" size={14} /> Đời thứ {p.generation}
                    </span>
                    <HeritageIcon name="next" size={17} />
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
        <ResultsPagination
          page={currentPage}
          total={total}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      </div>
      {!embedded && <Footer />}
    </PageFrame>
  );
}
export function FamilyRelations({
  person,
  onSelect,
}: {
  person: Member;
  onSelect?: (p: Member) => void;
}) {
  const { members } = useFamily();
  const family = relatives(members, person);
  return (
    <div className="family-relations">
      {(
        [
          { key: 'parents', label: 'Cha mẹ' },
          { key: 'spouses', label: 'Vợ / chồng' },
          { key: 'children', label: 'Con' },
          { key: 'siblings', label: 'Anh chị em' },
        ] as const
      ).map(({ key, label }) => (
        <section key={key}>
          <h3>
            {label}
            <small>{family[key].length}</small>
          </h3>
          {family[key].length ? (
            family[key].map((p) =>
              onSelect ? (
                <button
                  className="relative-button"
                  key={p.id}
                  onClick={() => onSelect(p)}
                >
                  <Avatar person={p} />
                  <span>
                    <strong>{memberName(p)}</strong>
                    <small>
                      Đời {p.generation} · {memberBirthLabel(p)}
                    </small>
                  </span>
                  <HeritageIcon name="next" size={16} />
                </button>
              ) : (
                <MemberTile person={p} members={members} key={p.id} />
              ),
            )
          ) : (
            <p className="muted">Chưa có thông tin</p>
          )}
        </section>
      ))}
    </div>
  );
}
function Facts({ person, members }: { person: Member; members: Member[] }) {
  return (
    <dl className="person-facts">
      <div>
        <dt>Giới tính</dt>
        <dd>{person.gender === 'male' ? 'Nam' : 'Nữ'}</dd>
      </div>
      <div>
        <dt>Năm sinh</dt>
        <dd>
          {person.born === undefined ? 'Chưa rõ' : `Năm ${person.born}`}
        </dd>
      </div>
      <div>
        <dt>Đời / nhánh</dt>
        <dd>
          Đời {person.generation} · {memberBranchName(person, members)}
        </dd>
      </div>
      <div className="fact-hometown">
        <dt>Quê quán</dt>
        <dd>{person.hometown || 'Chưa cập nhật'}</dd>
      </div>
      {person.tabooName && (
        <div>
          <dt>Tên húy</dt>
          <dd>{person.tabooName}</dd>
        </div>
      )}
      {person.styleName && (
        <div>
          <dt>Hiệu</dt>
          <dd>{person.styleName}</dd>
        </div>
      )}
      <div>
        <dt>Tình trạng</dt>
        <dd>
          {memberLifeStatus(person) === 'living'
            ? 'Còn sống'
            : memberLifeStatus(person) === 'deceased'
              ? 'Đã mất'
              : 'Chưa rõ'}
        </dd>
      </div>
      {memberLifeStatus(person) === 'deceased' && (
        <div>
          <dt>Năm mất</dt>
          <dd>{memberDeathLabel(person)}</dd>
        </div>
      )}
      {person.anniversary && (
        <div>
          <dt>Ngày giỗ âm lịch</dt>
          <dd>
            {person.anniversary.day}/{person.anniversary.month}
          </dd>
        </div>
      )}
    </dl>
  );
}
export function MemberDetail({ id }: { id: string }) {
  const { members } = useFamily();
  const p = members.find((p) => p.id === id);
  if (!p)
    return (
      <main id="main" className="container page-space">
        <EmptyState
          title="Không tìm thấy hồ sơ"
          description="Hồ sơ có thể không tồn tại trong bản gia phả hiện tại."
        />
        <Link className="text-link" href="/family-tree?tab=members">
          <HeritageIcon name="previous" size={16} /> Về danh sách thành viên
        </Link>
      </main>
    );
  return (
    <main id="main">
      <div className="container page-space">
        <Link className="back-link" href="/family-tree?tab=members">
          <HeritageIcon name="previous" size={17} /> Thành viên dòng họ
        </Link>
        <div className="profile-hero">
          <div className="profile-identity">
            <Avatar person={p} large />
            <div className="profile-summary">
              <div className="eyebrow">
                ĐỜI THỨ {p.generation} ·{' '}
                {memberBranchName(p, members).toLocaleUpperCase('vi')}
              </div>
              <h1>{memberName(p)}</h1>
              <p>
                {memberYearRange(p)}
                <span>
                  <HeritageIcon name="location" size={15} />
                  {p.hometown || 'Chưa cập nhật quê quán'}
                </span>
              </p>
            </div>
          </div>
          <Button
            className="action-button profile-tree-button"
            render={<Link href={`/family-tree?person=${id}`} />}
            nativeButton={false}
          >
            <HeritageIcon name="tree" size={19} />
            Xem trên cây
          </Button>
        </div>
        <div className="profile-layout">
          <aside className="profile-info-panel">
            <h3>Thông tin gia phả</h3>
            <Facts person={p} members={members} />
            <div className="sample-note">Hồ sơ minh họa · Dữ liệu mẫu</div>
            {p.anniversary && (
              <Link
                className="memorial-link"
                href={`/lunar-calendar?person=${id}`}
              >
                <HeritageIcon name="memorial" size={20} />
                <span>
                  Ngày giỗ {p.anniversary.day}/{p.anniversary.month} âm lịch
                  <small>Xem ngày dương lịch tương ứng</small>
                </span>
                <HeritageIcon name="next" size={17} />
              </Link>
            )}
          </aside>
          <div className="profile-content-panel">
            <Tabs defaultValue="family">
              <TabsList variant="line" className="profile-tabs">
                <TabsTrigger value="family">Quan hệ gia đình</TabsTrigger>
                <TabsTrigger value="story">Tiểu sử</TabsTrigger>
              </TabsList>
              <TabsContent value="family">
                <FamilyRelations person={p} />
              </TabsContent>
              <TabsContent value="story">
                <article className="biography">
                  <h2>Cuộc đời và dấu ấn</h2>
                  <p>
                    {p.biography ||
                      'Chưa có tiểu sử được ghi nhận cho thành viên này.'}
                  </p>
                </article>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
export function QuickView({
  person,
  onClose,
  onSelect,
}: {
  person: Member | null;
  onClose: () => void;
  onSelect: (p: Member) => void;
}) {
  const { members } = useFamily();
  const mobile = useIsMobile();
  const profile = person && (
    <div className="quick-profile">
      <div className="quick-top">
        <Avatar person={person} large />
        <p>
          {memberYearRange(person)}
        </p>
      </div>
      <section className="quick-info-section" aria-label="Thông tin gia phả">
        <p className="quick-section-label">Thông tin gia phả</p>
        <Facts person={person} members={members} />
      </section>
      <section className="quick-relations-section" aria-label="Quan hệ gia đình">
        <p className="quick-section-label">Quan hệ gia đình</p>
        <FamilyRelations person={person} onSelect={onSelect} />
      </section>
    </div>
  );
  const actions = person && (
    <div className="quick-actions">
      <Button
        className="action-button w-full"
        render={<Link href={`/members/${person.id}`} />}
        nativeButton={false}
      >
        <HeritageIcon name="profile" size={20} />
        Xem hồ sơ đầy đủ
        <HeritageIcon name="next" size={20} />
      </Button>
    </div>
  );
  return mobile ? (
    <Drawer
      open={!!person}
      onOpenChange={(o) => !o && onClose()}
      snapPoints={[0.5, 0.9]}
      defaultSnapPoint={0.5}
      showSwipeHandle
    >
      <DrawerContent className="quick-drawer">
        <DrawerHeader>
          <p className="sheet-kicker">Hồ sơ thành viên</p>
          <DrawerTitle>{person ? memberName(person) : ''}</DrawerTitle>
          <DrawerDescription>
            Đời {person?.generation} · {person ? memberBranchName(person, members) : ''}
          </DrawerDescription>
        </DrawerHeader>
        <div className="quick-scroll">
          {profile}
          {actions}
          <DrawerClose
            render={
              <Button
                variant="outline"
                className="action-button quick-close w-full"
              />
            }
          >
            Đóng
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  ) : (
    <Sheet open={!!person} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="quick-sheet">
        <SheetHeader>
          <p className="sheet-kicker">Hồ sơ thành viên</p>
          <SheetTitle>{person ? memberName(person) : ''}</SheetTitle>
          <SheetDescription>
            Đời {person?.generation} · {person ? memberBranchName(person, members) : ''}
          </SheetDescription>
        </SheetHeader>
        <div className="quick-scroll">
          {profile}
          {actions}
        </div>
      </SheetContent>
    </Sheet>
  );
}
