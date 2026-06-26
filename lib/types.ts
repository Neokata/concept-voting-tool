// Core data model for the Concept Voting POC.
// All entities live in a single localStorage blob, schema-versioned in lib/store.ts.

export type Concept = {
  id: string;
  name: string;
  description?: string;
  category?: string;
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
  schemaVersion: 1;
  concepts: Concept[];
  customers: Customer[];
  participants: Participant[];
  sessions: Session[];
  votes: Vote[];
};

export const MAX_YES_PER_PARTICIPANT = 30;
