"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, Calendar, DollarSign, User, FileText } from "lucide-react"
import Link from "next/link"

import { useAuthStore } from "@/lib/store/auth-store"
import { useCurrency } from "@/lib/hooks/use-currency"
import { getStaffServiceRecords, getStaffMonthlyServiceRecords, getStaffServiceRecordDetail } from "@/lib/api"
import { UserHeader } from "@/components/layout/user-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { format } from "date-fns"

function getStatusBadge(status: string) {
  switch (status?.toLowerCase()) {
    case "completed": 
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>
    case "in progress": 
      return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
    case "pending": 
      return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>
    default: 
      return <Badge variant="outline">{status}</Badge>
  }
}

export default function ServiceRecordsPage() {
  const { accessToken } = useAuthStore()
  const { format: formatCurrency } = useCurrency()
  const [search, setSearch] = useState("")
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [filterMonth, setFilterMonth] = useState(new Date())

  const [page, setPage] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState("")

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(handler)
  }, [search])

  const { data: allRecordsData, isLoading: loadingAll } = useQuery({
    queryKey: ["staff-service-records", page, debouncedSearch],
    queryFn: () => getStaffServiceRecords(accessToken || "", page, 20, debouncedSearch),
    enabled: !!accessToken && activeTab === "all",
  })
  
  const allRecords = allRecordsData?.items || []

  const { data: monthlyRecords = [], isLoading: loadingMonthly } = useQuery({
    queryKey: ["staff-service-records-monthly", filterMonth.getFullYear(), filterMonth.getMonth() + 1],
    queryFn: () => getStaffMonthlyServiceRecords(accessToken || "", filterMonth.getFullYear(), filterMonth.getMonth() + 1),
    enabled: !!accessToken && activeTab === "monthly",
  })

  const records = activeTab === "all" ? allRecords : monthlyRecords
  const isLoading = activeTab === "all" ? loadingAll : loadingMonthly

  const { data: selectedRecord, isLoading: loadingDetail } = useQuery({
    queryKey: ["staff-service-record-detail", selectedRecordId],
    queryFn: () => getStaffServiceRecordDetail(accessToken || "", selectedRecordId as number),
    enabled: !!accessToken && selectedRecordId !== null,
  })

  const filteredRecords = activeTab === "all" ? records : records.filter(record =>
    (record.vehicleNumber?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (record.customerName?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (record.serviceDescription?.toLowerCase() || "").includes(search.toLowerCase())
  )

  const stats = {
    total: records.length,
    completed: records.filter(r => r.status?.toLowerCase() === "completed").length,
    totalRevenue: records.reduce((sum, r) => sum + (r.serviceCost || 0), 0),
    avgCost: records.length > 0 ? records.reduce((sum, r) => sum + (r.serviceCost || 0), 0) / records.length : 0,
  }

  return (
    <>
      <UserHeader 
        title="Service Records" 
        subtitle="View and manage all service work completed for customers." 
      />

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500">Total Records</p>
              <p className="text-xl font-bold text-zinc-950">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
              <Badge className="h-5 w-5 bg-green-100" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500">Completed</p>
              <p className="text-xl font-bold text-zinc-950">{stats.completed}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500">Total Revenue</p>
              <p className="text-xl font-bold text-zinc-950">{formatCurrency(stats.totalRevenue)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500">Avg Cost</p>
              <p className="text-xl font-bold text-zinc-950">{formatCurrency(stats.avgCost)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input 
            placeholder="Search by vehicle, customer, or service..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        {activeTab === "monthly" && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-zinc-600">Month:</label>
            <input 
              type="month" 
              value={`${filterMonth.getFullYear()}-${String(filterMonth.getMonth() + 1).padStart(2, '0')}`}
              onChange={(e) => {
                const [year, month] = e.target.value.split('-')
                setFilterMonth(new Date(parseInt(year), parseInt(month) - 1))
              }}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>

      {/* Records Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Records</TabsTrigger>
          <TabsTrigger value="monthly">Monthly View</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service Description</TableHead>
                  <TableHead>Service Date</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                      Loading service records...
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                      No service records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.serviceRecordId} className="hover:bg-zinc-50">
                      <TableCell className="font-medium text-zinc-950">
                        {record.vehicleNumber}
                      </TableCell>
                      <TableCell className="text-zinc-900">
                        {record.customerName}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-zinc-600">
                        {record.serviceDescription}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-500">
                        {format(new Date(record.serviceDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="font-semibold text-zinc-950">
                        {formatCurrency(record.serviceCost || 0)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(record.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          onClick={() => setSelectedRecordId(record.serviceRecordId)}
                          className="h-8 px-3 text-xs"
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-zinc-500">
              Page {allRecordsData?.page ?? page} of {allRecordsData?.totalPages ?? 1} • {allRecordsData?.totalItems ?? allRecords.length} total
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-8 w-auto px-3 text-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-8 w-auto px-3 text-xs"
                disabled={!allRecordsData?.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="monthly">
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                      Loading monthly records...
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                      No records for this month.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.serviceRecordId}>
                      <TableCell className="font-medium text-zinc-950">
                        {record.vehicleNumber}
                      </TableCell>
                      <TableCell>{record.customerName}</TableCell>
                      <TableCell className="text-sm text-zinc-600">
                        {record.serviceDescription?.substring(0, 50)}...
                      </TableCell>
                      <TableCell className="text-sm text-zinc-500">
                        {format(new Date(record.serviceDate), "MMM d")}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(record.serviceCost || 0)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <Dialog open={selectedRecordId !== null} onOpenChange={(open) => !open && setSelectedRecordId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Service Record Details</DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="py-10 text-center text-zinc-500">Loading details...</div>
          ) : selectedRecord ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase">Vehicle</p>
                  <p className="mt-1 font-semibold text-zinc-950">{selectedRecord.vehicleNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase">Customer</p>
                  <p className="mt-1 font-semibold text-zinc-950">{selectedRecord.customerName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase">Service Date</p>
                  <p className="mt-1 text-zinc-950">{format(new Date(selectedRecord.serviceDate), "PPP")}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase">Status</p>
                  <p className="mt-1">{getStatusBadge(selectedRecord.status)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase">Service Description</p>
                <p className="mt-2 text-zinc-900">{selectedRecord.serviceDescription}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-200">
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase">Service Cost</p>
                  <p className="mt-1 text-lg font-bold text-zinc-950">{formatCurrency(selectedRecord.serviceCost || 0)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase">Created At</p>
                  <p className="mt-1 text-sm text-zinc-600">{format(new Date(selectedRecord.createdAt || new Date()), "PPp")}</p>
                </div>
              </div>
              {selectedRecord.reviewRating && (
                <div className="pt-4 border-t border-zinc-200">
                  <p className="text-xs font-medium text-zinc-500 uppercase">Customer Review</p>
                  <p className="mt-2 flex items-center gap-2">
                    <span className="font-semibold text-zinc-950">{selectedRecord.reviewRating}/5</span>
                    <span className="text-zinc-600">★</span>
                  </p>
                  {selectedRecord.reviewComment && (
                    <p className="mt-2 text-sm text-zinc-900 italic">"{selectedRecord.reviewComment}"</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="py-10 text-center text-zinc-500">Failed to load service record details.</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
