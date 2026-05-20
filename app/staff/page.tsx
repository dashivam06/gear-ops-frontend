"use client"

import { useQuery } from "@tanstack/react-query"
import { Users, CalendarDays, FileText, TrendingUp, Wrench, BarChart3 } from "lucide-react"
import Link from "next/link"

import { useAuthStore } from "@/lib/store/auth-store"
import { useCurrency } from "@/lib/hooks/use-currency"
import { getStaffDashboard } from "@/lib/api"
import { UserHeader } from "@/components/layout/user-header"

export default function StaffDashboardPage() {
  const { accessToken } = useAuthStore()
  const { format: formatCurrency } = useCurrency()

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["staff-dashboard"],
    queryFn: () => getStaffDashboard(accessToken || ""),
    enabled: !!accessToken,
  })

  const schedule = dashboard?.schedule
  const performance = dashboard?.performance
  const monthly = dashboard?.monthlyMetrics

  return (
    <>
      <UserHeader 
        title="Staff Dashboard" 
        subtitle="Manage customers, vehicles, sales, and service appointments." 
      />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-zinc-500">
          Loading dashboard data...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <CalendarDays className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-500">Today's Appointments</p>
                  <p className="text-2xl font-bold text-zinc-950">{schedule?.todayAppointments ?? 0}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <TrendingUp className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-500">Upcoming</p>
                  <p className="text-2xl font-bold text-zinc-950">{schedule?.upcomingAppointments ?? 0}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                  <FileText className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-500">Completed This Month</p>
                  <p className="text-2xl font-bold text-zinc-950">{schedule?.completedAppointmentsThisMonth ?? 0}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                  <Users className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-500">Avg Rating</p>
                  <p className="text-2xl font-bold text-zinc-950">{performance?.averageCustomerRating?.toFixed(1) ?? "—"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Quick Actions */}
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col">
              <div className="border-b border-zinc-100 px-6 py-4">
                <h2 className="font-semibold text-zinc-950">Quick Actions</h2>
              </div>
              <div className="flex-1 p-6 grid grid-cols-2 gap-4">
                <Link href="/staff/customers" className="flex flex-col items-center justify-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-6 text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-950">
                  <Users className="size-8" />
                  <span className="font-medium">Register Customer</span>
                </Link>
                <Link href="/staff/invoices" className="flex flex-col items-center justify-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-6 text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-950">
                  <FileText className="size-8" />
                  <span className="font-medium">Create Invoice</span>
                </Link>
                <Link href="/staff/appointments" className="flex flex-col items-center justify-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-6 text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-950">
                  <CalendarDays className="size-8" />
                  <span className="font-medium">Service Tasks</span>
                </Link>
                <Link href="/staff/service-records" className="flex flex-col items-center justify-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-6 text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-950">
                  <Wrench className="size-8" />
                  <span className="font-medium">Service Records</span>
                </Link>
              </div>
            </div>

            {/* Performance Summary */}
            <Link href="/staff/reports" className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col hover:border-zinc-300 transition-colors">
              <div className="border-b border-zinc-100 px-6 py-4">
                <h2 className="font-semibold text-zinc-950">Performance Summary</h2>
              </div>
              <div className="flex-1 p-6 space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-zinc-50">
                  <span className="text-sm text-zinc-500">Total Completed</span>
                  <span className="font-semibold text-zinc-950">{performance?.totalAppointmentsCompleted ?? 0}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-zinc-50">
                  <span className="text-sm text-zinc-500">Total Revenue Generated</span>
                  <span className="font-semibold text-zinc-950">{formatCurrency(performance?.totalRevenueGenerated ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-zinc-50">
                  <span className="text-sm text-zinc-500">Avg Service Cost</span>
                  <span className="font-semibold text-zinc-950">{formatCurrency(performance?.averageServiceCost ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm text-zinc-500">Customer Rating</span>
                  <span className="font-semibold text-zinc-950">{performance?.averageCustomerRating?.toFixed(1) ?? "—"} / 5.0</span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
