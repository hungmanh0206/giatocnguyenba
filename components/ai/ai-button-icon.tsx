type AIButtonIconProps = {
  size?: number;
  variant?: 'default' | 'light';
};

export function AIButtonIcon({ size = 18, variant = 'default' }: AIButtonIconProps) {
  return (
    <img
      alt=""
      aria-hidden="true"
      className={`ai-button-icon ai-button-icon-${variant}`}
      height={size}
      src={variant === 'light' ? '/app-icons/ai-sparkles-light.png' : '/app-icons/ai-sparkles-optimized.png'}
      width={size}
    />
  );
}
