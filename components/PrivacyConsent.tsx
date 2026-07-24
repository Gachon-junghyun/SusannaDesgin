"use client";

import { useState } from "react";
import { privacyConsent } from "@/config/site";

/**
 * 개인정보 수집·이용 동의.
 * 개인정보보호법 제15조 — 체크박스만으로는 부족하고 수집항목·목적·보유기간·거부권을
 * 폼 안에서 함께 고지해야 합니다. (레퍼런스: 비스퀘어는 약관 전문을 스크롤박스로 노출)
 */
export default function PrivacyConsent({
  checked,
  onChange,
  error,
  dark = false,
  compact = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  dark?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const muted = dark ? "text-white/55" : "text-ink-500";
  const box = dark
    ? "border-white/15 bg-white/5 text-white/70"
    : "border-line bg-paper text-ink-500";

  return (
    <div>
      <div className="flex items-start gap-2">
        <input
          id="agree"
          name="agree"
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={!!error}
          aria-describedby={error ? "agree-error" : undefined}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#00a79d]"
        />
        <div className="min-w-0 flex-1">
          <label
            htmlFor="agree"
            className={`cursor-pointer text-[13px] leading-snug ${
              dark ? "text-white/80" : ""
            }`}
          >
            <span className="font-bold text-accent">(필수)</span>{" "}
            개인정보 수집 및 이용에 동의합니다.
          </label>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={`ml-2 text-[13px] underline underline-offset-2 ${muted}`}
          >
            {open ? "닫기" : "전문 보기"}
          </button>
        </div>
      </div>

      {open && (
        <div
          className={`mt-2 max-h-40 overflow-y-auto rounded-lg border p-3 text-[12px] leading-relaxed ${box}`}
        >
          <dl className="space-y-1">
            <Row label="수집 항목" value={privacyConsent.items} />
            <Row label="수집 목적" value={privacyConsent.purpose} />
            <Row label="보유 기간" value={privacyConsent.retention} />
          </dl>
          <p className="mt-2 border-t border-current/10 pt-2">
            {privacyConsent.refusalNotice}
          </p>
        </div>
      )}

      {!compact && !open && (
        <p className={`mt-1.5 pl-6 text-[12px] leading-relaxed ${muted}`}>
          수집항목 {privacyConsent.items} · 목적 {privacyConsent.purpose} · 보유기간{" "}
          {privacyConsent.retention}
        </p>
      )}

      {error && (
        <p id="agree-error" role="alert" className="mt-1.5 pl-6 text-[13px] font-medium text-accent">
          {error}
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-16 shrink-0 font-bold">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
