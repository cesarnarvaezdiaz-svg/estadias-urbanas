import { useCallback, useEffect, useState } from "react";

import { fallbackProperties } from "@/data/catalog";
import { api } from "@/lib/api";
import { Property } from "@/types";

export function useCatalog() {
  const [properties, setProperties] = useState<Property[]>(fallbackProperties);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.properties();
      setProperties(result.length ? result : fallbackProperties);
      setUsingFallback(false);
    } catch {
      setProperties(fallbackProperties);
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { properties, loading, usingFallback, refresh };
}
