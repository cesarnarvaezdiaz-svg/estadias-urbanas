import * as SecureStore from "expo-secure-store";
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

const FAVORITES_KEY = "estadias_urbanas.favorite_properties";
const CURRENCY_KEY = "estadias_urbanas.currency";

export type CurrencyCode = "USD" | "EUR" | "CLP" | "MXN" | "COP";
const currencyRates: Record<CurrencyCode, number> = { USD: 1, EUR: 0.92, CLP: 950, MXN: 17, COP: 4050 };
const currencyLocales: Record<CurrencyCode, string> = { USD: "en-US", EUR: "es-ES", CLP: "es-CL", MXN: "es-MX", COP: "es-CO" };

type AppPreferencesValue = {
  favoriteIds: string[];
  loaded: boolean;
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => Promise<void>;
  formatPrice: (priceUsd: number) => string;
  isFavorite: (propertyId: string) => boolean;
  toggleFavorite: (propertyId: string) => Promise<void>;
};

const AppPreferencesContext = createContext<AppPreferencesValue | null>(null);

export function AppPreferencesProvider({ children }: PropsWithChildren) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");

  useEffect(() => {
    Promise.all([SecureStore.getItemAsync(FAVORITES_KEY), SecureStore.getItemAsync(CURRENCY_KEY)])
      .then(([storedFavorites, storedCurrency]) => {
        if (storedFavorites) {
          const parsed = JSON.parse(storedFavorites) as unknown;
          if (Array.isArray(parsed)) setFavoriteIds(parsed.filter((value): value is string => typeof value === "string"));
        }
        if (storedCurrency && storedCurrency in currencyRates) setCurrencyState(storedCurrency as CurrencyCode);
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const toggleFavorite = useCallback(async (propertyId: string) => {
    let next: string[] = [];
    setFavoriteIds((current) => {
      next = current.includes(propertyId)
        ? current.filter((id) => id !== propertyId)
        : [...current, propertyId];
      return next;
    });
    await SecureStore.setItemAsync(FAVORITES_KEY, JSON.stringify(next));
  }, []);

  const value = useMemo<AppPreferencesValue>(() => ({
    favoriteIds,
    loaded,
    currency,
    async setCurrency(nextCurrency) {
      setCurrencyState(nextCurrency);
      await SecureStore.setItemAsync(CURRENCY_KEY, nextCurrency);
    },
    formatPrice(priceUsd) {
      return new Intl.NumberFormat(currencyLocales[currency], { style: "currency", currency, maximumFractionDigits: 0 })
        .format(priceUsd * currencyRates[currency]);
    },
    isFavorite: (propertyId) => favoriteIds.includes(propertyId),
    toggleFavorite,
  }), [currency, favoriteIds, loaded, toggleFavorite]);

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences() {
  const value = useContext(AppPreferencesContext);
  if (!value) throw new Error("useAppPreferences debe usarse dentro de AppPreferencesProvider");
  return value;
}
