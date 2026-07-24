/**
 * 사진이 아직 없을 때 자리에 뜨는 박스.
 * 어떤 파일을, 어떤 크기로 넣어야 하는지 화면에 그대로 표시합니다.
 * public/ 에 같은 경로·파일명으로 넣으면 자동으로 실제 사진으로 교체됩니다.
 */
export default function Placeholder({
  src,
  width,
  height,
  label,
  className = "",
  dark = false,
}: {
  src: string;
  width: number;
  height: number;
  label?: string;
  className?: string;
  dark?: boolean;
}) {
  const file = src.replace(/^\/images\//, "");

  return (
    <div
      className={`flex flex-col items-center justify-center gap-1.5 border-2 border-dashed p-4 text-center ${
        dark
          ? "border-white/20 bg-ink-800 text-white/50"
          : "border-line bg-paper text-ink-500"
      } ${className}`}
      role="img"
      aria-label={label ? `${label} (사진 준비 중)` : "사진 준비 중"}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
        className="opacity-60"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9.5" r="1.5" />
        <path d="M21 16l-5-5-4.5 4.5L9 13l-6 6" />
      </svg>
      {label && (
        <p className="text-[13px] leading-tight font-medium opacity-90">{label}</p>
      )}
      <p className="font-mono text-[11px] leading-tight break-all opacity-70">
        {file}
      </p>
      <p className="font-mono text-[11px] leading-tight opacity-50">
        {width}×{height}
      </p>
    </div>
  );
}
