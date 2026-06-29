"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/hooks";
import { store } from "@/lib/store";
import { DEFAULT_YES_CAP } from "@/lib/types";
import { votesByParticipant } from "@/lib/voting";
import { BackButton } from "@/components/BackButton";

type ParticipantInfo = { id: string; alias: string };

export default function SessionVotePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = use(params);
  const code = rawCode.toUpperCase();
  const router = useRouter();
  const data = useStore();
  const session = data.sessions.find((s) => s.code === code) ?? null;

  // Resolve participant from sessionStorage in an effect.
  const [participantInfo, setParticipantInfo] = useState<ParticipantInfo | null>(null);
  const [participantResolved, setParticipantResolved] = useState(false);
  useEffect(() => {
    const raw = window.sessionStorage.getItem(`participant:${code}`);
    if (!raw) {
      router.replace(`/join?code=${code}`);
      return;
    }
    try {
      setParticipantInfo(JSON.parse(raw) as ParticipantInfo);
    } catch {
      router.replace(`/join?code=${code}`);
      return;
    }
    setParticipantResolved(true);
  }, [code, router]);

  if (participantResolved && !session) {
    return <NotFound code={code} />;
  }

  if (participantResolved && session?.status === "draft") {
    return (
      <WaitingScreen
        code={code}
        message="Waiting for the facilitator to open the session."
      />
    );
  }

  if (participantResolved && session?.status === "closed") {
    return (
      <WaitingScreen
        code={code}
        message="This session has been closed. Redirecting to results…"
      />
    );
  }

  if (!participantResolved || !session || !participantInfo) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <VotingFlow
      code={code}
      session={session}
      participantId={participantInfo.id}
      alias={participantInfo.alias}
    />
  );
}

function NotFound({ code }: { code: string }) {
  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <BackButton href="/join" label="Back to join" />
      <div className="mt-8 text-center">
        <h1 className="text-2xl font-bold">Session not found</h1>
        <p className="mt-2 text-zinc-600">
          No session exists with code <code className="font-mono">{code}</code>.
        </p>
        <Link href="/join" className="mt-6 inline-block text-blue-700 hover:underline">
          Try a different code
        </Link>
      </div>
    </div>
  );
}

function WaitingScreen({ code, message }: { code: string; message: string }) {
  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <BackButton href="/join" label="Back to join" />
      <div className="mt-8 text-center">
        <p className="font-mono text-3xl tracking-widest">{code}</p>
        <p className="mt-4 text-zinc-700">{message}</p>
        <Link
          href={`/results/${code}`}
          className="mt-6 inline-block text-sm text-blue-700 hover:underline"
        >
          Go to results →
        </Link>
      </div>
    </div>
  );
}

