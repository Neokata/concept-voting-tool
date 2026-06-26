"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/hooks";
import { store } from "@/lib/store";

export default function NewSessionPage() {
  const router = useRouter();
  const data = useStore();
  // Default to "existing" mode if there are any customers, "new" otherwise.
  // useState initializer runs once with the server snapshot (always empty),
  // so we instead use an effect to set the initial mode once data arrives.
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("new");
  const [customerId, setCustomerId] = useState<string>("");
  const [initialized, setInitialized] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");

  // Once client-side data is loaded, default to existing-customer mode if any exist.
  // Note: we only mark `initialized` once we've seen non-empty data, so the
  // server-snapshot-then-client-snapshot transition doesn't lock us into
  // "new" mode prematurely.
  useEffect(() => {
    if (initialized) return;
    if (data.customers.length === 0) return;
    setCustomerMode("existing");
    setCustomerId(data.customers[0].id);
    setInitialized(true);
  }, [data.customers, initialized]);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [includeSuppressed, setIncludeSuppressed] = useState(false);
  const [conceptSearch, setConceptSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [created, setCreated] = useState<string | null>(null);
  const [openAfter, setOpenAfter] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveCustomerId = customerMode === "new" ? null : customerId;
  const visibleConcepts = data.concepts.filter((c) => {
    if (!includeSuppressed && effectiveCustomerId && c.suppressedFor.includes(effectiveCustomerId)) {
      return false;
    }
    if (conceptSearch.trim()) {
      const q = conceptSearch.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.category?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function selectAll() {
    setSelected(new Set(visibleConcepts.map((c) => c.id)));
  }
  function clearAll() {
    setSelected(new Set());
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let finalCustomerId = customerId;
    if (customerMode === "new") {
      const name = newCustomerName.trim();
      if (!name) {
        setError("Customer name is required.");
        return;
      }
      const c = store.createCustomer(name);
      finalCustomerId = c.id;
    } else if (!finalCustomerId) {
      setError("Please select a customer.");
      return;
    }

    if (selected.size === 0) {
      setError("Please select at least one concept.");
      return;
    }

    if (!date) {
      setError("Please pick a date.");
      return;
    }

    const session = store.createSession({
      customerId: finalCustomerId,
      date,
      conceptIds: Array.from(selected),
      yesCap: 10, // TODO: replace with form input in task 16
    });

    if (openAfter) store.updateSession(session.id, { status: "open" });

    setCreated(session.code);
  }

  if (created) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-green-900">
          <h1 className="text-2xl font-bold">Session created</h1>
          <p className="mt-2 text-sm">
            Share this code with participants so they can join:
          </p>
          <div className="mt-4 flex items-center gap-3">
            <code className="rounded-md bg-white px-4 py-2 font-mono text-3xl tracking-widest text-zinc-900">
              {created}
            </code>
            <button
              onClick={() => navigator.clipboard?.writeText(created)}
              className="rounded-md border border-green-300 bg-white px-3 py-1.5 text-sm font-medium text-green-900 hover:bg-green-100"
            >
              Copy
            </button>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href={`/results/${created}`}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
            >
              View results
            </Link>
            <Link
              href="/admin"
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Back to admin
            </Link>
            <button
              onClick={() => {
                setCreated(null);
                setSelected(new Set());
                setNewCustomerName("");
              }}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Create another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/admin" className="text-sm text-zinc-500 hover:underline">
        ← Back to admin
      </Link>
      <h1 className="mt-2 text-2xl font-bold">New session</h1>

      <form onSubmit={handleCreate} className="mt-6 space-y-6">
        {/* Customer */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-700">Customer</h2>
          <div className="mt-3 space-y-3">
            {data.customers.length > 0 && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={customerMode === "existing"}
                  onChange={() => setCustomerMode("existing")}
                />
                Existing customer
                {customerMode === "existing" && (
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="ml-2 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                  >
                    {data.customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={customerMode === "new"}
                onChange={() => setCustomerMode("new")}
              />
              New customer
              {customerMode === "new" && (
                <input
                  type="text"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="e.g. Costco"
                  className="ml-2 rounded-md border border-zinc-300 px-2 py-1 text-sm"
                />
              )}
            </label>
          </div>
        </div>

        {/* Date */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-700">Session date</h2>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-3 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
          />
        </div>

        {/* Concepts */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-700">
              Concepts ({selected.size} selected)
            </h2>
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={selectAll}
                className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-50"
              >
                Select visible
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-50"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={conceptSearch}
              onChange={(e) => setConceptSearch(e.target.value)}
              placeholder="Search concepts…"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            />
            {effectiveCustomerId && (
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={includeSuppressed}
                  onChange={(e) => setIncludeSuppressed(e.target.checked)}
                />
                Show concepts suppressed for this customer
              </label>
            )}
          </div>

          {visibleConcepts.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-500">
              No concepts match. Try clearing the search or adding concepts in{" "}
              <Link href="/admin/concepts" className="text-blue-700 hover:underline">
                Manage concepts
              </Link>
              .
            </p>
          ) : (
            <div className="mt-3 max-h-96 overflow-y-auto rounded-md border border-zinc-100">
              <ul className="divide-y divide-zinc-100">
                {visibleConcepts.map((c) => {
                  const suppressedHere =
                    effectiveCustomerId && c.suppressedFor.includes(effectiveCustomerId);
                  return (
                    <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggle(c.id)}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-zinc-900">{c.name}</div>
                        <div className="text-xs text-zinc-500">
                          {c.category ?? "—"}
                          {suppressedHere && (
                            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">
                              suppressed
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Options */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={openAfter}
              onChange={(e) => setOpenAfter(e.target.checked)}
            />
            Open session immediately (otherwise starts as draft)
          </label>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Create session
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
