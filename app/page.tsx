import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Concept Voting Tool</h1>
      <p className="mt-3 text-lg text-zinc-500">
        Run ideation sessions with customers. Surface the concepts that resonate.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        <Link
          href="/join"
          className="group rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-900 hover:shadow-md"
        >
          <h2 className="text-xl font-bold text-zinc-900">Join a session</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Enter the 6-character code your facilitator shared, pick an alias,
            and start voting.
          </p>
          <p className="mt-4 text-sm font-semibold text-zinc-900 group-hover:underline">
            Continue →
          </p>
        </Link>

        <Link
          href="/admin"
          className="group rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-900 hover:shadow-md"
        >
          <h2 className="text-xl font-bold text-zinc-900">Open admin</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Create sessions, manage the concept library, and review results from
            past ideation days.
          </p>
          <p className="mt-4 text-sm font-semibold text-zinc-900 group-hover:underline">
            Continue →
          </p>
        </Link>
      </div>

      <div className="mt-12 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>POC notice:</strong> all data lives in this browser&apos;s local
        storage. Clearing site data, switching browsers, or using a different
        device will not show the same sessions.
      </div>
    </div>
  );
}