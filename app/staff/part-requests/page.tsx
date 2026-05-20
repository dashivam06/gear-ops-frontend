"use client"

import { useMemo, useState, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/lib/store/auth-store"
import {
  approveStaffPartRequest,
  escalateStaffPartRequest,
  getStaffPartRequests,
  getStaffPendingPartRequests,
  rejectStaffPartRequest,
} from "@/lib/api"
import { UserHeader } from "@/components/layout/user-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"

const statusColor: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-800",
  Available: "bg-emerald-100 text-emerald-800",
  PendingAdminReview: "bg-blue-100 text-blue-800",
  Ordered: "bg-violet-100 text-violet-800",
  Rejected: "bg-red-100 text-red-800",
}

export default function StaffPartRequestsPage() {
  const { accessToken } = useAuthStore()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [tab, setTab] = useState<"pending" | "all">("pending")
  const [note, setNote] = useState("")
  const [selected, setSelected] = useState<any | null>(null)
  const [decision, setDecision] = useState<"approve" | "reject" | "escalate">("approve")

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
    queryKey: ["staff-part-requests", tab, page, debouncedSearch],
    queryFn: async () => {
      if (tab === "pending") {
        const res = await getStaffPendingPartRequests(accessToken || "")
        return { items: res }
      } else {
        return getStaffPartRequests(accessToken || "", page, 20, debouncedSearch)
      }
    },
    enabled: !!accessToken,
  })

  const requests = requestsData?.items || []

  const sorted = useMemo(
    () => [...requests].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [requests]
  )

  const decideMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return
      if (decision === "approve") return approveStaffPartRequest(accessToken || "", selected.partRequestId, note.trim())
      if (decision === "escalate") return escalateStaffPartRequest(accessToken || "", selected.partRequestId, note.trim())
      return rejectStaffPartRequest(accessToken || "", selected.partRequestId, note.trim())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-part-requests"] })
      const msg = decision === "approve" ? "Request approved" : decision === "escalate" ? "Request escalated to Admin" : "Request rejected"
      addToast({ title: msg, variant: "success" })
      setSelected(null)
      setNote("")
    },
    onError: (err) => {
      addToast({ title: (err as Error).message || "Failed to update request", variant: "error" })
    },
  })

  const dialogTitle = decision === "approve" ? "Approve Request" : decision === "escalate" ? "Escalate to Admin" : "Reject Request"

  return (
    <>
      <UserHeader title="Part Requests" subtitle="Review customer part requests — approve, reject, or escalate to admin." />
      <Tabs value={tab} onValueChange={(value) => { setTab(value as "pending" | "all"); setPage(1); setSearch("") }}>
        <TabsList className="mb-4">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        {tab === "all" && (
          <div className="mb-4 max-w-sm">
            <Input
              placeholder="Search part requests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white"
            />
          </div>
        )}

        <TabsContent value={tab}>
          {isLoading ? (
            <div className="py-12 text-center text-zinc-500">Loading requests...</div>
          ) : sorted.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-zinc-500">No part requests found.</div>
          ) : (
            <div className="space-y-3">
              {sorted.map((req) => (
                <div key={req.partRequestId} className="rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-zinc-950">{req.partName}</p>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[req.status] || "bg-zinc-100 text-zinc-700"}`}>
                          {req.status === "PendingAdminReview" ? "Pending Admin Review" : req.status || "Pending"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-600">{req.description || "No description provided"}</p>
                      <p className="mt-2 text-xs text-zinc-500">Vehicle: {req.vehicleNumber || req.vehicleId || "—"} • {new Date(req.createdAt).toLocaleString()}</p>
                      {req.decisionNote ? <p className="mt-2 text-xs text-zinc-500">Latest note: {req.decisionNote}</p> : null}
                    </div>
                    {req.status === "Pending" && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          className="h-8 px-3 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => { setSelected(req); setDecision("approve"); setNote(req.decisionNote || "") }}
                        >
                          ✓ Approve
                        </Button>
                        <Button
                          variant="outline"
                          className="h-8 px-3 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                          onClick={() => { setSelected(req); setDecision("escalate"); setNote(req.decisionNote || "") }}
                        >
                          ↑ Escalate
                        </Button>
                        <Button
                          variant="outline"
                          className="h-8 px-3 text-xs border-red-300 text-red-700 hover:bg-red-50"
                          onClick={() => { setSelected(req); setDecision("reject"); setNote(req.decisionNote || "") }}
                        >
                          ✕ Reject
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

      {tab === "all" && requestsData && 'totalPages' in requestsData && (requestsData as any).totalPages > 1 && (
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

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-zinc-700">
              {selected?.partName} ({selected?.vehicleNumber || selected?.vehicleId || "—"})
            </p>
            {decision === "escalate" && (
              <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                This will mark the request as &quot;Pending Admin Review&quot;. Admin can then decide whether to order this part from a vendor.
              </p>
            )}
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                decision === "approve"
                  ? "Message to customer (ready timeline, collection note...)"
                  : decision === "escalate"
                  ? "Note to admin (e.g. part not in stock, customer needs urgently...)"
                  : "Rejection reason to customer"
              }
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
              <Button
                onClick={() => decideMutation.mutate()}
                disabled={decideMutation.isPending || !note.trim()}
                className={
                  decision === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : decision === "escalate"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-red-600 hover:bg-red-700"
                }
              >
                {decideMutation.isPending
                  ? "Saving..."
                  : decision === "approve"
                  ? "Approve"
                  : decision === "escalate"
                  ? "Escalate to Admin"
                  : "Reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
