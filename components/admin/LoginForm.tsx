"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/browser";

export default function LoginForm({ next = "/admin" }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // 어느 쪽이 틀렸는지 알려주지 않습니다. 계정 존재 여부를 떠보는 걸 막습니다.
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      setBusy(false);
      return;
    }

    // 로그인 쿠키가 심어진 뒤 서버가 다시 판단하도록 새로고침합니다.
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <div>
        <label htmlFor="email" className="block text-[14px] font-bold">
          이메일
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line px-4 py-3 outline-none focus:border-brand"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-[14px] font-bold">
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-line px-4 py-3 outline-none focus:border-brand"
        />
      </div>

      {error && (
        <p role="alert" className="text-[14px] font-bold text-accent">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-brand px-6 py-3.5 font-black text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
      >
        {busy ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}
