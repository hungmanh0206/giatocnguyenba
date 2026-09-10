import type { ImgHTMLAttributes } from 'react';

type BrandIconProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'alt' | 'height' | 'src' | 'width'
> & {
  label?: string;
  size?: number;
};

export function BrandIcon({
  className,
  label,
  size = 32,
  ...props
}: BrandIconProps) {
  return (
    <img
      {...props}
      alt={label || ''}
      aria-hidden={label ? undefined : true}
      className={className ? `brand-icon ${className}` : 'brand-icon'}
      height={size}
      src="/brand-icon.png"
      width={size}
    />
  );
}
