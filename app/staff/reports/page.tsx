"use client"

import { useState, useMemo } from "react"
import { useCurrency } from "@/lib/hooks/use-currency"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { TrendingUp, DollarSign, Star, CheckCircle, AlertCircle, Users } from "lucide-react"

import { useAuthStore } from "@/lib/store/auth-store"
import { getStaffPerformanceReport, getStaffMonthlyReport, getStaffCustomerReports, type StaffCustomerReportRow } from "@/lib/api"
import { UserHeader } from "@/components/layout/user-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface PerformanceStats {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
}

function StatCard({ stat }: { stat: PerformanceStats }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${stat.color}`}>
          {stat.icon}
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
          <p className="text-2xl font-bold text-zinc-950">{stat.value}</p>
        </div>
      </div>
    </div>
  )
}

interface MetricsRowProps {
  label: string
  value: string | number
  change?: string
}

function MetricsRow({ label, value, change }: MetricsRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-100 last:border-b-0">
      <span className="text-sm text-zinc-600">{label}</span>
      <div className="text-right">
        <p className="font-semibold text-zinc-950">{value}</p>
        {change && <p className="text-xs text-green-600">{change}</p>}
      </div>
    </div>
  )
}



function CustomerInsightsTable({
  title,
  emptyHint,
  rows,
  mode,
}: {
  title: string
  emptyHint: string
  rows: StaffCustomerReportRow[]
  mode: "spender" | "regular" | "credit"
}) {
  const { format: formatCurrency } = useCurrency()
  const fmtMoney = (v: number | undefined) => {
    const n = Number(v)
    return Number.isFinite(n) ? formatCurrency(n) : "—"
  }
  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-zinc-100 px-6 py-4">
        <h3 className="font-semibold text-zinc-950">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="p-6 text-sm text-zinc-500">{emptyHint}</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                {mode === "spender" ? (
                  <>
                    <TableHead className="text-right">Total spend</TableHead>
                    <TableHead className="text-right">Purchases</TableHead>
                  </>
                ) : null}
                {mode === "regular" ? (
                  <>
                    <TableHead className="text-right">Visits</TableHead>
                    <TableHead className="text-right">Purchases</TableHead>
                    <TableHead>Last activity</TableHead>
                  </>
                ) : null}
                {mode === "credit" ? (
                  <>
                    <TableHead className="text-right">Balance due</TableHead>
                    <TableHead className="text-right">Days overdue</TableHead>
                  </>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, idx) => (
                <TableRow
                  key={`${r.userId}-${r.fullName}-${r.email}`}
                  className={
                    idx < 3
                      ? mode === "spender"
                        ? "bg-emerald-50"
                        : mode === "regular"
                          ? "bg-blue-50"
                          : "bg-amber-50"
                      : undefined
                  }
                >
                  <TableCell className="font-medium text-zinc-900">{r.fullName || "—"}</TableCell>
                  <TableCell className="max-w-[160px] truncate text-sm text-zinc-600">{r.email ?? "—"}</TableCell>
                  <TableCell className="text-sm text-zinc-600">{r.phone ?? "—"}</TableCell>
                  {mode === "spender" ? (
                    <>
                      <TableCell className="text-right text-sm font-medium">{fmtMoney(r.totalSpend)}</TableCell>
                      <TableCell className="text-right text-sm">{r.totalPurchases ?? "—"}</TableCell>
                    </>
                  ) : null}
                  {mode === "regular" ? (
                    <>
                      <TableCell className="text-right text-sm">{r.visitCount ?? "—"}</TableCell>
                      <TableCell className="text-right text-sm">{r.totalPurchases ?? "—"}</TableCell>
                      <TableCell className="text-sm text-zinc-600">
                        {r.lastActivity ? new Date(r.lastActivity).toLocaleDateString() : "—"}
                      </TableCell>
                    </>
                  ) : null}
                  {mode === "credit" ? (
                    <>
                      <TableCell className="text-right text-sm font-medium text-amber-800">{fmtMoney(r.creditsRemaining)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-red-700">{r.daysOverdue ?? "—"}</TableCell>
                    </>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

export default function ReportsPage() {
  const { accessToken } = useAuthStore()
  const { format: formatCurrency } = useCurrency()
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })

  const { data: performanceData, isLoading: loadingPerformance } = useQuery({
    queryKey: ["staff-performance-report"],
    queryFn: () => getStaffPerformanceReport(accessToken || ""),
    enabled: !!accessToken,
  })

  const { data: monthlyData, isLoading: loadingMonthly } = useQuery({
    queryKey: ["staff-monthly-report", selectedMonth.year, selectedMonth.month],
    queryFn: () => getStaffMonthlyReport(accessToken || "", selectedMonth.year, selectedMonth.month),
    enabled: !!accessToken,
  })

  const { data: customerInsights, isLoading: loadingInsights, isError: insightsError } = useQuery({
    queryKey: ["staff-customer-insights"],
    queryFn: () => getStaffCustomerReports(accessToken || ""),
    enabled: !!accessToken,
  })

  // Calculate performance trends
  const performanceStats: PerformanceStats[] = useMemo(() => {
    if (!performanceData) return []
    return [
      {
        label: "Total Appointments Completed",
        value: performanceData.totalAppointmentsCompleted || 0,
        icon: <CheckCircle className="h-6 w-6 text-green-600" />,
        color: "bg-green-50",
      },
      {
        label: "Total Revenue Generated",
        value: formatCurrency(performanceData.totalRevenueGenerated || 0),
        icon: <DollarSign className="h-6 w-6 text-emerald-600" />,
        color: "bg-emerald-50",
      },
      {
        label: "Average Customer Rating",
        value: (performanceData.averageCustomerRating || 0).toFixed(1),
        icon: <Star className="h-6 w-6 text-amber-600" />,
        color: "bg-amber-50",
      },
      {
        label: "Average Service Cost",
        value: formatCurrency(performanceData.averageServiceCost || 0),
        icon: <TrendingUp className="h-6 w-6 text-blue-600" />,
        color: "bg-blue-50",
      },
    ]
  }, [performanceData])

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month] = e.target.value.split('-')
    setSelectedMonth({ year: parseInt(year), month: parseInt(month) })
  }

  const monthInput = `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}`

  return (
    <>
      <UserHeader 
        title="Reports" 
        subtitle="View detailed performance metrics and monthly reports." 
      />

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="customers" className="gap-1.5">
            <Users className="size-3.5 opacity-70" />
            Customer insights
          </TabsTrigger>
        </TabsList>

        {/* Performance Overview Tab */}
        <TabsContent value="performance" className="space-y-6">
          {loadingPerformance ? (
            <div className="flex h-64 items-center justify-center text-zinc-500">
              Loading performance data...
            </div>
          ) : (
            <>
              {/* Performance Stats Grid */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {performanceStats.map((stat, idx) => (
                  <StatCard key={idx} stat={stat} />
                ))}
              </div>

              {/* Detailed Performance Metrics */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Left Column */}
                <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-zinc-100 px-6 py-4">
                    <h3 className="font-semibold text-zinc-950">Performance Metrics</h3>
                  </div>
                  <div className="p-6 space-y-3">
                    <MetricsRow
                      label="Staff Name"
                      value={performanceData?.staffName || "—"}
                    />
                    <MetricsRow
                      label="Position"
                      value={performanceData?.position || "—"}
                    />
                    <MetricsRow
                      label="Total Service Records"
                      value={performanceData?.totalServiceRecords || 0}
                    />
                    <MetricsRow
                      label="Pending Appointments"
                      value={performanceData?.pendingAppointments || 0}
                    />
                    <MetricsRow
                      label="Staff ID"
                      value={`#${performanceData?.staffId || "—"}`}
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                  <div className="border-b border-zinc-100 px-6 py-4">
                    <h3 className="font-semibold text-zinc-950">Summary</h3>
                  </div>
                  <div className="p-6 space-y-6">
                    <div>
                      <div className="text-3xl font-bold text-zinc-950">
                        {formatCurrency(performanceData?.totalRevenueGenerated || 0)}
                      </div>
                      <p className="text-sm text-zinc-500 mt-1">Total Revenue Generated</p>
                    </div>
                    <div>
                      <div className="text-3xl font-bold text-zinc-950">
                        {(performanceData?.averageCustomerRating || 0).toFixed(1)}/5.0
                      </div>
                      <p className="text-sm text-zinc-500 mt-1">Average Customer Rating</p>
                    </div>
                    {performanceData?.reportGeneratedAt && (
                      <p className="text-xs text-zinc-400 pt-4 border-t border-zinc-100">
                        Report Generated: {new Date(performanceData.reportGeneratedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* Monthly Report Tab */}
        <TabsContent value="monthly" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="text-lg font-semibold text-zinc-950">Monthly Report</h3>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-zinc-600">Select Month:</label>
              <input
                type="month"
                value={monthInput}
                onChange={handleMonthChange}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {loadingMonthly ? (
            <div className="flex h-64 items-center justify-center text-zinc-500">
              Loading monthly report...
            </div>
          ) : monthlyData ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Monthly Stats */}
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-500">Total Revenue</p>
                    <p className="text-2xl font-bold text-zinc-950">{formatCurrency(monthlyData.totalRevenue || 0)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-500">Completed Services</p>
                    <p className="text-2xl font-bold text-zinc-950">{monthlyData.completedServices || 0}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                    <Star className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-500">Avg Rating</p>
                    <p className="text-2xl font-bold text-zinc-950">{(monthlyData.averageCustomerRating || 0).toFixed(1)}/5</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                    <TrendingUp className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-500">Avg Cost/Service</p>
                    <p className="text-2xl font-bold text-zinc-950">{formatCurrency(monthlyData.averageCostPerService || 0)}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {monthlyData && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Monthly Details */}
              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-zinc-100 px-6 py-4">
                  <h3 className="font-semibold text-zinc-950">
                    {`${monthlyData.month}/${monthlyData.year}`} Details
                  </h3>
                </div>
                <div className="p-6 space-y-3">
                  <MetricsRow
                    label="Total Appointments"
                    value={monthlyData.totalAppointments || 0}
                  />
                  <MetricsRow
                    label="Completed Services"
                    value={monthlyData.completedServices || 0}
                  />
                  <MetricsRow
                    label="Cancelled Appointments"
                    value={monthlyData.cancelledAppointments || 0}
                  />
                  <MetricsRow
                    label="Total Revenue"
                    value={formatCurrency(monthlyData.totalRevenue || 0)}
                  />
                  <MetricsRow
                    label="Average Cost Per Service"
                    value={formatCurrency(monthlyData.averageCostPerService || 0)}
                  />
                </div>
              </div>

              {/* Summary Card */}
              <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm overflow-hidden">
                <div className="border-b border-blue-200 px-6 py-4">
                  <h3 className="font-semibold text-zinc-950">Monthly Summary</h3>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <p className="text-sm text-zinc-600 font-medium">Revenue Performance</p>
                    <p className="text-3xl font-bold text-zinc-950 mt-2">
                      {formatCurrency(monthlyData.totalRevenue || 0)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {monthlyData.completedServices || 0} services completed
                    </p>
                  </div>
                  <div className="pt-4 border-t border-blue-200">
                    <p className="text-sm text-zinc-600 font-medium">Customer Satisfaction</p>
                    <p className="text-3xl font-bold text-zinc-950 mt-2">
                      {(monthlyData.averageCustomerRating || 0).toFixed(1)}/5.0
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">Average rating from customers</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <p className="text-sm text-zinc-600">
            Top spenders, regulars, and customers with overdue credit balances.
          </p>
          {loadingInsights ? (
            <div className="flex h-48 items-center justify-center text-zinc-500">Loading customer insights…</div>
          ) : insightsError ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>Could not load customer insights. Check that you are signed in as staff and the server implements the report.</span>
            </div>
          ) : (
            <div className="space-y-8">
              <CustomerInsightsTable
                title="High spenders"
                emptyHint="No high-spender rows returned yet."
                rows={customerInsights?.topSpenders ?? []}
                mode="spender"
              />
              <CustomerInsightsTable
                title="Regular customers"
                emptyHint="No regular-customer rows returned yet."
                rows={customerInsights?.regularCustomers ?? []}
                mode="regular"
              />
              <CustomerInsightsTable
                title="Overdue / pending credits"
                emptyHint="No overdue credit rows — or balances are current."
                rows={customerInsights?.overdueCredits ?? []}
                mode="credit"
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  )
}
