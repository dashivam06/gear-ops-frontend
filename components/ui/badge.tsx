import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "danger"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2",
        {
          "border-transparent bg-zinc-900 text-zinc-50": variant === "default",
          "border-transparent bg-zinc-100 text-zinc-900": variant === "secondary",
          "border-transparent bg-green-100 text-green-800": variant === "success",
          "border-transparent bg-red-100 text-red-800": variant === "danger",
          "text-zinc-950 border-zinc-200": variant === "outline",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
