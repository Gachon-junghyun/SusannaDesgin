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
  idPrefix = "agree",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  dark?: boolean;
  compact?: boolean;
  /**
   * 한 화면에 이 컴포넌트가 두 벌 이상 놓일 때 `id` 가 겹치지 않게 하는 접두어.
   * 홈이 그런 화면입니다 — 간편 견적 폼이 데스크톱·모바일 두 벌 들어갑니다
   * (`QuickQuoteForm` 머리말 참조).
   */
  idPrefix?: string;
}) {
  const [open, setOpen] = useState(false);
  const errorId = `${idPrefix}-error`;

  const muted = dark ? "text-white/55" : "text-ink-500";
  const box = dark
    ? "border-white/15 bg-white/5 text-white/70"
    : "border-line bg-paper text-ink-500";

  return (
    <div>
      <div className="flex items-start gap-2">
        {/*
          체크박스는 20px 입니다. WCAG 2.2 «Target Size» 의 24px 에는 못 미치지만,
          바로 옆 라벨(`htmlFor`)이 같은 동작을 하는 충분히 큰 대체 수단이라
          «Equivalent» 예외에 해당합니다. **라벨 연결을 끊으면 이 예외가 사라집니다.**
          체크 색은 토큰(`accent-brand`)으로 받습니다 — 예전에는 `#00a79d` 를 손으로
          박아 두어서, 팔레트를 고쳐도 **여기만 옛 색으로 남는** 자리였습니다.
          (지금 값은 같습니다. 다음에 팔레트를 만질 때 갈라지지 않게 하려는 것입니다)
        */}
        <input
          id={idPrefix}
          name="agree"
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
        />
        <div className="min-w-0 flex-1">
          <label
            htmlFor={idPrefix}
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
        <p id={errorId} role="alert" className="mt-1.5 pl-6 text-[13px] font-medium text-accent">
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
