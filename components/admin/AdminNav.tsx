import { Link } from "@/i18n/navigation";

const TABS = [
  { href: "/admin", label: "Orders" },
  { href: "/admin/metrics", label: "Dashboard" },
  { href: "/admin/creators", label: "Creators" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/ledger", label: "Ledger" },
  { href: "/admin/safety", label: "Safety" },
  { href: "/admin/lookup", label: "Lookup" },
];

export function AdminNav({
  email,
  role,
  active,
}: {
  email: string;
  role: string;
  active: string;
}) {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold text-neutral-900">
          MUYA administration
        </span>
        <div className="flex items-center gap-3 text-sm text-neutral-500">
          <span className="hidden sm:inline">
            {email} · <span className="font-medium">{role}</span>
          </span>
          <form action="/api/auth/logout?admin=1" method="post">
            <button className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs hover:bg-neutral-50">
              Sign out
            </button>
          </form>
        </div>
      </div>
      <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
              active === tab.href
                ? "bg-neutral-900 text-white"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
