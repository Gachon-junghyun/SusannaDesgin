"use client";

import { useRef, useState } from "react";

import { MEDIA_BUCKET } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/browser";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * 사진 업로드 칸.
 *
 * 파일을 서버 액션으로 보내지 않고 브라우저에서 Supabase 스토리지로 곧장 올립니다.
 * 서버 액션은 기본 본문 한도가 1MB 라 사진 한 장도 못 넘기기 때문입니다.
 * 업로드가 끝나면 공개 URL 만 숨은 input 에 담아 폼과 함께 제출합니다.
 *
 * 업로드 권한은 스토리지 정책(관리자만 insert)이 판단합니다.
 */
export default function ImageField({
  name = "image_url",
  defaultValue = "",
  hint,
}: {
  name?: string;
  defaultValue?: string;
  hint?: string;
}) {
  const [url, setUrl] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 올릴 수 있습니다.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`파일이 너무 큽니다 (${(file.size / 1024 / 1024).toFixed(1)}MB). 10MB 이하로 줄여 주세요.`);
      return;
    }

    setBusy(true);
    setError("");

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, file, { cacheControl: "31536000", upsert: false });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
      setUrl(data.publicUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? `업로드 실패: ${err.message}`
          : "업로드에 실패했습니다. 잠시 후 다시 시도해 주세요."
      );
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={url} />

      <div className="flex items-start gap-4">
        <div className="relative h-28 w-40 shrink-0 overflow-hidden rounded-lg border border-line bg-paper">
          {url ? (
            // 로컬 경로와 스토리지 URL 을 모두 받아야 해서 순수 img 를 씁니다.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="미리보기" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[12px] text-ink-500">
              사진 없음
            </span>
          )}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-white/80 text-[12px] font-bold">
              올리는 중…
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            disabled={busy}
            className="block w-full text-[13px] file:mr-3 file:rounded-lg file:border-0 file:bg-ink file:px-4 file:py-2 file:text-[13px] file:font-bold file:text-white hover:file:bg-ink-700"
          />
          {hint && <p className="mt-1.5 text-[12px] text-ink-500">{hint}</p>}

          {url && (
            <div className="mt-2 flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-[12px] text-ink-500" title={url}>
                {url}
              </p>
              <button
                type="button"
                onClick={() => setUrl("")}
                className="shrink-0 text-[12px] font-bold text-accent underline"
              >
                제거
              </button>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-2 text-[13px] font-bold text-accent">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
