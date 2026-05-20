"use client"

import { useMemo, useState, type ChangeEvent } from "react"
import { useCurrency } from "@/lib/hooks/use-currency"
import { useMutation, useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { Boxes, FileDown, LineChart } from "lucide-react"
import { format, startOfMonth } from "date-fns"

import { useAuthStore } from "@/lib/store/auth-store"
import {
  getFinancialReport,
  getFinancialReportRange,
  getInventoryReport,
  postFinancialReportRangePdf,
  type FinancialReport,
} from "@/lib/api"
import { UserHeader } from "@/components/layout/user-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/toast"

type ViewMode = "Daily" | "Monthly" | "Yearly" | "Custom"



function pct(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return "—"
  return `${Number(n).toFixed(1)}%`
}

function FinancialMetricsGrid({
  f,
  periodLabel,
  loading,
  error,
}: {
  f: FinancialReport | undefined
  periodLabel?: string
  loading: boolean
  error: boolean
}) {
  const { format: formatCurrency } = useCurrency()
  const money = (n: number | undefined) => {
    if (n == null || Number.isNaN(n)) return "—"
    return formatCurrency(n)
  }
  if (loading) {
    return <p className="py-8 text-center text-zinc-500">Loading financial report…</p>
  }
  if (error) {
    return <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">Could not load financial report.</p>
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard label="Total revenue" value={money(f?.totalRevenue ?? f?.totalSalesRevenue)} />
      <MetricCard label="Total expenses / purchase cost" value={money(f?.totalExpenses ?? f?.totalPurchaseCost)} />
      <MetricCard label="Net profit" value={money(f?.netProfit ?? f?.grossProfit)} accent />
      <MetricCard label="Profit margin" value={pct(f?.profitMargin)} />
      <MetricCard label="Gross profit" value={money(f?.grossProfit)} />
      <MetricCard label="Transactions" value={f?.totalTransactions != null ? String(f.totalTransactions) : "—"} />
      <MetricCard label="Parts movement" value={f?.totalPartsMovement != null ? String(f.totalPartsMovement) : "—"} />
      <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 text-sm text-zinc-600">
        <p className="font-medium text-zinc-800">Report meta</p>
        <p className="mt-1 text-zinc-700">{periodLabel ?? f?.period ?? "—"}</p>
        <p className="mt-0.5">{f?.reportDate ? format(new Date(f.reportDate), "PPp") : "—"}</p>
      </div>
    </div>
  )
}

export default function AdminReportsPage() {
  const { accessToken } = useAuthStore()
  const { format: formatCurrency } = useCurrency()
  const { addToast } = useToast()
  const [viewMode, setViewMode] = useState<ViewMode>("Daily")
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)

  const [rangeStart, setRangeStart] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"))
  const [rangeEnd, setRangeEnd] = useState(() => format(new Date(), "yyyy-MM-dd"))

  const financialQueryKey = useMemo(
    () => ["admin-financial-report", viewMode, year, month] as const,
    [viewMode, year, month]
  )

  const { data: financial, isLoading: loadingFinancial, error: financialError } = useQuery({
    queryKey: financialQueryKey,
    queryFn: () => {
      if (viewMode === "Yearly") return getFinancialReport("Yearly", year)
      if (viewMode === "Monthly") return getFinancialReport("Monthly", year, month)
      return getFinancialReport("Daily", year, month)
    },
    enabled: !!accessToken && viewMode !== "Custom",
  })

  const rangeInvalid = rangeStart > rangeEnd
  const {
    data: rangeFinancial,
    isLoading: loadingRange,
    isError: rangeQueryError,
  } = useQuery({
    queryKey: ["admin-financial-range", rangeStart, rangeEnd],
    queryFn: () => getFinancialReportRange(rangeStart, rangeEnd),
    enabled: !!accessToken && !rangeInvalid && viewMode === "Custom",
  })

  const pdfMutation = useMutation({
    mutationFn: ({ start, end }: { start: string; end: string }) => postFinancialReportRangePdf(start, end),
    onSuccess: (url) => {
      addToast({ title: "PDF ready", description: "Opening in a new tab.", variant: "success", duration: 4000 })
      window.open(url, "_blank", "noopener,noreferrer")
    },
    onError: (e) => {
      addToast({
        title: "Could not generate PDF",
        description: (e as Error)?.message ?? "Try again after restarting the API.",
        variant: "error",
        duration: 5000,
      })
    },
  })

  const { data: inventoryRows = [], isLoading: loadingInventory } = useQuery({
    queryKey: ["admin-inventory-report"],
    queryFn: () => getInventoryReport(),
    enabled: !!accessToken,
  })

  const f = financial as FinancialReport | undefined
  const rf = rangeFinancial as FinancialReport | undefined

  return (
    <>
      <UserHeader
        title="Reports"
        subtitle="Financial performance (period, custom date range, PDF export) and inventory snapshot. Low-stock monitoring is on Alerts."
      />

      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 pb-4">
          <LineChart className="size-5 text-zinc-700" />
          <h2 className="text-lg font-semibold text-zinc-950">Financial report</h2>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-40">
              <Label htmlFor="viewMode">View</Label>
              <Select id="viewMode" className="mt-1 bg-white" value={viewMode} onChange={(e: ChangeEvent<HTMLSelectElement>) => setViewMode(e.target.value as ViewMode)}>
                <option value="Daily">Daily</option>
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
                <option value="Custom">Custom Date Range</option>
              </Select>
            </div>
            
            {viewMode === "Custom" ? (
              <>
                <div>
                  <Label htmlFor="range-start">Start date</Label>
                  <Input id="range-start" type="date" className="mt-1 w-auto min-w-[11rem]" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="range-end">End date</Label>
                  <Input id="range-end" type="date" className="mt-1 w-auto min-w-[11rem]" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div className="w-32">
                  <Label htmlFor="year">Year</Label>
                  <Input id="year" type="number" className="mt-1" value={year} onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())} />
                </div>
                {(viewMode === "Monthly" || viewMode === "Daily") && (
                  <div className="w-40">
                    <Label htmlFor="month">Month</Label>
                    <Select id="month" className="mt-1 bg-white" value={String(month)} onChange={(e: ChangeEvent<HTMLSelectElement>) => setMonth(Number(e.target.value))}>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={String(i + 1)}>
                          {format(new Date(2000, i, 1), "MMMM")}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </>
            )}

            <Button
              type="button"
              variant="outline"
              className="w-auto shrink-0"
              disabled={(viewMode === "Custom" && rangeInvalid) || pdfMutation.isPending}
              onClick={() => {
                let start = rangeStart
                let end = rangeEnd

                if (viewMode === "Yearly") {
                  start = format(new Date(year, 0, 1), "yyyy-MM-dd")
                  end = format(new Date(year, 11, 31), "yyyy-MM-dd")
                } else if (viewMode === "Monthly" || viewMode === "Daily") {
                  const date = new Date(year, month - 1, 1)
                  start = format(date, "yyyy-MM-dd")
                  end = format(new Date(year, month, 0), "yyyy-MM-dd")
                }

                pdfMutation.mutate({ start, end })
              }}
            >
              <FileDown className="mr-2 size-4" />
              {pdfMutation.isPending ? "Generating PDF…" : "Download PDF"}
            </Button>
          </div>
          
          <p className="text-sm text-zinc-500 lg:max-w-xl">
            {viewMode === "Custom"
              ? "Inclusive start and end dates (YYYY-MM-DD). Same start and end = a single day. Matches the range API and the PDF export."
              : "Choose daily, monthly, or yearly. For monthly and daily views, pick the calendar year; monthly and daily also need the month."}
          </p>
          
          {viewMode === "Custom" && rangeInvalid && (
            <p className="text-sm text-amber-800">Start date must be on or before end date.</p>
          )}
        </div>

        <FinancialMetricsGrid
          f={viewMode === "Custom" ? rf : f}
          periodLabel={
            viewMode === "Custom"
              ? `Range: ${rangeStart} → ${rangeEnd}`
              : `${viewMode} · ${year}${viewMode !== "Yearly" ? ` · ${format(new Date(2000, month - 1, 1), "MMMM")}` : ""}`
          }
          loading={viewMode === "Custom" ? loadingRange : loadingFinancial}
          error={viewMode === "Custom" ? rangeQueryError : !!financialError}
        />
      </section>

      <section className="mt-8 space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 pb-4">
          <Boxes className="size-5 text-zinc-700" />
          <h2 className="text-lg font-semibold text-zinc-950">Inventory report</h2>
        </div>
        <p className="text-sm text-zinc-500">Current stock levels and part metadata from the inventory snapshot.</p>
        {loadingInventory ? (
          <p className="py-6 text-center text-zinc-500">Loading inventory…</p>
        ) : inventoryRows.length === 0 ? (
          <p className="text-sm text-zinc-500">No inventory rows returned.</p>
        ) : (
          <div className="max-h-96 overflow-auto rounded-lg border border-zinc-100">
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(inventoryRows[0] as object).map((key) => (
                    <TableHead key={key} className="whitespace-nowrap capitalize">
                      {key}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryRows.slice(0, 100).map((row: Record<string, unknown>, idx) => (
                  <TableRow key={idx}>
                    {Object.entries(row).map(([key, cell], i) => (
                      <TableCell key={i} className="max-w-[200px] truncate text-sm">
                        {cell === null || cell === undefined
                          ? "—"
                          : (key === "costPricePerUnit" || key === "inventoryValue")
                          ? formatCurrency(Number(cell))
                          : String(cell)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {inventoryRows.length > 100 && (
              <p className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500">Showing first 100 of {inventoryRows.length} rows.</p>
            )}
          </div>
        )}
        <p className="mt-4 text-sm text-zinc-500">
          For configurable low-stock lists and counts, open{" "}
          <Link href="/admin/alerts" className="font-medium text-zinc-800 underline underline-offset-2 hover:text-zinc-950">
            Alerts
          </Link>
          .
        </p>
      </section>
    </>
  )
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${accent ? "border-emerald-200 bg-emerald-50/50" : "border-zinc-100 bg-zinc-50/80"}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accent ? "text-emerald-800" : "text-zinc-950"}`}>{value}</p>
    </div>
  )
}
