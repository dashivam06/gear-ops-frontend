"use client"

import { useState, type ChangeEvent } from "react"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle } from "lucide-react"

import { useAuthStore } from "@/lib/store/auth-store"
import { getLowStockParts } from "@/lib/api"
import { UserHeader } from "@/components/layout/user-header"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

export default function AdminAlertsPage() {
  const { accessToken } = useAuthStore()
  const [lowStockThreshold, setLowStockThreshold] = useState(10)

  const { data: lowStock = [], isLoading: loadingLow } = useQuery({
    queryKey: ["admin-low-stock", lowStockThreshold],
    queryFn: () => getLowStockParts(lowStockThreshold),
    enabled: !!accessToken,
  })

  return (
    <>
      <UserHeader
        title="Alerts"
        subtitle="Monitor parts that are at or below your stock threshold so you can reorder before shelves run dry."
      />

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-zinc-950">Low stock</h2>
            {lowStock.length > 0 ? <Badge variant="danger">{lowStock.length}</Badge> : null}
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="threshold" className="text-xs text-zinc-500">
              Threshold (units)
            </Label>
            <Input
              id="threshold"
              type="number"
              min={1}
              className="h-9 w-24"
              value={lowStockThreshold}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setLowStockThreshold(Math.max(1, Number(e.target.value) || 10))}
            />
          </div>
        </div>
        <p className="text-sm text-zinc-500">
          Parts with on-hand quantity at or below this threshold appear here. Default matches the usual reorder rule (10 units).
        </p>
        {loadingLow ? (
          <p className="py-6 text-center text-zinc-500">Loading low-stock parts…</p>
        ) : lowStock.length === 0 ? (
          <p className="text-sm text-emerald-700">No parts below threshold.</p>
        ) : (
          <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-100">
            {(lowStock as { partId?: number; partName?: string; category?: string; stockQuantity?: number; unit?: string }[]).map((part) => (
              <div key={part.partId ?? part.partName} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="font-medium text-zinc-950">{part.partName ?? "Part"}</p>
                  <p className="text-xs text-zinc-500">{part.category}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-amber-700">
                  {part.stockQuantity ?? 0} {part.unit ?? ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
