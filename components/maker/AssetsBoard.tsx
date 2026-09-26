"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { deleteMakerAsset, deleteMakerProject } from "@/app/admin/maker/assets/actions";
import type { AssetList, MakerAsset } from "@/lib/maker/assets";

/**
 * 프로젝트 에셋 보드 (F26-j · 2026-09-26) — 프로젝트(손님 한 건)마다 한 절, 에셋은 격자 섬네일.
 * 상자를 늘리지 않습니다(절은 제목과 선으로 나눔). 투명 PNG·SVG 가 보이게 섬네일 바탕만 옅은 바둑판입니다.
 */
export default function AssetsBoard({ initial }: { initial: AssetList }) {
  const [items, setItems] = useState<MakerAsset[]>(initial.ok ? initial.items : []);
  const [err, setErr] = useState(initial.ok ? "" : initial.error);
  const [pending, start] = useTransition();

  const groups = useMemo(() => {
    const m = new Map<string, MakerAsset[]>();
    for (const a of items) m.set(a.project, [...(m.get(a.project) ?? []), a]);
    return [...m.entries()];
  }, [items]);

  function remove(a: MakerAsset) {
    if (!confirm(`«${a.name}» 을(를) 지웁니다. 되돌릴 수 없습니다.`)) return;
    start(async () => {
      const r = await deleteMakerAsset(a.id);
      if (!r.ok) return setErr(r.error ?? "지우지 못했습니다.");
      setItems((xs) => xs.filter((x) => x.id !== a.id));
    });
  }

  function removeProject(p: string, n: number) {
    if (!confirm(`프로젝트 «${p}» 의 에셋 ${n}개를 모두 지웁니다. 상담이 끝난 손님 자료를 정리할 때 씁니다. 되돌릴 수 없습니다.`)) return;
    start(async () => {
      const r = await deleteMakerProject(p);
      if (!r.ok) return setErr(r.error ?? "지우지 못했습니다.");
      setItems((xs) => xs.filter((x) => x.project !== p));
    });
  }

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-[22px] font-black">프로젝트 에셋</h1>
        <p className="mt-2 max-w-3xl text-[13px] leading-6 text-ink-500">
          클로드 코드가 손님 시안에서 뽑아 올린 로고·레터링·아이콘·그림입니다. 벽에 올리려면{" "}
          <Link href="/admin/maker" className="font-bold text-brand-700 underline underline-offset-2">간판 에디터</Link>의 «넣기 → 프로젝트 에셋»에서 고르세요.
          다 조립했으면 에디터 오른쪽 «공유 링크 만들기»로 방을 만들고 그 주소를 클로드에게 주면 일러스트 파일로 구워 옵니다.
        </p>
        <p className="mt-1 text-[12px] text-ink-500">손님 자료라 관리자만 봅니다. 상담이 끝나면 프로젝트째 지워 주세요.</p>

        {err && <p className="mt-4 border-l-[3px] border-red-600 bg-red-50 px-3 py-2 text-[13px] text-red-700">{err}</p>}
        {!err && !groups.length && (
          <p className="mt-10 text-[14px] text-ink-500">
            아직 올라온 에셋이 없습니다. 올리는 법: <code className="bg-paper px-1.5 py-0.5 text-[12px]">npm run cms -- maker-assets upload &lt;프로젝트&gt; &lt;파일…&gt;</code>
          </p>
        )}

        {groups.map(([p, list]) => (
          <section key={p} className="mt-10 border-t border-ink pt-4">
            <div className="flex items-baseline gap-3">
              <h2 className="text-[17px] font-black">{p}</h2>
              <span className="text-[12px] text-ink-500">{list.length}개 · 처음 올린 날 {list[0].created_at.slice(0, 10)}</span>
              <button type="button" disabled={pending} onClick={() => removeProject(p, list.length)} className="ml-auto text-[12px] text-ink-500 underline underline-offset-2 hover:text-red-700">
                프로젝트째 지우기
              </button>
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
              {list.map((a) => (
                <li key={a.id} className="group">
                  <div
                    className="flex aspect-[4/3] items-center justify-center p-3"
                    style={{ backgroundColor: "#f5f5f2", backgroundImage: "linear-gradient(45deg,#ebebe6 25%,transparent 25%,transparent 75%,#ebebe6 75%),linear-gradient(45deg,#ebebe6 25%,transparent 25%,transparent 75%,#ebebe6 75%)", backgroundSize: "16px 16px", backgroundPosition: "0 0,8px 8px" }}
                  >
                    {a.url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- 서명 URL(수명 있음)이라 next/image 최적화에 안 태웁니다
                      <img src={a.url} alt={a.name} className="max-h-full max-w-full object-contain" loading="lazy" />
                    ) : (
                      <span className="text-[12px] text-ink-500">미리보기 없음</span>
                    )}
                  </div>
                  <div className="mt-2 flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold" title={a.name}>{a.name}</p>
                      <p className="text-[11px] text-ink-500">
                        {a.kind.toUpperCase()} · {a.width}×{a.height} · {Math.max(1, Math.round(a.bytes / 1024))}KB
                      </p>
                      {a.note && <p className="mt-0.5 line-clamp-2 text-[11px] text-ink-500" title={a.note}>{a.note}</p>}
                    </div>
                    <button type="button" disabled={pending} onClick={() => remove(a)} className="shrink-0 text-[11px] text-ink-500 opacity-0 hover:text-red-700 group-hover:opacity-100 focus:opacity-100">
                      지우기
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
