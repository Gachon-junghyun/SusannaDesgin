import Link from "next/link";
import Img from "@/components/Img";
import { PageHero } from "@/components/Section";
import { signTypes } from "@/config/content";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("/signs");

export default function SignsPage() {
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
              key={t.slug}
              id={t.slug}
              className="grid scroll-mt-28 gap-8 md:grid-cols-2 md:items-center md:gap-14"
            >
              <div
                className={`relative aspect-4/3 overflow-hidden rounded-2xl ${
                  i % 2 === 1 ? "md:order-2" : ""
                }`}
              >
                <Img
                  src={t.image}
                  alt={`${t.name} 시공 예시`}
                  width={800}
                  height={600}
                  fill
                  sizes="(max-width: 768px) 100vw, 560px"
                  label={`${t.name} 예시`}
                />
              </div>

              <div>
                <p className="text-[13px] font-black tracking-[0.25em] text-brand">
                  {t.en}
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
                  {t.name}
                </h2>
                <p className="mt-4 leading-relaxed text-ink-500 md:text-lg">{t.desc}</p>

                <ul className="mt-6 space-y-2.5">
                  {t.points.map((p) => (
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
                  {t.name} 견적 문의 <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
