"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/hooks";
import { store } from "@/lib/store";

export default function CustomersPage() {
  const data = useStore();
  const [drillDownId, setDrillDownId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Per-customer summary stats
  const summaries = useMemo(() => {
    return data.customers
      .map((customer) => {
        const customerSessions = data.sessions.filter(
          (s) => s.customerId === customer.id
        );
        const customerSessionIds = new Set(customerSessions.map((s) => s.id));
        const customerVotes = data.votes.filter((v) =>
          customerSessionIds.has(v.sessionId)
        );
        const yes = customerVotes.filter((v) => v.value === "yes").length;
        const no = customerVotes.filter((v) => v.value === "no").length;
        const lastSession = customerSessions
          .map((s) => s.date)
          .sort()
          .reverse()[0];
        return {
          customer,
          sessionCount: customerSessions.length,
          lastSessionDate: lastSession ?? null,
          totalYes: yes,
          totalNo: no,
        };
      })
      .sort((a, b) => b.sessionCount - a.sessionCount);
  }, [data.customers, data.sessions, data.votes]);

  function createCustomer(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    const name = newName.trim();
    if (!name) {
      setCreateError("Customer name is required.");
      return;
    }
    const c = store.createCustomer(name);
    setNewName("");
    setCreating(false);
    setDrillDownId(c.id);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers ({data.customers.length})</h1>
        <button
          onClick={() => setCreating(true)}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          + New customer
        </button>
      </div>

      {summaries.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">No customers yet</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Click <strong>+ New customer</strong> or load demo data from the Sessions tab.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((s) => (
            <button
              key={s.customer.id}
              onClick={() => setDrillDownId(s.customer.id)}
              className="group rounded-lg border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-zinc-400 hover:shadow"
            >
              <div className="text-lg font-semibold text-zinc-900">
                {s.customer.name}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-zinc-500">Sessions</div>
                  <div className="text-sm font-semibold text-zinc-900">
                    {s.sessionCount}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500">Yes / No</div>
                  <div className="text-sm font-semibold text-zinc-900">
                    {s.totalYes} / {s.totalNo}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500">Last seen</div>
                  <div className="text-sm font-semibold text-zinc-900">
                    {s.lastSessionDate
                      ? formatDate(s.lastSessionDate)
                      : "—"}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-400 group-hover:text-zinc-700">
                Click to view sessions →
              </p>
            </button>
          ))}
        </div>
      )}

      {drillDownId && (
        <CustomerHistoryModal
          customer={data.customers.find((c) => c.id === drillDownId)!}
          sessions={data.sessions.filter((s) => s.customerId === drillDownId)}
          votes={data.votes}
          concepts={data.concepts}
          onClose={() => setDrillDownId(null)}
        />
      )}

      {creating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            setCreating(false);
            setNewName("");
            setCreateError(null);
          }}
        >
          <form
            onSubmit={createCustomer}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">New customer</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600">Name</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Costco"
                  autoFocus
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
                />
              </div>
              {createError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800">
                  {createError}
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setNewName("");
                  setCreateError(null);
                }}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Create & view
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function CustomerHistoryModal({
  customer,
  sessions,
  votes,
  concepts,
  onClose,
}: {
  customer: import("@/lib/types").Customer;
  sessions: import("@/lib/types").Session[];
  votes: import("@/lib/types").Vote[];
  concepts: import("@/lib/types").Concept[];
  onClose: () => void;
}) {
  // Sort newest first
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">{customer.name}</h2>
            <p className="mt-1 text-sm text-zinc-600">
              {sessions.length} session{sessions.length === 1 ? "" : "s"} ·{" "}
              {votes.filter((v) => sessions.some((s) => s.id === v.sessionId)).length}{" "}
              total votes
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <section className="mt-6">
          <h3 className="text-sm font-semibold text-zinc-700">Sessions</h3>
          {sorted.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">
              No sessions with this customer yet.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
              {sorted.map((s) => {
                const sessionVotes = votes.filter((v) => v.sessionId === s.id);
                const yes = sessionVotes.filter((v) => v.value === "yes").length;
                const no = sessionVotes.filter((v) => v.value === "no").length;
                const participants = new Set(sessionVotes.map((v) => v.participantId))
                  .size;
                // Top 3 concepts in this session
                const sessionConcepts = s.conceptIds
                  .map((id) => concepts.find((c) => c.id === id))
                  .filter((c): c is NonNullable<typeof c> => Boolean(c));
                const tally = new Map<string, { yes: number }>();
                for (const v of sessionVotes) {
                  if (v.value !== "yes") continue;
                  const t = tally.get(v.conceptId) ?? { yes: 0 };
                  t.yes += 1;
                  tally.set(v.conceptId, t);
                }
                const top3 = sessionConcepts
                  .map((c) => ({ concept: c, yes: tally.get(c.id)?.yes ?? 0 }))
                  .sort((a, b) => b.yes - a.yes)
                  .slice(0, 3)
                  .map((x) => x.concept.name);

                return (
                  <li key={s.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/admin/sessions/${s.id}`}
                        className="text-sm font-semibold text-zinc-900 hover:underline"
                      >
                        {formatDate(s.date)}
                      </Link>
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={`rounded-full px-2 py-0.5 font-medium ${
                            s.status === "open"
                              ? "bg-green-100 text-green-800"
                              : s.status === "closed"
                                ? "bg-zinc-200 text-zinc-700"
                                : "bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          {s.status}
                        </span>
                        <span className="font-mono text-zinc-500">{s.code}</span>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-zinc-600">
                      {sessionConcepts.length} concepts · {participants} participants ·{" "}
                      {yes} yes / {no} no · Yes cap {s.yesCap}
                    </div>
                    {top3.length > 0 && (
                      <div className="mt-2 text-xs text-zinc-600">
                        <span className="font-medium">Top 3:</span> {top3.join(" · ")}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
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