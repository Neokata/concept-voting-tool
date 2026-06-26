"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { use, useMemo, useState } from "react";
import { useStore } from "@/lib/hooks";
import { store } from "@/lib/store";
import { MAX_YES_PER_PARTICIPANT } from "@/lib/types";
import { remainingYes, votesByParticipant } from "@/lib/voting";

export default function SessionVotePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = use(params);
  const code = rawCode.toUpperCase();
  const router = useRouter();
  const data = useStore();
  const session = useMemo(
    () => data.sessions.find((s) => s.code === code),
    [data.sessions, code]
  );

  // Identify this participant (set by /join)
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

  // If no participant, send them back to /join
  if (typeof window !== "undefined" && !participantInfo) {
    if (typeof window !== "undefined") {
      router.replace(`/join?code=${code}`);
    }
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-2xl font-bold">Session not found</h1>
        <p className="mt-2 text-zinc-600">
          No session exists with code <code className="font-mono">{code}</code>.
        </p>
        <Link href="/join" className="mt-6 inline-block text-blue-700 hover:underline">
          Try a different code
        </Link>
      </div>
    );
  }

  if (session.status === "draft") {
    return (
      <WaitingScreen
        code={code}
        message="Waiting for the facilitator to open the session."
      />
    );
  }

  if (session.status === "closed") {
    return (
      <WaitingScreen
        code={code}
        message="This session has been closed. Redirecting to results…"
      />
    );
  }

  if (!participantInfo) {
    return (
      <WaitingScreen code={code} message="Redirecting to join…" />
    );
  }

  return (
    <VotingView
      code={code}
      sessionId={session.id}
      participantId={participantInfo.id}
      alias={participantInfo.alias}
      onSubmitted={() => router.push(`/results/${code}`)}
    />
  );
}

function WaitingScreen({ code, message }: { code: string; message: string }) {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <p className="font-mono text-3xl tracking-widest">{code}</p>
      <p className="mt-4 text-zinc-700">{message}</p>
      <Link
        href={`/results/${code}`}
        className="mt-6 inline-block text-sm text-blue-700 hover:underline"
      >
        Go to results →
      </Link>
    </div>
  );
}

function VotingView({
  code,
  sessionId,
  participantId,
  alias,
  onSubmitted,
}: {
  code: string;
  sessionId: string;
  participantId: string;
  alias: string;
  onSubmitted: () => void;
}) {
  const data = useStore();
  const session = data.sessions.find((s) => s.id === sessionId);
  if (!session) return null;
  const concepts = session.conceptIds
    .map((id) => data.concepts.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const persistedVotes = votesByParticipant(data.votes, sessionId, participantId);
  const [votes, setVotes] = useState<Map<string, "yes" | "no">>(persistedVotes);
  const [submitted, setSubmitted] = useState(false);
  const [filter, setFilter] = useState<"all" | "yes" | "no" | "unvoted">("all");

  // Re-sync local votes if the store changes from another tab.
  useMemo(() => {
    setVotes(new Map(persistedVotes));
  }, [persistedVotes]);

  const yesCount = Array.from(votes.values()).filter((v) => v === "yes").length;
  const remaining = Math.max(0, MAX_YES_PER_PARTICIPANT - yesCount);
  const atCap = yesCount >= MAX_YES_PER_PARTICIPANT;

  function setVote(conceptId: string, value: "yes" | "no") {
    if (submitted) return;
    const next = new Map(votes);
    const prev = next.get(conceptId);
    if (prev === value) {
      next.delete(conceptId);
    } else if (value === "yes" && prev !== "yes" && yesCount >= MAX_YES_PER_PARTICIPANT) {
      // Block: at cap
      return;
    } else {
      next.set(conceptId, value);
    }
    setVotes(next);
  }

  function handleSubmit() {
    // Write all votes to store.
    for (const [conceptId, value] of votes.entries()) {
      store.castVote(sessionId, participantId, conceptId, value);
    }
    // Clear any previously-set votes not in the new map (e.g. user changed mind and removed).
    // Simplest: compare to store and delete extras.
    const storeVotes = votesByParticipant(data.votes, sessionId, participantId);
    for (const [conceptId, value] of storeVotes.entries()) {
      if (!votes.has(conceptId)) store.clearVote(sessionId, participantId, conceptId);
      else if (value !== votes.get(conceptId)) {
        // Updated value; castVote above already wrote it, no further action.
      }
    }
    setSubmitted(true);
    onSubmitted();
  }

  const filteredConcepts = concepts.filter((c) => {
    if (filter === "all") return true;
    const v = votes.get(c.id);
    if (filter === "yes") return v === "yes";
    if (filter === "no") return v === "no";
    return !v;
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <div>
          <p className="font-mono text-sm text-zinc-500">Session {code}</p>
          <p className="text-sm text-zinc-700">
            Voting as <strong>{alias}</strong>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm">
            Yes votes:{" "}
            <strong className={atCap ? "text-red-700" : "text-zinc-900"}>
              {yesCount} / {MAX_YES_PER_PARTICIPANT}
            </strong>
          </div>
          {!submitted && (
            <button
              onClick={handleSubmit}
              className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Submit & see results
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {(["all", "unvoted", "yes", "no"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md border px-3 py-1 ${
              filter === f
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {f === "all"
              ? `All (${concepts.length})`
              : f === "unvoted"
                ? `Unvoted (${concepts.length - votes.size})`
                : f === "yes"
                  ? `Yes (${yesCount})`
                  : `No (${votes.size - yesCount})`}
          </button>
        ))}
      </div>

      <p className="mt-2 text-xs text-zinc-500">
        {atCap
          ? "You've reached the 30-Yes cap. Additional Yes votes are blocked until you un-vote some."
          : `${remaining} Yes votes remaining.`}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredConcepts.map((c) => {
          const v = votes.get(c.id);
          const blockedYes = atCap && v !== "yes";
          return (
            <div
              key={c.id}
              className="flex flex-col rounded-lg border border-zinc-200 bg-white p-4"
            >
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-zinc-900">{c.name}</h3>
                {c.category && (
                  <p className="text-xs text-zinc-500">{c.category}</p>
                )}
                {c.description && (
                  <p className="mt-2 text-xs text-zinc-600">{c.description}</p>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  disabled={submitted || blockedYes}
                  onClick={() => setVote(c.id, "yes")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    v === "yes"
                      ? "bg-green-600 text-white"
                      : "border border-green-300 bg-white text-green-800 hover:bg-green-50 disabled:opacity-50"
                  }`}
                >
                  Yes
                </button>
                <button
                  disabled={submitted}
                  onClick={() => setVote(c.id, "no")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    v === "no"
                      ? "bg-red-600 text-white"
                      : "border border-red-300 bg-white text-red-800 hover:bg-red-50"
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredConcepts.length === 0 && (
        <p className="mt-12 text-center text-sm text-zinc-500">
          No concepts match the current filter.
        </p>
      )}
    </div>
  );
}