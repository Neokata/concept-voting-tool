"use client";

import Link from "next/link";
import { use, useMemo } from "react";
import { useStore } from "@/lib/hooks";
import { aggregateSession, sortResults } from "@/lib/voting";
import { CustomerAvatar, longDate } from "@/lib/display";

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const data = useStore();
  const customer = data.customers.find((c) => c.id === id) ?? null;
  const sessions = useMemo(
    () =>
      data.sessions
        .filter((s) => s.customerId === id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [data.sessions, id]
  );

  // Aggregated "all-time top" concepts for this customer.
  const allTimeTop = useMemo(() => {
    if (!customer) return [];
    const tally = new Map<
      string,
      { concept: import("@/lib/types").Concept; yes: number; no: number; sessionCount: number }
    >();
    for (const session of sessions) {
      const sessionConcepts = session.conceptIds
        .map((cid) => data.concepts.find((c) => c.id === cid))
        .filter((c): c is NonNullable<typeof c> => Boolean(c));
      const sessionVotes = data.votes.filter((v) => v.sessionId === session.id);
      for (const v of sessionVotes) {
        const c = data.concepts.find((x) => x.id === v.conceptId);
        if (!c) continue;
        const cur = tally.get(c.id) ?? {
          concept: c,
          yes: 0,
          no: 0,
          sessionCount: 0,
        };
        if (v.value === "yes") cur.yes += 1;
        else cur.no += 1;
        tally.set(c.id, cur);
      }
      // Bump sessionCount for every concept that was in the session, even if no votes.
      for (const c of sessionConcepts) {
        const cur = tally.get(c.id);
        if (cur) cur.sessionCount += 1;
        else
          tally.set(c.id, {
            concept: c,
            yes: 0,
            no: 0,
            sessionCount: 1,
          });
      }
    }
    const rows = Array.from(tally.values()).map((r) => ({
      ...r,
      total: r.yes + r.no,
      percentYes:
        r.yes + r.no === 0 ? 0 : Math.round((r.yes / (r.yes + r.no)) * 100),
    }));
    rows.sort((a, b) => {
      if (b.yes !== a.yes) return b.yes - a.yes;
      if (a.no !== b.no) return a.no - b.no;
      return a.concept.name.localeCompare(b.concept.name);
    });
    return rows;
  }, [customer, sessions, data.concepts, data.votes]);

  if (!customer) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-2xl font-bold">Customer not found</h1>
        <p className="mt-2 text-zinc-600">This customer no longer exists.</p>
        <Link
          href="/admin/customers"
          className="mt-6 inline-block text-sm text-blue-700 hover:underline"
        >
          ← Back to customers
        </Link>
      </div>
    );
  }

  const totalYes = allTimeTop.reduce((s, r) => s + r.yes, 0);
  const totalNo = allTimeTop.reduce((s, r) => s + r.no, 0);
  const totalParticipants = new Set(
    sessions.flatMap((s) =>
      data.votes.filter((v) => v.sessionId === s.id).map((v) => v.participantId)
    )
  ).size;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link
        href="/admin/customers"
        className="text-sm text-zinc-500 hover:underline"
      >
        ← Back to customers
      </Link>

      <header className="mt-3 flex items-center gap-4 border-b border-zinc-200 pb-6">
        <CustomerAvatar customer={customer} size="md" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{customer.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {sessions.length} session{sessions.length === 1 ? "" : "s"} ·{" "}
            {totalParticipants} participant{totalParticipants === 1 ? "" : "s"} ·{" "}
            {totalYes} yes / {totalNo} no ·{" "}
            {allTimeTop.length} concept{allTimeTop.length === 1 ? "" : "s"} seen
          </p>
        </div>
      </header>

      {/* All-time top */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">All-time top concepts</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Aggregated across every session with {customer.name}. Sorted by total
          Yes votes.
        </p>

        {allTimeTop.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            No sessions with this customer yet.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3 w-10 text-right">#</th>
                  <th className="px-4 py-3">Concept</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Shown in</th>
                  <th className="px-4 py-3 text-right">Yes</th>
                  <th className="px-4 py-3 text-right">No</th>
                  <th className="px-4 py-3 text-right">% Yes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {allTimeTop.map((r, idx) => (
                  <tr key={r.concept.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 text-right font-mono text-zinc-400">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      {r.concept.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {r.concept.category ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.sessionCount} session{r.sessionCount === 1 ? "" : "s"}
                    </td>
                    <td className="px-4 py-3 text-right text-green-700 font-medium">
                      {r.yes}
                    </td>
                    <td className="px-4 py-3 text-right text-red-700">{r.no}</td>
                    <td className="px-4 py-3 text-right">{r.percentYes}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Per-session tables */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Sessions</h2>
        {sessions.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No sessions yet.</p>
        ) : (
          <div className="mt-4 space-y-6">
            {sessions.map((session) => (
              <SessionResults
                key={session.id}
                session={session}
                concepts={data.concepts}
                votes={data.votes}
                customerName={customer.name}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SessionResults({
  session,
  concepts,
  votes,
  customerName,
}: {
  session: import("@/lib/types").Session;
  concepts: import("@/lib/types").Concept[];
  votes: import("@/lib/types").Vote[];
  customerName: string;
}) {
  const sessionConcepts = session.conceptIds
    .map((id) => concepts.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  const sessionVotes = votes.filter((v) => v.sessionId === session.id);
  const results = sortResults(aggregateSession(sessionVotes, sessionConcepts));
  const totalYes = results.reduce((s, r) => s + r.yes, 0);
  const totalNo = results.reduce((s, r) => s + r.no, 0);
  const participants = new Set(sessionVotes.map((v) => v.participantId)).size;
  const maxYes = Math.max(1, ...results.map((r) => r.yes));

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-200 p-4">
        <div>
          <Link
            href={`/admin/sessions/${session.id}`}
            className="text-base font-semibold text-zinc-900 hover:underline"
          >
            {formatDateLong(session.date)}
          </Link>
          <p className="mt-1 text-xs text-zinc-500">
            {sessionConcepts.length} concepts · {participants} participant
            {participants === 1 ? "" : "s"} · {totalYes} yes / {totalNo} no ·
            Yes cap {session.yesCap} · {customerName}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${
              session.status === "open"
                ? "bg-green-100 text-green-800"
                : session.status === "closed"
                  ? "bg-zinc-200 text-zinc-700"
                  : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {session.status}
          </span>
          <span className="font-mono text-zinc-500">{session.code}</span>
        </div>
      </div>

      <div className="overflow-hidden">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2 w-10 text-right">#</th>
              <th className="px-3 py-2">Concept</th>
              <th className="px-3 py-2 text-right">Yes</th>
              <th className="px-3 py-2 text-right">No</th>
              <th className="px-3 py-2 text-right">% Yes</th>
              <th className="px-3 py-2 w-1/4">Bar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {results.map((r, idx) => (
              <tr key={r.concept.id}>
                <td className="px-3 py-2 text-right font-mono text-zinc-400">
                  {idx + 1}
                </td>
                <td className="px-3 py-2 font-medium text-zinc-900">
                  {r.concept.name}
                  {r.concept.category && (
                    <span className="ml-2 text-xs font-normal text-zinc-500">
                      {r.concept.category}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-green-700 font-medium">
                  {r.yes}
                </td>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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