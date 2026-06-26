"use client";

// React hook that subscribes a component to the localStorage-backed store.
// Re-renders whenever data changes in this tab or another.

import { useSyncExternalStore } from "react";
import { load, subscribe } from "./store";
import { DataState } from "./types";

const SERVER_SNAPSHOT: DataState = {
  schemaVersion: 1,
  concepts: [],
  customers: [],
  participants: [],
  sessions: [],
  votes: [],
};

export function useStore(): DataState {
  // useSyncExternalStore gives us a clean SSR-safe pattern:
  //  - getServerSnapshot returns the empty state during SSR
  //  - getSnapshot returns the current localStorage state on the client
  //  - subscribe wires up cross-tab and same-tab updates
  return useSyncExternalStore(
    (cb) => subscribe(cb),
    () => load(),
    () => SERVER_SNAPSHOT
  );
}
