"use client"

import { useQuery } from "@tanstack/react-query"
import { CarFront, CalendarDays, FileText, ShoppingBag } from "lucide-react"
import Link from "next/link"

import { useAuthStore } from "@/lib/store/auth-store"
import { getCustomerDashboard } from "@/lib/api"
import { UserHeader } from "@/components/layout/user-header"
import { Badge } from "@/components/ui/badge"
import { useCurrency } from "@/lib/hooks/use-currency"

const truncateText = (text: string, maxLength = 20) =>
  text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text

const statusVariantMap: Record<string, "success" | "outline" | "secondary" | "danger"> = {
  Pending: "outline",
  Confirmed: "secondary",
  "In Progress": "success",
  Completed: "success",
}

export default function CustomerDashboardPage() {
  const { accessToken } = useAuthStore()
  const { format } = useCurrency()

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["customer-dashboard"],
    queryFn: () => getCustomerDashboard(accessToken || ""),
    enabled: !!accessToken,
  })

  const upcomingAppointments = dashboard?.upcomingAppointments || []
  const pendingRequests = dashboard?.pendingPartRequests || []
  const creditBalance = dashboard?.creditBalance
  const loyaltyStatus = dashboard?.loyaltyStatus

  return (
    <>
      <UserHeader
        title="Welcome Back!"
        subtitle="Here's a summary of your account activity."
      />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-zinc-500">Loading dashboard...</div>
      ) : (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/dashboard/vehicles" className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="flex size-11 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
                  <CarFront className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500">My Vehicles</p>
                  <p className="text-xl font-bold text-zinc-950">{dashboard?.profile ? "View" : "—"}</p>
                </div>
              </div>
            </Link>
            <Link href="/dashboard/appointments" className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100">
                  <CalendarDays className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500">Upcoming Appointments</p>
                  <p className="text-xl font-bold text-zinc-950">{upcomingAppointments.length}</p>
                </div>
              </div>
            </Link>
            <Link href="/dashboard/history" className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="flex size-11 items-center justify-center rounded-full bg-amber-50 text-amber-600 transition-colors group-hover:bg-amber-100">
                  <FileText className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500">Available Credit</p>
                  <p className="text-xl font-bold text-zinc-950">{format((dashboard?.profile as any)?.creditsRemaining ?? creditBalance?.availableCredit ?? 0)}</p>
                </div>
              </div>
            </Link>
            <Link href="/dashboard/requests" className="group rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md">
              <div className="flex items-center gap-4">
                <div className="flex size-11 items-center justify-center rounded-full bg-violet-50 text-violet-600 transition-colors group-hover:bg-violet-100">
                  <ShoppingBag className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500">Pending Requests</p>
                  <p className="text-xl font-bold text-zinc-950">{pendingRequests.length}</p>
                </div>
              </div>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Upcoming Appointments */}
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-zinc-100 px-6 py-4 flex items-center justify-between">
                <h2 className="font-semibold text-zinc-950">Upcoming Appointments</h2>
                <Link href="/dashboard/appointments" className="text-xs font-semibold text-blue-600 hover:underline">View All</Link>
              </div>
              <div className="divide-y divide-zinc-100">
                {upcomingAppointments.length === 0 ? (
                  <div className="p-6 text-center text-sm text-zinc-500">No upcoming appointments. <Link href="/dashboard/appointments" className="text-blue-600 hover:underline">Book one now</Link></div>
                ) : (
                  upcomingAppointments.map(apt => {
                    const variant = statusVariantMap[apt.status] || "outline"
                    return (
                      <div key={apt.appointmentId} className="flex items-center justify-between px-6 py-4">
                        <div>
                          <p className="font-medium text-zinc-950">{apt.vehicleNumber}</p>
                          <p className="text-xs text-zinc-500">
                            {new Date(apt.appointmentDate).toLocaleDateString()} • {truncateText(apt.description || "—")}
                          </p>
                        </div>
                        <Badge variant={variant}>{apt.status}</Badge>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Loyalty & Credits */}
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-zinc-100 px-6 py-4">
                <h2 className="font-semibold text-zinc-950">Loyalty & Credits</h2>
              </div>
              <div className="p-6 space-y-4">
                {loyaltyStatus ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-zinc-500">Tier</span>
                      <span className="text-sm font-semibold text-zinc-950">{loyaltyStatus.loyaltyTier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-zinc-500">Points Available</span>
                      <span className="text-sm font-semibold text-zinc-950">{loyaltyStatus.availablePoints}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-zinc-500">Available Credit</span>
                      <span className="text-sm font-semibold text-emerald-600">{format((dashboard?.profile as any)?.creditsRemaining ?? creditBalance?.availableCredit ?? 0)}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-zinc-500 text-center">No loyalty data available yet.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
