'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useFamily } from './provider';
import { Avatar } from './home';
import { HeritageIcon } from './heritage-icon';
import {
  Choice,
  SearchBox,
  EmptyState,
  branchOptions,
  generationOptions,
  pageSizeOptions,
  ResultsPagination,
} from './common';
import {
  UNKNOWN_MEMBER_NAME,
  eligibleBirthYears,
  eligibleBranches,
  eligibleGenerations,
  eligibleParents,
  eligibleSpouses,
  memberDeletionError,
  memberBirthLabel,
  memberDeathLabel,
  memberLifeStatus,
  memberBranchName,
  memberName,
  memberPositionLockMessage,
  searchMembers,
  branchName,
  type Member,
} from '@/lib/family';
import { canManageFamily } from '@/lib/access';
const blank = (): Member => ({
  id: crypto.randomUUID(),
  name: '',
  gender: '' as Member['gender'],
  isClanMember: true,
  lineageType: 'direct',
  generation: 0,
  branch: -1,
  born: undefined,
  lifeStatus: 'unknown',
  parents: [],
  spouses: [],
});

function deathFieldValue(person: Member) {
  return person.died !== undefined ? String(person.died) : person.diedText || '';
}

function deathFields(value: string) {
  const text = value.trim();
  return /^\d{4}$/.test(text)
    ? { died: Number(text), diedText: undefined }
    : { died: undefined, diedText: text || undefined };
}

const adminBranchOptions = [
  ...branchOptions,
  { value: 'external', label: 'Nhánh ngoại' },
];

const genderOptions = [
  { value: 'all', label: 'Tất cả giới tính' },
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'unknown', label: 'Chưa rõ giới tính' },
];

const lifeStatusOptions = [
  { value: 'all', label: 'Tất cả tình trạng' },
  { value: 'deceased', label: 'Đã mất' },
  { value: 'living', label: 'Còn sống' },
  { value: 'unknown', label: 'Chưa rõ tình trạng' },
];

