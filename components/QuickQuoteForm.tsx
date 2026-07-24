"use client";

import { useState } from "react";
import Link from "next/link";
import PrivacyConsent from "./PrivacyConsent";
import { formatPhone, validateQuick, type Errors } from "@/lib/validate";

/**
 * 히어로 인라인 간편 상담 (3필드).
 * 레퍼런스: 홍간판 — 이름/연락처/설치지역/설치층수만 받고 이메일도 받지 않음.
 * 필드가 적을수록 전환이 오릅니다. 상세 정보는 회신 통화에서 받습니다.
 */
export default function QuickQuoteForm() {
  const [form, setForm] = useState({ name: "", phone: "", region: "", trap: "" });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

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
      fd.set("agree", "true");
      fd.set("company_website", form.trap);

      const res = await fetch("/api/quote", { method: "POST", body: fd });
      if (!res.ok) throw new Error("failed");
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
        <Link
          href="/quote"
          className="mt-4 inline-block text-[14px] font-bold text-accent underline underline-offset-4"
        >
          상세 견적도 남기기 →
        </Link>
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
          id="q-name"
          label="성함"
          value={form.name}
          onChange={set("name")}
          placeholder="성함을 입력해 주세요"
          error={errors.name}
          autoComplete="name"
        />
        <Input
          id="q-phone"
          label="연락처"
          value={form.phone}
          onChange={(v) => set("phone")(formatPhone(v))}
          placeholder="010-0000-0000"
          error={errors.phone}
          inputMode="tel"
          autoComplete="tel"
        />
        <Input
          id="q-region"
          label="설치지역"
          value={form.region}
          onChange={set("region")}
          placeholder="예: 수원시 팔달구"
          error={errors.region}
        />
      </div>

      {/* 봇 트랩 — 화면에 보이지 않습니다 */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="q-website">Website</label>
        <input
          id="q-website"
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
        />
      </div>

      <button
        type="submit"
        disabled={state === "sending"}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-[16px] font-black text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
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
      <label htmlFor={id} className="sr-only">
        {label} (필수)
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
        className="w-full rounded-lg border border-line px-4 py-3 text-[15px] outline-none transition-colors placeholder:text-ink-500/60 focus:border-brand focus:ring-2 focus:ring-brand/20 aria-[invalid=true]:border-brand"
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-[13px] font-medium text-accent">
          {error}
        </p>
      )}
    </div>
  );
}
