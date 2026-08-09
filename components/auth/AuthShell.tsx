import { Link } from "@/i18n/navigation";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="mx-auto w-full max-w-5xl px-4 py-4">
        <Link
          href="/"
          className="font-heading text-2xl font-bold tracking-tight text-primary-700"
        >
          MUYA
        </Link>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
        <div className="rounded-card border border-line bg-surface p-6 shadow-card">
          {children}
        </div>
      </main>
    </div>
  );
}
