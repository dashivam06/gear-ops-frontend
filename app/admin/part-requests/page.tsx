"use client"

import { useMemo, useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/lib/store/auth-store"
import {
  getStaffPartRequests,
  adminOrderPartRequest,
  rejectStaffPartRequest,
  approveStaffPartRequest,
  getParts,
  getVendors,
} from "@/lib/api"
import type { PartRequest, Part, Vendor } from "@/lib/api"
import { UserHeader } from "@/components/layout/user-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import { useCurrency } from "@/lib/hooks/use-currency"

const statusColor: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Available: "bg-emerald-100 text-emerald-800",
  PendingAdminReview: "bg-blue-100 text-blue-800",
  Ordered: "bg-violet-100 text-violet-800",
  Rejected: "bg-red-100 text-red-800",
}

const statusLabel: Record<string, string> = {
  Pending: "Pending",
  Available: "Available",
  PendingAdminReview: "Pending Admin Review",
  Ordered: "Ordered",
  Rejected: "Rejected",
}

export default function AdminPartRequestsPage() {
  const { accessToken } = useAuthStore()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const { symbol, format } = useCurrency()
  const [tab, setTab] = useState<"escalated" | "all">("escalated")
  const [selected, setSelected] = useState<PartRequest | null>(null)
  const [action, setAction] = useState<"order" | "approve" | "reject">("order")
  const [note, setNote] = useState("")

  // Order form state
  const [orderPartId, setOrderPartId] = useState(0)
  const [orderVendorId, setOrderVendorId] = useState(0)
  const [orderQuantity, setOrderQuantity] = useState(1)
  const [orderUnitPrice, setOrderUnitPrice] = useState(0)

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(handler)
  }, [search])

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ["admin-part-requests", tab, page, debouncedSearch],
    queryFn: () => getStaffPartRequests(
      accessToken || "", 
      page, 
      20, 
      debouncedSearch, 
      tab === "escalated" ? "PendingAdminReview" : undefined
    ),
    enabled: !!accessToken,
  })

  const { data: partsData } = useQuery({
    queryKey: ["admin-parts-for-order"],
    queryFn: () => getParts(accessToken || "", 1, 200),
    enabled: !!accessToken,
  })
  const parts = partsData?.items || []

  const { data: vendorsData } = useQuery({
    queryKey: ["admin-vendors-for-order"],
    queryFn: () => getVendors(accessToken || "", 1, 200),
    enabled: !!accessToken,
  })
  const vendors = vendorsData?.items || []

  const filtered = requestsData?.items || []

  const orderMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return
      if (action === "order") {
        return adminOrderPartRequest(accessToken || "", selected.partRequestId, {
          partId: orderPartId === -1 ? null : orderPartId,
          vendorId: orderVendorId,
          quantity: orderQuantity,
          unitPrice: orderUnitPrice,
          notes: note.trim() || undefined,
          newPartCategory: orderPartId === -1 ? "Special Request" : undefined,
        })
      }
      if (action === "approve") {
        return approveStaffPartRequest(accessToken || "", selected.partRequestId, note.trim())
      }
      return rejectStaffPartRequest(accessToken || "", selected.partRequestId, note.trim())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-part-requests"] })
      const msg = action === "order" ? "Part ordered from vendor" : action === "approve" ? "Request approved" : "Request rejected"
      addToast({ title: msg, variant: "success" })
      closeDialog()
    },
    onError: (err) => {
      addToast({ title: (err as Error).message || "Failed", variant: "error" })
    },
  })

  const closeDialog = () => {
    setSelected(null)
    setNote("")
    setOrderPartId(0)
    setOrderVendorId(0)
    setOrderQuantity(1)
    setOrderUnitPrice(0)
  }

  const openOrderDialog = (req: PartRequest) => {
    setSelected(req)
    setAction("order")
    setNote("")
  }

  const openApproveDialog = (req: PartRequest) => {
    setSelected(req)
    setAction("approve")
    setNote("")
  }

  const openRejectDialog = (req: PartRequest) => {
    setSelected(req)
    setAction("reject")
    setNote("")
  }

  return (
    <>
      <UserHeader title="Part Requests" subtitle="Review escalated part requests and order from vendors." />
      <Tabs value={tab} onValueChange={(v) => { setTab(v as "escalated" | "all"); setPage(1); setSearch("") }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="escalated">
              Escalated
              {tab === "escalated" && requestsData && 'totalItems' in requestsData && (requestsData as any).totalItems > 0 && (
                <span className="ml-2 rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {(requestsData as any).totalItems}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All Requests</TabsTrigger>
          </TabsList>

          <div className="max-w-xs w-full">
            <Input
              placeholder="Search part requests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white h-9"
            />
          </div>
        </div>
        <TabsContent value={tab}>
          {isLoading ? (
            <div className="py-12 text-center text-zinc-500">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-zinc-500">
              {tab === "escalated" ? "No escalated part requests." : "No part requests found."}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((req: PartRequest) => (
                <div key={req.partRequestId} className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-zinc-950">{req.partName}</h3>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[req.status] || "bg-zinc-100 text-zinc-700"}`}>
                          {statusLabel[req.status] || req.status}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600">{req.description || "No description"}</p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Vehicle: {req.vehicleNumber || req.vehicleId || "—"} • {new Date(req.createdAt).toLocaleString()}
                      </p>
                      {req.decisionNote && (
                        <p className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                          <span className="font-medium">Staff note:</span> {req.decisionNote}
                        </p>
                      )}
                    </div>
                    {(req.status === "PendingAdminReview" || req.status === "Pending") && (
                      <div className="flex flex-col gap-2">
                        <Button
                          className="h-8 px-3 text-xs bg-violet-600 hover:bg-violet-700 text-white"
                          onClick={() => openOrderDialog(req)}
                        >
                          Order from Vendor
                        </Button>
                        <Button
                          variant="outline"
                          className="h-8 px-3 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => openApproveDialog(req)}
                        >
                          Approve (Available)
                        </Button>
                        <Button
                          variant="outline"
                          className="h-8 px-3 text-xs border-red-300 text-red-700 hover:bg-red-50"
                          onClick={() => openRejectDialog(req)}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {requestsData && 'totalPages' in requestsData && (requestsData as any).totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Page {page} of {(requestsData as any).totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="h-9 px-3" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button variant="outline" className="h-9 px-3" disabled={!(requestsData as any).hasNextPage} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Order / Approve / Reject Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {action === "order" ? "Order Part from Vendor" : action === "approve" ? "Approve Request" : "Reject Request"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-zinc-50 p-3">
              <p className="text-sm font-medium text-zinc-900">{selected?.partName}</p>
              <p className="text-xs text-zinc-500">{selected?.description || "No description"}</p>
            </div>

            {action === "order" && (
              <>
                <div>
                  <Label>Part</Label>
                  <Select className="mt-1" value={orderPartId} onChange={(e) => {
                    const pid = Number(e.target.value)
                    setOrderPartId(pid)
                    if (pid === -1) {
                      setOrderUnitPrice(0)
                    } else {
                      const part = parts.find((p: Part) => p.partId === pid)
                      if (part) setOrderUnitPrice(part.costPricePerUnit || 0)
                    }
                  }}>
                    <option value={0}>Select a part...</option>
                    <optgroup label="Customer Requested (New Part)">
                      <option value={-1} className="font-semibold text-violet-700">
                        {selected?.partName}
                      </option>
                    </optgroup>
                    <optgroup label="Existing Inventory">
                      {parts.map((p: Part) => (
                        <option key={p.partId} value={p.partId}>{p.partName} (Stock: {p.stockQuantity})</option>
                      ))}
                    </optgroup>
                  </Select>
                </div>
                <div>
                  <Label>Vendor</Label>
                  <Select className="mt-1" value={orderVendorId} onChange={(e) => setOrderVendorId(Number(e.target.value))}>
                    <option value={0}>Select a vendor...</option>
                    {vendors.map((v: Vendor) => (
                      <option key={v.vendorId} value={v.vendorId}>{v.vendorName}</option>
                    ))}
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Quantity</Label>
                    <Input type="number" min={1} className="mt-1" value={orderQuantity} onChange={(e) => setOrderQuantity(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Unit Price ({symbol})</Label>
                    <Input type="number" min={0} step="0.01" className="mt-1" value={orderUnitPrice} onChange={(e) => setOrderUnitPrice(Number(e.target.value))} />
                  </div>
                </div>
                {orderPartId !== 0 && orderQuantity > 0 && orderUnitPrice > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-violet-50 px-4 py-3">
                    <span className="text-sm text-violet-700">Total Order Cost</span>
                    <span className="text-lg font-bold text-violet-900">{format(orderQuantity * orderUnitPrice)}</span>
                  </div>
                )}
              </>
            )}

            <div>
              <Label>{action === "order" ? "Notes" : action === "approve" ? "Decision Note" : "Rejection Reason"}</Label>
              <Input
                className="mt-1"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  action === "order" ? "Notes for the order..." : action === "approve" ? "Note to customer..." : "Reason for rejection..."
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button
                onClick={() => orderMutation.mutate()}
                disabled={
                  orderMutation.isPending ||
                  (action === "order" && (!orderPartId || !orderVendorId || orderQuantity <= 0 || orderUnitPrice <= 0)) ||
                  (action !== "order" && !note.trim())
                }
                className={
                  action === "order"
                    ? "bg-violet-600 hover:bg-violet-700"
                    : action === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }
              >
                {orderMutation.isPending
                  ? "Processing..."
                  : action === "order"
                  ? "Place Order"
                  : action === "approve"
                  ? "Approve"
                  : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
