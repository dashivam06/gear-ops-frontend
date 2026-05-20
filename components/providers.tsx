"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { useAuthStore } from "@/lib/store/auth-store";
import { useCurrencyStore } from "@/lib/store/currency-store";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const hydrateAuth = useAuthStore((state) => state.hydrateFromStorage);
  const hydrateCurrency = useCurrencyStore((state) => state.hydrateFromStorage);

  useEffect(() => {
    hydrateAuth();
    hydrateCurrency();
  }, [hydrateAuth, hydrateCurrency]);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
