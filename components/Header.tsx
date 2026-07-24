"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { site } from "@/config/site";

export const NAV = [
  { href: "/about", label: "회사소개" },
  { href: "/signs", label: "사업영역" },
  { href: "/works", label: "주요실적" },
  { href: "/process", label: "업무프로세스" },
  { href: "/support", label: "고객지원" },
];

/** 이 높이만큼 히어로가 헤더 아래로 깔립니다 (HeroSlider 상단 패딩과 맞춤) */
const SOLID_AT = 40;

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  /** 홈은 히어로 사진 위에 헤더가 투명하게 얹힙니다 */
  const overlay = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SOLID_AT);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // 투명 상태: 홈 + 아직 스크롤 안 함 + 모바일 메뉴 닫힘
  const clear = overlay && !scrolled && !open;

  return (
    <header
      className={`z-50 transition-[background-color,box-shadow] duration-300 ${
        overlay ? "fixed inset-x-0 top-0" : "sticky top-0"
      }`}
    >
      {/* 사진 위 텍스트 가독성용 상단 스크림 */}
      {clear && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/45 to-transparent"
        />
      )}

      {/* 상단 유틸 바 */}
      <div
        className={`relative hidden transition-colors duration-300 md:block ${
          clear ? "text-white" : "bg-ink text-white"
        }`}
      >
        <div className="wrap flex h-9 items-center justify-between text-[13px]">
          <p className={clear ? "text-white/70" : "text-white/60"}>
            {site.hours} · {site.hoursNote}
          </p>
          <div className="flex items-center gap-5">
            <a href={site.phoneHref} className="font-semibold tracking-wide hover:text-brand-400">
              빠른상담 {site.phone}
            </a>
            <Link
              href="/support#location"
              className={clear ? "text-white/70 hover:text-white" : "text-white/60 hover:text-white"}
            >
              오시는길
            </Link>
          </div>
        </div>
      </div>

      {/* 메인 바 */}
      <div
        className={`relative border-b transition-colors duration-300 ${
          clear
            ? "border-transparent"
            : "border-line bg-white/95 shadow-[0_1px_16px_rgba(0,0,0,.06)] backdrop-blur"
        }`}
      >
        <div className="wrap flex h-16 items-center justify-between md:h-20">
          <Link href="/" className="flex items-center" aria-label={`${site.name} 홈`}>
            <Image
              src={clear ? "/logo-white.svg" : "/logo.svg"}
              alt={`${site.legalName} ${site.nameEn}`}
              width={1000}
              height={251}
              priority
              unoptimized
              className="h-7 w-auto md:h-9"
            />
          </Link>

          <nav aria-label="주 메뉴" className="hidden lg:block">
            <ul className="flex items-center gap-9">
              {NAV.map((n) => {
                const active = pathname.startsWith(n.href);
                return (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      aria-current={active ? "page" : undefined}
                      className={`relative text-[15px] font-semibold transition-colors ${
                        clear
                          ? "text-white/90 hover:text-white"
                          : active
                            ? "text-brand"
                            : "hover:text-brand"
                      }`}
                    >
                      {n.label}
                      {active && !clear && (
                        <span className="absolute -bottom-1.5 left-0 h-0.5 w-full bg-brand" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={site.phoneHref}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-2 lg:hidden ${
                clear ? "text-white" : ""
              }`}
              aria-label={`전화 걸기 ${site.phone}`}
            >
              <PhoneIcon />
            </a>

            <Link
              href="/quote"
              className="hidden rounded-lg bg-brand px-5 py-2.5 text-[15px] font-bold text-white shadow-sm transition-colors hover:bg-brand-600 sm:inline-flex"
            >
              무료 견적
              <span aria-hidden="true" className="ml-1">↗</span>
            </Link>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
              className="flex h-10 w-10 items-center justify-center rounded-lg lg:hidden"
            >
              <span className="relative block h-4 w-6">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={`absolute left-0 block h-0.5 w-6 transition-all ${
                      clear ? "bg-white" : "bg-ink"
                    } ${
                      i === 0
                        ? open
                          ? "top-1.5 rotate-45"
                          : "top-0"
                        : i === 1
                          ? `top-1.5 ${open ? "opacity-0" : ""}`
                          : open
                            ? "top-1.5 -rotate-45"
                            : "top-3"
                    }`}
                  />
                ))}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {open && (
        <div
          id="mobile-menu"
          className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-white lg:hidden"
        >
          <nav aria-label="모바일 메뉴" className="wrap py-2">
            <ul className="divide-y divide-line">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between py-4 text-lg font-bold"
                  >
                    {n.label}
                    <span aria-hidden="true" className="text-ink-500">›</span>
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              href="/quote"
              onClick={() => setOpen(false)}
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-brand px-5 py-4 text-lg font-bold text-white"
            >
              무료 견적 신청
            </Link>

            <a
              href={site.phoneHref}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-ink px-5 py-4 text-lg font-bold"
            >
              <PhoneIcon /> {site.phone}
            </a>

            <p className="mt-4 pb-8 text-center text-sm text-ink-500">
              {site.hours} · {site.hoursNote}
            </p>
          </nav>
        </div>
      )}
    </header>
  );
}

function PhoneIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.68 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.32 1.85.55 2.81.68A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
