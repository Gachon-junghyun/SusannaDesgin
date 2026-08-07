import Image from "next/image";
import Link from "next/link";
import { site } from "@/config/site";

export default function Footer() {
  return (
    <footer className="mt-auto bg-ink text-white/70">
      <div className="wrap py-14">
        {/* 상단 — 상담 유도 */}
        <div className="flex flex-col gap-6 border-b border-white/10 pb-10 md:flex-row md:items-center md:justify-between">
          <div>
            <Image
              src="/logo-white.svg"
              alt={site.legalName}
              width={1000}
              height={251}
              unoptimized
              loading="eager"
              className="mb-6 h-8 w-auto opacity-90"
            />
            <p className="text-sm text-white/50">사인물·철구조물 견적이 궁금하시면</p>
            <a
              href={site.phoneHref}
              className="mt-1 block text-3xl font-black tracking-tight text-white md:text-4xl"
            >
              {site.phone}
            </a>
            <p className="mt-1 text-sm">
              {site.hours} <span className="text-white/40">· {site.hoursNote}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/quote"
              className="rounded-lg bg-brand px-6 py-3 font-bold text-white transition-colors hover:bg-brand-600"
            >
              무료 견적 신청
            </Link>
            {site.kakaoChannelUrl && (
              <a
                href={site.kakaoChannelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/25 px-6 py-3 font-bold text-white transition-colors hover:bg-white/10"
              >
                카카오톡 상담
              </a>
            )}
          </div>
        </div>

        {/* 사이트맵 */}
        <nav aria-label="푸터 메뉴" className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <FooterCol
            title="회사"
            links={[
              { href: "/about", label: "회사소개" },
              { href: "/about#history", label: "연혁" },
              // "공장 공정"(/about#equipment)을 뺐습니다 (2026-08-07). 그 구역이
              // SHOW_FABRICATION 로 닫히면서 앵커가 사라져, 누르면 /about 맨 위로만
              // 떨어졌습니다. 스위치를 다시 켤 때 이 줄도 같이 살리세요.
              { href: "/support#location", label: "오시는길" },
            ]}
          />
          <FooterCol
            title="사업"
            links={[
              { href: "/signs", label: "사업영역" },
              { href: "/process", label: "업무프로세스" },
              { href: "/works", label: "주요실적" },
            ]}
          />
          <FooterCol
            title="고객지원"
            links={[
              { href: "/quote", label: "무료 견적 문의" },
              { href: "/support#faq", label: "자주 묻는 질문" },
              { href: "/support", label: "고객지원" },
            ]}
          />
          <div>
            <h2 className="mb-3 text-sm font-bold text-white">연락처</h2>
            <ul className="space-y-1.5 text-sm">
              <li>
                <a href={site.phoneHref} className="hover:text-white">
                  M. {site.phone}
                </a>
              </li>
              <li>T. {site.officePhone}</li>
              <li>F. {site.fax}</li>
              <li>
                <a href={`mailto:${site.email}`} className="hover:text-white">
                  {site.email}
                </a>
              </li>
              <li className="pt-1 text-white/50">
                ({site.zip}) {site.address} {site.addressDetail}
              </li>
            </ul>
          </div>
        </nav>

        {/* 법정 표기 */}
        <div className="border-t border-white/10 pt-8">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <li>
              <Link href="/privacy" className="font-bold text-white hover:underline">
                개인정보처리방침
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-white">
                이용약관
              </Link>
            </li>
            <li>
              <Link href="/no-email-collect" className="hover:text-white">
                이메일주소무단수집거부
              </Link>
            </li>
            <li>
              <Link href="/support#location" className="hover:text-white">
                오시는길
              </Link>
            </li>
          </ul>

          <div className="mt-5 space-y-1 text-[13px] leading-relaxed text-white/45">
            <p>
              <span className="text-white/70">{site.legalName}</span>
              <Sep />
              대표 {site.ceo}
              {site.bizNo && (
                <>
                  <Sep />
                  사업자등록번호 {site.bizNo}
                </>
              )}
              {site.outdoorAdNo && (
                <>
                  <Sep />
                  옥외광고사업자 등록 {site.outdoorAdNo}
                </>
              )}
            </p>
            <p>
              ({site.zip}) {site.address} {site.addressDetail}
              <Sep />
              TEL {site.phone}
              <Sep />
              {site.officePhone}
              <Sep />
              FAX {site.fax}
            </p>
            <p className="pt-2">
              © {new Date().getFullYear()} {site.name}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-bold text-white">{title}</h2>
      <ul className="space-y-1.5 text-sm">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Sep() {
  return <span className="mx-2 text-white/20">|</span>;
}
