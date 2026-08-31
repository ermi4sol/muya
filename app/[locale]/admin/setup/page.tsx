"use client";

import { useState } from "react";

/**
 * One-time admin credential setup. Requires the platform setup key
 * (CRON_SECRET from the environment) — nobody without server access can
 * create an admin account.
 */
export default function AdminSetupPage() {
  const [setupKey, setSetupKey] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setupKey, email, password }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setDone(true);
    } else {
      setError(body.message ?? "Setup failed.");
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-100 px-4">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-neutral-900">
          MUYA admin setup
        </h1>
        {done ? (
          <div className="mt-4 space-y-3">
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Admin account created. Sign in and set up your authenticator app.
            </p>
            <a
              href="/admin/login"
              className="block w-full rounded-md bg-neutral-900 py-2.5 text-center text-sm font-medium text-white"
            >
              Go to sign in
            </a>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <input
              type="password"
              required
              placeholder="Setup key"
              value={setupKey}
              onChange={(e) => setSetupKey(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-900"
            />
            <input
              type="email"
              required
              placeholder="Admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-900"
            />
            <input
              type="password"
              required
              minLength={12}
              placeholder="New password (12+ characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-900"
            />
            <input
              type="password"
              required
              minLength={12}
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:border-neutral-900"
            />
            <button
              disabled={busy}
              className="w-full rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              Create admin account
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
