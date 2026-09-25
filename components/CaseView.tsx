import Link from "next/link";

import JsonLd from "@/components/JsonLd";
import { site } from "@/config/site";
import { photoUrl, type PublicPhoto, type PublicSite, STAGES, stageLabel } from "@/lib/sites-shared";

/**
 * 시공사례 상세의 «그리는» 부분 (F29). 데이터를 가져오는 건 `app/works/[slug]/page.tsx` —
 * 둘로 나눠 DB 없이 가짜 현장으로 화면을 시험할 수 있게 했습니다(F27 사용량 화면과 같은 방식).
 * 🔴 구조화 데이터는 화면에 보이는 것만 적습니다(`components/JsonLd.tsx` 규칙).
 */
export default function CaseView({ site: s, photos }: { site: PublicSite; photos: PublicPhoto[] }) {
  const path = `/works/${s.slug}`;
  const cover = photos.find((p) => p.id === s.cover_photo) ?? photos.find((p) => p.stage === "done") ?? photos[0];

  const facts = [
    ["위치", s.location],
    ["간판 종류", s.sign_type],
    ["치수", s.size_text],
    ["자재", s.materials],
    ["기간", s.period],
  ].filter(([, v]) => v);

  const alt = (p: (typeof photos)[number]) => p.caption || `${s.title} ${s.sign_type} ${stageLabel(p.stage)}`;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "홈", item: site.url },
            { "@type": "ListItem", position: 2, name: "주요실적", item: `${site.url}/works` },
            { "@type": "ListItem", position: 3, name: s.title, item: `${site.url}${path}` },
          ],
        }}
      />

      <div className="bg-ink py-14 text-white md:py-20">
        <div className="wrap">
          <p className="mb-3 text-[13px] font-black tracking-[0.25em] text-accent">
            <Link href="/works" className="hover:underline">
              시공사례
            </Link>
            {s.location && ` · ${s.location}`}
          </p>
          <h1 className="text-3xl leading-tight font-black tracking-tight md:text-5xl">
            {s.title} {s.sign_type}
          </h1>
          {facts.length > 0 && (
            <dl className="mt-8 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[12px] font-bold tracking-[0.1em] text-white/50">{k}</dt>
                  <dd className="mt-1 text-[16px] font-bold">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      <div className="wrap py-12 md:py-16">
        {cover && (
          <figure className="overflow-hidden rounded-2xl bg-paper">
            {/* eslint-disable-next-line @next/next/no-img-element -- 이미 줄여 저장한 사진(긴 변 1600px)을 그대로 냅니다 */}
            <img src={photoUrl(cover.key)} alt={alt(cover)} width={cover.width} height={cover.height} className="h-auto w-full" />
          </figure>
        )}

        {s.story && (
          <section className="mt-12 max-w-3xl">
            <h2 className="text-2xl font-black tracking-tight">현장 이야기</h2>
            <div className="mt-4 space-y-4 text-[17px] leading-[1.85] text-ink">
              {s.story
                .split(/\n{2,}/)
                .map((para) => para.trim())
                .filter(Boolean)
                .map((para, i) => (
                  <p key={i} className="whitespace-pre-line">
                    {para}
                  </p>
                ))}
            </div>
          </section>
        )}

        {STAGES.map((st) => {
          const items = photos.filter((p) => p.stage === st.key && p.id !== cover?.id);
          if (!items.length) return null;
          return (
            <section key={st.key} className="mt-14">
              <h2 className="text-xl font-black tracking-tight">{st.label}</h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {items.map((p) => (
                  <li key={p.id}>
                    <figure>
                      {/* eslint-disable-next-line @next/next/no-img-element -- 위와 같음 */}
                      <img src={photoUrl(p.key)} alt={alt(p)} width={p.width} height={p.height} loading="lazy" className="h-auto w-full rounded-xl bg-paper" />
                      {p.caption && <figcaption className="mt-2 text-[14px] text-ink-500">{p.caption}</figcaption>}
                    </figure>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <div className="mt-16 rounded-2xl bg-paper px-6 py-12 text-center">
          <h2 className="text-2xl font-black tracking-tight">비슷한 간판을 생각하고 계신가요?</h2>
          <p className="mt-3 leading-relaxed text-ink-500">현장을 알려주시면 이 사례와 비교해 사양과 예상 견적을 보내드립니다. 현장 확인·시안은 무료입니다.</p>
          <Link
            href="/quote"
            className="mt-6 inline-block rounded-xl bg-brand px-8 py-4 font-black text-white transition-colors hover:bg-brand-600"
          >
            무료 견적 신청
          </Link>
          <p className="mt-4">
            <Link href="/works" className="text-[14px] font-bold text-brand-700 hover:underline">
              ← 다른 시공사례 보기
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
