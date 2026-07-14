import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { AccountSummary } from "@/types";

export function useAccount() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) {
      setSummary(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setSummary(await api.account(token));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar tu cuenta.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { summary, loading, error, refresh };
}
