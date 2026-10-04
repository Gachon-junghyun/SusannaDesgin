"use client";

import { useState } from "react";
import Link from "next/link";
import PrivacyConsent from "./PrivacyConsent";
import {
  ACCEPTED_FILE_TYPES,
  MAX_FILES,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  formatPhone,
  isAcceptedFile,
  validateQuick,
  type Errors,
} from "@/lib/validate";
import { trackLead } from "@/lib/analytics";

/**
 * 히어로 인라인 간편 상담 (3필드).
 * 레퍼런스: 홍간판 — 이름/연락처/설치지역/설치층수만 받고 이메일도 받지 않음.
 * 필드가 적을수록 전환이 오릅니다. 상세 정보는 회신 통화에서 받습니다.
 *
 * 🔴 **홈에는 이 폼이 두 벌 들어갑니다** — 데스크톱은 히어로 사진 안(`HeroSlider`),
 *    모바일은 히어로 아래(`app/page.tsx`). CSS 로 한쪽씩 숨기지만 **숨겨도 DOM 에는
 *    둘 다 남습니다.** 그래서 `id` 가 통째로 겹쳐 있었고, 브라우저는 `label for=` 를
 *    **문서에서 처음 만난 칸**에 붙입니다 — 즉 모바일에서 라벨을 눌러도 화면에 없는
 *    데스크톱 칸에 포커스가 갔고, `aria-describedby` 의 에러 안내도 같은 곳을
 *    가리켰습니다. 오류가 안 나서 화면만 봐서는 모릅니다.
 *    **`idPrefix` 를 서로 다르게 주는 것이 이 문제의 해법입니다.** 새 자리에 이 폼을
 *    또 놓게 되면 접두어를 반드시 새로 주세요.
 */
