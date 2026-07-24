import type { ReactNode } from "react";

export const inputCls =
  "w-full rounded-lg border border-line bg-white px-4 py-3 text-[15px] outline-none transition-colors placeholder:text-ink-500/60 focus:border-brand focus:ring-2 focus:ring-brand/20 aria-[invalid=true]:border-accent aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-accent/20";

export default function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[14px] font-bold">
        {label}
        {required && (
          <span className="ml-1 text-accent" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only">(필수)</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-[12px] text-ink-500">{hint}</p>
      )}
      {error && (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="mt-1 text-[13px] font-medium text-accent"
        >
          {error}
        </p>
      )}
    </div>
  );
}
