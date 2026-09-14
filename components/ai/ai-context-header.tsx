'use client';

import { type AIMode, type AIClientContext } from '@/lib/ai/types';
import { HeritageIcon } from '@/components/genealogy/heritage-icon';
import { AIButtonIcon } from './ai-button-icon';

const labels: Record<AIMode, { title: string; description: string }> = {
  general: {
    title: 'Trợ lý Gia phả',
    description: 'Hướng dẫn và tra cứu trong hệ thống.',
  },
  genealogy: {
    title: 'Tra cứu gia phả',
    description: 'Chỉ diễn giải dữ liệu đang có trong gia phả.',
  },
  calendar: {
    title: 'Trợ lý Lịch Việt Nam',
    description: 'Dựa trên Calendar Engine của hệ thống.',
  },
  horoscope: {
    title: 'Luận giải tham khảo',
    description: 'Tham khảo theo Can Chi và lịch truyền thống.',
  },
};

export function AIContextHeader({
  mode,
  context,
  contextLabel,
  onClearContext,
}: {
  mode: AIMode;
  context: AIClientContext;
  contextLabel?: string;
  onClearContext?: () => void;
}) {
  const label = labels[mode];
  const detail = contextLabel || (context.selectedDate
    ? `Đang xem ngày ${new Date(`${context.selectedDate}T12:00:00`).toLocaleDateString('vi-VN')}`
    : context.birthYear
      ? `Năm sinh ${context.birthYear}`
      : label.description);

  return (
    <div className="ai-context-header">
      <span className="ai-context-icon" aria-hidden="true">
        {mode === 'horoscope' ? <AIButtonIcon size={20} /> : <HeritageIcon name={mode === 'calendar' ? 'calendar' : mode === 'genealogy' ? 'members' : 'message'} size={16} />}
      </span>
      <span className="ai-context-copy">
        <strong>{label.title}</strong>
        <small>{detail}</small>
      </span>
      {onClearContext ? (
        <button className="ai-clear-context" onClick={onClearContext} type="button">
          Bỏ context
        </button>
      ) : null}
    </div>
  );
}
