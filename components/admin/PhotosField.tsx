"use client";

import { useRef, useState } from "react";

import { createClient } from "@/lib/supabase/browser";
import { MEDIA_BUCKET } from "@/lib/supabase/env";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB — `ImageField` 와 같은 값

/**
 * 사진 **여러 장** 칸 (F24-e, 2026-09-09 신설).
 *
 * `ImageField`(한 장)의 형제입니다. 합치지 않은 이유: 한 장짜리는 «있다/없다» 지만
 * 여러 장은 **순서가 뜻을 갖습니다**(상세페이지 슬라이더가 이 순서로 넘깁니다).
 * 한 부품에 두 모드를 넣으면 그 부품이 늘 두 갈래로 읽힙니다.
 *
 * 저장 방식은 `points` 와 같습니다 — **줄바꿈으로 이어 붙인 숨은 input** 하나.
 * 서버 액션이 `toLines()` 로 다시 배열로 만듭니다(새 직렬화 규칙을 만들지 않았습니다).
 *
 * 🔴 **여러 장을 한 번에 고를 수 있습니다.** 현장 사진은 보통 한 번에 여러 장이
 * 나옵니다 — 한 장씩 고르게 하면 대표님이 안 씁니다. 실패한 장은 이유를 남기고
 * **성공한 장은 그대로 붙입니다**(하나가 실패해서 전부 날아가면 다시 다 골라야 합니다).
 */
export default function PhotosField({
  name = "photos",
  defaultValue = [],
  hint,
}: {
  name?: string;
  defaultValue?: string[];
  hint?: string;
}) {
  const [urls, setUrls] = useState<string[]>(defaultValue);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    if (!files.length) return;

    setError("");
    setBusy(files.length);

    const supabase = createClient();
    const added: string[] = [];
    const failed: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        failed.push(`${file.name} (이미지가 아닙니다)`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        failed.push(`${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB — 10MB 넘음)`);
        continue;
      }
      try {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(MEDIA_BUCKET)
          .upload(path, file, { cacheControl: "31536000", upsert: false });
        if (upErr) throw upErr;
        added.push(supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl);
      } catch (err) {
        failed.push(`${file.name} (${err instanceof Error ? err.message : "업로드 실패"})`);
      } finally {
        setBusy((n) => n - 1);
      }
    }

    if (added.length) setUrls((prev) => [...prev, ...added]);
    if (failed.length) setError(`올리지 못한 사진: ${failed.join(" · ")}`);
    if (fileRef.current) fileRef.current.value = "";
    setBusy(0);
  }

  const move = (i: number, dir: -1 | 1) =>
    setUrls((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const remove = (i: number) => setUrls((prev) => prev.filter((_, k) => k !== i));

  return (
    <div>
      {/* 서버로는 «줄바꿈으로 이은 한 덩이» 로 갑니다 — points 와 같은 규칙 */}
      <input type="hidden" name={name} value={urls.join("\n")} />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        disabled={busy > 0}
        className="block w-full text-[13px] file:mr-3 file:rounded-lg file:border-0 file:bg-ink file:px-4 file:py-2 file:text-[13px] file:font-bold file:text-white hover:file:bg-ink-700"
      />
      <p className="mt-1.5 text-[12px] text-ink-500">
        {hint ?? "여러 장을 한 번에 고를 수 있습니다. 장당 10MB 이하."}
        {urls.length > 0 && (
          <>
            {" "}
            지금 <b className="text-ink">{urls.length}장</b>.
          </>
        )}
      </p>

      {busy > 0 && (
        <p className="mt-2 text-[13px] font-bold text-brand">사진 {busy}장 올리는 중…</p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[13px] font-medium text-accent">
          {error}
        </p>
      )}

      {urls.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {urls.map((u, i) => (
            <li
              key={`${u}-${i}`}
              className="overflow-hidden rounded-lg border border-line bg-paper"
            >
              <div className="relative aspect-square">
                {/* 로컬 경로와 스토리지 URL 을 모두 받아야 해서 순수 img 를 씁니다 (ImageField 와 같은 이유) */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="h-full w-full object-cover" />
                <span className="absolute top-1.5 left-1.5 rounded bg-ink/75 px-1.5 py-0.5 text-[11px] font-bold text-white">
                  {i + 1}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="앞으로"
                    className="rounded px-1.5 py-0.5 text-[13px] font-bold text-ink-500 hover:bg-paper disabled:opacity-30"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === urls.length - 1}
                    aria-label="뒤로"
                    className="rounded px-1.5 py-0.5 text-[13px] font-bold text-ink-500 hover:bg-paper disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-[12px] font-bold text-accent underline"
                >
                  제거
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
