"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import type { AnalysisSession, UXAnalysisResult } from "@/types";

interface AnalysisContextType {
  currentSession: AnalysisSession | null;
  setSession: (session: AnalysisSession) => void;
  updateResult: (result: UXAnalysisResult) => void;
  clearSession: () => void;
  clearAll: () => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

const SESSION_KEY = "optiux-current-session";

interface StoreState {
  session: AnalysisSession | null;
}

function getInitialState(): StoreState {
  if (typeof window === "undefined") return { session: null };
  try {
    const session = localStorage.getItem(SESSION_KEY);
    return {
      session: session ? JSON.parse(session) : null,
    };
  } catch {
    return { session: null };
  }
}

const SERVER_SNAPSHOT: StoreState = { session: null };

let currentState = getInitialState();
let listeners: Array<() => void> = [];

function emitChange() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): StoreState {
  return currentState;
}

function updateStore(partial: Partial<StoreState>) {
  currentState = { ...currentState, ...partial };
  emitChange();
}

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);

  const setSession = useCallback((session: AnalysisSession) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    updateStore({ session });
  }, []);

  const updateResult = useCallback((result: UXAnalysisResult) => {
    const prev = currentState.session;
    if (!prev) return;
    const updated = { ...prev, result };
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    updateStore({ session: updated });
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    updateStore({ session: null });
  }, []);

  const clearAll = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    updateStore({ session: null });
  }, []);

  return (
    <AnalysisContext.Provider
      value={{
        currentSession: state.session,
        setSession,
        updateResult,
        clearSession,
        clearAll,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error("useAnalysis must be used within an AnalysisProvider");
  }
  return context;
}
