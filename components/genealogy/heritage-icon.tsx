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
  return (
    <img
      {...props}
      alt={label || ''}
      aria-hidden={label ? undefined : true}
      className={className ? `heritage-icon ${className}` : 'heritage-icon'}
      height={size}
      src={`/heritage-icons/${name}.png`}
      width={size}
    />
  );
}
