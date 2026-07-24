import Link from "next/link";
import { site } from "@/config/site";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-28 text-center md:py-40">
      <p className="text-[13px] font-black tracking-[0.3em] text-brand">404</p>
      <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
        페이지를 찾을 수 없습니다
      </h1>
      <p className="mt-4 leading-relaxed text-ink-500">
        주소가 변경되었거나 삭제된 페이지입니다.
        <br />
        찾으시는 내용이 있으면 아래로 이동해 보세요.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-xl bg-ink px-7 py-3.5 font-bold text-white transition-colors hover:bg-ink-800"
        >
          홈으로
        </Link>
        <Link
          href="/quote"
          className="rounded-xl bg-brand px-7 py-3.5 font-bold text-white transition-colors hover:bg-brand-600"
        >
          무료 견적 신청
        </Link>
        <a
          href={site.phoneHref}
          className="rounded-xl border-2 border-line px-7 py-3.5 font-bold transition-colors hover:border-ink"
        >
          {site.phone}
        </a>
      </div>
    </div>
  );
}
