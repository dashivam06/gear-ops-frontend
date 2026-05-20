"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const TabsContext = React.createContext<{ value: string; onValueChange: (value: string) => void }>({
  value: "",
  onValueChange: () => {},
})

export function Tabs({ defaultValue, value, onValueChange, className, children }: { defaultValue?: string; value?: string; onValueChange?: (value: string) => void; className?: string; children: React.ReactNode }) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  const currentValue = value !== undefined ? value : internalValue
  const handleValueChange = (newValue: string) => {
    setInternalValue(newValue)
    onValueChange?.(newValue)
  }

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div className={cn("w-full", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex items-center border-b border-zinc-200 mb-4 overflow-x-auto no-scrollbar", className)}>
      {children}
    </div>
  )
}

export function TabsTrigger({ value, className, children, disabled }: { value: string; className?: string; children: React.ReactNode; disabled?: boolean }) {
  const context = React.useContext(TabsContext)
  const isActive = context.value === value

  return (
    <button
      type="button"
      role="tab"
      disabled={disabled}
      aria-selected={isActive}
      onClick={() => context.onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "border-b-2 border-zinc-950 text-zinc-950"
          : "border-b-2 border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300",
        className
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const context = React.useContext(TabsContext)
  if (context.value !== value) return null

  return (
    <div role="tabpanel" className={cn("focus-visible:outline-none", className)}>
      {children}
    </div>
  )
}
