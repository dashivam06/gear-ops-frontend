"use client";

import { createContext, useContext } from "react";

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
  const { open } = useAlertDialog();
  if (!open) return null;
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className={className}
      data-size={size}
    >
      {children}
    </div>
  );
}

export function AlertDialogHeader({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={className}>{children}</div>;
}

export function AlertDialogFooter({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={className}>{children}</div>;
}

export function AlertDialogTitle({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <h2 className={className}>{children}</h2>;
}

export function AlertDialogDescription({
  className,
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

export function AlertDialogAction({
  className,
  onClick,
  children
}: {
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const { setOpen } = useAlertDialog();
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        onClick?.();
        setOpen(false);
      }}
    >
      {children}
    </button>
  );
}

