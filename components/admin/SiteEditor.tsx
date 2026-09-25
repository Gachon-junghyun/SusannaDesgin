"use client";

import { useRouter } from "next/navigation";
import { useActionState, useRef, useState, useTransition } from "react";

import {
  deletePhoto,
  deleteSite,
  markOriginal,
  readSignOf,
  saveSite,
  setCover,
  setPhoto,
  setPublished,
  type SiteState,
} from "@/app/admin/sites/actions";
import { preparePhoto } from "@/lib/photo-prep";
import { photoUrl, publishGaps, sortPhotos, stageLabel, STAGES } from "@/lib/sites-shared";
import type { PhotoStage, SitePhotoRow, SiteRow } from "@/lib/supabase/types";

/**
 * 현장 한 건 편집 (F29) — 사진 끌어다 놓기 · 단계 · 사실 칸 · 공개.
 * 가져오는 건 `app/admin/sites/[id]/page.tsx`, 여기는 받은 것만 그리고 올립니다.
 */

type Job = { name: string; state: "준비" | "올리는 중" | "원본 보내는 중" | "끝" | "실패"; note?: string };

/**
 * `MM/DD HH:mm` (한국 시각). 🔴 `toLocaleString("ko-KR")` 을 쓰지 마세요 — 서버(워커·노드)와 브라우저의 ICU 가 달라
 * 서버는 «AM 10:00», 브라우저는 «오전 10:00» 을 내서 화면이 다시 그려집니다(hydration 오류, 2026-09-26 실측).
 * `sv-SE` 는 어디서나 `2026-09-10 10:00:00` 을 줍니다.
 */
const kst = (iso: string | null) => {
  if (!iso) return "";
  const t = new Date(iso).toLocaleString("sv-SE", { timeZone: "Asia/Seoul" });
  return `${t.slice(5, 7)}/${t.slice(8, 10)} ${t.slice(11, 16)}`;
};

