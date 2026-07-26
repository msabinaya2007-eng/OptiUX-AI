"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

interface User {
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  signIn: (email: string) => Promise<boolean>;
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "optiux-auth";
const USERS_STORAGE_KEY = "optiux-users";

function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

let currentUser = getStoredUser();
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

function getSnapshot() {
  return currentUser;
}

function setUserState(user: User | null) {
  currentUser = user;
  emitChange();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const user = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const signIn = useCallback(async (email: string): Promise<boolean> => {
    try {
      const usersRaw = localStorage.getItem(USERS_STORAGE_KEY);
      const users: Record<string, { name: string; password: string }> = usersRaw
        ? JSON.parse(usersRaw)
        : {};

      const stored = users[email.toLowerCase()];
      if (!stored) return false;

      const newUser: User = { email: email.toLowerCase(), name: stored.name };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
      setUserState(newUser);
      return true;
    } catch {
      return false;
    }
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const usersRaw = localStorage.getItem(USERS_STORAGE_KEY);
      const users: Record<string, { name: string; password: string }> = usersRaw
        ? JSON.parse(usersRaw)
        : {};

      if (users[email.toLowerCase()]) return false;

      users[email.toLowerCase()] = { name, password };
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

      const newUser: User = { email: email.toLowerCase(), name };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
      setUserState(newUser);
      return true;
    } catch {
      return false;
    }
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUserState(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
