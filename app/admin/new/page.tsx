"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/hooks";
import { store } from "@/lib/store";
import { parseBulkConcepts, splitDuplicates } from "@/lib/bulkParse";

const DEFAULT_YES_CAP = 10;

export default function NewSessionPage() {
  const router = useRouter();
  const data = useStore();

  // Customer mode (existing vs new) — initialized after data loads.
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("new");
  const [customerId, setCustomerId] = useState<string>("");
  const [initialized, setInitialized] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");

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
  const [yesCap, setYesCap] = useState<number>(DEFAULT_YES_CAP);
  const [error, setError] = useState<string | null>(null);

  // Bulk-paste state
  const [bulkText, setBulkText] = useState("");
  const [bulkPreviewOpen, setBulkPreviewOpen] = useState(false);

  // Auto-track yesCap to current selected.size when selections change.
  // When the user changes which concepts are in the session, set the cap
  // to match the new selection size. They can manually adjust the cap
  // afterward if they want a different number.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selected.size > 0 && yesCap !== selected.size) {
      setYesCap(selected.size);
    }
  }, [selected.size]);

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

  // Compute bulk-paste preview: how many are new, how many duplicate
  const bulkPreview = useMemo(() => {
    if (!bulkText.trim()) return null;
    const { parsed, errors } = parseBulkConcepts(bulkText);
    const { unique, duplicates } = splitDuplicates(
      parsed,
      data.concepts.map((c) => c.name)
    );
    return { parsed, errors, unique, duplicates };
  }, [bulkText, data.concepts]);

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

  function applyBulkParsed() {
    if (!bulkPreview) return;
    // Create the unique concepts in the library.
    const created = store.bulkCreateConcepts(bulkPreview.unique);
    // Auto-select the newly-created concepts for this session.
    const next = new Set(selected);
    for (const c of created) next.add(c.id);
    setSelected(next);
    // Clear the bulk textarea.
    setBulkText("");
    setBulkPreviewOpen(false);
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

    if (yesCap < 1 || yesCap > selected.size) {
      setError(`Yes cap must be between 1 and ${selected.size} (the number of selected concepts).`);
      return;
    }

    const session = store.createSession({
      customerId: finalCustomerId,
      date,
      conceptIds: Array.from(selected),
      yesCap,
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
              href={`/admin/sessions`}
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
    <div className="mx-auto max-w-4xl px-6 py-8">
      <Link href="/admin/sessions" className="text-sm text-zinc-500 hover:underline">
        ← Back to sessions
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

        {/* Date + Yes cap */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-zinc-700">Session date</h2>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-3 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-zinc-700">
              Yes cap per participant
            </h2>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={Math.max(1, selected.size)}
                value={yesCap}
                onChange={(e) => setYesCap(parseInt(e.target.value, 10) || 1)}
                className="w-20 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
              />
              <span className="text-xs text-zinc-500">
                (1–{Math.max(1, selected.size)} based on concepts selected)
              </span>
            </div>
          </div>
        </div>

        {/* Bulk paste */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-700">
              Bulk paste concepts
            </h2>
            <button
              type="button"
              onClick={() => setBulkPreviewOpen((v) => !v)}
              className="text-xs text-blue-700 hover:underline"
            >
              {bulkPreviewOpen ? "Hide preview" : "Preview"}
            </button>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            One per line. Optional <span className="font-mono">|</span> separators for
            category and description:{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5">
              Name | Category | Description
            </code>
            . Lines starting with # are ignored.
          </p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`Spicy Maple BBQ | Sauces | Smoky-sweet with real maple syrup\nKorean Gochujang Glaze | Sauces\nCajun Lime Butter | Drizzles`}
            rows={5}
            className="mt-3 w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-xs focus:border-zinc-900 focus:outline-none"
          />
          {bulkPreviewOpen && bulkPreview && (
            <div className="mt-3 rounded-md border border-zinc-100 bg-zinc-50 p-3 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-green-800">
                    {bulkPreview.unique.length} new
                  </span>
                  {bulkPreview.duplicates.length > 0 && (
                    <>
                      {" "}
                      ·{" "}
                      <span className="text-amber-800">
                        {bulkPreview.duplicates.length} duplicate
                      </span>
                    </>
                  )}
                  {bulkPreview.errors.length > 0 && (
                    <>
                      {" "}
                      ·{" "}
                      <span className="text-red-800">
                        {bulkPreview.errors.length} error
                        {bulkPreview.errors.length === 1 ? "" : "s"}
                      </span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={applyBulkParsed}
                  disabled={bulkPreview.unique.length === 0}
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                >
                  Add {bulkPreview.unique.length} to library & select
                </button>
              </div>
              {bulkPreview.errors.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-red-800">
                  {bulkPreview.errors.map((e, i) => (
                    <li key={i}>
                      Line {e.line}: {e.reason} {e.text && `— "${e.text}"`}
                    </li>
                  ))}
                </ul>
              )}
              {bulkPreview.duplicates.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-amber-800">
                    Duplicates ({bulkPreview.duplicates.length})
                  </summary>
                  <ul className="mt-1 ml-4 list-disc text-xs text-zinc-600">
                    {bulkPreview.duplicates.map((d, i) => (
                      <li key={i}>{d.name}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
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
              No concepts match. Try clearing the search, adding concepts via bulk
              paste above, or visit{" "}
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
            onClick={() => router.push("/admin/sessions")}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}