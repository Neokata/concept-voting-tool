// Core data model for the Concept Voting POC.
// All entities live in a single localStorage blob, schema-versioned in lib/store.ts.
// Schema version 2: added imageUrl on Concept, yesCap on Session.

export type Concept = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  // Customer ids this concept should be hidden from in new sessions.
  suppressedFor: string[];
  createdAt: string; // ISO
};

export type Customer = {
  id: string;
  name: string;
  createdAt: string;
};

export type Participant = {
  id: string;
  alias: string;
  createdAt: string;
};

export type SessionStatus = "draft" | "open" | "closed";

export type Session = {
  id: string;
  // Short human-typeable join code, e.g. "Q3F7K2".
  code: string;
  customerId: string;
  date: string; // ISO date (yyyy-mm-dd)
  conceptIds: string[]; // ordered list of concepts shown in this session
  status: SessionStatus;
  // Max number of "Yes" votes each participant is allowed in this session.
  yesCap: number;
  createdAt: string;
};

export type Vote = {
  sessionId: string;
  participantId: string;
  conceptId: string;
  value: "yes" | "no";
  votedAt: string;
};

export type DataState = {
  schemaVersion: 2;
  concepts: Concept[];
  customers: Customer[];
  participants: Participant[];
  sessions: Session[];
  votes: Vote[];
};

// Fallback when a session record predates the yesCap field.
// We default to 10 because that's the most common case we'll see in demo data.
export const DEFAULT_YES_CAP = 10;