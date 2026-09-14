type AIButtonIconProps = {
  size?: number;
};

export function AIButtonIcon({ size = 18 }: AIButtonIconProps) {
  return (
    <img
      alt=""
      aria-hidden="true"
      className="ai-button-icon"
      height={size}
      src="/app-icons/ai-sparkles-optimized.png"
      width={size}
    />
  );
}