export default function SiteEditor({
  site,
  photos,
  storageReady,
  driveReady,
  ocrReady,
}: {
  site: SiteRow;
  photos: SitePhotoRow[];
  storageReady: boolean;
  driveReady: boolean;
  ocrReady: boolean;
}) {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const [suggest, setSuggest] = useState<{ name: string; signType: string } | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLInputElement>(null);

  const sorted = sortPhotos(photos);
  const gaps = publishGaps(site, photos.length);
  const busy = jobs.some((j) => j.state !== "끝" && j.state !== "실패");

  const run = (fn: () => Promise<SiteState>) =>
    start(async () => {
      const r = await fn();
      if (r.error) setError(r.error);
      else setError("");
    });

  async function upload(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (!list.length) return;
    setJobs(list.map((f) => ({ name: f.name, state: "준비" })));
    const set = (i: number, j: Partial<Job>) => setJobs((all) => all.map((x, k) => (k === i ? { ...x, ...j } : x)));

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      try {
        set(i, { state: "올리는 중" });
        const p = await preparePhoto(file);
        const fd = new FormData();
        fd.set("siteId", site.id);
        fd.set("takenAt", p.takenAt ?? "");
        fd.set("width", String(p.width));
        fd.set("height", String(p.height));
        fd.set("web", p.web, "web");
        fd.set("thumb", p.thumb, "thumb");
        const r = await fetch("/api/admin/site-photos", { method: "POST", body: fd });
        const j = (await r.json()) as { photo?: SitePhotoRow; error?: string };
        if (!r.ok || !j.photo) throw new Error(j.error ?? `올리기 실패 (${r.status})`);

        if (driveReady) {
          set(i, { state: "원본 보내는 중" });
          try {
            const s = await fetch("/api/admin/drive/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ photoId: j.photo.id, name: file.name, mime: file.type, size: file.size }),
            });
            const sj = (await s.json()) as { url?: string; error?: string };
            if (!sj.url) throw new Error(sj.error ?? "드라이브 자리 없음");
            const up = await fetch(sj.url, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
            const uj = (await up.json().catch(() => ({}))) as { id?: string };
            if (!up.ok) throw new Error(`드라이브 ${up.status}`);
            await markOriginal(j.photo.id, "drive", uj.id ?? "");
          } catch (e) {
            await markOriginal(j.photo.id, "failed");
            set(i, { state: "끝", note: `웹용은 올렸고 원본은 못 보냈습니다 (${(e as Error).message}) — 원본은 폰 BeePhotos 로 백업하세요` });
            continue;
          }
        }
        set(i, { state: "끝", note: p.takenAt ? `촬영 ${kst(p.takenAt)}` : "촬영 시각 없음 — 올린 시각으로" });
      } catch (e) {
        set(i, { state: "실패", note: (e as Error).message });
      }
    }
    router.refresh();
  }

  return (
    <div className="space-y-10">
      {error && (
        <p role="alert" className="border-l-4 border-accent bg-white px-4 py-3 text-[14px] leading-relaxed text-ink">
          {error}
        </p>
      )}

      {/* 공개 상태 */}
      <section className="flex flex-wrap items-center justify-between gap-4 border-y border-line bg-white px-4 py-4">
        <div className="min-w-0">
          <p className="text-[15px] font-black">
            {site.published ? (
              <>
                <span className="text-brand-700">홈페이지에 공개 중</span> ·{" "}
                <a href={`/works/${site.slug}`} target="_blank" rel="noreferrer" className="font-bold text-brand-700 underline">
                  /works/{site.slug} ↗
                </a>
              </>
            ) : (
              <span className="text-ink">아직 비공개</span>
            )}
          </p>
          {!site.published && (
            <p className="mt-1 text-[13px] text-ink-500">
              {gaps.length ? `공개하려면: ${gaps.join(" · ")}` : "공개할 준비가 됐습니다. 공개하면 사진의 위치 정보는 이미 빠진 상태로 나갑니다."}
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={pending || (!site.published && gaps.length > 0)}
          onClick={() => run(() => setPublished(site.id, !site.published))}
          className={`px-5 py-2.5 text-[14px] font-bold disabled:opacity-40 ${site.published ? "border border-line bg-white text-ink" : "bg-brand-700 text-white"}`}
        >
          {site.published ? "비공개로 돌리기" : "홈페이지 사례로 공개"}
        </button>
      </section>

      {/* 사진 */}
      <section aria-label="사진">
        <h2 className="text-[20px] font-black tracking-tight">
          사진 <span className="text-ink-500">{photos.length}</span>
        </h2>
        {!storageReady ? (
          <p className="mt-3 border-l-4 border-accent bg-white px-4 py-3 text-[14px] leading-relaxed">
            사진 저장소(Cloudflare R2)가 아직 연결되지 않아 사진을 올릴 수 없습니다. 연결 방법은 «현장 폴더» 목록 위 안내에 있습니다.
          </p>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              if (!busy) upload(e.dataTransfer.files);
            }}
            className={`mt-3 border-2 border-dashed px-4 py-8 text-center ${drag ? "border-brand-600 bg-brand-50" : "border-line bg-white"}`}
          >
            <p className="text-[15px] font-bold">사진을 여기로 끌어다 놓거나</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => input.current?.click()}
              className="mt-3 bg-brand-700 px-5 py-2.5 text-[14px] font-bold text-white disabled:opacity-50"
            >
              사진 고르기
            </button>
            <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && upload(e.target.files)} />
            <p className="mt-3 text-[12px] leading-relaxed text-ink-500">
              여러 장 한 번에 됩니다. 촬영 시각 순으로 정리되고, 저녁 7시~새벽 5시에 찍은 사진은 «야간 점등»으로 먼저 잡습니다(바꿀 수 있음).
              <br />
              홈페이지에는 줄인 사진만 올라가고 위치 정보는 빠집니다.{" "}
              {driveReady ? "원본은 구글 드라이브를 거쳐 비스테이션으로 갑니다." : "원본 자동 전송은 꺼져 있습니다 — 원본은 폰 BeePhotos 백업으로 보관하세요."}
            </p>
          </div>
        )}

        {jobs.length > 0 && (
          <ul className="mt-3 space-y-1 text-[13px]">
            {jobs.map((j, i) => (
              <li key={i} className={j.state === "실패" ? "text-accent-600" : j.state === "끝" ? "text-ink-500" : "text-brand-700"}>
                <b>{j.state}</b> · {j.name}
                {j.note && ` — ${j.note}`}
              </li>
            ))}
          </ul>
        )}

        {suggest && (
          <div className="mt-4 border-l-4 border-brand-600 bg-white px-4 py-3 text-[14px]">
            <p>
              <b>AI 가 읽은 상호 (확인 필요):</b> {suggest.name || "읽지 못함"}
              {suggest.signType && ` · 간판 종류 추정: ${suggest.signType}`}
            </p>
            <div className="mt-2 flex gap-3 text-[13px] font-bold">
              {suggest.name && (
                <button
                  type="button"
                  className="text-brand-700"
                  onClick={() => {
                    if (titleRef.current) titleRef.current.value = suggest.name;
                    if (typeRef.current && suggest.signType && !typeRef.current.value) typeRef.current.value = suggest.signType;
                    setSuggest(null);
                  }}
                >
                  아래 칸에 넣기 (저장은 따로)
                </button>
              )}
              <button type="button" className="text-ink-500" onClick={() => setSuggest(null)}>
                닫기
              </button>
            </div>
          </div>
        )}

        {STAGES.map((st) => {
          const items = sorted.filter((p) => p.stage === st.key);
          if (!items.length) return null;
          return (
            <div key={st.key} className="mt-8">
              <h3 className="text-[14px] font-black text-ink-500">
                {st.label} <span className="font-bold">{items.length}</span>
              </h3>
              <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((p) => (
                  <PhotoCard
                    key={p.id}
                    p={p}
                    isCover={site.cover_photo === p.id}
                    ocrReady={ocrReady}
                    onError={setError}
                    onSuggest={setSuggest}
                    siteId={site.id}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <FactsForm site={site} titleRef={titleRef} typeRef={typeRef} />

      <section className="border-t border-line pt-6">
        <button
          type="button"
          onClick={() => confirm(`«${site.title}» 현장과 사진 ${photos.length}장을 지울까요? 되돌릴 수 없습니다. (비스테이션의 원본은 남습니다)`) && run(() => deleteSite(site.id))}
          className="text-[13px] font-bold text-ink-500 hover:text-accent-600"
        >
          이 현장 지우기
        </button>
      </section>
    </div>
  );
}

function PhotoCard({
  p,
  isCover,
  ocrReady,
  onError,
  onSuggest,
  siteId,
}: {
  p: SitePhotoRow;
  isCover: boolean;
  ocrReady: boolean;
  onError: (s: string) => void;
  onSuggest: (s: { name: string; signType: string }) => void;
  siteId: string;
}) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<SiteState>) =>
    start(async () => {
      const r = await fn();
      if (r.error) onError(r.error);
    });
  return (
    <li className={`bg-white ${pending ? "opacity-50" : ""} ${isCover ? "outline outline-2 outline-brand-700" : ""}`}>
      <a href={photoUrl(p.key)} target="_blank" rel="noreferrer" className="block aspect-[4/3] bg-paper">
        {/* eslint-disable-next-line @next/next/no-img-element -- 관리자 전용·비공개 사진이라 이미지 최적화를 안 거칩니다 */}
        <img src={photoUrl(p.thumb_key)} alt={p.caption || stageLabel(p.stage)} loading="lazy" className="h-full w-full object-cover" />
      </a>
      <div className="space-y-1.5 p-2 text-[12px]">
        <p className="text-ink-500">
          {p.taken_at ? kst(p.taken_at) : "시각 없음"}
          {isCover && <b className="ml-1 text-brand-700">대표</b>}
          {p.original_status === "drive" && <span className="ml-1">· 원본 전송됨</span>}
          {p.original_status === "failed" && <span className="ml-1 text-accent-600">· 원본 못 보냄</span>}
        </p>
        <select
          value={p.stage}
          onChange={(e) => run(() => setPhoto(p.id, { stage: e.target.value as PhotoStage }))}
          aria-label="단계"
          className="w-full border border-line bg-white px-1.5 py-1"
        >
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <input
          defaultValue={p.caption}
          maxLength={200}
          placeholder="한 줄 설명 (예: 3층 높이 고소작업)"
          aria-label="설명"
          onBlur={(e) => e.target.value !== p.caption && run(() => setPhoto(p.id, { caption: e.target.value }))}
          className="w-full border border-line px-1.5 py-1"
        />
        {p.ocr_text && <p className="leading-snug text-ink-500">AI 인식: {p.ocr_text}</p>}
        <div className="flex flex-wrap gap-x-3 gap-y-1 font-bold">
          {!isCover && (
            <button type="button" className="text-brand-700" onClick={() => run(() => setCover(siteId, p.id))}>
              대표로
            </button>
          )}
          {ocrReady && (
            <button
              type="button"
              className="text-brand-700"
              onClick={() =>
                start(async () => {
                  const r = await readSignOf(p.id);
                  if (r.error) onError(r.error);
                  else if (r.reading) onSuggest({ name: r.reading.name, signType: r.reading.signType });
                })
              }
            >
              상호 읽기
            </button>
          )}
          <button type="button" className="text-ink-500 hover:text-accent-600" onClick={() => confirm("이 사진을 지울까요?") && run(() => deletePhoto(p.id))}>
            지우기
          </button>
        </div>
      </div>
    </li>
  );
}

function FactsForm({
  site,
  titleRef,
  typeRef,
}: {
  site: SiteRow;
  titleRef: React.RefObject<HTMLInputElement | null>;
  typeRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [state, action, pending] = useActionState(saveSite.bind(null, site.id), {} as SiteState);
  const field = "mt-1 w-full border border-line bg-white px-3 py-2 text-[15px]";
  const lab = "text-[12px] font-bold text-ink-500";
  return (
    <section aria-label="현장 정보">
      <h2 className="text-[20px] font-black tracking-tight">현장 정보</h2>
      <p className="mt-1 text-[13px] text-ink-500">
        공개하면 이 칸들이 사례 페이지의 본문이 됩니다. 숫자(치수·높이·기간)를 적을수록 검색에 강합니다. 손님 연락처·번지는 적지 마세요.
      </p>
      <form action={action} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={lab}>상호 · 현장 이름 *</span>
          <input ref={titleRef} name="title" required maxLength={80} defaultValue={site.title} className={field} />
        </label>
        <label className="block">
          <span className={lab}>위치 (구·동까지) *</span>
          <input name="location" maxLength={60} defaultValue={site.location} placeholder="대전 서구 둔산동" className={field} />
        </label>
        <label className="block">
          <span className={lab}>간판 종류 *</span>
          <input ref={typeRef} name="sign_type" maxLength={40} defaultValue={site.sign_type} placeholder="채널간판" className={field} />
        </label>
        <label className="block">
          <span className={lab}>치수</span>
          <input name="size_text" maxLength={80} defaultValue={site.size_text} placeholder="가로 6m × 세로 0.9m" className={field} />
        </label>
        <label className="block">
          <span className={lab}>자재</span>
          <input name="materials" maxLength={120} defaultValue={site.materials} placeholder="갈바 프레임, 아크릴 전면, LED 모듈" className={field} />
        </label>
        <label className="block">
          <span className={lab}>기간</span>
          <input name="period" maxLength={60} defaultValue={site.period} placeholder="제작 5일 · 시공 반나절" className={field} />
        </label>
        <label className="block sm:col-span-2">
          <span className={lab}>현장 이야기 * (150자 이상 — 벽 재질, 높이, 장비, 어려웠던 점, 어떻게 풀었나)</span>
          <textarea name="story" maxLength={4000} rows={6} defaultValue={site.story} className={field} />
        </label>
        <label className="block">
          <span className={lab}>주소 조각 (한글 가능)</span>
          <input name="slug" maxLength={80} defaultValue={site.slug} className={field} />
        </label>
        <label className="block">
          <span className={lab}>비스테이션 링크 (관리자만 봄)</span>
          <input name="bee_link" type="url" maxLength={500} defaultValue={site.bee_link} placeholder="https://" className={field} />
        </label>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button type="submit" disabled={pending} className="bg-brand-700 px-5 py-2.5 text-[14px] font-bold text-white disabled:opacity-50">
            {pending ? "저장 중…" : "저장"}
          </button>
          {site.bee_link && (
            <a href={site.bee_link} target="_blank" rel="noreferrer" className="text-[13px] font-bold text-brand-700">
              비스테이션 열기 ↗
            </a>
          )}
          {state.error && <p className="text-[13px] text-accent-600">{state.error}</p>}
          {state.ok && <p className="text-[13px] text-brand-700">저장했습니다.</p>}
        </div>
      </form>
    </section>
  );
}
