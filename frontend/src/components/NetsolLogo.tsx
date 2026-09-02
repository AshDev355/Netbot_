type Props = {
  size?: number;
  fill?: string;
  glyphFill?: string;
  className?: string;
};

export default function NetsolLogo({
  size = 20,
  fill = "#003876",
  glyphFill = "white",
  className,
}: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="24" height="24" rx="5" fill={fill} />
      <path d="M6 17V7l6 8V7h1v10l-6-8v10H6z" fill={glyphFill} />
    </svg>
  );
}
