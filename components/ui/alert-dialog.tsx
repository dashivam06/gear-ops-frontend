"use client";

import { createContext, useContext } from "react";

import { cn } from "@/lib/utils";

type AlertDialogCtx = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const AlertDialogContext = createContext<AlertDialogCtx | null>(null);

function useAlertDialog() {
  const ctx = useContext(AlertDialogContext);
  if (!ctx) throw new Error("AlertDialog components must be used within AlertDialog");
  return ctx;
}

export function AlertDialog({
  open,
  onOpenChange,
  children
}: {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <AlertDialogContext.Provider
      value={{
        open,
        setOpen: (next) => onOpenChange?.(next)
      }}
    >
      {children}
    </AlertDialogContext.Provider>
  );
}

export function AlertDialogContent({
  className,
  size,
  children
}: {
  className?: string;
  size?: "default" | "sm" | "lg";
  children: React.ReactNode;
}) {
  const { open, setOpen } = useAlertDialog();
  if (!open) return null;
  return (
    <>
      <div 
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" 
        onClick={() => setOpen(false)} 
      />
      <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-zinc-200 bg-white p-6 shadow-lg duration-200 sm:rounded-lg md:w-full">
        <div
          role="alertdialog"
          aria-modal="true"
          className={className}
          data-size={size}
        >
          {children}
        </div>
      </div>
    </>
  );
}

export function AlertDialogHeader({
  className = "flex flex-col space-y-2 text-center sm:text-left",
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={className}>{children}</div>;
}

export function AlertDialogFooter({
  className = "mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3",
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={className}>{children}</div>;
}

export function AlertDialogTitle({
  className = "text-lg font-semibold",
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <h2 className={className}>{children}</h2>;
}

export function AlertDialogDescription({
  className = "text-sm text-zinc-500",
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <p className={className}>{children}</p>;
}

export function AlertDialogMedia({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={className}>{children}</div>;
}

const alertDialogActionBase =
  "inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-md px-5 py-2.5 text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-transparent bg-red-600 text-white hover:bg-red-700";

export function AlertDialogAction({
  className,
  onClick,
  children,
  disabled
}: {
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { setOpen } = useAlertDialog();
  return (
    <button
      type="button"
      className={cn(alertDialogActionBase, className)}
      disabled={disabled}
      onClick={(e) => {
        onClick?.(e);
        setOpen(false);
      }}
    >
      {children}
    </button>
  );
}

const alertDialogCancelBase =
  "mt-2 inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-md border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 ring-offset-white transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 sm:mt-0";

export function AlertDialogCancel({
  className,
  onClick,
  children,
  disabled
}: {
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { setOpen } = useAlertDialog();
  return (
    <button
      type="button"
      className={cn(alertDialogCancelBase, className)}
      disabled={disabled}
      onClick={() => {
        onClick?.();
        setOpen(false);
      }}
    >
      {children}
    </button>
  );
}
