"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";

export default function AdminSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = use(searchParams);
  const router = useRouter();
  const [step, setStep] = useState<"password" | "totp" | "done">("password");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [qr, setQr] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [stageToken, setStageToken] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!token) {
    return (
      <Shell>
        <p className="text-sm text-red-700">
          Missing setup token. Request a new setup link from the admin login
          page.
        </p>
      </Shell>
    );
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 10) {
      setError("Password must be at least 10 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/auth/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setQr(body.qrDataUrl);
      setManualCode(body.manualCode);
      setStageToken(body.stageToken);
      setStep("totp");
    } else if (body.error === "invalid_or_expired") {
      setError("This setup link is invalid or expired — request a new one.");
    } else {
      setError(body.detail ?? "Something went wrong.");
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/auth/setup", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageToken, code }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && body.ok) {
      setStep("done");
      setTimeout(() => router.push("/admin/login"), 2500);
    } else {
      setError("Wrong code — scan the QR again and retry.");
    }
  }

  return (
    <Shell>
      {error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {step === "password" && (
        <form onSubmit={submitPassword} className="space-y-3">
          <p className="text-sm text-neutral-600">
            Choose a strong password (10+ characters) for your admin account.
          </p>
          <input
            type="password"
            required
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-900"
          />
          <input
            type="password"
            required
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-900"
          />
          <button
            disabled={busy}
            className="w-full rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            Continue
          </button>
        </form>
      )}
      {step === "totp" && (
        <form onSubmit={submitCode} className="space-y-3">
          <p className="text-sm text-neutral-600">
            Scan this QR code with Google Authenticator (or any authenticator
            app), then enter the 6-digit code it shows.
          </p>
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qr}
              alt="TOTP QR code"
              width={240}
              height={240}
              className="mx-auto rounded-md border border-neutral-200"
            />
          )}
          <p className="break-all text-center text-xs text-neutral-400">
            Manual entry code: {manualCode}
          </p>
          <input
            inputMode="numeric"
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
            Activate two-factor authentication
          </button>
        </form>
      )}
      {step === "done" && (
        <p className="rounded-md bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
          ✅ Admin access is set up. Redirecting to the login page…
        </p>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-100 px-4">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6">
        <h1 className="mb-4 text-lg font-semibold text-neutral-900">
          MUYA admin setup
        </h1>
        {children}
      </div>
    </div>
  );
}
