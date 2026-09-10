import type { ImgHTMLAttributes } from 'react';

export const heritageIconNames = [
  'add-member',
  'analytics',
  'avatar',
  'backup',
  'branch',
  'calendar',
  'delete',
  'descendants',
  'document',
  'edit',
  'eye',
  'family-record',
  'favorite',
  'filter',
  'fit-view',
  'folder',
  'generations',
  'grid',
  'help',
  'history',
  'hide',
  'home',
  'info',
  'link',
  'list',
  'location',
  'login',
  'logout',
  'members',
  'memorial',
  'message',
  'more',
  'next',
  'notification',
  'open-link',
  'parents',
  'people',
  'permissions',
  'previous',
  'print',
  'profile',
  'quote',
  'reminder',
  'reset',
  'restore',
  'search',
  'security',
  'settings',
  'share',
  'sort',
  'spouses',
  'tag',
  'time',
  'timeline',
  'today',
  'tree-view',
  'tree',
  'upload',
  'zoom-in',
  'zoom-out',
] as const;

export type HeritageIconName = (typeof heritageIconNames)[number];

const heritageIconAssets: Record<HeritageIconName, string> = {
  'add-member': 'add-member',
  analytics: 'grid',
  avatar: 'profile',
  backup: 'book',
  branch: 'hierarchy',
  calendar: 'calendar-traditional',
  delete: 'delete',
  descendants: 'hierarchy',
  document: 'book',
  edit: 'edit',
  eye: 'list-detail',
  'family-record': 'book',
  favorite: 'memorial',
  filter: 'filter',
  'fit-view': 'fit-view',
  folder: 'book',
  generations: 'hierarchy',
  grid: 'grid',
  help: 'book',
  history: 'list-detail',
  hide: 'list-detail',
  home: 'home',
  info: 'list-detail',
  link: 'next',
  list: 'list',
  location: 'location',
  login: 'next',
  logout: 'previous',
  members: 'members',
  memorial: 'memorial',
  message: 'notification',
  more: 'grid',
  next: 'next',
  notification: 'notification',
  'open-link': 'next',
  parents: 'hierarchy',
  people: 'members',
  permissions: 'settings',
  previous: 'previous',
  print: 'book',
  profile: 'profile',
  quote: 'book',
  reminder: 'notification',
  reset: 'refresh',
  restore: 'refresh',
  search: 'search',
  security: 'settings',
  settings: 'settings',
  share: 'hierarchy',
  sort: 'list',
  spouses: 'hierarchy',
  tag: 'list-detail',
  time: 'calendar-traditional',
  timeline: 'list-detail',
  today: 'calendar-day',
  'tree-view': 'tree',
  tree: 'tree',
  upload: 'book',
  'zoom-in': 'zoom-in',
  'zoom-out': 'zoom-out',
};

type HeritageIconProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'alt' | 'height' | 'src' | 'width'
> & {
  name: HeritageIconName;
  size?: number;
  label?: string;
};

export function HeritageIcon({
  name,
  size = 20,
  label,
  className,
  ...props
}: HeritageIconProps) {
  const renderedSize = Math.max(18, Math.round(size * 1.25));

  return (
    <img
      {...props}
      alt={label || ''}
      aria-hidden={label ? undefined : true}
      className={className ? `heritage-icon ${className}` : 'heritage-icon'}
      height={renderedSize}
      src={`/heritage-icons-3d/${heritageIconAssets[name]}.png`}
      width={renderedSize}
    />
  );
}
