"use client";

// Helpers for rendering customer/customer-name artifacts.

import type { Customer } from "./types";

/** First letter(s) of a customer name for an avatar. */
export function customerInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Stable background color for a customer avatar, picked from a small palette
 * by hashing the customer id. Same id always yields the same color.
 */
export function customerColor(id: string): string {
  // Hash the id to an index 0..7
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  const palette = [
    "bg-brand-wine",
    "bg-amber-600",
    "bg-emerald-700",
    "bg-sky-700",
    "bg-violet-700",
    "bg-rose-700",
    "bg-teal-700",
    "bg-slate-700",
  ];
  return palette[Math.abs(h) % palette.length];
}

/** Render an inline avatar with the customer's initials. */
export function CustomerAvatar({
  customer,
  size = "md",
}: {
  customer: Pick<Customer, "id" | "name">;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm";
  return (
    <div className={`avatar ${customerColor(customer.id)} ${dim}`}>
      {customerInitials(customer.name)}
    </div>
  );
}

/** "5 months ago" / "yesterday" / "in 3 days" relative time. */
export function relativeDate(iso: string): string {
  const then = new Date(iso + "T00:00:00").getTime();
  const now = new Date().getTime();
  const ms = now - then;
  const day = 24 * 60 * 60 * 1000;
  const days = Math.round(ms / day);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days > 1 && days < 7) return `${days} days ago`;
  if (days >= 7 && days < 30) return `${Math.round(days / 7)} weeks ago`;
  if (days >= 30 && days < 365) return `${Math.round(days / 30)} months ago`;
  return `${Math.round(days / 365)} years ago`;
}

/** "Jan 15, 2025" — long-form. */
export function longDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}