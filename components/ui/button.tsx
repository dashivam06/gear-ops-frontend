import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline";
}

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 w-full items-center justify-center rounded-lg border text-sm font-medium transition",
        variant === "primary"
          ? "border-zinc-950 bg-zinc-950 text-white hover:bg-zinc-800"
          : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}
