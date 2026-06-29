"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/hooks";
import { store } from "@/lib/store";
import { BackButton } from "@/components/BackButton";

export default function JoinPage() {
  const router = useRouter();
  const data = useStore();
  const [code, setCode] = useState("");
  const [alias, setAlias] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const normalized = code.trim().toUpperCase();
    if (normalized.length !== 6) {
      setError("Session code should be 6 characters.");
      return;
    }
    const session = store.findSessionByCode(normalized);
    if (!session) {
      setError(`No session found with code "${normalized}".`);
      return;
    }
    if (session.status === "closed") {
      setError("That session is closed. Ask the facilitator to reopen it.");
      return;
    }
    const trimmedAlias = alias.trim();
    if (!trimmedAlias) {
      setError("Please enter an alias.");
      return;
    }
    // Create participant record so votes can be attributed.
    const participant = store.createParticipant(trimmedAlias);
    // Stash participant id in sessionStorage so the voting page can use it.
    window.sessionStorage.setItem(
      `participant:${normalized}`,
      JSON.stringify({ id: participant.id, alias: participant.alias })
    );
    router.push(`/session/${normalized}`);
  }

  // Show recent sessions to make testing easier.
  const recent = [...data.sessions]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold">Join a session</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Enter the code from your facilitator and pick an alias (no real names
        needed for the POC).
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600">
            Session code
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-lg tracking-widest focus:border-zinc-900 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600">
            Your alias
          </label>
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="e.g. Alice, Bob, Panelist-3"
            maxLength={40}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
          />
        </div>
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        <button
          type="submit"
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Join session
        </button>
      </form>

      {recent.length > 0 && (
        <div className="mt-10 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-700">Recent sessions on this device</h2>
          <ul className="mt-2 divide-y divide-zinc-100">
            {recent.map((s) => {
              const cust = data.customers.find((c) => c.id === s.customerId);
              return (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="font-medium text-zinc-900">{cust?.name ?? "Unknown"}</div>
                    <div className="text-xs text-zinc-500">
                      {s.date} · {s.status}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCode(s.code)}
                    className="font-mono text-xs text-blue-700 hover:underline"
                  >
                    {s.code}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-zinc-500">
            Click a code to prefill it.
          </p>
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <BackButton href="/" label="Back to home" />
      </div>
    </div>
  );
}