function VotingFlow({
  code,
  session,
  participantId,
  alias,
}: {
  code: string;
  session: import("@/lib/types").Session;
  participantId: string;
  alias: string;
}) {
  const data = useStore();
  const concepts = session.conceptIds
    .map((id) => data.concepts.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  // Persisted votes from the store, as a stable sorted string key.
  const persistedEntries = useMemo(() => {
    const map = votesByParticipant(data.votes, session.id, participantId);
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [data.votes, session.id, participantId]);
  const persistedKey = useMemo(
    () => persistedEntries.map(([k, v]) => `${k}=${v}`).join("|"),
    [persistedEntries]
  );

  // Local vote state — seeded from persisted on first render.
  const [votes, setVotes] = useState<Map<string, "yes" | "no">>(() => {
    return new Map(persistedEntries);
  });
  const [submitted, setSubmitted] = useState(false);

  // Re-sync if persisted votes change from another tab / reopen.
  useEffect(() => {
    setVotes(new Map(persistedEntries));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistedKey]);

  const cap = session.yesCap ?? DEFAULT_YES_CAP;
  const yesCount = Array.from(votes.values()).filter((v) => v === "yes").length;
  const atCap = yesCount >= cap;

  function setVote(conceptId: string, value: "yes" | "no") {
    if (submitted) return;
    setVotes((prev) => {
      const next = new Map(prev);
      const cur = next.get(conceptId);
      if (cur === value) {
        next.delete(conceptId);
      } else if (value === "yes" && cur !== "yes" && countYes(prev) >= cap) {
        // At cap — block this Yes.
        return prev;
      } else {
        next.set(conceptId, value);
      }
      return next;
    });
  }

  function handleSubmit() {
    // Write all current votes to store.
    for (const [conceptId, value] of votes.entries()) {
      store.castVote(session.id, participantId, conceptId, value);
    }
    setSubmitted(true);
  }

  if (submitted) {
    const noCount = Array.from(votes.values()).filter((v) => v === "no").length;
    return <ThankYouScreen code={code} alias={alias} yesCount={yesCount} noCount={noCount} />;
  }

  return (
    <OneAtATime
      code={code}
      concepts={concepts}
      votes={votes}
      setVote={setVote}
      yesCount={yesCount}
      cap={cap}
      atCap={atCap}
      alias={alias}
      onSubmit={handleSubmit}
    />
  );
}

function countYes(m: Map<string, "yes" | "no">): number {
  let n = 0;
  for (const v of m.values()) if (v === "yes") n++;
  return n;
}

function OneAtATime({
  code,
  concepts,
  votes,
  setVote,
  yesCount,
  cap,
  atCap,
  alias,
  onSubmit,
}: {
  code: string;
  concepts: import("@/lib/types").Concept[];
  votes: Map<string, "yes" | "no">;
  setVote: (conceptId: string, value: "yes" | "no") => void;
  yesCount: number;
  cap: number;
  atCap: boolean;
  alias: string;
  onSubmit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [summaryMode, setSummaryMode] = useState(false);

  const total = concepts.length;
  const allVoted = votes.size === total;

  // Keyboard shortcuts: Y / N for Yes / No, ← / → for prev / next.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (summaryMode) return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key === "y" || e.key === "Y") {
        const c = concepts[index];
        if (c) setVote(c.id, "yes");
      } else if (e.key === "n" || e.key === "N") {
        const c = concepts[index];
        if (c) setVote(c.id, "no");
      } else if (e.key === "ArrowLeft") {
        setIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight") {
        // Only advance when this concept has a vote recorded.
        const c = concepts[index];
        if (!c || !votes.has(c.id)) return;
        if (index === concepts.length - 1) setSummaryMode(true);
        else setIndex((i) => Math.min(concepts.length - 1, i + 1));
      } else if (e.key === "Enter") {
        const c = concepts[index];
        if (!c || !votes.has(c.id)) return;
        if (index === concepts.length - 1) setSummaryMode(true);
        else setIndex((i) => Math.min(concepts.length - 1, i + 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [concepts, index, setVote, summaryMode, votes]);

  if (summaryMode) {
    return (
      <SummaryScreen
        code={code}
        concepts={concepts}
        votes={votes}
        setVote={setVote}
        yesCount={yesCount}
        cap={cap}
        atCap={atCap}
        alias={alias}
        onBack={() => setSummaryMode(false)}
        onSubmit={onSubmit}
      />
    );
  }

  const current = concepts[index];
  const voted = current ? votes.get(current.id) : undefined;
  const canAdvance = voted !== undefined;

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <BackButton href="/join" label="Back to join" />
      <div className="mt-6 flex items-center justify-between text-sm">
        <span className="font-mono text-zinc-500">{code}</span>
        <span className="text-zinc-500">
          Concept {index + 1} of {total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full bg-zinc-900 transition-all"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      {/* Yes counter */}
      <div className="mt-3 text-xs text-zinc-500">
        Voting as <strong className="text-zinc-700">{alias}</strong> · Yes votes:{" "}
        <strong className={atCap ? "text-red-700" : "text-zinc-900"}>
          {yesCount} / {cap}
        </strong>
        {atCap && (
          <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-red-700">
            cap reached
          </span>
        )}
      </div>

      {/* The concept card */}
      {current && (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {current.category ?? "Concept"}
          </div>
          <h2 className="mt-2 text-3xl font-bold text-zinc-900">{current.name}</h2>
          {current.description && (
            <p className="mt-4 text-base text-zinc-600">{current.description}</p>
          )}
          {current.imageUrl && (
            <img
              src={current.imageUrl}
              alt={current.name}
              className="mt-6 max-h-64 rounded-lg object-cover"
            />
          )}
          <div className="mt-8 flex items-center justify-between text-xs text-zinc-400">
            <span>Keyboard: Y / N · ← / →</span>
            {voted && (
              <span className="text-zinc-600">
                You voted <strong>{voted.toUpperCase()}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={() => current && setVote(current.id, "yes")}
          disabled={voted === "yes" || atCap}
          className={`rounded-xl px-4 py-4 text-base font-semibold transition ${
            voted === "yes"
              ? "bg-green-600 text-white"
              : "border-2 border-green-600 bg-white text-green-700 hover:bg-green-50 disabled:opacity-50"
          }`}
        >
          Yes <span className="ml-2 text-xs font-normal opacity-70">(Y)</span>
        </button>
        <button
          onClick={() => current && setVote(current.id, "no")}
          className={`rounded-xl px-4 py-4 text-base font-semibold transition ${
            voted === "no"
              ? "bg-red-600 text-white"
              : "border-2 border-red-600 bg-white text-red-700 hover:bg-red-50"
          }`}
        >
          No <span className="ml-2 text-xs font-normal opacity-70">(N)</span>
        </button>
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          ← Back
        </button>
        {index < total - 1 ? (
          <button
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
            disabled={!canAdvance}
            title={!canAdvance ? "Please vote Yes or No before advancing" : undefined}
            className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={() => setSummaryMode(true)}
            disabled={!allVoted}
            title={!allVoted ? "Please vote on every concept first" : undefined}
            className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            Review & submit →
          </button>
        )}
      </div>
    </div>
  );
}

function SummaryScreen({
  code,
  concepts,
  votes,
  setVote,
  yesCount,
  cap,
  atCap,
  alias,
  onBack,
  onSubmit,
}: {
  code: string;
  concepts: import("@/lib/types").Concept[];
  votes: Map<string, "yes" | "no">;
  setVote: (conceptId: string, value: "yes" | "no") => void;
  yesCount: number;
  cap: number;
  atCap: boolean;
  alias: string;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const noCount = Array.from(votes.values()).filter((v) => v === "no").length;
  const allVoted = votes.size === concepts.length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="flex items-center justify-between">
        <BackButton href="/join" label="Cancel and exit" />
        <span className="font-mono text-sm text-zinc-500">{code}</span>
      </div>
      <h1 className="mt-2 text-2xl font-bold">Review your votes</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Voting as <strong>{alias}</strong> ·{" "}
        <strong className={atCap ? "text-red-700" : "text-zinc-900"}>
          {yesCount} yes / {cap}
        </strong>{" "}
        · {noCount} no
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Concept</th>
              <th className="px-3 py-2 text-center">Yes</th>
              <th className="px-3 py-2 text-center">No</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {concepts.map((c, idx) => {
              const v = votes.get(c.id);
              return (
                <tr key={c.id}>
                  <td className="px-3 py-2 font-mono text-xs text-zinc-400">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-zinc-900">{c.name}</div>
                    {c.category && (
                      <div className="text-xs text-zinc-500">{c.category}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => setVote(c.id, "yes")}
                      className={`rounded-md px-3 py-1 text-xs font-medium ${
                        v === "yes"
                          ? "bg-green-600 text-white"
                          : "border border-green-300 text-green-700 hover:bg-green-50"
                      }`}
                    >
                      Yes
                    </button>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => setVote(c.id, "no")}
                      className={`rounded-md px-3 py-1 text-xs font-medium ${
                        v === "no"
                          ? "bg-red-600 text-white"
                          : "border border-red-300 text-red-700 hover:bg-red-50"
                      }`}
                    >
                      No
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          ← Back to voting
        </button>
        <button
          onClick={onSubmit}
          disabled={!allVoted}
          title={!allVoted ? "You must vote Yes or No on every concept" : undefined}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          Submit votes
        </button>
      </div>
    </div>
  );
}

function ThankYouScreen({
  code,
  alias,
  yesCount,
  noCount,
}: {
  code: string;
  alias: string;
  yesCount: number;
  noCount: number;
}) {
  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <BackButton href="/join" label="Back to join" />
      <div className="mt-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
          <span className="text-3xl">✓</span>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">Thanks for voting!</h1>
        <p className="mt-3 text-sm text-zinc-600">
          Your responses for session <span className="font-mono">{code}</span> have
          been recorded as <strong>{alias}</strong>.
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {yesCount} yes · {noCount} no
        </p>
        <p className="mt-6 text-xs text-zinc-500">
          You can close this window.
        </p>
      </div>
    </div>
  );
}