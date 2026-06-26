"use client";

// localStorage-backed store for the POC.
// Single namespaced key, schema-versioned. On corrupt data: log + reset to empty.

import { DataState, Session, Concept, Customer, Participant, Vote } from "./types";
import { seedIfEmpty } from "./seed";
import { buildDemoState } from "./demoData";

const STORAGE_KEY = "concept-voting:v2";

const empty: DataState = {
  schemaVersion: 2,
  concepts: [],
  customers: [],
  participants: [],
  sessions: [],
  votes: [],
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

// ---------- Snapshot cache ----------
//
// useSyncExternalStore requires getSnapshot to return a stable reference
// when the data hasn't changed. We hold a cached snapshot and only re-parse
// when something tells us storage changed (storage event, our own mutation).

let cachedSnapshot: DataState = empty;
let snapshotInitialized = false;

function readRaw(): DataState {
  if (!isBrowser()) return empty;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schemaVersion !== 2) {
      console.warn("[store] schema version mismatch — resetting");
      return empty;
    }
    if (
      !Array.isArray(parsed.concepts) ||
      !Array.isArray(parsed.customers) ||
      !Array.isArray(parsed.participants) ||
      !Array.isArray(parsed.sessions) ||
      !Array.isArray(parsed.votes)
    ) {
      console.warn("[store] corrupt shape — resetting");
      return empty;
    }
    return parsed as DataState;
  } catch (err) {
    console.warn("[store] failed to parse — resetting", err);
    return empty;
  }
}

/** Initialize the cache from localStorage. Called once on the client. */
function ensureSnapshot(): void {
  if (snapshotInitialized) return;
  cachedSnapshot = readRaw();
  // Seed once, if needed. writeRaw will update cachedSnapshot directly.
  const seeded = seedIfEmpty(cachedSnapshot);
  if (seeded !== cachedSnapshot) {
    writeRaw(seeded);
  } else {
    snapshotInitialized = true;
  }
}

/**
 * Read-side for useSyncExternalStore. Returns the same reference until
 * the store actually changes.
 */
export function getSnapshot(): DataState {
  ensureSnapshot();
  return cachedSnapshot;
}

function writeRaw(state: DataState): void {
  cachedSnapshot = state;
  snapshotInitialized = true;
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Fire a storage-like event so other tabs in the same browser can react.
    window.dispatchEvent(new CustomEvent("concept-voting:change"));
  } catch (err) {
    console.error("[store] failed to write", err);
  }
}

/** Force a fresh read from localStorage (e.g. on storage events). */
function refreshFromStorage(): void {
  cachedSnapshot = readRaw();
  snapshotInitialized = true;
}

/** Replace the entire state. Use sparingly — prefer the targeted helpers below. */
export function save(state: DataState): void {
  writeRaw(state);
}

// ---------- Helpers (id generation, mutations) ----------

export function newId(): string {
  // crypto.randomUUID is available in modern browsers and Node 19+.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Generate a 6-char uppercase alphanumeric join code, avoiding 0/O/1/I for readability. */
export function generateJoinCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 chars, no ambiguous
  let code = "";
  const bytes = new Uint8Array(6);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 6; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < 6; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}

// ---------- Subscriptions (cross-tab and same-tab reactivity) ----------

type Listener = () => void;
const listeners = new Set<Listener>();

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      refreshFromStorage();
      listeners.forEach((l) => l());
    }
  });
  window.addEventListener("concept-voting:change", () => {
    listeners.forEach((l) => l());
  });
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// ---------- Targeted mutations ----------

