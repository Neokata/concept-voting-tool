"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/hooks";
import { store } from "@/lib/store";
import {
  buildSessionRows,
  filterAndSortRows,
  SessionFilters,
} from "@/lib/voting";
import {
  CustomerAvatar,
  longDate,
  relativeDate,
} from "@/lib/display";

const STATUS_OPTIONS: Array<{ value: "all" | "draft" | "open" | "closed"; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

const SORT_OPTIONS: Array<{ value: NonNullable<SessionFilters["sortBy"]>; label: string }> = [
  { value: "date", label: "Date" },
  { value: "participants", label: "Participants" },
  { value: "yesVotes", label: "Yes votes" },
];

export default function AdminSessionsPage() {
  const data = useStore();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "draft" | "open" | "closed">("all");
  const [sortBy, setSortBy] = useState<NonNullable<SessionFilters["sortBy"]>>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(
    () => buildSessionRows(data.sessions, data.customers, data.votes),
    [data.sessions, data.customers, data.votes]
  );

  const visible = useMemo(
    () => filterAndSortRows(rows, { search, status, sortBy, sortDir }),
    [rows, search, status, sortBy, sortDir]
  );

  // Close filter popover when clicking outside
  useEffect(() => {
    if (!filterOpen) return;
    function onClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [filterOpen]);

  const filtersActive =
    search !== "" || status !== "all" || sortBy !== "date" || sortDir !== "desc";
  const activeFilterCount =
    (search !== "" ? 1 : 0) +
    (status !== "all" ? 1 : 0) +
    (sortBy !== "date" ? 1 : 0) +
    (sortDir !== "desc" ? 1 : 0);

  // Headline + subhead (replaces greeting)
  const totalSessions = data.sessions.length;
  const openSessions = data.sessions.filter((s) => s.status === "open");
  const draftSessions = data.sessions.filter((s) => s.status === "draft");

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Headline */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-heading">Sessions</h1>
          <p className="page-subheading">
            {totalSessions === 0
              ? "Get started by loading demo data or creating your first session."
              : `${totalSessions} session${totalSessions === 1 ? "" : "s"} across ${data.customers.length} customer${data.customers.length === 1 ? "" : "s"} · ${data.concepts.length} concept${data.concepts.length === 1 ? "" : "s"} in your library`}
          </p>
        </div>
        <Link
          href="/admin/new"
          className="btn-primary"
        >
          + New session
        </Link>
      </div>

      {/* Needs-attention panel — replaces the 3 vanity stat cards */}
      {totalSessions > 0 && (
        <AttentionPanel
          openSessions={openSessions.map((s) => {
            const row = rows.find((r) => r.session.id === s.id);
            const cust = data.customers.find((c) => c.id === s.customerId);
            return row && cust ? { row, customer: cust } : null;
          }).filter((x): x is { row: ReturnType<typeof buildSessionRows>[number]; customer: typeof data.customers[number] } => x !== null)}
          draftSessions={draftSessions.map((s) => {
            const cust = data.customers.find((c) => c.id === s.customerId);
            return cust ? { session: s, customer: cust } : null;
          }).filter((x): x is { session: typeof data.sessions[number]; customer: typeof data.customers[number] } => x !== null)}
        />
      )}

      {/* Filter button + popover */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="section-heading">All sessions</h2>
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition ${
              filtersActive
                ? "border-brand-wine bg-white text-brand-wine"
                : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            <span>Filter</span>
            {filtersActive && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-wine px-1.5 text-xs font-bold text-white">
                {activeFilterCount}
              </span>
            )}
            <span className="text-zinc-400">▾</span>
          </button>
          {filterOpen && (
            <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Search customer
                  </label>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="e.g. Foods R Us"
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-brand-wine focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as "all" | "draft" | "open" | "closed")
                    }
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Sort by
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as NonNullable<SessionFilters["sortBy"]>)}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
                    >
                      {SORT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Direction
                    </label>
                    <select
                      value={sortDir}
                      onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
                    >
                      <option value="desc">Desc</option>
                      <option value="asc">Asc</option>
                    </select>
                  </div>
                </div>
                {filtersActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setStatus("all");
                      setSortBy("date");
                      setSortDir("desc");
                    }}
                    className="w-full text-xs text-zinc-500 hover:text-zinc-700"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tile grid or empty state */}
      {totalSessions === 0 ? (
        <EmptyState />
      ) : visible.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">No sessions match</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Try clearing the filters.
          </p>
          <button
            onClick={() => {
              setSearch("");
              setStatus("all");
              setSortBy("date");
              setSortDir("desc");
            }}
            className="btn-secondary mt-4"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((r) => (
            <SessionTile key={r.session.id} row={r} />
          ))}
        </div>
      )}

      <DangerZone />
    </div>
  );
}

