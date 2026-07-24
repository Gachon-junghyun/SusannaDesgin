"use client";

import { useRef, useState } from "react";
import Field, { inputCls } from "./Field";
import PrivacyConsent from "./PrivacyConsent";
import { floorOptions, signTypeOptions, timingOptions } from "@/config/content";
import { site } from "@/config/site";
import {
  ACCEPTED_FILE_TYPES,
  MAX_FILES,
  MAX_FILE_BYTES,
  formatPhone,
  validateFull,
  type Errors,
} from "@/lib/validate";

type DaumPostcodeData = {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  buildingName?: string;
};

declare global {
  interface Window {
    daum?: {
      Postcode: new (opts: {
        oncomplete: (data: DaumPostcodeData) => void;
      }) => { open: () => void };
    };
  }
}

const POSTCODE_SRC =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

const initial = {
  name: "",
  phone: "",
  email: "",
  zip: "",
  address: "",
  addressDetail: "",
  floor: "",
  signType: "",
  timing: "",
  message: "",
  trap: "",
};

export default function QuoteForm() {
  const [form, setForm] = useState(initial);
  const [agree, setAgree] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const detailRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  /** 다음 우편번호 검색 — 스크립트를 필요할 때만 불러옵니다 */
  function openPostcode() {
    const open = () => {
      if (!window.daum) return;
      new window.daum.Postcode({
        oncomplete: (data) => {
          const addr = data.roadAddress || data.jibunAddress;
          setForm((f) => ({ ...f, zip: data.zonecode, address: addr }));
          setErrors((e) => ({ ...e, address: undefined }));
          requestAnimationFrame(() => detailRef.current?.focus());
        },
      }).open();
    };

    if (window.daum) return open();

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${POSTCODE_SRC}"]`
    );
    if (existing) return existing.addEventListener("load", open, { once: true });

    const s = document.createElement("script");
    s.src = POSTCODE_SRC;
    s.async = true;
    s.onload = open;
    s.onerror = () =>
      setErrors((e) => ({
        ...e,
        address: "우편번호 검색을 불러오지 못했습니다. 주소를 직접 입력해 주세요.",
      }));
    document.body.appendChild(s);
  }

  function onFiles(list: FileList | null) {
    if (!list) return;
    const picked = [...list];
    setFileError("");

    if (files.length + picked.length > MAX_FILES) {
      setFileError(`첨부파일은 최대 ${MAX_FILES}개까지 가능합니다.`);
      return;
    }
    const tooBig = picked.find((f) => f.size > MAX_FILE_BYTES);
    if (tooBig) {
      setFileError(`'${tooBig.name}' 은(는) 10MB를 넘습니다.`);
      return;
    }
    setFiles((prev) => [...prev, ...picked]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateFull({ ...form, agree });
    setErrors(err);
    if (Object.keys(err).length) {
      const first = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      first?.focus();
      first?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    setState("sending");
    try {
      const fd = new FormData();
      fd.set("kind", "full");
      Object.entries(form).forEach(([k, v]) => {
        if (k !== "trap") fd.set(k, v);
      });
      fd.set("company_website", form.trap);
      fd.set("agree", "true");
      files.forEach((f) => fd.append("files", f));

      const res = await fetch("/api/quote", { method: "POST", body: fd });
      if (!res.ok) throw new Error("failed");
      setState("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-2xl border border-line bg-paper p-10 text-center md:p-16">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00a79d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h2 className="text-2xl font-black">견적 문의가 접수됐습니다</h2>
        <p className="mt-3 leading-relaxed text-ink-500">
          담당자가 내용을 확인한 뒤 <b className="text-ink">{form.phone}</b> 으로
          연락드리겠습니다.
          <br />
          급하신 경우 <a href={site.phoneHref} className="font-bold text-brand underline underline-offset-4">{site.phone}</a> 으로 바로 전화 주세요.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="상호 / 담당자명" htmlFor="name" required error={errors.name}>
          <input
            id="name"
            name="name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="상호 또는 담당자분 성함"
            autoComplete="organization"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
            className={inputCls}
          />
        </Field>

        <Field label="연락처" htmlFor="phone" required error={errors.phone}>
          <input
            id="phone"
            name="phone"
            value={form.phone}
            onChange={(e) => set("phone", formatPhone(e.target.value))}
            placeholder="010-0000-0000"
            inputMode="tel"
            autoComplete="tel"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            className={inputCls}
          />
        </Field>
      </div>

      <Field
        label="이메일"
        htmlFor="email"
        error={errors.email}
        hint="시안을 메일로 받아보시려면 입력해 주세요. (선택)"
      >
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          placeholder="example@email.com"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          className={inputCls}
        />
      </Field>

      {/* 설치 주소 */}
      <Field label="설치 주소" htmlFor="address" required error={errors.address}>
        <div className="space-y-2.5">
          <div className="flex gap-2">
            <input
              id="zip"
              name="zip"
              value={form.zip}
              readOnly
              placeholder="우편번호"
              className={`${inputCls} max-w-36 bg-paper`}
            />
            <button
              type="button"
              onClick={openPostcode}
              className="shrink-0 rounded-lg bg-ink px-5 py-3 text-[15px] font-bold text-white transition-colors hover:bg-ink-800"
            >
              우편번호 찾기
            </button>
          </div>
          <input
            id="address"
            name="address"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="현장 주소"
            autoComplete="street-address"
            aria-invalid={!!errors.address}
            aria-describedby={errors.address ? "address-error" : undefined}
            className={inputCls}
          />
          <input
            ref={detailRef}
            id="addressDetail"
            name="addressDetail"
            value={form.addressDetail}
            onChange={(e) => set("addressDetail", e.target.value)}
            placeholder="상세주소 (건물명, 호수 등)"
            className={inputCls}
          />
        </div>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* 설치 층수 — 고소작업차 필요 여부가 갈리는 견적 변수 */}
        <Field
          label="설치 층수"
          htmlFor="floor"
          required
          error={errors.floor}
          hint="층수에 따라 고소작업차 여부가 달라집니다."
        >
          <select
            id="floor"
            name="floor"
            value={form.floor}
            onChange={(e) => set("floor", e.target.value)}
            aria-invalid={!!errors.floor}
            aria-describedby={errors.floor ? "floor-error" : undefined}
            className={inputCls}
          >
            <option value="">선택해 주세요</option>
            {floorOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>

        <Field label="예상 시공 시기" htmlFor="timing">
          <select
            id="timing"
            name="timing"
            value={form.timing}
            onChange={(e) => set("timing", e.target.value)}
            className={inputCls}
          >
            <option value="">선택해 주세요</option>
            {timingOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* 간판 유형 */}
      <fieldset>
        <legend className="mb-2 text-[14px] font-bold">
          문의 분야
          <span className="ml-1 text-accent" aria-hidden="true">*</span>
          <span className="sr-only">(필수)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {signTypeOptions.map((t) => {
            const on = form.signType === t;
            return (
              <label
                key={t}
                className={`cursor-pointer rounded-lg border px-4 py-2.5 text-[15px] font-medium transition-colors ${
                  on
                    ? "border-brand bg-brand-50 font-bold text-brand"
                    : "border-line hover:border-ink-500"
                }`}
              >
                <input
                  type="radio"
                  name="signType"
                  value={t}
                  checked={on}
                  onChange={(e) => set("signType", e.target.value)}
                  className="sr-only"
                />
                {t}
              </label>
            );
          })}
        </div>
        {errors.signType && (
          <p role="alert" className="mt-1.5 text-[13px] font-medium text-accent">
            {errors.signType}
          </p>
        )}
      </fieldset>

      <Field label="문의 내용" htmlFor="message">
        <textarea
          id="message"
          name="message"
          rows={6}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          placeholder={
            "예)\n· 사인물 크기: 가로 5m × 세로 1m\n· 상호명 / 로고 파일(AI·CDR) 유무\n· 건물 형태와 설치 위치 (외벽 / 옥상 / 로비 등)\n· 철거해야 할 기존 사인물이 있는지"
          }
          className={`${inputCls} resize-y leading-relaxed`}
        />
      </Field>

      {/* 첨부파일 */}
      <div>
        <p className="mb-1.5 text-[14px] font-bold">첨부파일</p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-[15px] font-medium transition-colors hover:border-ink-500">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
          파일 선택
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
        <p className="mt-1 text-[12px] text-ink-500">
          현장 사진, 로고 파일을 올려주시면 견적이 정확해집니다. 최대 {MAX_FILES}개 · 개당 10MB
        </p>

        {files.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center justify-between gap-3 rounded-lg bg-paper px-3 py-2 text-[13px]"
              >
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
        {fileError && (
          <p role="alert" className="mt-1.5 text-[13px] font-medium text-accent">
            {fileError}
          </p>
        )}
      </div>

      {/* 봇 트랩 */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="company_website">Website</label>
        <input
          id="company_website"
          name="company_website"
          tabIndex={-1}
          autoComplete="off"
          value={form.trap}
          onChange={(e) => set("trap", e.target.value)}
        />
      </div>

      <div className="rounded-xl border border-line bg-paper p-4">
        <PrivacyConsent checked={agree} onChange={setAgree} error={errors.agree} />
      </div>

      <div>
        <button
          type="submit"
          disabled={state === "sending"}
          className="w-full rounded-xl bg-brand px-6 py-4 text-[17px] font-black text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
        >
          {state === "sending" ? "전송 중…" : "견적 문의하기"}
        </button>
        {state === "error" && (
          <p role="alert" className="mt-2 text-center text-[14px] font-medium text-accent">
            전송에 실패했습니다. 잠시 후 다시 시도하시거나 {site.phone} 으로 연락 주세요.
          </p>
        )}
      </div>
    </form>
  );
}
