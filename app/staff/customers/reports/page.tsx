"use client"

import { useQuery } from "@tanstack/react-query"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts"
import { Users, TrendingUp, AlertTriangle } from "lucide-react"

import { useAuthStore } from "@/lib/store/auth-store"
import { useCurrency } from "@/lib/hooks/use-currency"
import { getStaffCustomerReports } from "@/lib/api"
import { UserHeader } from "@/components/layout/user-header"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function CustomerReportsPage() {
  const { accessToken } = useAuthStore()
  const { format: formatCurrency } = useCurrency()

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ["staff-customer-reports"],
    queryFn: () => getStaffCustomerReports(accessToken || ""),
    enabled: !!accessToken,
  })

  const topSpenders = reportsData?.topSpenders || []
  const regularCustomers = reportsData?.regularCustomers || []
  const overdueCredits = reportsData?.overdueCredits || []

  const chartData = topSpenders.map((c) => ({
    name: c.fullName,
    spend: c.totalSpend || 0,
  }))

  return (
    <>
      <UserHeader
        title="Customer Analytics & Reports"
        subtitle="View insights on top spenders, regular customers, and outstanding credits."
      />

      <div className="mb-8 overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-zinc-950">Top Spenders Overview</h2>
        </div>
        <div className="h-72 w-full">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">Loading chart...</div>
          ) : chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-500">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#71717a" }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#71717a" }}
                  tickFormatter={(value) => `$${value}`}
                />
                <RechartsTooltip
                  cursor={{ fill: "#f4f4f5" }}
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e4e4e7", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  formatter={(value: any) => [formatCurrency(Number(value) || 0), "Total Spend"]}
                />
                <Bar dataKey="spend" fill="#fcfcfcff" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <Tabs defaultValue="top" className="w-full">
        <TabsList className="mb-6 grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="top">Top Spenders</TabsTrigger>
          <TabsTrigger value="regular">Regulars</TabsTrigger>
          <TabsTrigger value="overdue">Pending Credits</TabsTrigger>
        </TabsList>

        <TabsContent value="top">
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Purchases</TableHead>
                  <TableHead className="text-right">Total Spend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-zinc-500">Loading...</TableCell>
                  </TableRow>
                ) : topSpenders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-zinc-500">No top spenders found.</TableCell>
                  </TableRow>
                ) : (
                  topSpenders.map((c) => (
                    <TableRow key={c.userId}>
                      <TableCell className="font-medium text-zinc-950">{c.fullName}</TableCell>
                      <TableCell className="text-zinc-600">{c.email || "—"}</TableCell>
                      <TableCell className="text-zinc-600">{c.phone || "—"}</TableCell>
                      <TableCell className="text-right font-medium">{c.totalPurchases || 0}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(c.totalSpend || 0)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="regular">
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Invoices / Visits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-zinc-500">Loading...</TableCell>
                  </TableRow>
                ) : regularCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-zinc-500">No regular customers found.</TableCell>
                  </TableRow>
                ) : (
                  regularCustomers.map((c) => (
                    <TableRow key={c.userId}>
                      <TableCell className="font-medium text-zinc-950">{c.fullName}</TableCell>
                      <TableCell className="text-zinc-600">{c.email || "—"}</TableCell>
                      <TableCell className="text-zinc-600">{c.phone || "—"}</TableCell>
                      <TableCell className="text-right font-medium">{c.totalPurchases || c.visitCount || 0}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="overdue">
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Credits Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-zinc-500">Loading...</TableCell>
                  </TableRow>
                ) : overdueCredits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-zinc-500">No pending credits found.</TableCell>
                  </TableRow>
                ) : (
                  overdueCredits.map((c) => (
                    <TableRow key={c.userId}>
                      <TableCell className="font-medium text-zinc-950">{c.fullName}</TableCell>
                      <TableCell className="text-zinc-600">{c.email || "—"}</TableCell>
                      <TableCell className="text-zinc-600">{c.phone || "—"}</TableCell>
                      <TableCell className="text-right font-bold text-red-600">{formatCurrency(c.creditsRemaining || 0)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </>
  )
}
