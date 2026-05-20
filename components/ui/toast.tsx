"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type AddToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastContextValue = {
  addToast: (opts: AddToastOptions) => void;
  removeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (opts: AddToastOptions) => {
      const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? (crypto as any).randomUUID() : String(Date.now());
      const toast: Toast = {
        id,
        title: opts.title,
        description: opts.description,
        variant: opts.variant ?? "info"
      };
      setToasts((prev) => [...prev, toast]);
      const duration = opts.duration ?? 3000;
      setTimeout(() => removeToast(id), duration);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="max-w-sm w-full flex items-start gap-3 rounded-md border bg-white p-3 shadow"
            role="status"
          >
            <div className="mt-0.5">
              {t.variant === "success" ? (
                <CheckCircle className="text-green-600 size-5" />
              ) : t.variant === "error" ? (
                <AlertCircle className="text-red-600 size-5" />
              ) : (
                <Info className="text-sky-600 size-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm text-zinc-900">{t.title}</div>
              {t.description && <div className="text-xs text-zinc-600 mt-1">{t.description}</div>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="ml-2 text-zinc-400 hover:text-zinc-600"
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
