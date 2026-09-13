import Image from 'next/image';

export function CloseIcon({
  className,
  size = 18,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <Image
      alt=""
      aria-hidden
      className={className ? `close-icon ${className}` : 'close-icon'}
      height={size}
      src="/heritage-icons-3d/close.png"
      width={size}
    />
  );
}
