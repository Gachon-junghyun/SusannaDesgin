"use client";

import { useFormStatus } from "react-dom";

/** 제출 중에는 스스로 잠기는 버튼. 두 번 눌러 중복 저장되는 걸 막습니다. */
export default function SubmitButton({
  children,
  pendingLabel = "저장 중…",
  className = "",
  confirm,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  /** 값을 주면 누를 때 확인창을 띄웁니다 (삭제용) */
  confirm?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={`disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
