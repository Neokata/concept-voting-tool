"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import { useStore } from "@/lib/hooks";
import { store } from "@/lib/store";
import { aggregateSession, sortResults } from "@/lib/voting";
import { BackButton } from "@/components/BackButton";

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const data = useStore();
  const session = data.sessions.find((s) => s.id === id) ?? null;

  // Compute results once.
  const results = useMemo(() => {
    if (!session) return [];
    const sessionConcepts = session.conceptIds
      .map((cid) => data.concepts.find((c) => c.id === cid))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
    const sessionVotes = data.votes.filter((v) => v.sessionId === session.id);
    return sortResults(aggregateSession(sessionVotes, sessionConcepts));
  }, [session, data.concepts, data.votes]);

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-2xl font-bold">Session not found</h1>
        <p className="mt-2 text-zinc-600">
          The session you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/admin/sessions"
          className="mt-6 inline-block text-sm text-blue-700 hover:underline"
        >
          ← Back to sessions
        </Link>
      </div>
    );
  }

  const customer = data.customers.find((c) => c.id === session.customerId);
  const top10 = results.slice(0, 10);
  const bottom10 = results.slice(-10).reverse(); // show worst-first
  const totalYes = results.reduce((sum, r) => sum + r.yes, 0);
  const totalNo = results.reduce((sum, r) => sum + r.no, 0);
  const participantCount = new Set(
    data.votes.filter((v) => v.sessionId === session.id).map((v) => v.participantId)
  ).size;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <BackButton href="/admin/sessions" label="Back to sessions" />

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 pb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {customer?.name ?? "Unknown customer"}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {formatDateLong(session.date)}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Code <span className="font-mono">{session.code}</span> ·{" "}
            {session.conceptIds.length} concepts · {participantCount} participants ·{" "}
            {totalYes} yes / {totalNo} no · Yes cap: {session.yesCap}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SessionStatusControls session={session} />
          <Link
            href={`/results/${session.code}`}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            View public results
          </Link>
        </div>
      </header>

      {/* Top 10 / Bottom 10 side-by-side */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ConceptList
          title="Top 10"
          tone="positive"
          results={top10}
          customers={data.customers}
          allResults={results}
        />
        <ConceptList
          title="Bottom 10"
          tone="negative"
          results={bottom10}
          customers={data.customers}
          allResults={results}
        />
      </div>

      {/* All concepts */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">
          All concepts ({results.length})
        </h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2 w-10 text-right">#</th>
                <th className="px-3 py-2">Concept</th>
                <th className="px-3 py-2 text-right">Yes</th>
                <th className="px-3 py-2 text-right">No</th>
                <th className="px-3 py-2 text-right">% Yes</th>
                <th className="px-3 py-2 w-1/3">Bar</th>
                <th className="px-3 py-2">Suppressed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {results.map((r, idx) => {
                const suppressedNames = r.concept.suppressedFor
                  .map((cid) => data.customers.find((c) => c.id === cid)?.name)
                  .filter(Boolean) as string[];
                const maxYes = Math.max(1, ...results.map((x) => x.yes));
                return (
                  <tr key={r.concept.id}>
                    <td className="px-3 py-2 text-right font-mono text-zinc-400">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2 font-medium text-zinc-900">
                      {r.concept.name}
                    </td>
                    <td className="px-3 py-2 text-right text-green-700">{r.yes}</td>
                    <td className="px-3 py-2 text-right text-red-700">{r.no}</td>
                    <td className="px-3 py-2 text-right">{r.percentYes}%</td>
                    <td className="px-3 py-2">
                      <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full bg-green-500"
                          style={{
                            width: `${Math.round((r.yes / maxYes) * 100)}%`,
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {suppressedNames.length === 0 ? (
                        <span className="text-zinc-400">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {suppressedNames.map((n) => (
                            <span
                              key={n}
                              className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800"
                            >
                              {n}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ConceptList({
  title,
  tone,
  results,
  customers,
  allResults,
}: {
  title: string;
  tone: "positive" | "negative";
  results: ReturnType<typeof sortResults>;
  customers: ReturnType<typeof useStore>["customers"];
  allResults: ReturnType<typeof sortResults>;
}) {
  const border =
    tone === "positive" ? "border-green-200" : "border-zinc-200";
  const headerColor =
    tone === "positive" ? "text-green-800" : "text-zinc-700";

  const maxYes = Math.max(1, ...allResults.map((x) => x.yes));

  return (
    <section className={`rounded-lg border ${border} bg-white p-4`}>
      <h2 className={`text-sm font-semibold ${headerColor}`}>
        {title}
      </h2>
      <ul className="mt-3 space-y-2">
        {results.map((r, idx) => (
          <li
            key={r.concept.id}
            className="flex items-center justify-between gap-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-zinc-400">{idx + 1}.</span>
                <span className="truncate text-sm font-medium text-zinc-900">
                  {r.concept.name}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={tone === "positive" ? "h-full bg-green-500" : "h-full bg-zinc-400"}
                  style={{ width: `${Math.round((r.yes / maxYes) * 100)}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span
                className={
                  tone === "positive"
                    ? "font-semibold text-green-700"
                    : "font-semibold text-zinc-700"
                }
              >
                {r.yes}
              </span>
              <SuppressButton concept={r.concept} customers={customers} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SuppressButton({
  concept,
  customers,
}: {
  concept: import("@/lib/types").Concept;
  customers: import("@/lib/types").Customer[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(concept.suppressedFor);

  function toggle(cid: string) {
    setSelected((prev) =>
      prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]
    );
  }

  function save() {
    store.updateConcept(concept.id, { suppressedFor: selected });
    setOpen(false);
  }

  if (open) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={() => setOpen(false)}
      >
        <div
          className="w-full max-w-md rounded-xl bg-white p-5 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-sm font-semibold text-zinc-900">
            Suppress &quot;{concept.name}&quot;
          </h3>
          <p className="mt-1 text-xs text-zinc-600">
            Hidden from new sessions for the selected customers. Existing sessions are unaffected.
          </p>
          {customers.length === 0 ? (
            <p className="mt-3 text-xs text-zinc-500">
              No customers yet.
            </p>
          ) : (
            <div className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-md border border-zinc-100 p-2">
              {customers.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={() => toggle(c.id)}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isSuppressed = concept.suppressedFor.length > 0;
  return (
    <button
      onClick={() => setOpen(true)}
      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
        isSuppressed
          ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
          : "border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50"
      }`}
      title={
        isSuppressed
          ? `Suppressed for ${concept.suppressedFor.length} customer(s)`
          : "Suppress this concept"
      }
    >
      {isSuppressed ? `Suppressed (${concept.suppressedFor.length})` : "Suppress"}
    </button>
  );
}

function SessionStatusControls({
  session,
}: {
  session: import("@/lib/types").Session;
}) {
  const { id, status } = session;
  if (status === "draft") {
    return (
      <button
        onClick={() => store.updateSession(id, { status: "open" })}
        className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800"
      >
        Open session
      </button>
    );
  }
  if (status === "open") {
    return (
      <button
        onClick={() => store.updateSession(id, { status: "closed" })}
        className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
      >
        Close session
      </button>
    );
  }
  return (
    <button
      onClick={() => store.updateSession(id, { status: "open" })}
      className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
    >
      Reopen
    </button>
  );
}

function formatDateLong(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}