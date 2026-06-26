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

export default function AdminHome() {
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

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin · Sessions</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/concepts"
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Manage concepts
          </Link>
          <Link
            href="/admin/new"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            + New session
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-end gap-4 rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-zinc-600">
            Search by customer
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. Foods R Us"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600">Status</label>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "all" | "draft" | "open" | "closed")
            }
            className="mt-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600">Sort by</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as NonNullable<SessionFilters["sortBy"]>)}
            className="mt-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600">Direction</label>
          <select
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
            className="mt-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Concepts</th>
              <th className="px-4 py-3 text-right">Participants</th>
              <th className="px-4 py-3 text-right">Yes / No</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-zinc-500">
                  No sessions yet. Click <strong>+ New session</strong> to get started.
                </td>
              </tr>
            )}
            {visible.map((r) => (
              <tr key={r.session.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 font-medium text-zinc-900">
                  {r.customer?.name ?? <span className="text-zinc-400">(deleted)</span>}
                </td>
                <td className="px-4 py-3 text-zinc-700">{r.session.date}</td>
                <td className="px-4 py-3 font-mono text-zinc-700">{r.session.code}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.session.status} />
                </td>
                <td className="px-4 py-3 text-right">{r.conceptCount}</td>
                <td className="px-4 py-3 text-right">{r.participantCount}</td>
                <td className="px-4 py-3 text-right">
                  {r.totalYes} / {r.totalNo}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {r.session.status === "open" && (
                      <Link
                        href={`/results/${r.session.code}`}
                        className="text-xs font-medium text-blue-700 hover:underline"
                      >
                        Results
                      </Link>
                    )}
                    {r.session.status === "draft" && (
                      <button
                        onClick={() => store.updateSession(r.session.id, { status: "open" })}
                        className="text-xs font-medium text-green-700 hover:underline"
                      >
                        Open
                      </button>
                    )}
                    {r.session.status === "open" && (
                      <button
                        onClick={() => store.updateSession(r.session.id, { status: "closed" })}
                        className="text-xs font-medium text-amber-700 hover:underline"
                      >
                        Close
                      </button>
                    )}
                    {r.session.status === "closed" && (
                      <button
                        onClick={() => store.updateSession(r.session.id, { status: "open" })}
                        className="text-xs font-medium text-green-700 hover:underline"
                      >
                        Reopen
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm(`Delete session "${r.session.code}"? This cannot be undone.`)) {
                          store.deleteSession(r.session.id);
                        }
                      }}
                      className="text-xs font-medium text-red-700 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DangerZone />
    </div>
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
            className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800"
          >
            Yes, reset everything
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-900 hover:bg-red-100"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-900 hover:bg-red-100"
        >
          Reset data…
        </button>
      )}
    </div>
  );
}
