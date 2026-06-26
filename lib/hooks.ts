"use client";

// React hook that subscribes a component to the localStorage-backed store.
// Re-renders whenever data changes in this tab or another.

import { useSyncExternalStore } from "react";
import { getSnapshot, subscribe } from "./store";
import { DataState } from "./types";

const SERVER_SNAPSHOT: DataState = {
  schemaVersion: 2,
  concepts: [],
  customers: [],
  participants: [],
  sessions: [],
  votes: [],
};

export function useStore(): DataState {
  return useSyncExternalStore(
    (cb) => subscribe(cb),
    () => getSnapshot(),
    () => SERVER_SNAPSHOT
  );
}