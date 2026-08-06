import Link from "next/link";
import Img from "@/components/Img";
import { PageHero } from "@/components/Section";
import { getBlocks } from "@/lib/cms";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("/process");

/**
 * 프로세스 문구를 관리자 화면에서 고칠 수 있게 되면서(F19) DB 를 읽는 페이지가
 * 됐습니다. 단계별 상세 항목은 예전에 이 파일 안의 `detail` 표에 있었고, 단계를
 * 하나 늘리면 두 곳을 같이 고쳐야 했습니다. 지금은 블록의 `points` 한 곳뿐입니다.
 */
export const dynamic = "force-dynamic";

export default async function ProcessPage() {
  const { process: steps } = await getBlocks();

  return (
    <>
      <PageHero
        eyebrow="PROCESS"
        title="업무프로세스"
        desc="문의 한 번으로 현장 확인부터 제작, 시공, A/S까지 이어집니다."
        path="/process"
      />

      <div className="mx-auto max-w-6xl px-6 py-14 md:py-20">
        <ol className="space-y-14 md:space-y-20">
          {steps.map((s, i) => (
            <li
              key={s.eyebrow || i}
              className="grid gap-8 md:grid-cols-[280px_1fr] md:gap-12"
            >
              <div className="relative aspect-4/3 overflow-hidden rounded-2xl">
                <Img
                  src={s.image}
                  alt={s.alt || s.title}
                  width={640}
                  height={480}
                  fill
                  sizes="(max-width: 768px) 100vw, 280px"
                  label={`${s.eyebrow}. ${s.title}`}
                />
              </div>
              <div>
                <p className="text-[13px] font-black tracking-widest text-brand">
                  STEP {s.eyebrow}
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
                  {s.title}
                </h2>
                <p className="mt-3 leading-relaxed text-ink-500">{s.sub}</p>
                <ul className="mt-5 space-y-2.5 border-t border-line pt-5">
                  {s.points.map((d: string) => (
                    <li key={d} className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                      />
                      <span className="text-[15px] leading-relaxed">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-16 rounded-2xl bg-ink px-6 py-12 text-center text-white">
          <h2 className="text-2xl font-black tracking-tight">
            현장 확인과 시안까지 무료입니다
          </h2>
          <p className="mt-3 leading-relaxed text-white/60">
            보시고 결정하셔도 됩니다. 부담 없이 문의하세요.
          </p>
          <Link
            href="/quote"
            className="mt-6 inline-block rounded-xl bg-brand px-8 py-4 font-black text-white transition-colors hover:bg-brand-600"
          >
            무료 견적 신청
          </Link>
        </div>
      </div>
    </>
  );
}
