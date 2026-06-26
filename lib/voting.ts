"use client";

// Pure helpers: aggregation, sort, filter. No I/O.

import { Concept, Customer, Session, Vote } from "./types";
import { DEFAULT_YES_CAP } from "./types";

export type ConceptResult = {
  concept: Concept;
  yes: number;
  no: number;
  total: number;
  percentYes: number; // 0..100
};

/** Aggregate votes for a single session, returning one row per concept. */
export function aggregateSession(votes: Vote[], concepts: Concept[]): ConceptResult[] {
  const tally = new Map<string, { yes: number; no: number }>();
  for (const v of votes) {
    const cur = tally.get(v.conceptId) ?? { yes: 0, no: 0 };
    if (v.value === "yes") cur.yes += 1;
    else cur.no += 1;
    tally.set(v.conceptId, cur);
  }
  return concepts.map((c) => {
    const t = tally.get(c.id) ?? { yes: 0, no: 0 };
    const total = t.yes + t.no;
    return {
      concept: c,
      yes: t.yes,
      no: t.no,
      total,
      percentYes: total === 0 ? 0 : Math.round((t.yes / total) * 100),
    };
  });
}

/** Sort results: yes desc, no asc, then alphabetical. */
export function sortResults(results: ConceptResult[]): ConceptResult[] {
  return [...results].sort((a, b) => {
    if (b.yes !== a.yes) return b.yes - a.yes;
    if (a.no !== b.no) return a.no - b.no;
    return a.concept.name.localeCompare(b.concept.name);
  });
}

export function topN(results: ConceptResult[], n: number): ConceptResult[] {
  return sortResults(results).slice(0, n);
}

/** A participant's votes for a given session, keyed by conceptId. */
export function votesByParticipant(
  votes: Vote[],
  sessionId: string,
  participantId: string
): Map<string, "yes" | "no"> {
  const map = new Map<string, "yes" | "no">();
  for (const v of votes) {
    if (v.sessionId === sessionId && v.participantId === participantId) {
      map.set(v.conceptId, v.value);
    }
  }
  return map;
}

export function countYes(participantVotes: Map<string, "yes" | "no">): number {
  let n = 0;
  for (const v of participantVotes.values()) if (v === "yes") n++;
  return n;
}

export function remainingYes(participantVotes: Map<string, "yes" | "no">, cap: number = DEFAULT_YES_CAP): number {
  return Math.max(0, cap - countYes(participantVotes));
}

// ---------- Filter / sort for admin views ----------

export type SessionFilters = {
  search?: string; // matches customer name (case-insensitive)
  status?: Session["status"] | "all";
  sortBy?: "date" | "participants" | "yesVotes";
  sortDir?: "asc" | "desc";
};

export type SessionRow = {
  session: Session;
  customer: Customer | null;
  participantCount: number;
  totalYes: number;
  totalNo: number;
  conceptCount: number;
};

export function buildSessionRows(
  sessions: Session[],
  customers: Customer[],
  votes: Vote[]
): SessionRow[] {
  const customersById = new Map(customers.map((c) => [c.id, c]));
  return sessions.map((session) => {
    const sessionVotes = votes.filter((v) => v.sessionId === session.id);
    const participants = new Set(sessionVotes.map((v) => v.participantId));
    const totalYes = sessionVotes.filter((v) => v.value === "yes").length;
    const totalNo = sessionVotes.filter((v) => v.value === "no").length;
    return {
      session,
      customer: customersById.get(session.customerId) ?? null,
      participantCount: participants.size,
      totalYes,
      totalNo,
      conceptCount: session.conceptIds.length,
    };
  });
}

export function filterAndSortRows(rows: SessionRow[], f: SessionFilters): SessionRow[] {
  let out = rows;
  if (f.search && f.search.trim()) {
    const q = f.search.toLowerCase();
    out = out.filter((r) => (r.customer?.name ?? "").toLowerCase().includes(q));
  }
  if (f.status && f.status !== "all") {
    out = out.filter((r) => r.session.status === f.status);
  }
  const dir = f.sortDir === "asc" ? 1 : -1;
  const key = f.sortBy ?? "date";
  out = [...out].sort((a, b) => {
    let av: number | string;
    let bv: number | string;
    switch (key) {
      case "participants":
        av = a.participantCount; bv = b.participantCount; break;
      case "yesVotes":
        av = a.totalYes; bv = b.totalYes; break;
      default:
        av = a.session.date; bv = b.session.date;
    }
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
  return out;
}

// ---------- Concept library analytics ----------

export type ConceptStats = {
  concept: Concept;
  timesShown: number; // # sessions it appeared in
  timesInTop30: number; // # sessions where it landed in top 30
  totalYes: number;
  totalNo: number;
};

export function buildConceptStats(
  concepts: Concept[],
  sessions: Session[],
  votes: Vote[]
): ConceptStats[] {
  return concepts.map((concept) => {
    const appearances = sessions.filter((s) => s.conceptIds.includes(concept.id));
    let inTop = 0;
    let yes = 0;
    let no = 0;
    for (const session of appearances) {
      const sessionConcepts = session.conceptIds
        .map((id) => concepts.find((c) => c.id === id))
        .filter((c): c is Concept => Boolean(c));
      const sessionVotes = votes.filter((v) => v.sessionId === session.id);
      const results = sortResults(aggregateSession(sessionVotes, sessionConcepts));
      const top30 = results.slice(0, 30);
      if (top30.some((r) => r.concept.id === concept.id)) inTop += 1;
      for (const v of sessionVotes) {
        if (v.conceptId !== concept.id) continue;
        if (v.value === "yes") yes += 1;
        else no += 1;
      }
    }
    return {
      concept,
      timesShown: appearances.length,
      timesInTop30: inTop,
      totalYes: yes,
      totalNo: no,
    };
  });
}

/** Generate a 6-character join code. Re-export from store for convenience. */
export { generateJoinCode } from "./store";
