"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * 뷰포트에 들어오면 살짝 떠오르며 나타납니다.
 * 움직임 줄이기(prefers-reduced-motion)는 CSS 쪽에서 처리하므로 여기선 신경 쓰지 않아도 됩니다.
 */
export default function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  /** ms — 여러 개를 순차로 띄울 때 */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    );
    io.observe(el);

    // 안전장치 — 관찰이 어떤 이유로든 발동하지 않아도 콘텐츠가 영영 숨지 않도록
    const failsafe = setTimeout(() => setShown(true), 3000);

    return () => {
      io.disconnect();
      clearTimeout(failsafe);
    };
  }, []);

  return (
    <Tag
      // @ts-expect-error — 태그가 바뀌어도 ref 타입은 HTMLElement 로 충분합니다
      ref={ref}
      className={`reveal ${shown ? "is-in" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
