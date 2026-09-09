'use client';
import { useState, type FormEvent } from 'react';
import { Plus, Pencil, Save, Info, Check, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
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
import { useFamily } from './provider';
import { Avatar } from './home';
import {
  Choice,
  SearchBox,
  EmptyState,
  branchOptions,
  generationOptions,
} from './common';
import { searchMembers, branchName, type Member } from '@/lib/family';
const blank = (): Member => ({
  id: crypto.randomUUID(),
  name: '',
  gender: 'male',
  generation: 5,
  branch: 1,
  born: 2000,
  parents: [],
  spouses: [],
});
export function AdminPage() {
  const { members, save } = useFamily();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Member | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const filtered = searchMembers(members, query);
  function update<K extends keyof Member>(key: K, value: Member[K]) {
    setEditing((p) => (p ? { ...p, [key]: value } : null));
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const result = save({ ...editing, name: editing.name.trim() });
    if (result) {
      setError(result);
      return;
    }
    setSuccess(`Đã lưu hồ sơ ${editing.name} trong phiên dùng thử.`);
    setEditing(null);
    setError('');
  }
  return (
    <main id="main" className="container page-space">
      <div className="page-heading">
        <div>
          <div className="eyebrow">SỔ GIA PHẢ</div>
          <h1>Quản lý thành viên</h1>
          <p>{members.length} hồ sơ trong dòng họ</p>
        </div>
        <Button
          className="action-button"
          onClick={() => {
            setEditing(blank());
            setError('');
            setSuccess('');
          }}
        >
          <Plus />
          Thêm thành viên
        </Button>
      </div>
      <div className="notice">
        <Info size={20} />
        <p>
          Chế độ dùng thử. Thay đổi chỉ có hiệu lực trong phiên này và sẽ mất
          khi tải lại trang. Chưa có đăng nhập quản trị hoặc lưu trữ trực tuyến.
        </p>
      </div>
      {success && (
        <div className="success-message" role="status">
          <Check size={18} />
          {success}
        </div>
      )}
      <div className="filter-bar">
        <SearchBox query={query} setQuery={setQuery} />
        <span className="muted">{filtered.length} hồ sơ</span>
      </div>
      {!filtered.length ? (
        <EmptyState onReset={() => setQuery('')} />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Thành viên</th>
                <th>Đời / chi</th>
                <th>Năm sinh</th>
                <th>Tình trạng</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="table-person">
                      <Avatar person={p} />
                      <Link href={`/members/${p.id}`}>{p.name}</Link>
                    </div>
                  </td>
                  <td>
                    Đời {p.generation} · {branchName(p.branch)}
                  </td>
                  <td>{p.born}</td>
                  <td>
                    <span
                      className={`status-label ${p.died ? 'deceased' : 'living'}`}
                    >
                      {p.died ? `Đã mất · ${p.died}` : 'Còn sống'}
                    </span>
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      className="icon-button"
                      title={`Sửa ${p.name}`}
                      aria-label={`Sửa ${p.name}`}
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
                      <Pencil size={17} />
                    </Button>
                    <Link
                      className="icon-button"
                      title="Mở hồ sơ"
                      aria-label={`Mở hồ sơ ${p.name}`}
                      href={`/members/${p.id}`}
                    >
                      <ArrowUpRight size={17} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="editor-sheet">
          <SheetHeader>
            <SheetTitle>
              {members.some((p) => p.id === editing?.id)
                ? 'Cập nhật hồ sơ'
                : 'Thêm thành viên'}
            </SheetTitle>
            <SheetDescription>
              Dữ liệu dùng thử trong phiên hiện tại
            </SheetDescription>
          </SheetHeader>
          {editing && (
            <form className="member-form" onSubmit={submit}>
              <div className="form-scroll">
                <h3>Thông tin cơ bản</h3>
                <label>
                  Họ và tên <span>*</span>
                  <Input
                    required
                    maxLength={100}
                    value={editing.name}
                    onChange={(e) => update('name', e.target.value)}
                  />
                </label>
                <div className="form-columns">
                  <label>
                    Giới tính
                    <Choice
                      label="Giới tính"
                      value={editing.gender}
                      onChange={(v) => update('gender', v as Member['gender'])}
                      options={[
                        { value: 'male', label: 'Nam' },
                        { value: 'female', label: 'Nữ' },
                      ]}
                    />
                  </label>
                  <label>
                    Năm sinh <span>*</span>
                    <Input
                      required
                      type="number"
                      min={1600}
                      max={new Date().getFullYear()}
                      value={editing.born}
                      onChange={(e) => update('born', Number(e.target.value))}
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
                    Đời
                    <Choice
                      label="Đời"
                      value={String(editing.generation)}
                      onChange={(v) => update('generation', Number(v))}
                      options={generationOptions.filter(
                        (o) => o.value !== 'all',
                      )}
                    />
                  </label>
                  <label>
                    Chi
                    <Choice
                      label="Chi"
                      value={String(editing.branch)}
                      onChange={(v) => update('branch', Number(v))}
                      options={branchOptions.filter((o) => o.value !== 'all')}
                    />
                  </label>
                </div>
                <h3>Quan hệ gia đình</h3>
                {[0, 1].map((index) => (
                  <label key={index}>
                    {index === 0 ? 'Cha / mẹ thứ nhất' : 'Cha / mẹ thứ hai'}
                    <Choice
                      label={`Cha mẹ ${index + 1}`}
                      value={editing.parents[index] || 'none'}
                      onChange={(v) => {
                        const parents = [...editing.parents];
                        if (v === 'none') parents.splice(index, 1);
                        else parents[index] = v;
                        update('parents', parents.filter(Boolean));
                      }}
                      options={[
                        { value: 'none', label: 'Chưa ghi nhận' },
                        ...members
                          .filter((p) => p.id !== editing.id)
                          .map((p) => ({
                            value: p.id,
                            label: `${p.name} (${p.born})`,
                          })),
                      ]}
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
                      ...members
                        .filter(
                          (p) =>
                            p.id !== editing.id &&
                            !editing.spouses.includes(p.id),
                        )
                        .map((p) => ({ value: p.id, label: p.name })),
                    ]}
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
                    >
                      {members.find((p) => p.id === id)?.name} ×
                    </Button>
                  ))}
                </div>
                <h3>Ngày mất & tưởng nhớ</h3>
                <label>
                  Năm mất (để trống nếu còn sống)
                  <Input
                    type="number"
                    min={editing.born}
                    max={new Date().getFullYear()}
                    value={editing.died || ''}
                    onChange={(e) => {
                      const died = e.target.value
                        ? Number(e.target.value)
                        : undefined;
                      setEditing((p) =>
                        p
                          ? {
                              ...p,
                              died,
                              anniversary: died ? p.anniversary : undefined,
                            }
                          : null,
                      );
                    }}
                  />
                </label>
                {editing.died && (
                  <>
                    <div className="form-columns">
                      <label>
                        Ngày giỗ âm
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
                        Tháng giỗ âm
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
                <Button
                  variant="outline"
                  type="button"
                  className="action-button"
                  onClick={() => setEditing(null)}
                >
                  Hủy
                </Button>
                <Button type="submit" className="action-button">
                  <Save />
                  Lưu hồ sơ
                </Button>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}
