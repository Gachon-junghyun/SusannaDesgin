import Link from "next/link";
import Img from "@/components/Img";
import { PageHero } from "@/components/Section";
import { getBlocks } from "@/lib/cms";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("/signs");

/**
 * 사업영역 문구를 관리자 화면에서 고칠 수 있게 되면서(F19) DB 를 읽는 페이지가
 * 됐습니다. `/` `/works` 와 같은 이유로 ISR 대신 요청 시 렌더링합니다
 * (Cloudflare 에서 ISR 은 캐시 저장소가 없으면 타임아웃 — §2.1).
 * DB 가 없으면 `config/content.ts` 내용이 그대로 나갑니다 [A1].
 */
export const dynamic = "force-dynamic";

export default async function SignsPage() {
  const { signTypes } = await getBlocks();

  return (
    <>
      <PageHero
        eyebrow="BUSINESS"
        title="사업영역"
        desc="옥외광고물부터 철구조물까지, 사인이 걸리는 구조물째로 다룹니다."
        path="/signs"
      />

      <div className="wrap py-14 md:py-20">
        <div className="space-y-20 md:space-y-28">
          {signTypes.map((t, i) => (
            <article
              key={t.slug || i}
              id={t.slug || undefined}
              className="grid scroll-mt-28 gap-8 md:grid-cols-2 md:items-center md:gap-14"
            >
              <div
                className={`relative aspect-4/3 overflow-hidden rounded-2xl ${
                  i % 2 === 1 ? "md:order-2" : ""
                }`}
              >
                <Img
                  src={t.image}
                  alt={t.alt || `${t.title} 시공 예시`}
                  width={800}
                  height={600}
                  fill
                  sizes="(max-width: 768px) 100vw, 560px"
                  label={`${t.title} 예시`}
                />
              </div>

              <div>
                <p className="text-[13px] font-black tracking-[0.25em] text-brand">
                  {t.eyebrow}
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
                  {t.title}
                </h2>
                <p className="mt-4 leading-relaxed text-ink-500 md:text-lg">{t.sub}</p>

                <ul className="mt-6 space-y-2.5">
                  {t.points.map((p: string) => (
                    <li key={p} className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                      />
                      <span className="text-[15px]">{p}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/quote"
                  className="mt-7 inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-3 font-bold text-white transition-colors hover:bg-brand-600"
                >
                  {t.title} 견적 문의 <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