export default function QuickQuoteForm({
  idPrefix = "q",
  product = "",
  withPhoto = false,
  moreHref = "/quote",
}: {
  idPrefix?: string;
  /**
   * 「보고 온 제품」 (F24-c·d). 제품 상세페이지가 채워 넣습니다 — 홈에서는 빈 값입니다.
   * 🔴 **화면에 입력칸으로 세우지 않습니다.** 이 폼의 존재 이유가 «칸이 적다» 라서,
   * 칸을 하나 늘리면 그 이유가 깎입니다. 대신 폼 위에 «어느 간판인지» 를 한 줄로
   * 적어 두고(상세페이지의 제목이 이미 그 말을 합니다) 값만 조용히 실어 보냅니다.
   */
  product?: string;
  /**
   * 「사진 (선택)」 칸 하나를 더 붙입니다 — `/quote` 맨 위에서만 켭니다 (2026-10-04).
   * 2026-10-03 Clarity 녹화에서 견적 폼(11칸) 첫 칸에서 멈추고 나간 손님이 있어,
   * `/quote` 첫 화면을 «연락처 + 사진 한 장» 으로 줄였습니다. 사진은 **선택**이라 칸 수는 늘지 않습니다.
   * 서버(`/api/quote`)는 `kind` 와 상관없이 `files` 를 같은 규칙으로 검사합니다.
   */
  withPhoto?: boolean;
  /** 접수 완료 뒤 «상세 견적도 남기기» 링크. `/quote` 안에서는 `null` 로 숨깁니다(같은 페이지라). */
  moreHref?: string | null;
}) {
  const [form, setForm] = useState({ name: "", phone: "", region: "", trap: "" });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");

  /** 규칙은 `QuoteForm` 의 `onFiles` 와 같습니다 — 서버도 같은 함수로 다시 검사합니다. */
  function onFiles(list: FileList | null) {
    if (!list) return;
    const picked = [...list];
    setFileError("");
    if (files.length + picked.length > MAX_FILES) {
      setFileError(`사진은 최대 ${MAX_FILES}장까지 가능합니다.`);
      return;
    }
    const tooBig = picked.find((f) => f.size > MAX_FILE_BYTES);
    if (tooBig) {
      setFileError(`'${tooBig.name}' 은(는) ${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB를 넘습니다.`);
      return;
    }
    const total = [...files, ...picked].reduce((n, f) => n + f.size, 0);
    if (total > MAX_TOTAL_BYTES) {
      setFileError(`사진을 합쳐 ${Math.round(MAX_TOTAL_BYTES / 1024 / 1024)}MB 까지 보낼 수 있습니다.`);
      return;
    }
    const badType = picked.find((f) => !isAcceptedFile(f.name));
    if (badType) {
      setFileError(`'${badType.name}' 은(는) 받을 수 없는 형식입니다.`);
      return;
    }
    setFiles((prev) => [...prev, ...picked]);
  }

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateQuick({ ...form, agree });
    setErrors(err);
    if (Object.keys(err).length) return;

    setState("sending");
    try {
      const fd = new FormData();
      fd.set("kind", "quick");
      fd.set("name", form.name);
      fd.set("phone", form.phone);
      fd.set("region", form.region);
      if (product) fd.set("product", product);
      fd.set("agree", "true");
      fd.set("company_website", form.trap);
      files.forEach((f) => fd.append("files", f));

      const res = await fetch("/api/quote", { method: "POST", body: fd });
      if (!res.ok) throw new Error("failed");
      // 허니팟에 걸린 제출은 서버가 저장 없이 200 을 돌려줍니다 — 전환으로 세지 않습니다
      if (!form.trap) trackLead("quick");
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-2xl bg-white/95 p-7 text-center backdrop-blur">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00a79d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <p className="text-lg font-black">상담 신청이 접수됐습니다</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-500">
          담당자가 확인 후 빠르게 연락드리겠습니다.
        </p>
        {moreHref && (
          <Link
            href={moreHref}
            className="mt-4 inline-block text-[14px] font-bold text-accent underline underline-offset-4"
          >
            상세 견적도 남기기 →
          </Link>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-2xl bg-white/95 p-6 shadow-2xl backdrop-blur"
    >
      <p className="text-[13px] font-bold tracking-wide text-accent">FREE ESTIMATE</p>
      <h2 className="mt-1 text-xl font-black">1분 만에 무료 견적</h2>
      <p className="mt-1 text-[13px] text-ink-500">
        연락처만 남겨주시면 담당자가 바로 연락드립니다.
      </p>

      <div className="mt-4 space-y-2.5">
        <Input
          id={`${idPrefix}-name`}
          label="성함"
          value={form.name}
          onChange={set("name")}
          placeholder="홍길동"
          error={errors.name}
          autoComplete="name"
        />
        <Input
          id={`${idPrefix}-phone`}
          label="연락처"
          value={form.phone}
          onChange={(v) => set("phone")(formatPhone(v))}
          placeholder="010-0000-0000"
          error={errors.phone}
          inputMode="tel"
          autoComplete="tel"
        />
        <Input
          id={`${idPrefix}-region`}
          label="설치지역"
          value={form.region}
          onChange={set("region")}
          placeholder="예: 대전 서구"
          error={errors.region}
        />
      </div>

      {withPhoto && (
        <div className="mt-2.5">
          <p className="mb-1 block text-[12px] font-bold text-ink-500">
            간판 자리 사진 <span className="font-medium">(선택)</span>
          </p>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-line px-4 py-3 text-[14px] font-medium text-ink-500 transition-colors hover:border-ink-500 hover:text-ink">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            사진 찍기 · 고르기
            <input
              type="file"
              multiple
              accept={ACCEPTED_FILE_TYPES}
              onChange={(e) => {
                onFiles(e.target.files);
                e.target.value = "";
              }}
              className="sr-only"
            />
          </label>
          {files.length > 0 && (
            // 파일 이름은 손님이 붙인 이름이라 방문 녹화에서 가립니다 (F22 Clarity — QuoteForm 과 같은 규칙)
            <ul className="mt-2 space-y-1.5" data-clarity-mask="true">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 rounded-lg bg-paper px-3 py-2 text-[13px]">
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="shrink-0 font-bold text-ink-500 hover:text-brand"
                    aria-label={`${f.name} 삭제`}
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )}
          {fileError ? (
            <p role="alert" className="mt-1 text-[13px] font-medium text-accent">{fileError}</p>
          ) : (
            <p className="mt-1 text-[12px] text-ink-500">사진이 있으면 통화 전에 크기와 재질을 미리 봐 둡니다.</p>
          )}
        </div>
      )}

      {/* 봇 트랩 — 화면에 보이지 않습니다 */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor={`${idPrefix}-website`}>Website</label>
        <input
          id={`${idPrefix}-website`}
          name="company_website"
          tabIndex={-1}
          autoComplete="off"
          value={form.trap}
          onChange={(e) => set("trap")(e.target.value)}
        />
      </div>

      <div className="mt-3.5">
        <PrivacyConsent
          checked={agree}
          onChange={setAgree}
          error={errors.agree}
          compact
          idPrefix={`${idPrefix}-agree`}
        />
      </div>

      <button
        type="submit"
        disabled={state === "sending"}
        className="btn mt-4 flex w-full px-5 py-3.5 text-[16px] font-black"
      >
        {state === "sending" ? "전송 중…" : "무료 견적 신청"}
      </button>

      {state === "error" && (
        <p role="alert" className="mt-2 text-center text-[13px] font-medium text-accent">
          전송에 실패했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      )}
    </form>
  );
}

function Input({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  inputMode,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  inputMode?: "tel" | "text";
  autoComplete?: string;
}) {
  return (
    <div>
      {/*
        🔴 **라벨을 눈에 보이게 둡니다.** 예전에는 `sr-only` 라 화면에는 안내문
           (placeholder)뿐이었는데, **타이핑을 시작하면 그 안내문이 사라집니다** —
           칸을 세 개 채우고 나면 무엇을 적는 칸이었는지 화면에 아무 단서가 없고,
           자동완성으로 값이 채워진 경우엔 처음부터 없습니다.
           안내문으로 라벨을 대신하는 것은 널리 기록된 안티패턴입니다.
      */}
      <label htmlFor={id} className="mb-1 block text-[12px] font-bold text-ink-500">
        {label}
        <span className="ml-1 text-accent" aria-hidden="true">
          *
        </span>
        <span className="sr-only">(필수)</span>
      </label>
      <input
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        /* ⚠️ 에러 테두리가 원래 `border-brand`(청록)였습니다 — 잘못된 값에 브랜드색이
              들어와 «정상»처럼 보였습니다. 색 팔레트를 바꾼 게 아니라 **쓰던 자리를
              고친 것**이라, 색을 되돌린 뒤에도 이건 `accent`(에러색) 그대로 둡니다.
              `Field.tsx` 의 `inputCls` 와 같은 규칙입니다.
           placeholder 의 `ink-500/60` 은 흰 배경에서 2.50:1 이라 기준 미달인데,
              색 톤을 유지하기로 한 결정이라 그대로 둡니다 (globals.css 머리말). */
        className="w-full rounded-lg border border-line px-4 py-3 text-[15px] outline-none transition-colors placeholder:text-ink-500/60 focus:border-brand focus:ring-2 focus:ring-brand/20 aria-[invalid=true]:border-accent aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-accent/20"
      />
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1 text-[13px] font-medium text-accent"
        >
          {error}
        </p>
      )}
    </div>
  );
}
