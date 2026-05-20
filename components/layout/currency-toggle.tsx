"use client";

import { useEffect, useState } from "react";
import { useCurrencyStore } from "@/lib/store/currency-store";

export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrencyStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="mb-4 flex items-center justify-between rounded-xl border border-zinc-850 bg-zinc-900/40 p-2 text-xs">
      <span className="pl-1.5 font-semibold text-zinc-400">Currency</span>
      <div className="flex rounded-lg bg-zinc-950 p-0.5 border border-zinc-800">
        <button
          type="button"
          onClick={() => setCurrency("NPR")}
          className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
            currency === "NPR"
              ? "bg-zinc-800 text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Rs.
        </button>
        <button
          type="button"
          onClick={() => setCurrency("USD")}
          className={`rounded-md px-2.5 py-1 font-semibold transition-all ${
            currency === "USD"
              ? "bg-zinc-800 text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          $
        </button>
      </div>
    </div>
  );
}
