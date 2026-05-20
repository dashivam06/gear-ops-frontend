"use client"

import { useEffect, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, Plus, Search, Trash2, Send, CheckCircle, PackageCheck } from "lucide-react"
import { format } from "date-fns"

import { useAuthStore } from "@/lib/store/auth-store"
import { useCurrency } from "@/lib/hooks/use-currency"
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  getPurchaseOrdersByVendor,
  createPurchaseOrder,
  updatePurchaseOrder,
  sendPurchaseOrderToVendor,
  confirmPurchaseOrder,
  deliverPurchaseOrder,
  getVendors,
  getVendorParts,
  type PurchaseOrder,
  type PurchaseOrderLog,
} from "@/lib/api"
import { UserHeader } from "@/components/layout/user-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

const lineSchema = z.object({
  partId: z.coerce.number().min(1, "Part required"),
  quantity: z.coerce.number().min(1, "Min 1"),
  unitPrice: z.coerce.number().min(0, "Price required"),
})

const poCreateSchema = z.object({
  vendorId: z.coerce.number().min(1, "Vendor required"),
  invoiceNumber: z.string().optional(),
  items: z.array(lineSchema).min(1, "Add at least one part"),
})

const poEditSchema = z.object({
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(lineSchema).min(1, "Add at least one part"),
})

type PoCreateValues = z.infer<typeof poCreateSchema>
type PoEditValues = z.infer<typeof poEditSchema>

/** Part rows: fixed-ish columns + flexible part name; parent uses horizontal scroll on small screens. */
const PO_PART_ROW_GRID =
  "grid grid-cols-[2.5rem_minmax(13rem,1fr)_4.75rem_6.75rem] items-center gap-x-3 gap-y-1 sm:grid-cols-[2.5rem_minmax(16rem,1fr)_5rem_7rem]"

function purchaseOrderEditable(po: PurchaseOrder): boolean {
  if (typeof po.isEditable === "boolean") return po.isEditable
  const t = po.statusText
  if (t) return t !== "Delivered" && t !== "Cancelled"
  if (typeof po.status === "number") return po.status !== 3 && po.status !== 4
  return true
}

function statusBadgeClass(statusText?: string, status?: number): string {
  const key = statusText || (status === 0 ? "Draft" : status === 1 ? "SentToVendor" : status === 2 ? "ConfirmedByVendor" : status === 3 ? "Delivered" : status === 4 ? "Cancelled" : "")
  switch (key) {
    case "Draft":
      return "bg-zinc-100 text-zinc-800 border-zinc-200"
    case "SentToVendor":
      return "bg-sky-50 text-sky-900 border-sky-200"
    case "ConfirmedByVendor":
      return "bg-violet-50 text-violet-900 border-violet-200"
    case "Delivered":
      return "bg-emerald-50 text-emerald-900 border-emerald-200"
    case "Cancelled":
      return "bg-red-50 text-red-800 border-red-200"
    default:
      return "bg-zinc-50 text-zinc-700 border-zinc-200"
  }
}

function PoStatusBadge({ po }: { po: Pick<PurchaseOrder, "statusText" | "status"> }) {
  const label = po.statusText || (typeof po.status === "number" ? `Status ${po.status}` : "—")
  return (
    <Badge variant="outline" className={cn("font-medium", statusBadgeClass(po.statusText, po.status))}>
      {label}
    </Badge>
  )
}

