"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/hooks";
import { store } from "@/lib/store";
import { buildConceptStats } from "@/lib/voting";

export default function ConceptsPage() {
  const data = useStore();
  const stats = useMemo(
    () => buildConceptStats(data.concepts, data.sessions, data.votes),
    [data.concepts, data.sessions, data.votes]
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/admin" className="text-sm text-zinc-500 hover:underline">
        ← Back to admin
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Concepts ({data.concepts.length})</h1>
        <button
          onClick={() => setCreating(true)}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          + New concept
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Shown</th>
              <th className="px-4 py-3 text-right">In top 30</th>
              <th className="px-4 py-3 text-right">Yes / No</th>
              <th className="px-4 py-3">Suppressed for</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {stats.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                  No concepts yet. Click <strong>+ New concept</strong>.
                </td>
              </tr>
            )}
            {stats.map((s) => {
              const suppressedNames = s.concept.suppressedFor
                .map((id) => data.customers.find((c) => c.id === id)?.name)
                .filter(Boolean) as string[];
              return (
                <tr key={s.concept.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {s.concept.name}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{s.concept.category ?? "—"}</td>
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
                  <td className="px-4 py-3 text-right">
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

function ConceptModal({
  id,
  initial,
  customers,
  onClose,
}: {
  id: string | null;
  initial?: { name: string; description?: string; category?: string; suppressedFor: string[] };
  customers: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
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