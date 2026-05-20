"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  DollarSign, Package, Users, TrendingUp, AlertTriangle, FileBarChart2
} from "lucide-react"

import { useAuthStore } from "@/lib/store/auth-store"
import { useCurrency } from "@/lib/hooks/use-currency"
import { getFinancialReport, getInventoryReport, getLowStockParts, getStaffList, getParts, getVendors } from "@/lib/api"
import { UserHeader } from "@/components/layout/user-header"
import { Badge } from "@/components/ui/badge"

export default function AdminDashboardPage() {
  const { accessToken } = useAuthStore()
  const { format: formatCurrency } = useCurrency()
  const y = new Date().getFullYear()
  const m = new Date().getMonth() + 1

  const { data: financial, isLoading: loadingFinancial } = useQuery({
    queryKey: ["admin-financial-report", "dashboard", y, m],
    queryFn: () => getFinancialReport("Monthly", y, m),
    enabled: !!accessToken,
  })

  const { data: inventoryReport = [] } = useQuery({
    queryKey: ["admin-inventory-report"],
    queryFn: () => getInventoryReport(),
    enabled: !!accessToken,
  })

  const { data: lowStockParts = [] } = useQuery({
    queryKey: ["admin-low-stock"],
    queryFn: () => getLowStockParts(10),
    enabled: !!accessToken,
  })

  const { data: staffData } = useQuery({
    queryKey: ["staff", "dashboard"],
    queryFn: () => getStaffList(accessToken || "", 1, 100),
    enabled: !!accessToken,
  })
  const staffList = staffData?.items || []

  const { data: partsData } = useQuery({
    queryKey: ["parts", "dashboard"],
    queryFn: () => getParts(accessToken || "", 1, 500),
    enabled: !!accessToken,
  })
  const parts = partsData?.items || []

  const { data: vendorsData } = useQuery({
    queryKey: ["vendors", "dashboard"],
    queryFn: () => getVendors(accessToken || "", 1, 200),
    enabled: !!accessToken,
  })
  const vendors = vendorsData?.items || []

  const isLoading = loadingFinancial

  const totalRevenue = financial?.totalRevenue ?? financial?.totalSalesRevenue ?? 0
  const totalExpenses = financial?.totalExpenses ?? financial?.totalPurchaseCost ?? 0
  const netProfit = financial?.netProfit ?? financial?.grossProfit ?? totalRevenue - totalExpenses
  const totalInventoryValue = parts.reduce((sum, p) => sum + p.costPricePerUnit * p.stockQuantity, 0)

  return (
    <>
      <UserHeader
        title="Admin Dashboard"
        subtitle="Overview of financial performance, inventory, and operations."
      >
        <Link
          href="/admin/reports"
          className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 sm:w-auto"
        >
          <FileBarChart2 className="size-4" />
          Financial and inventory reports
        </Link>
      </UserHeader>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-zinc-500">Loading dashboard...</div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <DollarSign className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-zinc-950">{formatCurrency(totalRevenue)}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <TrendingUp className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-500">Net Profit</p>
                  <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {formatCurrency(netProfit)}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                  <Package className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-500">Inventory Value</p>
                  <p className="text-2xl font-bold text-zinc-950">{formatCurrency(totalInventoryValue)}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                  <Users className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-500">Active Staff</p>
                  <p className="text-2xl font-bold text-zinc-950">{staffList.filter(s => s.isActive).length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Low Stock Alerts */}
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col">
              <div className="border-b border-zinc-100 px-6 py-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-amber-500" />
                  <h2 className="font-semibold text-zinc-950">Low stock</h2>
                  {lowStockParts.length > 0 && (
                    <Badge variant="danger">{lowStockParts.length}</Badge>
                  )}
                </div>
                <Link
                  href="/admin/alerts"
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Open alerts
                </Link>
              </div>
              <div className="flex-1 divide-y divide-zinc-100 max-h-80 overflow-y-auto">
                {lowStockParts.length === 0 ? (
                  <div className="p-6 text-center text-sm text-zinc-500">All stock levels are healthy!</div>
                ) : (
                  lowStockParts.map((part: any) => (
                    <div key={part.partId} className="px-6 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-zinc-950 text-sm">{part.partName}</p>
                        <p className="text-xs text-zinc-500">{part.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-red-600">{part.stockQuantity} {part.unit}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col">
              <div className="border-b border-zinc-100 px-6 py-4">
                <h2 className="font-semibold text-zinc-950">Quick Summary</h2>
              </div>
              <div className="flex-1 p-6 space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-zinc-50">
                  <span className="text-sm text-zinc-500">Total Parts</span>
                  <span className="font-semibold text-zinc-950">{parts.length}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-zinc-50">
                  <span className="text-sm text-zinc-500">Total Vendors</span>
                  <span className="font-semibold text-zinc-950">{vendors.length}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-zinc-50">
                  <span className="text-sm text-zinc-500">Total Staff</span>
                  <span className="font-semibold text-zinc-950">{staffList.length}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-zinc-50">
                  <span className="text-sm text-zinc-500">Total Expenses</span>
                  <span className="font-semibold text-red-600">{formatCurrency(totalExpenses)}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm text-zinc-500">Low Stock Items</span>
                  <span className={`font-semibold ${lowStockParts.length > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {lowStockParts.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