export function AdminPage() {
  const { members, save, remove, connection } = useFamily();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [generationFilter, setGenerationFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [lifeStatusFilter, setLifeStatusFilter] = useState('all');
  const [pageSize, setPageSize] = useState('10');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState<Member | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingPending, setDeletingPending] = useState(false);
  const maxGeneration = Math.max(1, ...members.map((member) => member.generation));
  const filtered = searchMembers(members, query).filter(
    (member) =>
      (generationFilter === 'all' || member.generation === Number(generationFilter)) &&
      (branchFilter === 'all' ||
        (branchFilter === 'external'
          ? member.branch < 0
          : member.branch === Number(branchFilter))) &&
      (genderFilter === 'all' ||
        (genderFilter === 'unknown'
          ? !member.gender
          : member.gender === genderFilter)) &&
      (lifeStatusFilter === 'all' || memberLifeStatus(member) === lifeStatusFilter),
  );
  const size = pageSize === 'all' ? Math.max(1, filtered.length) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / size));
  const currentPage = Math.min(page, totalPages);
  const pageMembers = filtered.slice((currentPage - 1) * size, currentPage * size);
  const hasActiveFilters =
    !!query ||
    generationFilter !== 'all' ||
    branchFilter !== 'all' ||
    genderFilter !== 'all' ||
    lifeStatusFilter !== 'all';
  const membersById = new Map(members.map((member) => [member.id, member]));
  const birthYears = editing ? eligibleBirthYears(editing, members) : null;
  const existingEditing = editing
    ? members.find((member) => member.id === editing.id)
    : undefined;
  const positionLock = existingEditing
    ? memberPositionLockMessage(existingEditing, members)
    : null;
  const spouseLock = existingEditing && members.some((member) => member.parents.includes(existingEditing.id));
  const deletionError = existingEditing
    ? memberDeletionError(existingEditing, members)
    : null;
  function update<K extends keyof Member>(key: K, value: Member[K]) {
    setEditing((p) => (p ? { ...p, [key]: value } : null));
  }

  function updateParent(index: number, value: string) {
    setEditing((person) => {
      if (!person) return null;

      const parentSlots = [person.parents[0] || '', person.parents[1] || ''];
      parentSlots[index] = value === 'none' ? '' : value;
      let next = { ...person, parents: parentSlots.filter(Boolean) };

      if (
        next.parents.length === 2 &&
        !eligibleParents(next, members, index).some(
          (candidate) => candidate.id === next.parents[index],
        )
      ) {
        next = { ...next, parents: [next.parents[index]] };
      }

      const branches = eligibleBranches(next, members);
      return {
        ...next,
        branch: branches.includes(next.branch)
          ? next.branch
          : (branches[0] ?? -1),
      };
    });
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const person = {
      ...editing,
      name:
        editing.nameKnown === false
          ? UNKNOWN_MEMBER_NAME
          : editing.name.trim(),
      tabooName: editing.tabooName?.trim() || undefined,
      styleName: editing.styleName?.trim() || undefined,
      diedText: editing.diedText?.trim() || undefined,
    };
    const result = await save(person);
    setSaving(false);
    if (result) {
      setError(result);
      return;
    }
    setSuccess(
      connection.mode === 'demo'
        ? `Đã lưu hồ sơ ${memberName(person)} trong phiên dùng thử.`
        : `Đã đồng bộ hồ sơ ${memberName(person)} với Firestore.`,
    );
    setEditing(null);
    setError('');
  }

  async function confirmDelete() {
    if (!deleting) return;

    setDeletingPending(true);
    const result = await remove(deleting.id);
    setDeletingPending(false);
    if (result) {
      setError(result);
      return;
    }

    setSuccess(`Đã xóa hồ sơ ${memberName(deleting)}.`);
    setEditing((current) => (current?.id === deleting.id ? null : current));
    setDeleting(null);
    setError('');
  }

  async function copyUid() {
    if (!connection.user) return;
    try {
      await navigator.clipboard.writeText(connection.user.uid);
      setSuccess('Đã sao chép User UID.');
    } catch {
      setError('Không thể sao chép UID. Hãy chọn và sao chép thủ công.');
    }
  }

  const shouldRedirectHome = !connection.user && connection.mode !== 'loading';

  useEffect(() => {
    if (shouldRedirectHome) router.replace('/');
  }, [router, shouldRedirectHome]);

  useEffect(() => {
    setPage(1);
  }, [query, generationFilter, branchFilter, genderFilter, lifeStatusFilter, pageSize]);

  if (shouldRedirectHome) return null;

  if (!canManageFamily(connection.role)) {
    const checkingRole = connection.roleLoading;

    return (
      <main id="main" className="container page-space admin-page">
        <div className="page-heading">
          <div>
            <div className="eyebrow">KHU VỰC RIÊNG</div>
            <h1>Quản trị gia phả</h1>
            <p>Chỉ tài khoản super admin mới có thể thay đổi dữ liệu.</p>
          </div>
        </div>
        <div className="notice">
          <HeritageIcon name="security" size={20} />
          <div>
            <p>
              {checkingRole
                ? 'Đang kiểm tra quyền của tài khoản.'
                : connection.roleMessage ||
                  'Tài khoản này chưa có quyền super admin.'}
            </p>
            {connection.user && !checkingRole && (
              <p className="muted">
                User UID: <code>{connection.user.uid}</code>
              </p>
            )}
          </div>
          {connection.user && !checkingRole && (
            <Button
              className="action-button"
              variant="outline"
              onClick={() => void copyUid()}
            >
              <HeritageIcon name="link" size={16} />
              Sao chép UID
            </Button>
          )}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {success && (
          <div className="success-message" role="status">
            <Check size={18} />
            {success}
          </div>
        )}
      </main>
    );
  }

  return (
    <main id="main" className="container page-space admin-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">SUPER ADMIN</div>
          <h1>Quản trị gia phả</h1>
          <p>{members.length} hồ sơ trong dòng họ</p>
        </div>
        <Button
          className="action-button"
          disabled={connection.mode !== 'connected'}
          onClick={() => {
            setEditing(blank());
            setError('');
            setSuccess('');
          }}
        >
          <HeritageIcon name="add-member" size={20} />
          Thêm thành viên
        </Button>
      </div>
      <div className="notice">
        <HeritageIcon name="info" size={20} />
        <p>
          {connection.mode === 'demo'
            ? 'Chế độ dùng thử. Thay đổi chỉ có hiệu lực trong phiên này và sẽ mất khi tải lại trang.'
            : connection.mode === 'connected'
              ? 'Bạn đang sử dụng quyền super admin. Mọi thay đổi được đồng bộ với Firestore.'
              : connection.message || 'Firestore đang kết nối.'}
        </p>
      </div>
      {success && (
        <div className="success-message" role="status">
          <Check size={18} />
          {success}
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="filter-bar">
        <SearchBox query={query} setQuery={setQuery} />
        <Choice
          label="Lọc theo đời"
          value={generationFilter}
          onChange={setGenerationFilter}
          options={generationOptions.filter(
            (option) => option.value === 'all' || Number(option.value) <= maxGeneration,
          )}
        />
        <Choice
          label="Lọc theo chi hoặc nhánh"
          value={branchFilter}
          onChange={setBranchFilter}
          options={adminBranchOptions}
        />
        <Choice
          label="Lọc theo giới tính"
          value={genderFilter}
          onChange={setGenderFilter}
          options={genderOptions}
        />
        <Choice
          label="Lọc theo tình trạng"
          value={lifeStatusFilter}
          onChange={setLifeStatusFilter}
          options={lifeStatusOptions}
        />
        {hasActiveFilters && (
          <Button
            variant="ghost"
            className="filter-reset-button"
            onClick={() => {
              setQuery('');
              setGenerationFilter('all');
              setBranchFilter('all');
              setGenderFilter('all');
              setLifeStatusFilter('all');
            }}
          >
            Xóa bộ lọc
          </Button>
        )}
      </div>
      <div className="admin-results-summary">
        <span className="muted">{filtered.length} hồ sơ</span>
        <Choice
          label="Số hồ sơ mỗi trang"
          value={pageSize}
          onChange={setPageSize}
          options={pageSizeOptions}
        />
      </div>
      {!filtered.length ? (
        <EmptyState
          onReset={() => {
            setQuery('');
            setGenerationFilter('all');
            setBranchFilter('all');
            setGenderFilter('all');
            setLifeStatusFilter('all');
          }}
        />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Thành viên</th>
                <th>Đời / nhánh</th>
                <th>Năm sinh</th>
                <th>Tình trạng</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pageMembers.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="table-person">
                      <Avatar person={p} />
                      <Link href={`/members/${p.id}`}>{memberName(p)}</Link>
                    </div>
                  </td>
                  <td>
                    Đời {p.generation} · {memberBranchName(p, members)}
                  </td>
                  <td>{memberBirthLabel(p)}</td>
                  <td>
                    <span
                      className={`status-label ${memberLifeStatus(p)}`}
                    >
                      {memberLifeStatus(p) === 'deceased'
                        ? `Đã mất · ${memberDeathLabel(p)}`
                        : memberLifeStatus(p) === 'living'
                          ? 'Còn sống'
                          : 'Chưa rõ'}
                    </span>
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      className="icon-button"
                      title={`Sửa ${memberName(p)}`}
                      aria-label={`Sửa ${memberName(p)}`}
                      onClick={() => {
                        setEditing({
                          ...p,
                          parents: [...p.parents],
                          spouses: [...p.spouses],
                        });
                        setError('');
                        setSuccess('');
                      }}
                    >
                      <HeritageIcon name="edit" size={17} />
                    </Button>
                    <Button
                      variant="ghost"
                      className="icon-button delete-member-button"
                      title={memberDeletionError(p, members) || `Xóa ${memberName(p)}`}
                      aria-label={memberDeletionError(p, members) || `Xóa ${memberName(p)}`}
                      disabled={!!memberDeletionError(p, members)}
                      onClick={() => {
                        setDeleting(p);
                        setError('');
                        setSuccess('');
                      }}
                    >
                      <HeritageIcon name="delete" size={17} />
                    </Button>
                    <Link
                      className="icon-button"
                      title="Mở hồ sơ"
                      aria-label={`Mở hồ sơ ${memberName(p)}`}
                      href={`/members/${p.id}`}
                    >
                      <HeritageIcon name="open-link" size={17} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ResultsPagination
        page={currentPage}
        total={totalPages}
        onPageChange={setPage}
      />
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="editor-sheet">
          <SheetHeader>
            <p className="sheet-kicker">Hồ sơ gia phả</p>
            <SheetTitle>
              {members.some((p) => p.id === editing?.id)
                ? 'Cập nhật hồ sơ'
                : 'Thêm thành viên'}
            </SheetTitle>
            <SheetDescription>
              {connection.mode === 'demo'
                ? 'Dữ liệu dùng thử trong phiên hiện tại'
                : 'Thay đổi sẽ được đồng bộ qua Firestore'}
            </SheetDescription>
          </SheetHeader>
          {editing && (
            <form className="member-form" onSubmit={submit}>
              <div className="form-scroll">
                {positionLock && (
                  <p className="muted">
                    {positionLock}
                  </p>
                )}
                <h3>Thông tin cơ bản</h3>
                <div className="member-name-field">
                  <label>
                    Họ và tên {editing.nameKnown !== false && <span>*</span>}
                    <Input
                      required={editing.nameKnown !== false}
                      disabled={editing.nameKnown === false}
                      maxLength={100}
                      value={
                        editing.nameKnown === false
                          ? UNKNOWN_MEMBER_NAME
                          : editing.name
                      }
                      onChange={(e) => update('name', e.target.value)}
                    />
                  </label>
                  <label className="member-name-unknown">
                    <input
                      type="checkbox"
                      checked={editing.nameKnown === false}
                      onChange={(e) =>
                        setEditing((person) =>
                          person
                            ? {
                                ...person,
                                nameKnown: !e.target.checked,
                                name: e.target.checked
                                  ? UNKNOWN_MEMBER_NAME
                                  : person.name === UNKNOWN_MEMBER_NAME
                                    ? ''
                                    : person.name,
                              }
                            : null,
                        )
                      }
                    />
                    Chưa biết tên
                  </label>
                </div>
                <div className="form-columns">
                  <label>
                    Tên húy
                    <Input
                      maxLength={100}
                      value={editing.tabooName || ''}
                      onChange={(e) => update('tabooName', e.target.value)}
                    />
                  </label>
                  <label>
                    Hiệu
                    <Input
                      maxLength={100}
                      value={editing.styleName || ''}
                      onChange={(e) => update('styleName', e.target.value)}
                    />
                  </label>
                </div>
                <div className="form-columns">
                  <label>
                    Giới tính <span>*</span>
                    <Choice
                      label="Giới tính"
                      value={editing.gender || 'unselected'}
                      onChange={(v) => {
                        const gender = (v === 'unselected' ? '' : v) as Member['gender'];
                        setEditing((person) => {
                          if (!person) return null;
                          const next = {
                            ...person,
                            gender,
                            lineageType: person.isClanMember
                              ? gender === 'female'
                                ? 'maternal-terminal'
                                : 'direct'
                              : person.lineageType,
                          };
                          const branches = eligibleBranches(next, members);
                          return {
                            ...next,
                            branch: branches.includes(next.branch)
                              ? next.branch
                              : (branches[0] ?? -1),
                          };
                        });
                      }}
                      options={[
                        { value: 'unselected', label: 'Chọn giới tính' },
                        { value: 'male', label: 'Nam' },
                        { value: 'female', label: 'Nữ' },
                      ]}
                      disabled={!!positionLock}
                    />
                  </label>
                  <label>
                    Năm sinh
                    <Input
                      type="number"
                      min={birthYears?.min || 1600}
                      max={birthYears?.max || new Date().getFullYear()}
                      placeholder="Chưa rõ"
                      value={editing.born ?? ''}
                      onChange={(e) =>
                        update(
                          'born',
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                    />
                  </label>
                </div>
                <label>
                  Quê quán
                  <Input
                    maxLength={100}
                    value={editing.hometown || ''}
                    onChange={(e) => update('hometown', e.target.value)}
                  />
                </label>
                <div className="form-columns">
                  <label>
                    Đời <span>*</span>
                    <Choice
                      label="Đời"
                      value={
                        editing.generation > 0
                          ? String(editing.generation)
                          : 'unselected'
                      }
                      onChange={(v) => {
                        const generation = v === 'unselected' ? 0 : Number(v);
                        setEditing((person) => {
                          if (!person) return null;
                          const next = { ...person, generation };
                          const branches = eligibleBranches(next, members);
                          return {
                            ...next,
                            branch: branches.includes(next.branch)
                              ? next.branch
                              : (branches[0] ?? -1),
                          };
                        });
                      }}
                      options={[
                        { value: 'unselected', label: 'Chọn đời' },
                        ...eligibleGenerations(editing, members).map((generation) => ({
                          value: String(generation),
                          label: `Đời thứ ${generation}`,
                        })),
                      ]}
                      disabled={!!positionLock}
                    />
                  </label>
                  {editing.gender === 'male' && editing.isClanMember ? (
                    <label>
                      Chi <span>*</span>
                      <Choice
                        label="Chi"
                        value={
                          editing.branch >= 0 ? String(editing.branch) : 'unselected'
                        }
                        onChange={(v) =>
                          update('branch', v === 'unselected' ? -1 : Number(v))
                        }
                        options={[
                          { value: 'unselected', label: 'Chọn chi' },
                          ...eligibleBranches(editing, members).map((branch) => ({
                            value: String(branch),
                            label: branchName(branch),
                          })),
                        ]}
                        disabled={!!positionLock}
                      />
                    </label>
                  ) : (
                    <label className="member-derived-branch">
                      Nhánh gia đình
                      <output>
                        {editing.generation === 1 ? 'Thủy tổ' : 'Nhánh ngoại'}
                      </output>
                    </label>
                  )}
                </div>
                <div className="form-columns">
                  <label>
                    Vai trò trong gia phả
                    <Choice
                      label="Vai trò trong gia phả"
                      value={editing.isClanMember ? 'clan' : 'external'}
                      onChange={(value) => {
                        const isClanMember = value === 'clan';
                        setEditing((person) =>
                          person
                            ? {
                                ...person,
                                isClanMember,
                                lineageType: isClanMember
                                  ? person.gender === 'female'
                                    ? 'maternal-terminal'
                                    : 'direct'
                                  : person.lineageType,
                              }
                            : null,
                        );
                      }}
                      options={[
                        { value: 'clan', label: 'Thành viên dòng họ' },
                        { value: 'external', label: 'Phối ngẫu / nhánh ngoại' },
                      ]}
                      disabled={!!positionLock}
                    />
                  </label>
                  {editing.isClanMember && (
                    <label>
                      Hướng phát triển nhánh
                      <Choice
                        label="Hướng phát triển nhánh"
                      value={
                        editing.gender === 'female'
                          ? 'maternal-terminal'
                          : 'direct'
                      }
                      onChange={() =>
                        update(
                          'lineageType',
                          editing.gender === 'female'
                            ? 'maternal-terminal'
                            : 'direct',
                        )
                      }
                      options={[
                        editing.gender === 'female'
                          ? {
                              value: 'maternal-terminal',
                              label: 'Nhánh ngoại · dừng ở con trực tiếp',
                            }
                          : {
                              value: 'direct',
                              label: 'Nhánh chính · phát triển qua con trai',
                        },
                      ]}
                      disabled={!!positionLock}
                      />
                    </label>
                  )}
                </div>
                <label>
                  Thứ tự trong anh chị em
                  <Input
                    type="number"
                    min={1}
                    max={999}
                    inputMode="numeric"
                    placeholder="Ví dụ: 3"
                    value={editing.siblingOrder ?? ''}
                    onChange={(event) =>
                      update(
                        'siblingOrder',
                        event.target.value ? Number(event.target.value) : undefined,
                      )
                    }
                  />
                </label>
                <h3>Quan hệ gia đình</h3>
                {[0, 1].map((index) => (
                  <label key={index}>
                    {index === 0 ? 'Cha / mẹ thứ nhất' : 'Cha / mẹ thứ hai'}
                    <Choice
                      label={`Cha mẹ ${index + 1}`}
                      value={editing.parents[index] || 'none'}
                      onChange={(v) => updateParent(index, v)}
                      options={[
                        { value: 'none', label: 'Chưa ghi nhận' },
                        ...eligibleParents(editing, members, index)
                          .map((p) => ({
                            value: p.id,
                            label: `${memberName(p)} (${memberBirthLabel(p)})`,
                          })),
                      ]}
                      disabled={
                        !!positionLock || (index === 1 && !editing.parents[0])
                      }
                    />
                  </label>
                ))}
                <label>
                  Vợ / chồng
                  <Choice
                    label="Thêm vợ hoặc chồng"
                    value="none"
                    onChange={(v) => {
                      if (v !== 'none')
                        update('spouses', [
                          ...new Set([...editing.spouses, v]),
                        ]);
                    }}
                    options={[
                      { value: 'none', label: 'Chọn để thêm…' },
                      ...eligibleSpouses(editing, members)
                        .map((p) => ({ value: p.id, label: memberName(p) })),
                    ]}
                    disabled={!!spouseLock}
                  />
                </label>
                <div className="spouse-chips">
                  {editing.spouses.map((id) => (
                    <Button
                      key={id}
                      variant="secondary"
                      type="button"
                      onClick={() =>
                        update(
                          'spouses',
                          editing.spouses.filter((s) => s !== id),
                        )
                      }
                      title="Bỏ quan hệ vợ chồng"
                      disabled={!!spouseLock}
                    >
                      {memberName(membersById.get(id) || editing)} ×
                    </Button>
                  ))}
                </div>
                <h3>Ngày mất & tưởng nhớ</h3>
                <label>
                  Tình trạng
                  <Choice
                    label="Tình trạng"
                    value={memberLifeStatus(editing)}
                    onChange={(value) =>
                      setEditing((p) =>
                        p
                          ? {
                              ...p,
                              lifeStatus: value as NonNullable<Member['lifeStatus']>,
                              ...(value !== 'deceased'
                                ? {
                                    died: undefined,
                                    diedText: undefined,
                                    anniversary: undefined,
                                  }
                                : {}),
                            }
                          : null,
                      )
                    }
                    options={[
                      { value: 'unknown', label: 'Chưa rõ' },
                      { value: 'living', label: 'Còn sống' },
                      { value: 'deceased', label: 'Đã mất' },
                    ]}
                  />
                </label>
                {memberLifeStatus(editing) === 'deceased' && (
                  <>
                    <label>
                      Năm mất
                      <Input
                        type="text"
                        inputMode="numeric"
                        maxLength={100}
                        placeholder="Chưa rõ"
                        value={deathFieldValue(editing)}
                        onChange={(e) =>
                          setEditing((p) =>
                            p
                              ? {
                                  ...p,
                                  ...deathFields(e.target.value),
                                  lifeStatus: 'deceased',
                                }
                              : null,
                          )
                        }
                      />
                    </label>
                    <div className="form-columns">
                      <label>
                        Ngày mất âm lịch
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          value={editing.anniversary?.day || ''}
                          onChange={(e) =>
                            update(
                              'anniversary',
                              e.target.value
                                ? {
                                    day: Number(e.target.value),
                                    month: editing.anniversary?.month || 1,
                                  }
                                : undefined,
                            )
                          }
                        />
                      </label>
                      <label>
                        Tháng mất âm lịch
                        <Input
                          type="number"
                          min={1}
                          max={12}
                          value={editing.anniversary?.month || ''}
                          onChange={(e) =>
                            update(
                              'anniversary',
                              e.target.value
                                ? {
                                    day: editing.anniversary?.day || 1,
                                    month: Number(e.target.value),
                                  }
                                : undefined,
                            )
                          }
                        />
                      </label>
                    </div>
                  </>
                )}
                <h3>Tiểu sử</h3>
                <label>
                  Câu chuyện về thành viên
                  <Textarea
                    rows={5}
                    maxLength={5000}
                    value={editing.biography || ''}
                    onChange={(e) => update('biography', e.target.value)}
                  />
                </label>
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
              </div>
              <div className="form-actions">
                {members.some((person) => person.id === editing.id) && (
                  <Button
                    variant="ghost"
                    type="button"
                    className="action-button delete-profile-button"
                    title={deletionError || 'Xóa hồ sơ'}
                    disabled={!!deletionError}
                    onClick={() => {
                      setDeleting(editing);
                      setError('');
                    }}
                  >
                    <HeritageIcon name="delete" size={19} />
                    Xóa hồ sơ
                  </Button>
                )}
                <Button
                  variant="outline"
                  type="button"
                  className="action-button"
                  onClick={() => setEditing(null)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  className="action-button"
                  disabled={saving}
                >
                  <img
                    className="member-save-icon"
                    src="/app-icons/member-save.png"
                    alt=""
                  />
                  {saving ? 'Đang lưu...' : 'Lưu hồ sơ'}
                </Button>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>
      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open && !deletingPending) setDeleting(null);
        }}
      >
        <AlertDialogContent className="delete-dialog">
          <AlertDialogHeader className="delete-dialog-header">
            <AlertDialogMedia className="delete-dialog-icon">
              <HeritageIcon name="delete" size={19} />
            </AlertDialogMedia>
            <div className="delete-dialog-copy">
              <p className="delete-dialog-kicker">THAO TÁC KHÔNG THỂ HOÀN TÁC</p>
              <AlertDialogTitle>
                Xóa hồ sơ {deleting ? memberName(deleting) : ''}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Hồ sơ và các dữ liệu ghi chú sẽ bị xóa vĩnh viễn. Chỉ hồ sơ
                không có quan hệ cha mẹ hoặc vợ/chồng mới được phép xóa.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="delete-dialog-footer">
            <AlertDialogCancel
              className="delete-cancel-button"
              disabled={deletingPending}
            >
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              className="delete-confirm-button"
              disabled={deletingPending}
              onClick={() => void confirmDelete()}
            >
              <HeritageIcon name="delete" size={19} />
              {deletingPending ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
