"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <div>
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-4">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">Admin</h1>
          <Link
            href="/admin/new"
            className="btn-primary"
          >
            + New session
          </Link>
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
                className={`rounded-t-md px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "border-b-2 border-brand-wine text-brand-wine"
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