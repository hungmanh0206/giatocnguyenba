'use client';

import { type AIMode } from '@/lib/ai/types';

const actions: Record<AIMode, string[]> = {
  general: ['Cách dùng cây gia phả', 'Tìm thành viên', 'Ngày giỗ sắp tới', 'Mở Lịch Âm'],
  genealogy: ['Quan hệ gia phả', 'Cha mẹ', 'Vợ/chồng', 'Con cháu'],
  calendar: ['Luận giải ngày này', 'Giờ Hoàng đạo', 'Ngày này hợp việc gì?'],
  horoscope: ['Tổng quan', 'Công danh', 'Tài lộc', 'Tình duyên'],
};

export function AIQuickActions({
  mode,
  onChoose,
}: {
  mode: AIMode;
  onChoose: (prompt: string) => void;
}) {
  return (
    <div className="ai-quick-actions" aria-label="Gợi ý câu hỏi">
      {actions[mode].map((prompt) => (
        <button key={prompt} onClick={() => onChoose(prompt)} type="button">
          {prompt}
        </button>
      ))}
    </div>
  );
}