export const store = {
  // Sessions
  createSession(input: Omit<Session, "id" | "code" | "createdAt" | "status"> & { code?: string }): Session {
    const state = getSnapshot();
    const code = input.code ?? generateJoinCode();
    const existing = new Set(state.sessions.map((s) => s.code));
    let finalCode = code;
    while (existing.has(finalCode)) finalCode = generateJoinCode();
    const session: Session = {
      id: newId(),
      code: finalCode,
      customerId: input.customerId,
      date: input.date,
      conceptIds: input.conceptIds,
      status: "draft",
      yesCap: input.yesCap,
      createdAt: new Date().toISOString(),
    };
    writeRaw({ ...state, sessions: [...state.sessions, session] });
    return session;
  },

  updateSession(id: string, patch: Partial<Session>): Session | null {
    const state = getSnapshot();
    const idx = state.sessions.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    const updated = { ...state.sessions[idx], ...patch };
    const sessions = [...state.sessions];
    sessions[idx] = updated;
    writeRaw({ ...state, sessions });
    return updated;
  },

  deleteSession(id: string): void {
    const state = getSnapshot();
    writeRaw({
      ...state,
      sessions: state.sessions.filter((s) => s.id !== id),
      votes: state.votes.filter((v) => v.sessionId !== id),
    });
  },

  findSessionByCode(code: string): Session | null {
    const state = getSnapshot();
    return state.sessions.find((s) => s.code === code.toUpperCase()) ?? null;
  },

  // Concepts
  createConcept(input: Omit<Concept, "id" | "createdAt" | "suppressedFor"> & { suppressedFor?: string[] }): Concept {
    const state = getSnapshot();
    const concept: Concept = {
      id: newId(),
      name: input.name,
      description: input.description,
      category: input.category,
      imageUrl: input.imageUrl,
      suppressedFor: input.suppressedFor ?? [],
      createdAt: new Date().toISOString(),
    };
    writeRaw({ ...state, concepts: [...state.concepts, concept] });
    return concept;
  },

  updateConcept(id: string, patch: Partial<Concept>): Concept | null {
    const state = getSnapshot();
    const idx = state.concepts.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const updated = { ...state.concepts[idx], ...patch };
    const concepts = [...state.concepts];
    concepts[idx] = updated;
    writeRaw({ ...state, concepts });
    return updated;
  },

  deleteConcept(id: string): void {
    const state = getSnapshot();
    writeRaw({
      ...state,
      concepts: state.concepts.filter((c) => c.id !== id),
      sessions: state.sessions.map((s) => ({
        ...s,
        conceptIds: s.conceptIds.filter((cid) => cid !== id),
      })),
      votes: state.votes.filter((v) => v.conceptId !== id),
    });
  },

  // Customers
  createCustomer(name: string): Customer {
    const state = getSnapshot();
    const customer: Customer = { id: newId(), name, createdAt: new Date().toISOString() };
    writeRaw({ ...state, customers: [...state.customers, customer] });
    return customer;
  },

  // Participants
  createParticipant(alias: string): Participant {
    const state = getSnapshot();
    const participant: Participant = { id: newId(), alias, createdAt: new Date().toISOString() };
    writeRaw({ ...state, participants: [...state.participants, participant] });
    return participant;
  },

  // Votes
  castVote(sessionId: string, participantId: string, conceptId: string, value: "yes" | "no"): void {
    const state = getSnapshot();
    const others = state.votes.filter(
      (v) => !(v.sessionId === sessionId && v.participantId === participantId && v.conceptId === conceptId)
    );
    const vote: Vote = {
      sessionId,
      participantId,
      conceptId,
      value,
      votedAt: new Date().toISOString(),
    };
    writeRaw({ ...state, votes: [...others, vote] });
  },

  clearVote(sessionId: string, participantId: string, conceptId: string): void {
    const state = getSnapshot();
    writeRaw({
      ...state,
      votes: state.votes.filter(
        (v) => !(v.sessionId === sessionId && v.participantId === participantId && v.conceptId === conceptId)
      ),
    });
  },

  /** Wipe all data. Used by the export/import feature for a "reset" button. */
  resetAll(): void {
    writeRaw(empty);
  },

  /**
   * Load the demo dataset (5 customers, 60 concepts, 6 sessions with votes).
   * Idempotent: refuses if any sessions already exist.
   * Returns the resulting state on success, or throws on failure.
   */
  loadDemoData(): DataState {
    const state = getSnapshot();
    if (state.sessions.length > 0) {
      throw new Error(
        "Demo data can only be loaded when there are no sessions yet. Reset data first."
      );
    }
    const demo = buildDemoState();
    writeRaw(demo);
    return demo;
  },

  /**
   * Create many concepts at once (used by the bulk-paste flow).
   * Returns the list of created concepts (with their new ids).
   */
  bulkCreateConcepts(
    inputs: Array<{ name: string; category?: string; description?: string; imageUrl?: string }>
  ): Concept[] {
    const state = getSnapshot();
    const createdAt = new Date().toISOString();
    const newConcepts: Concept[] = inputs.map((input) => ({
      id: newId(),
      name: input.name,
      category: input.category,
      description: input.description,
      imageUrl: input.imageUrl,
      suppressedFor: [],
      createdAt,
    }));
    writeRaw({ ...state, concepts: [...state.concepts, ...newConcepts] });
    return newConcepts;
  },
};