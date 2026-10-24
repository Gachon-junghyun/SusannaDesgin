import Image from "next/image";
import { imageExists } from "@/lib/images";
import Placeholder from "./Placeholder";

type Props = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** 지정한 컨테이너를 꽉 채우고 잘라냅니다 (position: relative 인 부모 필요) */
  fill?: boolean;
  sizes?: string;
  preload?: boolean;
  className?: string;
  /** 플레이스홀더에 표시할 설명 */
  label?: string;
  /** 어두운 배경 위의 플레이스홀더 */
  dark?: boolean;
};

/**
 * 사진이 있으면 next/image, 없으면 크기 안내가 붙은 플레이스홀더를 렌더합니다.
 * (서버 컴포넌트)
 */
export default function Img({
  src,
  alt,
  width,
  height,
  fill,
  sizes,
  preload,
  className = "",
  label,
  dark,
}: Props) {
  if (!imageExists(src)) {
    return (
      <Placeholder
        src={src}
        width={width}
        height={height}
        label={label ?? alt}
        dark={dark}
        className={fill ? `absolute inset-0 h-full w-full ${className}` : className}
      />
    );
  }

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes ?? "100vw"}
        preload={preload}
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      // 명시하지 않은 호출도 1x/2x 대신 폭별 srcset 을 생성합니다.
      // CSS 표시 폭을 모르는 공통 컴포넌트에서는 원래 폭/뷰포트를 상한으로 삼습니다.
      sizes={sizes ?? `(max-width: ${width}px) 100vw, ${width}px`}
      preload={preload}
      className={className}
    />
  );
}