function LogTimeline({ logs }: { logs: PurchaseOrderLog[] | undefined }) {
  if (!logs?.length) return <p className="text-sm text-zinc-500">No activity log yet.</p>
  const sorted = [...logs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  return (
    <ul className="space-y-3 border-l-2 border-zinc-200 pl-4">
      {sorted.map((log) => (
        <li key={log.purchaseOrderLogId} className="relative text-sm">
          <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-zinc-400" aria-hidden />
          <p className="font-medium text-zinc-900">{log.action}</p>
          <p className="text-xs text-zinc-500">
            {log.fromStatus && log.toStatus ? `${log.fromStatus} → ${log.toStatus}` : null}
            {log.emailSentToVendor ? " · Email to vendor" : null}
          </p>
          {log.notes ? <p className="mt-1 text-zinc-600">{log.notes}</p> : null}
          <p className="mt-0.5 text-[11px] text-zinc-400">{format(new Date(log.createdAt), "PPp")}</p>
        </li>
      ))}
    </ul>
  )
}

export default function AdminPurchaseOrdersPage() {
  const { accessToken } = useAuthStore()
  const { symbol, format: formatCurrency, convert, convertToBase } = useCurrency()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [search, setSearch] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [vendorFilter, setVendorFilter] = useState(0)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [deliverNotes, setDeliverNotes] = useState("Items received and checked into store.")
  const [sendMessage, setSendMessage] = useState("Please confirm availability and send invoice number.")

  useEffect(() => {
    if (detailId != null) setDeliverNotes("Items received and checked into store.")
  }, [detailId])

  const { data: vendorsData } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => getVendors(accessToken || "", 1, 200),
    enabled: !!accessToken,
  })
  const vendors = vendorsData?.items || []

  const { data: listPaged, isLoading: loadingList } = useQuery({
    queryKey: ["admin-purchase-orders", page],
    queryFn: () => getPurchaseOrders(accessToken || "", page, 20),
    enabled: !!accessToken && vendorFilter === 0,
  })

  const { data: listByVendor = [], isLoading: loadingVendorList } = useQuery({
    queryKey: ["admin-purchase-orders-vendor", vendorFilter],
    queryFn: () => getPurchaseOrdersByVendor(accessToken || "", vendorFilter),
    enabled: !!accessToken && vendorFilter > 0,
  })

  const orders: PurchaseOrder[] = vendorFilter > 0 ? listByVendor : listPaged?.items || []
  const isLoading = vendorFilter > 0 ? loadingVendorList : loadingList
  const totalPages = listPaged?.totalPages ?? 1
  const hasNext = listPaged?.hasNextPage ?? false

  const createForm = useForm<PoCreateValues>({
    resolver: zodResolver(poCreateSchema) as any,
    defaultValues: {
      vendorId: 0,
      invoiceNumber: "",
      items: [{ partId: 0, quantity: 1, unitPrice: 0 }],
    },
  })

  const vendorIdCreate = createForm.watch("vendorId")

  const { data: vendorPartsCreate = [] } = useQuery({
    queryKey: ["admin-vendor-parts", vendorIdCreate],
    queryFn: () => getVendorParts(accessToken || "", Number(vendorIdCreate)),
    enabled: !!accessToken && Number(vendorIdCreate) > 0,
  })

  const { fields: createFields, append: appendCreate, remove: removeCreate } = useFieldArray({
    control: createForm.control,
    name: "items",
  })

  const createMutation = useMutation({
    mutationFn: (data: PoCreateValues) =>
      createPurchaseOrder(accessToken || "", {
        vendorId: data.vendorId,
        invoiceNumber: data.invoiceNumber?.trim() ? data.invoiceNumber.trim() : null,
        items: data.items.map((i) => ({
          partId: i.partId,
          quantity: i.quantity,
          unitPrice: convertToBase(i.unitPrice),
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-purchase-orders"] })
      queryClient.invalidateQueries({ queryKey: ["admin-purchase-orders-vendor"] })
      queryClient.invalidateQueries({ queryKey: ["parts"] })
      addToast({
        title: "Purchase order created",
        description: "Saved as Draft. Stock updates only after you mark the order Delivered.",
        variant: "success",
      })
      setIsAddOpen(false)
      createForm.reset({ vendorId: 0, invoiceNumber: "", items: [{ partId: 0, quantity: 1, unitPrice: 0 }] })
    },
    onError: (e) => addToast({ title: (e as Error).message || "Create failed", variant: "error" }),
  })

  const { data: detail, isLoading: loadingDetail, dataUpdatedAt } = useQuery({
    queryKey: ["admin-purchase-order-detail", detailId],
    queryFn: () => getPurchaseOrderById(accessToken || "", detailId as number),
    enabled: !!accessToken && detailId != null,
  })

  const editForm = useForm<PoEditValues>({
    resolver: zodResolver(poEditSchema) as any,
    defaultValues: { invoiceNumber: "", notes: "", items: [{ partId: 0, quantity: 1, unitPrice: 0 }] },
  })

  const vendorIdDetail = detail?.vendorId ?? 0

  const { data: vendorPartsDetail = [] } = useQuery({
    queryKey: ["admin-vendor-parts-detail", vendorIdDetail, detailId],
    queryFn: () => getVendorParts(accessToken || "", vendorIdDetail),
    enabled: !!accessToken && vendorIdDetail > 0 && detailId != null,
  })

  const { fields: editFields, append: appendEdit, remove: removeEdit } = useFieldArray({
    control: editForm.control,
    name: "items",
  })

  useEffect(() => {
    if (!detail) return
    editForm.reset({
      invoiceNumber: detail.invoiceNumber ?? "",
      notes: detail.notes ?? "",
      items:
        detail.items && detail.items.length > 0
          ? detail.items.map((it) => ({
            partId: it.partId,
            quantity: it.quantity,
            unitPrice: convert(it.unitPrice),
          }))
          : [{ partId: 0, quantity: 1, unitPrice: 0 }],
    })
  }, [detail, dataUpdatedAt, editForm])

  const invalidatePo = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-purchase-orders"] })
    queryClient.invalidateQueries({ queryKey: ["admin-purchase-orders-vendor"] })
    queryClient.invalidateQueries({ queryKey: ["admin-purchase-order-detail", detailId] })
    queryClient.invalidateQueries({ queryKey: ["parts"] })
  }

  const updateMutation = useMutation({
    mutationFn: async (data: PoEditValues) => {
      if (!detailId) throw new Error("No purchase order")
      return updatePurchaseOrder(accessToken || "", detailId, {
        invoiceNumber: data.invoiceNumber?.trim() || null,
        notes: data.notes?.trim() || null,
        items: data.items.map((i) => ({
          partId: i.partId,
          quantity: i.quantity,
          unitPrice: convertToBase(i.unitPrice),
        })),
      })
    },
    onSuccess: () => {
      invalidatePo()
      addToast({ title: "Purchase order updated", variant: "success" })
    },
    onError: (e) => addToast({ title: (e as Error).message || "Update failed", variant: "error" }),
  })

  const sendMutation = useMutation({
    mutationFn: () => {
      if (!detailId) throw new Error("No purchase order")
      return sendPurchaseOrderToVendor(accessToken || "", detailId, { message: sendMessage.trim() || " " })
    },
    onSuccess: () => {
      invalidatePo()
      addToast({ title: "Sent to vendor", variant: "success" })
    },
    onError: (e) => addToast({ title: (e as Error).message || "Send failed", variant: "error" }),
  })

  const confirmMutation = useMutation({
    mutationFn: (body: { invoiceNumber: string; notes?: string | null }) => {
      if (!detailId) throw new Error("No purchase order")
      return confirmPurchaseOrder(accessToken || "", detailId, body)
    },
    onSuccess: () => {
      invalidatePo()
      addToast({ title: "Confirmed with vendor invoice", variant: "success" })
    },
    onError: (e) => addToast({ title: (e as Error).message || "Confirm failed", variant: "error" }),
  })

  const deliverMutation = useMutation({
    mutationFn: (notes: string) => {
      if (!detailId) throw new Error("No purchase order")
      return deliverPurchaseOrder(accessToken || "", detailId, { notes: notes.trim() || null })
    },
    onSuccess: () => {
      invalidatePo()
      addToast({ title: "Marked delivered — stock updated", variant: "success" })
    },
    onError: (e) => addToast({ title: (e as Error).message || "Deliver failed", variant: "error" }),
  })

  const filtered = orders.filter(
    (o) =>
      String(o.purchaseOrderId).includes(search.trim()) ||
      (o.invoiceNumber || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.vendorName || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.statusText || "").toLowerCase().includes(search.toLowerCase())
  )

  const editableDetail = detail ? purchaseOrderEditable(detail) : false
  const statusText = detail?.statusText
  const showSendToVendor = statusText === "Draft"
  const showConfirm = statusText === "Draft" || statusText === "SentToVendor"
  const hasInvoice = Boolean((editForm.watch("invoiceNumber") || detail?.invoiceNumber || "").toString().trim())
  const showDeliver =
    Boolean(detail) &&
    statusText !== "Delivered" &&
    statusText !== "Cancelled" &&
    hasInvoice

  const onConfirmSubmit = () => {
    const inv = editForm.getValues("invoiceNumber")?.trim()
    if (!inv) {
      addToast({ title: "Vendor invoice number required", variant: "error" })
      return
    }
    confirmMutation.mutate({
      invoiceNumber: inv,
      notes: editForm.getValues("notes")?.trim() || null,
    })
  }

  return (
    <>
      <UserHeader
        title="Purchase orders"
        subtitle="Vendor workflow: Draft → sent → confirmed → delivered. Inventory increases only when you mark Delivered."
      >
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="h-10 w-full shrink-0 px-4 sm:w-auto">
              <Plus className="mr-2 size-4" />
              New purchase order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-4xl overflow-y-auto overflow-x-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Create purchase order (Draft)</DialogTitle>
            </DialogHeader>
            <form onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
              <div>
                <Label htmlFor="c-vendorId">Vendor</Label>
                <Select id="c-vendorId" className="mt-1 bg-white" {...createForm.register("vendorId")}>
                  <option value={0}>Select vendor…</option>
                  {vendors.map((v) => (
                    <option key={v.vendorId} value={v.vendorId}>
                      {v.vendorName}
                    </option>
                  ))}
                </Select>
                {createForm.formState.errors.vendorId && (
                  <p className="mt-1 text-xs text-red-500">{createForm.formState.errors.vendorId.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="c-invoice">Vendor invoice number (optional)</Label>
                <Input
                  id="c-invoice"
                  {...createForm.register("invoiceNumber")}
                  className="mt-1"
                  placeholder="Add later if the vendor has not invoiced yet"
                />
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4">
                <h3 className="text-base font-semibold text-zinc-900">Parts on this order</h3>
                {!Number(vendorIdCreate) ? (
                  <p className="mt-2 max-w-prose text-sm leading-relaxed text-zinc-600">
                    Choose a vendor above first. Their catalogue loads here so you can pick parts, quantities, and unit
                    cost.
                  </p>
                ) : vendorPartsCreate.length === 0 ? (
                  <p className="mt-2 max-w-prose text-sm text-amber-800">
                    No parts are linked to this vendor yet. Add parts in Inventory and assign this vendor before
                    ordering.
                  </p>
                ) : (
                  <>
                    <p className="mt-1 max-w-prose text-xs leading-relaxed text-zinc-500">
                      Each row is one part from this vendor’s catalogue. Adjust quantity and unit price as needed.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3 h-9 w-auto shrink-0 px-3 text-xs font-medium"
                      onClick={() => appendCreate({ partId: 0, quantity: 1, unitPrice: 0 })}
                    >
                      <Plus className="mr-1.5 size-3.5" />
                      Add part
                    </Button>
                    <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
                      <div className="min-w-[36rem]">
                        <div
                          className={cn(
                            PO_PART_ROW_GRID,
                            "border-b border-zinc-100 bg-zinc-50/90 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500"
                          )}
                        >
                          <span className="sr-only">Remove</span>
                          <span>Part</span>
                          <span>Qty</span>
                          <span>Unit ({symbol})</span>
                        </div>
                        <div className="divide-y divide-zinc-100">
                          {createFields.map((field, index) => (
                            <div key={field.id} className={cn(PO_PART_ROW_GRID, "px-3 py-2.5")}>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9 w-9 shrink-0 p-0 text-zinc-400 hover:border-red-200 hover:text-red-600"
                                onClick={() => removeCreate(index)}
                                disabled={createFields.length <= 1}
                                aria-label="Remove part"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                              <Controller
                                control={createForm.control}
                                name={`items.${index}.partId`}
                                render={({ field: f }) => (
                                  <Select
                                    className="h-9 min-w-0 w-full bg-white text-sm"
                                    value={String(f.value || 0)}
                                    onChange={(e) => {
                                      const pid = Number(e.target.value)
                                      f.onChange(pid)
                                      const p = vendorPartsCreate.find((x) => x.partId === pid)
                                      if (p) createForm.setValue(`items.${index}.unitPrice`, convert(p.costPricePerUnit))
                                    }}
                                  >
                                    <option value={0}>Select part…</option>
                                    {vendorPartsCreate.map((p) => (
                                      <option key={p.partId} value={p.partId}>
                                        {p.partName} ({formatCurrency(p.costPricePerUnit)})
                                      </option>
                                    ))}
                                  </Select>
                                )}
                              />
                              <Input type="number" min={1} className="h-9 w-full min-w-0" {...createForm.register(`items.${index}.quantity`)} />
                              <Input type="number" step="0.01" className="h-9 w-full min-w-0" {...createForm.register(`items.${index}.unitPrice`)} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
                {createForm.formState.errors.items?.root && (
                  <p className="mt-2 text-xs text-red-500">{createForm.formState.errors.items.root.message}</p>
                )}
              </div>
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button variant="outline" type="button" className="w-auto" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="w-auto" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Saving…" : "Create draft"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </UserHeader>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input placeholder="Search PO #, invoice, vendor, status…" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-zinc-500">Vendor filter</Label>
          <Select
            className="max-w-xs bg-white"
            value={String(vendorFilter)}
            onChange={(e) => {
              setVendorFilter(Number(e.target.value))
              setPage(1)
            }}
          >
            <option value={0}>All vendors</option>
            {vendors.map((v) => (
              <option key={v.vendorId} value={v.vendorId}>
                {v.vendorName}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO #</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-zinc-500">
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-zinc-500">
                  No purchase orders.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((o) => (
                <TableRow key={o.purchaseOrderId}>
                  <TableCell className="font-medium">#{o.purchaseOrderId}</TableCell>
                  <TableCell>{o.vendorName ?? `Vendor ${o.vendorId}`}</TableCell>
                  <TableCell>
                    <PoStatusBadge po={o} />
                  </TableCell>
                  <TableCell>{o.invoiceNumber ?? "—"}</TableCell>
                  <TableCell className="text-zinc-600">
                    {o.orderDate ? format(new Date(o.orderDate), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell>{formatCurrency(o.totalAmount ?? 0)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" className="h-8 px-2 text-xs" onClick={() => setDetailId(o.purchaseOrderId)}>
                      <Eye className="mr-1 size-3" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {vendorFilter === 0 ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Page {listPaged?.page ?? page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="h-9 px-3" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button variant="outline" className="h-9 px-3" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={detailId != null} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-4xl overflow-y-auto overflow-x-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              Purchase order #{detailId}
              {detail ? <PoStatusBadge po={detail} /> : null}
            </DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <p className="py-8 text-center text-zinc-500">Loading…</p>
          ) : detail ? (
            <div className="space-y-6 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <p>
                  <span className="text-zinc-500">Vendor:</span> {detail.vendorName ?? detail.vendorId}
                </p>
                <p>
                  <span className="text-zinc-500">Order date:</span>{" "}
                  {detail.orderDate ? format(new Date(detail.orderDate), "PPp") : "—"}
                </p>
                <p>
                  <span className="text-zinc-500">Sent to vendor:</span>{" "}
                  {detail.sentToVendorAt ? format(new Date(detail.sentToVendorAt), "PPp") : "—"}
                </p>
                <p>
                  <span className="text-zinc-500">Confirmed:</span>{" "}
                  {detail.confirmedAt ? format(new Date(detail.confirmedAt), "PPp") : "—"}
                </p>
                <p>
                  <span className="text-zinc-500">Delivered:</span>{" "}
                  {detail.deliveredAt ? format(new Date(detail.deliveredAt), "PPp") : "—"}
                </p>
                <p>
                  <span className="text-zinc-500">Total:</span> {formatCurrency(detail.totalAmount)}
                </p>
              </div>

              <form
                className="space-y-4"
                onSubmit={editForm.handleSubmit((d) => {
                  if (!editableDetail) return
                  updateMutation.mutate(d)
                })}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="e-invoice">Vendor invoice #</Label>
                    <Input
                      id="e-invoice"
                      {...editForm.register("invoiceNumber")}
                      className="mt-1"
                      disabled={!editableDetail}
                      placeholder="Required before delivery"
                    />
                  </div>
                  {/* <div className="sm:col-span-2">
                    <Label htmlFor="e-notes">Notes</Label>
                    <textarea
                      id="e-notes"
                      {...editForm.register("notes")}
                      disabled={!editableDetail}
                      rows={2}
                      className={cn(
                        "mt-1 flex w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-zinc-500",
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
                      )}
                    />
                  </div> */}
                </div>

                <div>
                  <h3 className="text-base font-semibold text-zinc-900">Parts on this order</h3>
                  {editableDetail ? (
                    <p className="mt-1 max-w-prose text-xs text-zinc-500">
                      Update quantities and costs if the vendor changed the order. Saving does not add stock until you
                      mark the order delivered.
                    </p>
                  ) : null}
                  {editableDetail ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3 h-9 w-auto shrink-0 px-3 text-xs font-medium"
                      onClick={() => appendEdit({ partId: 0, quantity: 1, unitPrice: 0 })}
                    >
                      <Plus className="mr-1.5 size-3.5" />
                      Add part
                    </Button>
                  ) : null}
                  <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
                    <div className="min-w-[36rem]">
                      <div
                        className={cn(
                          PO_PART_ROW_GRID,
                          "border-b border-zinc-100 bg-zinc-50/90 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500"
                        )}
                      >
                        <span className="sr-only">Remove</span>
                        <span>Part</span>
                        <span>Qty</span>
                        <span>Unit ({symbol})</span>
                      </div>
                      <div className="divide-y divide-zinc-100">
                        {editFields.map((field, index) => (
                          <div key={field.id} className={cn(PO_PART_ROW_GRID, "bg-zinc-50/40 px-3 py-2.5")}>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 w-9 shrink-0 p-0 text-zinc-400 hover:border-red-200 hover:text-red-600"
                              onClick={() => removeEdit(index)}
                              disabled={!editableDetail || editFields.length <= 1}
                              aria-label="Remove part"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                            <Controller
                              control={editForm.control}
                              name={`items.${index}.partId`}
                              render={({ field: f }) => (
                                <Select
                                  className="h-9 min-w-0 w-full bg-white text-sm"
                                  disabled={!editableDetail}
                                  value={String(f.value || 0)}
                                  onChange={(e) => {
                                    const pid = Number(e.target.value)
                                    f.onChange(pid)
                                    const p = vendorPartsDetail.find((x) => x.partId === pid)
                                    if (p) editForm.setValue(`items.${index}.unitPrice`, convert(p.costPricePerUnit))
                                  }}
                                >
                                  <option value={0}>Select part…</option>
                                  {vendorPartsDetail.map((p) => (
                                    <option key={p.partId} value={p.partId}>
                                      {p.partName} ({formatCurrency(p.costPricePerUnit)})
                                    </option>
                                  ))}
                                </Select>
                              )}
                            />
                            <Input
                              type="number"
                              min={1}
                              className="h-9 w-full min-w-0 bg-white"
                              disabled={!editableDetail}
                              {...editForm.register(`items.${index}.quantity`)}
                            />
                            <Input
                              type="number"
                              step="0.01"
                              className="h-9 w-full min-w-0 bg-white"
                              disabled={!editableDetail}
                              {...editForm.register(`items.${index}.unitPrice`)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {editableDetail ? (
                  <Button type="submit" variant="outline" disabled={updateMutation.isPending} className="sm:w-auto">
                    {updateMutation.isPending ? "Saving…" : "Save changes"}
                  </Button>
                ) : (
                  <p className="text-xs text-zinc-500">This purchase order is read-only.</p>
                )}
              </form>

              <div className="space-y-3 border-t border-zinc-100 pt-4">
                <p className="font-medium text-zinc-900">Workflow</p>
                {showSendToVendor ? (
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 space-y-2">
                    <Label htmlFor="send-msg">Message to vendor</Label>
                    <textarea
                      id="send-msg"
                      value={sendMessage}
                      onChange={(e) => setSendMessage(e.target.value)}
                      rows={2}
                      className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950"
                    />
                    <Button type="button" className="gap-2 sm:w-auto" onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>
                      <Send className="size-4" />
                      {sendMutation.isPending ? "Sending…" : "Send to vendor"}
                    </Button>
                  </div>
                ) : null}

                {showConfirm ? (
                  <div className="rounded-lg border border-violet-100 bg-violet-50/40 p-3 space-y-2">
                    <p className="text-xs text-violet-900">When you have the vendor invoice number and lines are final, confirm the PO.</p>
                    <Button type="button" variant="outline" className="gap-2 sm:w-auto" onClick={onConfirmSubmit} disabled={confirmMutation.isPending}>
                      <CheckCircle className="size-4" />
                      {confirmMutation.isPending ? "Confirming…" : "Confirm purchase order"}
                    </Button>
                  </div>
                ) : null}

                {showDeliver ? (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3 space-y-2">
                    <p className="text-xs text-emerald-900">Only when goods arrive. This adds stock in inventory.</p>
                    <Label htmlFor="deliver-notes">Receipt notes</Label>
                    <textarea
                      id="deliver-notes"
                      value={deliverNotes}
                      onChange={(e) => setDeliverNotes(e.target.value)}
                      rows={2}
                      className="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950"
                    />
                    <Button
                      type="button"
                      className="gap-2 border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800 sm:w-auto"
                      onClick={() => deliverMutation.mutate(deliverNotes)}
                      disabled={deliverMutation.isPending}
                    >
                      <PackageCheck className="size-4" />
                      {deliverMutation.isPending ? "Updating…" : "Mark delivered"}
                    </Button>
                  </div>
                ) : null}
              </div>

              <div>
                <p className="mb-2 font-medium text-zinc-900">Activity</p>
                <LogTimeline logs={detail.logs} />
              </div>
            </div>
          ) : (
            <p className="text-red-600">Could not load detail.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
