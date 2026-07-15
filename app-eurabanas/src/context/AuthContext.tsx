import * as SecureStore from "expo-secure-store";
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { User } from "@/types";

const TOKEN_KEY = "estadias_urbanas.mobile_token";
const USER_KEY = "estadias_urbanas.mobile_user";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone: string) => Promise<void>;
  completeOAuth: (provider: "google" | "apple" | "facebook", data: Record<string, string>) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function persistSession(token: string, user: User) {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, token),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
  ]);
}

async function clearSession() {
  await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(USER_KEY)]);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const acceptSession = useCallback(async (nextToken: string, nextUser: User) => {
    await persistSession(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const refresh = useCallback(async () => {
    const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
    const storedUser = await SecureStore.getItemAsync(USER_KEY);
    if (!storedToken) {
      setToken(null);
      setUser(null);
      return;
    }

    try {
      const result = await api.me(storedToken);
      setToken(storedToken);
      setUser(result.user);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(result.user));
    } catch {
      if (storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser) as User);
          return;
        } catch {
          // Invalid cached user; clear below.
        }
      }
      await clearSession();
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    loading,
    async login(email, password) {
      const result = await api.login(email.trim().toLowerCase(), password);
      await acceptSession(result.token, result.user);
    },
    async register(name, email, password, phone) {
      const result = await api.register(name.trim(), email.trim().toLowerCase(), password, phone.trim());
      await acceptSession(result.token, result.user);
    },
    async completeOAuth(provider, data) {
      const result = await api.oauth(provider, data);
      await acceptSession(result.token, result.user);
    },
    async logout() {
      const currentToken = token;
      await clearSession();
      setToken(null);
      setUser(null);
      if (currentToken) await api.logout(currentToken).catch(() => undefined);
    },
    refresh,
  }), [acceptSession, loading, refresh, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return value;
}
