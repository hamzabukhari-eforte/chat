"use client";

import { useEffect, useState } from "react";

export type Role = "agent" | "customer";

export interface AuthUser {
  id: string;
  name: string;
  role: Role;
}

const STORAGE_KEY = "chat-demo-auth";

function safeGetStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    const storage = safeGetStorage();
    if (!storage) {
      setInitialised(true);
      return;
    }
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AuthUser;
        if (parsed?.name && parsed?.role) {
          setUser(parsed);
        }
      } catch {
        storage.removeItem(STORAGE_KEY);
      }
    }
    setInitialised(true);
  }, []);

  const login = (name: string, role: Role) => {
    const storage = safeGetStorage();
    const authUser: AuthUser = {
      id: crypto.randomUUID(),
      name: name.trim(),
      role,
    };
    setUser(authUser);
    if (storage) {
      storage.setItem(STORAGE_KEY, JSON.stringify(authUser));
    }
  };

  const logout = () => {
    const storage = safeGetStorage();
    setUser(null);
    if (storage) {
      storage.removeItem(STORAGE_KEY);
    }
  };

  return {
    user,
    loading: !initialised,
    login,
    logout,
  };
}

