import { cn } from "@/lib/utils";
import { type InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function FormField({ label, error, className, id, ...props }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-zinc-900">
        {label}
      </label>
      <input
        id={id}
        className={cn(
          "h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition",
          "placeholder:text-zinc-400 focus:border-zinc-400",
          className
        )}
        {...props}
      />
      {error ? <p className="text-xs text-zinc-700">{error}</p> : null}
    </div>
  );
}
