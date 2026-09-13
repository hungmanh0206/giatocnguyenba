'use client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { HeritageIcon } from './heritage-icon';
export function Choice({
  value,
  onChange,
  options,
  label,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => v !== null && onChange(v)}
      items={options}
      disabled={disabled}
    >
      <SelectTrigger className="choice" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export const branchOptions = [
  { value: 'all', label: 'Tất cả các chi' },
  { value: '0', label: 'Thủy tổ' },
  { value: '1', label: 'Chi trưởng' },
  { value: '2', label: 'Chi hai' },
  { value: '3', label: 'Chi ba' },
  { value: '4', label: 'Chi tư' },
];
export const generationOptions = [
  { value: 'all', label: 'Tất cả các đời' },
  ...Array.from({ length: 8 }, (_, i) => ({
    value: String(i + 1),
    label: `Đời thứ ${i + 1}`,
  })),
];

export const pageSizeOptions = [
  { value: '5', label: '5/trang' },
  { value: '10', label: '10/trang' },
  { value: '20', label: '20/trang' },
  { value: 'all', label: 'Tất cả' },
];

export function ResultsPagination({
  page,
  total,
  onPageChange,
  pageSize,
  onPageSizeChange,
  showPageSize = true,
  variant = 'standard',
}: {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  pageSize: string;
  onPageSizeChange: (pageSize: string) => void;
  showPageSize?: boolean;
  variant?: 'standard' | 'cards';
}) {
  return (
    <nav className={`pagination pagination-${variant}`} aria-label="Phân trang">
      {showPageSize && (
        <Choice
          label="Số kết quả mỗi trang"
          value={pageSize}
          onChange={onPageSizeChange}
          options={pageSizeOptions}
        />
      )}
      {total > 1 && (
        <div className="pagination-page-controls">
          <Button
            variant="outline"
            className="icon-button"
            disabled={page === 1}
            aria-label="Trang trước"
            onClick={() => onPageChange(page - 1)}
          >
            <HeritageIcon name="previous" size={18} />
          </Button>
          <span>
            Trang {page} / {total}
          </span>
          <Button
            variant="outline"
            className="icon-button"
            disabled={page === total}
            aria-label="Trang sau"
            onClick={() => onPageChange(page + 1)}
          >
            <HeritageIcon name="next" size={18} />
          </Button>
        </div>
      )}
    </nav>
  );
}

export function SearchBox({
  query,
  setQuery,
  placeholder = 'Tìm theo họ và tên…',
}: {
  query: string;
  setQuery: (q: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-box">
      <HeritageIcon name="search" size={19} />
      <Input
        aria-label={placeholder}
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {query && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Xóa tìm kiếm"
          onClick={() => setQuery('')}
        >
          <HeritageIcon name="close" size={16} />
        </Button>
      )}
    </div>
  );
}
export function EmptyState({
  title = 'Không tìm thấy thành viên',
  description = 'Thử một tên khác hoặc thay đổi bộ lọc.',
  onReset,
}: {
  title?: string;
  description?: string;
  onReset?: () => void;
}) {
  return (
    <div className="empty-state">
      <HeritageIcon name="search" size={30} />
      <h3>{title}</h3>
      <p>{description}</p>
      {onReset && (
        <Button className="action-button" variant="outline" onClick={onReset}>
          Xóa bộ lọc
        </Button>
      )}
    </div>
  );
}
