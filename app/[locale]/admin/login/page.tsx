"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { authClient } from "@/lib/auth/client";

type Step = "credentials" | "mfa" | "enroll" | "enroll-verify";

export default function AdminLoginPage() {
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function goToAdmin() {
    window.location.assign("/admin");
  }

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error: err } = await authClient.signIn.email({
      email,
      password,
    });
    setBusy(false);
    if (err) {
      setError(
        err.status === 429
          ? "Too many attempts — try again later."
          : "Invalid email or password."
      );
      return;
    }
    if ((data as { twoFactorRedirect?: boolean })?.twoFactorRedirect) {
      setStep("mfa");
      return;
    }
    // Signed in without MFA — first login after setup: enroll now.
    setStep("enroll");
  }

  async function startEnrollment() {
    setBusy(true);
    setError(null);
    const { data, error: err } = await authClient.twoFactor.enable({
      password,
    });
    setBusy(false);
    if (err || !data || !("totpURI" in data)) {
      setError("Could not start two-factor setup — check your password and retry.");
      return;
    }
    setTotpUri(data.totpURI);
    setBackupCodes(data.backupCodes ?? []);
    try {
      setQrDataUrl(await QRCode.toDataURL(data.totpURI, { width: 220 }));
    } catch {
      setQrDataUrl(null);
    }
    setStep("enroll-verify");
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await authClient.twoFactor.verifyTotp({ code });
    setBusy(false);
    if (err) {
      setError("Wrong code — try again.");
      return;
    }
    goToAdmin();
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

        {step === "credentials" && (
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
            <p className="text-center text-xs text-neutral-500">
              First time here? Finish account setup at /admin/setup first.
            </p>
          </form>
        )}

        {step === "mfa" && (
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

        {step === "enroll" && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-neutral-600">
              You&apos;re signed in, but two-factor authentication isn&apos;t set
              up yet. It&apos;s required for the admin account.
            </p>
            <button
              onClick={startEnrollment}
              disabled={busy}
              className="w-full rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              Set up authenticator app
            </button>
          </div>
        )}

        {step === "enroll-verify" && (
          <form onSubmit={submitCode} className="mt-4 space-y-3">
            <p className="text-sm text-neutral-600">
              Scan this QR code with your authenticator app, then enter the
              6-digit code it shows.
            </p>
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="TOTP QR code"
                className="mx-auto rounded-md border border-neutral-200"
              />
            ) : totpUri ? (
              <p className="break-all rounded-md bg-neutral-50 p-2 font-mono text-[10px] text-neutral-600">
                {totpUri}
              </p>
            ) : null}
            {backupCodes.length > 0 && (
              <details className="rounded-md bg-amber-50 p-3 text-xs text-amber-800">
                <summary className="cursor-pointer font-medium">
                  Backup codes — save these somewhere safe
                </summary>
                <p className="mt-2 break-all font-mono">
                  {backupCodes.join("  ")}
                </p>
              </details>
            )}
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
              Confirm and finish
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
