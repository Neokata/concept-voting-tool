"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/hooks";
import { aggregateSession, sortResults, topN } from "@/lib/voting";
import { BackButton } from "@/components/BackButton";

type View = "top30" | "all" | "mine";

export default function ResultsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = use(params);
  const code = rawCode.toUpperCase();
  const data = useStore();
  const [view, setView] = useState<View>("top30");

  const session = useMemo(
    () => data.sessions.find((s) => s.code === code),
    [data.sessions, code]
  );

  const customer = useMemo(
    () => (session ? data.customers.find((c) => c.id === session.customerId) : null),
    [data.customers, session]
  );

  const concepts = useMemo(
    () =>
      session
        ? session.conceptIds
            .map((id) => data.concepts.find((c) => c.id === id))
            .filter((c): c is NonNullable<typeof c> => Boolean(c))
        : [],
    [session, data.concepts]
  );

  const sessionVotes = useMemo(
    () => (session ? data.votes.filter((v) => v.sessionId === session.id) : []),
    [data.votes, session]
  );

  const sorted = useMemo(
    () => (session ? sortResults(aggregateSession(sessionVotes, concepts)) : []),
    [sessionVotes, concepts, session]
  );

  const participantInfo = useMemo(() => {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(`participant:${code}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as { id: string; alias: string };
    } catch {
      return null;
    }
  }, [code]);

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-10">
        <BackButton href="/join" label="Back to join" />
        <div className="mt-8 text-center">
          <h1 className="text-2xl font-bold">Session not found</h1>
          <p className="mt-2 text-zinc-600">
            No session exists with code <code className="font-mono">{code}</code>.
          </p>
          <Link href="/join" className="mt-6 inline-block text-blue-700 hover:underline">
            Back to join
          </Link>
        </div>
      </div>
    );
  }

  const visible =
    view === "top30"
      ? topN(sorted, 30)
      : view === "mine" && participantInfo
        ? sorted.filter((r) => sessionVotes.some(
            (v) => v.participantId === participantInfo.id && v.conceptId === r.concept.id
          ))
        : sorted;

  const totalParticipants = new Set(sessionVotes.map((v) => v.participantId)).size;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <BackButton href="/join" label="Back to join" />
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-zinc-500">Session {code}</p>
          <h1 className="text-2xl font-bold">
            {customer?.name ?? "Unknown customer"}
          </h1>
          <p className="text-sm text-zinc-600">
            {session.date} ·{" "}
            {concepts.length} concepts · {totalParticipants} participant{totalParticipants === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2">
          {session.status === "open" && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
              live
            </span>
          )}
          {session.status === "closed" && (
            <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700">
              closed
            </span>
          )}
          {session.status === "draft" && (
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
              draft
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        {(["top30", "all", ...(participantInfo ? ["mine" as const] : [])] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-md border px-3 py-1 ${
              view === v
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {v === "top30" ? "Top 30" : v === "all" ? "All concepts" : "My votes"}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 w-12 text-right">#</th>
              <th className="px-4 py-3">Concept</th>
              <th className="px-4 py-3 text-right">Yes</th>
              <th className="px-4 py-3 text-right">No</th>
              <th className="px-4 py-3 text-right">% Yes</th>
              <th className="px-4 py-3">Bar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                  {sessionVotes.length === 0
                    ? "No votes yet."
                    : "No concepts match the current view."}
                </td>
              </tr>
            )}
            {visible.map((r, idx) => {
              const maxYes = Math.max(1, ...sorted.map((x) => x.yes));
              return (
                <tr
                  key={r.concept.id}
                  className={view === "top30" && idx < 30 ? "bg-green-50/40" : ""}
                >
                  <td className="px-4 py-2 text-right font-mono text-zinc-500">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-2 font-medium text-zinc-900">
                    {r.concept.name}
                    {r.concept.category && (
                      <span className="ml-2 text-xs font-normal text-zinc-500">
                        {r.concept.category}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-green-700 font-medium">
                    {r.yes}
                  </td>
                  <td className="px-4 py-2 text-right text-red-700">{r.no}</td>
                  <td className="px-4 py-2 text-right">{r.percentYes}%</td>
                  <td className="px-4 py-2 w-1/3">
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${Math.round((r.yes / maxYes) * 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-xs text-zinc-500">
        Live results — refreshes automatically as votes come in from this
        browser.
      </div>
    </div>
  );
}