'use client';

import { useEffect, useState } from 'react';

const sections = [
  ['origin', '01', 'Cội nguồn'],
  ['generations', '02', 'Các thế hệ'],
  ['values', '03', 'Nếp nhà truyền lại'],
  ['records', '04', 'Tư liệu gia phả'],
] as const;

export function HistoryIndex() {
  const [activeSection, setActiveSection] =
    useState<(typeof sections)[number][0]>('origin');

  useEffect(() => {
    const nodes = sections
      .map(([id]) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) {
          setActiveSection(visible.target.id as (typeof sections)[number][0]);
        }
      },
      { rootMargin: '-18% 0px -64%', threshold: [0, 0.1, 0.3] },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <aside className="history-index" aria-label="Mục lục lịch sử dòng họ">
      <span className="history-index-title">NỘI DUNG</span>
      {sections.map(([id, number, label]) => (
        <a
          aria-current={activeSection === id ? 'location' : undefined}
          className={activeSection === id ? 'is-active' : undefined}
          href={`#${id}`}
          key={id}
          onClick={() => setActiveSection(id)}
        >
          {number} <span>{label}</span>
        </a>
      ))}
    </aside>
  );
}
