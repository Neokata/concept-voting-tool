"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/hooks";
import { store } from "@/lib/store";
import {
  buildConceptStats,
  buildConceptCustomerResults,
  customersShownTo,
} from "@/lib/voting";

type ResultsBucket = "all" | "top" | "bottom" | "never";

export default function ConceptsPage() {
  const data = useStore();
  const stats = useMemo(
    () => buildConceptStats(data.concepts, data.sessions, data.votes),
    [data.concepts, data.sessions, data.votes]
  );

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [shownToFilter, setShownToFilter] = useState<string>("all");
  const [resultsBucket, setResultsBucket] = useState<ResultsBucket>("all");
  const [minYes, setMinYes] = useState<string>("");
  const [maxYes, setMaxYes] = useState<string>("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [drillDownId, setDrillDownId] = useState<string | null>(null);

  // Unique categories, sorted.
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const c of data.concepts) {
      if (c.category) set.add(c.category);
    }
    return Array.from(set).sort();
  }, [data.concepts]);

  // Apply filters.
  const visibleStats = useMemo(() => {
    const min = minYes === "" ? null : parseInt(minYes, 10);
    const max = maxYes === "" ? null : parseInt(maxYes, 10);

    return stats.filter((s) => {
      // Category filter
      if (categoryFilter !== "all") {
        if ((s.concept.category ?? "") !== categoryFilter) return false;
      }
      // Shown-to filter
      if (shownToFilter !== "all") {
        const wasShownTo = data.sessions.some(
          (sess) =>
            sess.customerId === shownToFilter &&
            sess.conceptIds.includes(s.concept.id)
        );
        if (!wasShownTo) return false;
      }
      // Results bucket filter
      const totalVotes = s.totalYes + s.totalNo;
      if (resultsBucket === "never") {
        if (totalVotes > 0) return false;
      } else if (resultsBucket === "top") {
        // ≥ 70% yes, with at least 1 vote
        if (totalVotes === 0) return false;
        if (s.totalYes / totalVotes < 0.7) return false;
      } else if (resultsBucket === "bottom") {
        // ≤ 30% yes, with at least 1 vote
        if (totalVotes === 0) return false;
        if (s.totalYes / totalVotes > 0.3) return false;
      }
      // Numeric range filter (combine with bucket via AND)
      if (min !== null && !Number.isNaN(min) && s.totalYes < min) return false;
      if (max !== null && !Number.isNaN(max) && s.totalYes > max) return false;
      return true;
    });
  }, [stats, categoryFilter, shownToFilter, resultsBucket, minYes, maxYes, data.sessions]);

  function clearFilters() {
    setCategoryFilter("all");
    setShownToFilter("all");
    setResultsBucket("all");
    setMinYes("");
    setMaxYes("");
  }

  const filtersActive =
    categoryFilter !== "all" ||
    shownToFilter !== "all" ||
    resultsBucket !== "all" ||
    minYes !== "" ||
    maxYes !== "";

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Concepts ({visibleStats.length}
          {visibleStats.length !== data.concepts.length && (
            <span className="text-base font-normal text-zinc-500">
              {" "}of {data.concepts.length}
            </span>
          )}
          )
        </h1>
        <button
          onClick={() => setCreating(true)}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          + New concept
        </button>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-end gap-4 rounded-lg border border-zinc-200 bg-white p-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="mt-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600">
            Shown to
          </label>
          <select
            value={shownToFilter}
            onChange={(e) => setShownToFilter(e.target.value)}
            className="mt-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
          >
            <option value="all">Any customer</option>
            {data.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600">
            Results
          </label>
          <select
            value={resultsBucket}
            onChange={(e) => setResultsBucket(e.target.value as ResultsBucket)}
            className="mt-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
          >
            <option value="all">All results</option>
            <option value="top">Top performers (≥70% yes)</option>
            <option value="bottom">Bottom performers (≤30% yes)</option>
            <option value="never">Never voted on</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600">
            Min yes votes
          </label>
          <input
            type="number"
            min={0}
            value={minYes}
            onChange={(e) => setMinYes(e.target.value)}
            placeholder="0"
            className="mt-1 w-20 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600">
            Max yes votes
          </label>
          <input
            type="number"
            min={0}
            value={maxYes}
            onChange={(e) => setMaxYes(e.target.value)}
            placeholder="∞"
            className="mt-1 w-20 rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
          />
        </div>
        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Shown to</th>
              <th className="px-4 py-3 text-right">Shown</th>
              <th className="px-4 py-3 text-right">In top 30</th>
              <th className="px-4 py-3 text-right">Yes / No</th>
              <th className="px-4 py-3">Suppressed for</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {visibleStats.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-zinc-500">
                  {data.concepts.length === 0
                    ? "No concepts yet. Click + New concept."
                    : "No concepts match the current filters."}
                </td>
              </tr>
            )}
            {visibleStats.map((s) => {
              const shownTo = customersShownTo(s.concept, data.sessions, data.customers);
              const suppressedNames = s.concept.suppressedFor
                .map((id) => data.customers.find((c) => c.id === id)?.name)
                .filter(Boolean) as string[];
              return (
                <tr
                  key={s.concept.id}
                  className="cursor-pointer hover:bg-zinc-50"
                  onClick={() => setDrillDownId(s.concept.id)}
                >
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {s.concept.name}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{s.concept.category ?? "—"}</td>
                  <td className="px-4 py-3">
                    {shownTo.length === 0 ? (
                      <span className="text-zinc-400">never</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {shownTo.slice(0, 3).map((c) => (
                          <span
                            key={c.id}
                            className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700"
                          >
                            {c.name}
                          </span>
                        ))}
                        {shownTo.length > 3 && (
                          <span className="text-xs text-zinc-500">
                            +{shownTo.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{s.timesShown}</td>
                  <td className="px-4 py-3 text-right">{s.timesInTop30}</td>
                  <td className="px-4 py-3 text-right">
                    {s.totalYes} / {s.totalNo}
                  </td>
                  <td className="px-4 py-3">
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
                  <td
                    className="px-4 py-3 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(s.concept.id)}
                        className="text-xs font-medium text-blue-700 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Delete concept "${s.concept.name}"? It will be removed from any sessions it's in.`
                            )
                          ) {
                            store.deleteConcept(s.concept.id);
                          }
                        }}
                        className="text-xs font-medium text-red-700 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {drillDownId && (
        <ConceptDetailModal
          concept={data.concepts.find((c) => c.id === drillDownId)!}
          customers={data.customers}
          sessions={data.sessions}
          votes={data.votes}
          onClose={() => setDrillDownId(null)}
          onEdit={() => {
            setEditingId(drillDownId);
            setDrillDownId(null);
          }}
        />
      )}

      {(creating || editingId) && (
        <ConceptModal
          id={editingId}
          customers={data.customers}
          initial={editingId ? data.concepts.find((c) => c.id === editingId) : undefined}
          onClose={() => {
            setCreating(false);
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}

function ConceptDetailModal({
  concept,
  customers,
  sessions,
  votes,
  onClose,
  onEdit,
}: {
  concept: import("@/lib/types").Concept;
  customers: import("@/lib/types").Customer[];
  sessions: import("@/lib/types").Session[];
  votes: import("@/lib/types").Vote[];
  onClose: () => void;
  onEdit: () => void;
}) {
  const customerResults = buildConceptCustomerResults(concept, sessions, votes, customers);
  const suppressedNames = concept.suppressedFor
    .map((id) => customers.find((c) => c.id === id)?.name)
    .filter(Boolean) as string[];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        {concept.imageUrl ? (
          <img
            src={concept.imageUrl}
            alt={concept.name}
            className="h-48 w-full rounded-t-xl object-cover"
          />
        ) : (
          <div className="flex h-48 w-full items-center justify-center rounded-t-xl bg-gradient-to-br from-zinc-100 to-zinc-200 text-zinc-400">
            <span className="text-sm">No image</span>
          </div>
        )}

        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-zinc-900">{concept.name}</h2>
              {concept.category && (
                <p className="mt-1 text-sm text-zinc-500">{concept.category}</p>
              )}
            </div>
            <button
              onClick={onEdit}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Edit
            </button>
          </div>

          {concept.description && (
            <p className="mt-3 text-sm text-zinc-700">{concept.description}</p>
          )}

          {suppressedNames.length > 0 && (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-900">
                Suppressed for:
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {suppressedNames.map((n) => (
                  <span
                    key={n}
                    className="rounded bg-amber-200 px-1.5 py-0.5 text-xs text-amber-900"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Customer scores */}
          <section className="mt-6">
            <h3 className="text-sm font-semibold text-zinc-700">
              Shown to {customerResults.length} customer
              {customerResults.length === 1 ? "" : "s"}
            </h3>
            {customerResults.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">
                Not shown in any session yet.
              </p>
            ) : (
              <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200">
                <table className="min-w-full divide-y divide-zinc-200 text-sm">
                  <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-3 py-2">Customer</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2 text-right">Yes</th>
                      <th className="px-3 py-2 text-right">No</th>
                      <th className="px-3 py-2 text-right">% Yes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {customerResults.map((cr) => {
                      const cust = customers.find((c) => c.id === cr.customerId);
                      return (
                        <tr key={`${cr.customerId}-${cr.sessionId}`}>
                          <td className="px-3 py-2 font-medium text-zinc-900">
                            {cust?.name ?? "(deleted)"}
                          </td>
                          <td className="px-3 py-2 text-zinc-700">{cr.sessionDate}</td>
                          <td className="px-3 py-2 text-right text-green-700">
                            {cr.yes}
                          </td>
                          <td className="px-3 py-2 text-right text-red-700">{cr.no}</td>
                          <td className="px-3 py-2 text-right">{cr.percentYes}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="flex justify-end border-t border-zinc-200 p-4">
          <button
            onClick={onClose}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ConceptModal({
  id,
  initial,
  customers,
  onClose,
}: {
  id: string | null;
  initial?: { name: string; description?: string; category?: string; imageUrl?: string; suppressedFor: string[] };
  customers: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [suppressedFor, setSuppressedFor] = useState<string[]>(initial?.suppressedFor ?? []);
  const [error, setError] = useState<string | null>(null);

  function toggleSuppression(cid: string) {
    setSuppressedFor((prev) =>
      prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]
    );
  }

  function save() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      suppressedFor,
    };
    if (id) store.updateConcept(id, payload);
    else store.createConcept(payload);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">{id ? "Edit concept" : "New concept"}</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600">
              Description (optional)
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600">
              Category (optional)
            </label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Sauces, Rubs, Glazes"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600">
              Image URL (optional)
            </label>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Paste a URL to an image. No upload UI in this POC.
            </p>
          </div>
          {customers.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-zinc-600">
                Suppressed for (won&apos;t show in new sessions for these customers)
              </label>
              <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-md border border-zinc-100 p-2">
                {customers.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={suppressedFor.includes(c.id)}
                      onChange={() => toggleSuppression(c.id)}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800">
              {error}
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
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