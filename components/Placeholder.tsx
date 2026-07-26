/**
 * 사진이 아직 없을 때 자리에 뜨는 박스.
 * public/ 에 같은 경로·파일명으로 넣으면 자동으로 실제 사진으로 교체됩니다.
 *
 * **개발 화면과 운영 화면이 다릅니다.**
 *
 *  · 개발(`npm run dev`) — 파일명과 필요한 픽셀 크기를 그대로 찍습니다.
 *    "어떤 파일을 몇 픽셀로 넣어야 하는지" 알려주는 게 이 박스의 목적입니다.
 *
 *  · 운영 — 파일명·픽셀수를 **숨깁니다.** 사이트가 이미 고객에게 열려 있는데
 *    `work-01.jpg 1200×900` 같은 개발자용 정보가 찍혀 있으면 미완성 사이트로
 *    보입니다. 대신 "사진 준비 중" 과 설명만 조용히 보여줍니다.
 *
 * 물론 진짜 해결은 사진을 넣는 것입니다 — `public/images/README.md` 참조.
 */
const IS_DEV = process.env.NODE_ENV !== "production";

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
      className={`flex flex-col items-center justify-center gap-1.5 p-4 text-center ${
        // 개발에서는 "여기 빈 자리"가 눈에 띄어야 하니 점선.
        // 운영에서는 고장난 것처럼 보이지 않게 실선 없이 은은한 면으로 둡니다.
        IS_DEV ? "border-2 border-dashed" : ""
      } ${
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

      {IS_DEV ? (
        <>
          <p className="font-mono text-[11px] leading-tight break-all opacity-70">
            {file}
          </p>
          <p className="font-mono text-[11px] leading-tight opacity-50">
            {width}×{height}
          </p>
        </>
      ) : (
        <p className="text-[11px] leading-tight opacity-50">사진 준비 중</p>
      )}
    </div>
  );
}