function AttentionPanel({
  openSessions,
  draftSessions,
}: {
  openSessions: { row: ReturnType<typeof buildSessionRows>[number]; customer: { id: string; name: string } }[];
  draftSessions: { session: { id: string; code: string; date: string; status: string }; customer: { id: string; name: string } }[];
}) {
  // If nothing needs attention, just show a quiet "all caught up" banner
  if (openSessions.length === 0 && draftSessions.length === 0) {
    return (
      <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-200 text-emerald-800">
          ✓
        </span>
        <p className="text-sm text-emerald-900">
          You&apos;re all caught up — no open or draft sessions right now.
        </p>
      </div>
    );
  }

  return (
    <section className="mt-6 rounded-xl border border-brand-wine bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-2 w-2 rounded-full bg-brand-wine" />
        <h2 className="text-sm font-bold uppercase tracking-wide text-brand-wine">
          Needs your attention
        </h2>
      </div>
      <ul className="divide-y divide-zinc-100">
        {openSessions.map(({ row, customer }) => (
          <li
            key={row.session.id}
            className="flex items-center justify-between gap-3 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <CustomerAvatar customer={customer} size="sm" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-900">
                    {customer.name}
                  </span>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    live
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  {longDate(row.session.date)} · {row.participantCount}{" "}
                  participant{row.participantCount === 1 ? "" : "s"} so far
                </p>
              </div>
            </div>
            <Link
              href={`/results/${row.session.code}`}
              className="btn-primary text-xs"
            >
              View live →
            </Link>
          </li>
        ))}
        {draftSessions.map(({ session, customer }) => (
          <li
            key={session.id}
            className="flex items-center justify-between gap-3 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <CustomerAvatar customer={customer} size="sm" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-900">
                    {customer.name}
                  </span>
                  <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
                    draft
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  {longDate(session.date)} · never opened
                </p>
              </div>
            </div>
            <button
              onClick={() => store.updateSession(session.id, { status: "open" })}
              className="btn-secondary text-xs"
            >
              Open session
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SessionTile({
  row,
}: {
  row: ReturnType<typeof buildSessionRows>[number];
}) {
  const s = row.session;
  const customer = row.customer;
  const isOpen = s.status === "open";
  const isDraft = s.status === "draft";

  // Wine left-stripe for live sessions, subtle border accent for others
  const stripeClass = isOpen
    ? "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-brand-wine before:rounded-l-xl"
    : "";

  return (
    <Link
      href={`/admin/sessions/${s.id}`}
      className={`relative card p-4 transition hover:shadow-md hover:border-zinc-400 ${stripeClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          {customer && <CustomerAvatar customer={customer} size="md" />}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-zinc-900">
              {customer?.name ?? <span className="text-zinc-400">(deleted)</span>}
            </div>
            <div
              className="text-xs text-zinc-500"
              title={longDate(s.date)}
            >
              {relativeDate(s.date)}
            </div>
          </div>
        </div>
        <StatusBadge status={s.status} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <TileStat label="Concepts" value={row.conceptCount} />
        <TileStat label="Participants" value={row.participantCount} />
        <TileStat label="Yes / No" value={`${row.totalYes} / ${row.totalNo}`} />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3">
        <span className="font-mono text-xs text-zinc-400">{s.code}</span>
        {isOpen ? (
          <span className="text-xs font-semibold text-brand-wine">
            View live →
          </span>
        ) : isDraft ? (
          <span className="text-xs font-semibold text-zinc-700">Open →</span>
        ) : (
          <span className="text-xs text-zinc-400">View results →</span>
        )}
      </div>
    </Link>
  );
}

function TileStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-zinc-500">{label}</div>
      <div className="text-sm font-semibold text-zinc-900">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: "draft" | "open" | "closed" }) {
  const styles: Record<typeof status, string> = {
    draft: "bg-zinc-100 text-zinc-600",
    open: "bg-green-100 text-green-800",
    closed: "bg-zinc-100 text-zinc-500",
  };
  return (
    <span className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {/* Primary CTA: load demo data */}
      <button
        onClick={() => {
          if (
            confirm(
              "Load the demo dataset? This will add 5 customers, 60 concepts, and 6 historical sessions with votes."
            )
          ) {
            try {
              store.loadDemoData();
            } catch (err) {
              alert((err as Error).message);
            }
          }
        }}
        className="card group p-6 text-left transition hover:border-brand-wine hover:shadow-md"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-wine text-lg text-white">
            ⚡
          </span>
          <div>
            <h3 className="text-base font-bold text-zinc-900">Load demo data</h3>
            <p className="text-xs text-zinc-500">
              Best way to explore the app
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm text-zinc-700">
          5 customers, 60 concepts, 6 historical sessions with synthesized votes.
          See what the dashboard, concept library, and session detail look like
          with real-shaped data.
        </p>
        <p className="mt-3 text-sm font-semibold text-brand-wine group-hover:underline">
          Load →
        </p>
      </button>

      {/* Secondary CTA: create from scratch */}
      <Link
        href="/admin/new"
        className="card group p-6 text-left transition hover:border-zinc-400 hover:shadow-md"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-lg text-zinc-600">
            +
          </span>
          <div>
            <h3 className="text-base font-bold text-zinc-900">
              Create from scratch
            </h3>
            <p className="text-xs text-zinc-500">
              For when you have your own concept list
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm text-zinc-700">
          Paste in your own concept list, set a Yes cap per participant, and
          start collecting votes from your team or customers.
        </p>
        <p className="mt-3 text-sm font-semibold text-zinc-900 group-hover:underline">
          Create →
        </p>
      </Link>
    </div>
  );
}

function DangerZone() {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="mt-16 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      <h3 className="font-semibold">Reset all data</h3>
      <p className="mt-1">
        Wipes all sessions, votes, concepts, and customers from this browser.
        Cannot be undone.
      </p>
      {confirming ? (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => {
              store.resetAll();
              setConfirming(false);
            }}
            className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-800"
          >
            Yes, reset everything
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100"
        >
          Reset data…
        </button>
      )}
    </div>
  );
}