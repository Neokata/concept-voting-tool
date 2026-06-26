"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/hooks";
import { store } from "@/lib/store";
import { MAX_YES_PER_PARTICIPANT } from "@/lib/types";
import { votesByParticipant } from "@/lib/voting";

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

  // Read participant from sessionStorage in an effect (not during render).
  // If absent, redirect to /join with the code preserved.
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
    return <WaitingScreen code={code} message="Waiting for the facilitator to open the session." />;
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
    <VotingView
      code={code}
      session={session}
      participantId={participantInfo.id}
      alias={participantInfo.alias}
      onSubmitted={() => router.push(`/results/${code}`)}
    />
  );
}

function NotFound({ code }: { code: string }) {
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
  session,
  participantId,
  alias,
  onSubmitted,
}: {
  code: string;
  session: import("@/lib/types").Session;
  participantId: string;
  alias: string;
  onSubmitted: () => void;
}) {
  const data = useStore();
  const concepts = session.conceptIds
    .map((id) => data.concepts.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  // The participant's persisted votes from the store, as a stable string key.
  // We compare by string (sorted entries) instead of by reference to avoid
  // re-syncing local state when the store re-emits the same data.
  const persistedKey = useMemo(() => {
    const map = votesByParticipant(data.votes, session.id, participantId);
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `${k}=${v}`)
      .join("|");
  }, [data.votes, session.id, participantId]);

  // Local mutable vote map. Seeded from persisted on first render via lazy init.
  const [votes, setVotes] = useState<Map<string, "yes" | "no">>(() => {
    const map = votesByParticipant(data.votes, session.id, participantId);
    return new Map(map);
  });
  const [submitted, setSubmitted] = useState(false);
  const [filter, setFilter] = useState<"all" | "yes" | "no" | "unvoted">("all");

  // If persisted votes change (e.g. another tab, or after a re-open), re-sync.
  useEffect(() => {
    const map = votesByParticipant(data.votes, session.id, participantId);
    setVotes(new Map(map));
    // We intentionally depend on persistedKey (a stable string) rather than
    // data.votes — the latter changes reference whenever the store updates
    // anything, including this user's own votes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistedKey]);

  const yesCount = Array.from(votes.values()).filter((v) => v === "yes").length;
  const remaining = Math.max(0, MAX_YES_PER_PARTICIPANT - yesCount);
  const atCap = yesCount >= MAX_YES_PER_PARTICIPANT;

  function setVote(conceptId: string, value: "yes" | "no") {
    if (submitted) return;
    setVotes((prev) => {
      const next = new Map(prev);
      const cur = next.get(conceptId);
      if (cur === value) {
        next.delete(conceptId);
      } else if (value === "yes" && cur !== "yes" && countYes(prev) >= MAX_YES_PER_PARTICIPANT) {
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
    // Clear any persisted votes the user removed.
    const currentMap = votesByParticipant(data.votes, session.id, participantId);
    for (const conceptId of currentMap.keys()) {
      if (!votes.has(conceptId)) {
        store.clearVote(session.id, participantId, conceptId);
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

function countYes(m: Map<string, "yes" | "no">): number {
  let n = 0;
  for (const v of m.values()) if (v === "yes") n++;
  return n;
}
