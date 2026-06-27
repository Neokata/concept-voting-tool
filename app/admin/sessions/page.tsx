"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/hooks";
import { store } from "@/lib/store";
import {
  buildSessionRows,
  filterAndSortRows,
  SessionFilters,
} from "@/lib/voting";

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

  const rows = useMemo(
    () => buildSessionRows(data.sessions, data.customers, data.votes),
    [data.sessions, data.customers, data.votes]
  );

  const visible = useMemo(
    () => filterAndSortRows(rows, { search, status, sortBy, sortDir }),
    [rows, search, status, sortBy, sortDir]
  );

  // Hero / stat-card summary
  const totalSessions = data.sessions.length;
  const openSessions = data.sessions.filter((s) => s.status === "open").length;
  const totalCustomers = data.customers.length;
  const totalConcepts = data.concepts.length;
  const greeting = getTimeOfDayGreeting();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Hero greeting */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {greeting}, Admin
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {totalSessions === 0
              ? "No sessions yet — load demo data or create your first session."
              : `${totalSessions} session${totalSessions === 1 ? "" : "s"} across ${totalCustomers} customer${totalCustomers === 1 ? "" : "s"} · ${totalConcepts} concept${totalConcepts === 1 ? "" : "s"} in your library`}
          </p>
        </div>
        <Link
          href="/admin/new"
          className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800"
        >
          + New session
        </Link>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total sessions"
          value={totalSessions}
          hint={openSessions > 0 ? `${openSessions} open now` : "All closed"}
        />
        <StatCard
          label="Customers"
          value={totalCustomers}
          hint="In your library"
        />
        <StatCard
          label="Concepts"
          value={totalConcepts}
          hint="Across all categories"
        />
      </div>

      {/* Filters */}
      <div className="mt-8 flex flex-wrap items-end gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Search by customer
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. Foods R Us"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
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
            className="mt-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Sort by
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as NonNullable<SessionFilters["sortBy"]>)}
            className="mt-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm"
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
            className="mt-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {/* Tile grid */}
      {visible.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((r) => (
            <SessionTile key={r.session.id} row={r} />
          ))}
        </div>
      )}

      <DangerZone />
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold text-zinc-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </div>
  );
}

function getTimeOfDayGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function SessionTile({
  row,
}: {
  row: ReturnType<typeof buildSessionRows>[number];
}) {
  const s = row.session;
  return (
    <Link
      href={`/admin/sessions/${s.id}`}
      className="group block rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-900 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {row.customer?.name ?? <span className="text-zinc-400">(deleted)</span>}
          </div>
          <div className="mt-1 text-lg font-bold text-zinc-900">{formatDate(s.date)}</div>
        </div>
        <StatusBadge status={s.status} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-zinc-500">Concepts</div>
          <div className="text-sm font-semibold text-zinc-900">{row.conceptCount}</div>
        </div>
        <div>
          <div className="text-zinc-500">Participants</div>
          <div className="text-sm font-semibold text-zinc-900">{row.participantCount}</div>
        </div>
        <div>
          <div className="text-zinc-500">Yes cap</div>
          <div className="text-sm font-semibold text-zinc-900">{s.yesCap}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 text-xs">
        <span className="font-mono text-zinc-500">{s.code}</span>
        <span className="text-zinc-400 group-hover:text-zinc-700">
          {row.totalYes} yes / {row.totalNo} no →
        </span>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: "draft" | "open" | "closed" }) {
  const styles: Record<typeof status, string> = {
    draft: "bg-zinc-100 text-zinc-700",
    open: "bg-green-100 text-green-800",
    closed: "bg-zinc-200 text-zinc-700",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function EmptyState() {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center">
      <h2 className="text-lg font-bold text-zinc-900">No sessions yet</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Click <strong>+ New session</strong> to create one, or click{" "}
        <strong>Load demo data</strong> at the top to populate 6 historical sessions.
      </p>
    </div>
  );
}

function DangerZone() {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="mt-12 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
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
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-900 hover:bg-red-100"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-900 hover:bg-red-100"
        >
          Reset data…
        </button>
      )}
    </div>
  );
}