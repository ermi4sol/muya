"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"credentials" | "mfa">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [stageToken, setStageToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [setupSent, setSetupSent] = useState(false);

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && body.mfaRequired) {
      setStageToken(body.stageToken);
      setStep("mfa");
    } else if (body.error === "setup_required") {
      setError("Account setup is not finished. Use the setup link below.");
    } else if (body.error === "rate_limited") {
      setError("Too many attempts — try again later.");
    } else {
      setError("Invalid email or password.");
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/auth/mfa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageToken, code }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && body.ok) {
      router.push("/admin");
      router.refresh();
    } else if (body.error === "invalid_or_expired") {
      setError("Session expired — start again.");
      setStep("credentials");
    } else {
      setError("Wrong code — try again.");
    }
  }

  async function requestSetupLink() {
    if (!email) {
      setError("Enter your admin email first, then request the setup link.");
      return;
    }
    setBusy(true);
    await fetch("/api/admin/auth/setup-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setBusy(false);
    setSetupSent(true);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-100 px-4">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-neutral-900">
          MUYA administration
        </h1>
        {error && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {setupSent && (
          <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            If that admin account exists, a setup link was emailed to it.
          </p>
        )}

        {step === "credentials" ? (
          <form onSubmit={submitCredentials} className="mt-4 space-y-3">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-900"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-900"
            />
            <button
              disabled={busy}
              className="w-full rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={requestSetupLink}
              disabled={busy}
              className="w-full text-center text-xs text-neutral-500 underline"
            >
              First time here / forgot password? Email me a setup link
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="mt-4 space-y-3">
            <p className="text-sm text-neutral-600">
              Enter the 6-digit code from your authenticator app.
            </p>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-md border border-neutral-300 px-3 py-3 text-center font-mono text-xl tracking-[0.5em] outline-none focus:border-neutral-900"
            />
            <button
              disabled={busy || code.length !== 6}
              className="w-full rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              Verify
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
