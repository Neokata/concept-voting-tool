"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/hooks";
import { store } from "@/lib/store";
import { CustomerAvatar, relativeDate } from "@/lib/display";

export default function CustomersPage() {
  const data = useStore();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Per-customer summary stats
  const summaries = useMemo(() => {
    return data.customers
      .map((customer) => {
        const customerSessions = data.sessions.filter(
          (s) => s.customerId === customer.id
        );
        const customerSessionIds = new Set(customerSessions.map((s) => s.id));
        const customerVotes = data.votes.filter((v) =>
          customerSessionIds.has(v.sessionId)
        );
        const yes = customerVotes.filter((v) => v.value === "yes").length;
        const no = customerVotes.filter((v) => v.value === "no").length;
        const lastSession = customerSessions
          .map((s) => s.date)
          .sort()
          .reverse()[0];
        return {
          customer,
          sessionCount: customerSessions.length,
          lastSessionDate: lastSession ?? null,
          totalYes: yes,
          totalNo: no,
        };
      })
      .sort((a, b) => b.sessionCount - a.sessionCount);
  }, [data.customers, data.sessions, data.votes]);

  function createCustomer(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    const name = newName.trim();
    if (!name) {
      setCreateError("Customer name is required.");
      return;
    }
    const c = store.createCustomer(name);
    setNewName("");
    setCreating(false);
    // Navigate to the new customer's detail page.
    window.location.href = `/admin/customers/${c.id}`;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-heading">Customers</h1>
          <p className="page-subheading">
            {data.customers.length === 0
              ? "Add a customer to start tracking their sessions."
              : `${data.customers.length} customer${data.customers.length === 1 ? "" : "s"} in your library`}
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="btn-primary"
        >
          + New customer
        </button>
      </div>

      {summaries.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">No customers yet</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Click <strong>+ New customer</strong> or load demo data from the Sessions tab.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((s) => (
            <Link
              key={s.customer.id}
              href={`/admin/customers/${s.customer.id}`}
              className="group card p-4 transition hover:border-zinc-400 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <CustomerAvatar customer={s.customer} size="md" />
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-zinc-900">
                    {s.customer.name}
                  </div>
                  <div
                    className="text-xs text-zinc-500"
                    title={
                      s.lastSessionDate ? `Last session: ${s.lastSessionDate}` : ""
                    }
                  >
                    {s.lastSessionDate
                      ? `Last seen ${relativeDate(s.lastSessionDate)}`
                      : "No sessions yet"}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-zinc-500">Sessions</div>
                  <div className="text-sm font-semibold text-zinc-900">
                    {s.sessionCount}
                  </div>
                </div>
                <div>
                  <div className="text-zinc-500">Yes / No</div>
                  <div className="text-sm font-semibold text-zinc-900">
                    {s.totalYes} / {s.totalNo}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-400 group-hover:text-brand-wine">
                View results →
              </p>
            </Link>
          ))}
        </div>
      )}

      {creating && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            setCreating(false);
            setNewName("");
            setCreateError(null);
          }}
        >
          <form
            onSubmit={createCustomer}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">New customer</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600">Name</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Costco"
                  autoFocus
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
                />
              </div>
              {createError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800">
                  {createError}
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setNewName("");
                  setCreateError(null);
                }}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                Create &amp; view
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}