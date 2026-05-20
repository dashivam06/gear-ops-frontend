import { create } from "zustand";

type Currency = "USD" | "NPR"; // USD ($), NPR (Rs.)

interface CurrencyState {
  currency: Currency;
  hasHydrated: boolean;
  setCurrency: (currency: Currency) => void;
  hydrateFromStorage: () => void;
}

export const useCurrencyStore = create<CurrencyState>((set) => ({
  currency: "USD",
  hasHydrated: false,
  setCurrency: (currency) => {
    set({ currency });
    if (typeof window !== "undefined") {
      window.localStorage.setItem("currency", currency);
    }
  },
  hydrateFromStorage: () => {
    if (typeof window === "undefined") return;
    const currency = (window.localStorage.getItem("currency") as Currency) || "USD";
    set({ currency, hasHydrated: true });
  },
}));
