import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

interface AuthCardProps {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}

export function AuthCard({ title, description, children, className }: AuthCardProps) {
  return (
    <div className={cn("w-full max-w-md rounded-xl border border-zinc-200 bg-white p-4", className)}>
      <div className="mb-4 space-y-1">
        <h1 className="text-xl font-semibold text-zinc-950">{title}</h1>
        <p className="text-sm text-zinc-600">{description}</p>
      </div>
      {children}
    </div>
  );
}
