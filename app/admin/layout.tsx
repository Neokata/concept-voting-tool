"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/hooks";
import { store } from "@/lib/store";

const TABS = [
  { href: "/admin/sessions", label: "Sessions" },
  { href: "/admin/concepts", label: "Concepts" },
  { href: "/admin/customers", label: "Customers" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const data = useStore();

  return (
    <div>
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-4">
          <h1 className="text-xl font-bold tracking-tight">Admin</h1>
          <div className="flex gap-2">
            <DemoDataButton hasSessions={data.sessions.length > 0} />
            <Link
              href="/admin/new"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
            >
              + New session
            </Link>
          </div>
        </div>
        <nav
          aria-label="Admin sections"
          className="mx-auto flex max-w-6xl gap-1 px-6 pt-2"
        >
          {TABS.map((tab) => {
            const active = pathname?.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-t-md px-4 py-2 text-sm font-medium ${
                  active
                    ? "border-b-2 border-zinc-900 text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div>{children}</div>
    </div>
  );
}

function DemoDataButton({ hasSessions }: { hasSessions: boolean }) {
  if (hasSessions) {
    return (
      <span
        className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-500"
        title="Reset data first to load demo data again"
      >
        Demo data loaded
      </span>
    );
  }
  return (
    <button
      onClick={() => {
        if (
          confirm(
            "Load the demo dataset? This will add 5 customers, 60 concepts, and 6 historical sessions. (You can wipe it later with Reset data.)"
          )
        ) {
          try {
            store.loadDemoData();
          } catch (err) {
            alert((err as Error).message);
          }
        }
      }}
      className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
    >
      Load demo data
    </button>
  );
}