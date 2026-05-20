"use client"

import { useState, useMemo, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Search, Mail, CheckCircle, Trash2, Eye, Wrench, Package } from "lucide-react"

import { useAuthStore } from "@/lib/store/auth-store"
import {
  getStaffInvoices,
  getStaffInvoiceDetail,
  createStaffInvoice,
  markStaffInvoicePaid,
  emailStaffInvoice,
  searchStaffCustomers,
  getStaffCustomerDetail,
  getStaffParts,
  getStaffPartsByCategory,
  searchStaffParts,
  getStaffAllAppointments,
  getStaffServiceRecords,
  type ServiceRecord,
} from "@/lib/api"
import { UserHeader } from "@/components/layout/user-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { useCurrency } from "@/lib/hooks/use-currency"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

/** Part rows on sales invoice: room for part name; scroll horizontally on narrow screens. */
const STAFF_PART_ROW_GRID =
  "grid grid-cols-[2.5rem_minmax(13rem,1fr)_4.75rem_6.75rem] items-center gap-x-3 gap-y-1 sm:grid-cols-[2.5rem_minmax(16rem,1fr)_5rem_7rem]"

const invoiceItemSchema = z.object({
  partId: z.coerce.number().min(1, "Part required"),
  quantity: z.coerce.number().min(1, "Min 1"),
  /** Empty = use catalog selling price */
  customUnitPrice: z.string().optional(),
})

const invoiceSchema = z
  .object({
    invoiceSource: z.enum(["parts", "appointment"]),
    linkedAppointmentId: z.coerce.number().optional(),
    customerId: z.coerce.number().min(1, "Customer required"),
    vehicleId: z.coerce.number().min(1, "Vehicle required"),
    dueDate: z.string().min(1, "Due date required"),
    isPaid: z.boolean().default(false),
    paymentMethod: z.string().optional(),
    discountAmount: z.coerce.number().min(0).default(0),
    serviceCharge: z.coerce.number().min(0).default(0),
    items: z.array(invoiceItemSchema).min(1, "Add at least one part"),
  })
  .superRefine((data, ctx) => {
    if (data.invoiceSource === "appointment") {
      if (!data.linkedAppointmentId || data.linkedAppointmentId < 1) {
        ctx.addIssue({
          code: "custom",
          message: "Choose the completed appointment this invoice is for.",
          path: ["linkedAppointmentId"],
        })
      }
    }
  })

type InvoiceFormValues = z.infer<typeof invoiceSchema>

function lineUnitPrice(
  item: { partId: number; quantity: number; customUnitPrice?: string },
  parts: { partId: number; sellingPricePerUnit: number }[]
): number {
  const custom = parseFloat((item.customUnitPrice || "").trim())
  if (!Number.isNaN(custom) && custom >= 0) return custom
  const part = parts.find((p) => p.partId === Number(item.partId))
  return part?.sellingPricePerUnit ?? 0
}

export default function InvoicesPage() {
  const { accessToken } = useAuthStore()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const { symbol, format: formatCurrency, convertToBase } = useCurrency()

  const [search, setSearch] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null)
  const [partsPage, setPartsPage] = useState(1)
  const [partCategory, setPartCategory] = useState("All")
  const [partSearch, setPartSearch] = useState("")
  const [pendingPreselect, setPendingPreselect] = useState<{
    customerId: number | null
    vehicleId: number | null
    linkedAppointmentId: number | null
  } | null>(null)

  const [debouncedSearch, setDebouncedSearch] = useState("")

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(handler)
  }, [search])

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ["staff-invoices", page, debouncedSearch],
    queryFn: () => getStaffInvoices(accessToken || "", page, 20, debouncedSearch),
    enabled: !!accessToken,
  })
  const invoices = invoicesData?.items || []

  const { data: customersData } = useQuery({
    queryKey: ["staff-customers-list"],
    queryFn: () => searchStaffCustomers(accessToken || "", ""),
    enabled: !!accessToken,
  })
  const customers = customersData?.items || []

  const { data: partsData } = useQuery({
    queryKey: ["staff-parts", partsPage, partCategory, partSearch],
    queryFn: () => {
      const q = partSearch.trim()
      if (q) return searchStaffParts(accessToken || "", q, partsPage, 20)
      if (partCategory !== "All") return getStaffPartsByCategory(accessToken || "", partCategory, partsPage, 20)
      return getStaffParts(accessToken || "", partsPage, 20)
    },
    enabled: !!accessToken,
  })
  const parts = partsData?.items || []
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(parts.map((p) => p.category).filter(Boolean)))],
    [parts]
  )

  const { data: allAppointmentsData } = useQuery({
    queryKey: ["staff-appointments-for-invoice"],
    queryFn: () => getStaffAllAppointments(accessToken || "", 1, 200),
    enabled: !!accessToken && isAddOpen,
  })
  const allAppointments = allAppointmentsData?.items || []

  const { data: serviceRecordsData } = useQuery({
    queryKey: ["staff-service-records-for-invoice"],
    queryFn: () => getStaffServiceRecords(accessToken || "", 1, 100),
    enabled: !!accessToken && isAddOpen,
  })
  const serviceRecords = serviceRecordsData?.items || []

  const addForm = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema) as any,
    defaultValues: {
      invoiceSource: "parts",
      linkedAppointmentId: 0,
      customerId: 0,
      vehicleId: 0,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isPaid: false,
      paymentMethod: "CreditCard",
      discountAmount: 0,
      serviceCharge: 0,
      items: [{ partId: 0, quantity: 1, customUnitPrice: "" }],
    },
  })

  const { fields: itemFields, append: appendItem, remove: removeItem, replace: replaceItems } = useFieldArray({
    control: addForm.control,
    name: "items",
  })

  const formValues = addForm.watch()
  const selectedCustomerId = formValues.customerId
  const selectedVehicleId = formValues.vehicleId
  const selectedItems = formValues.items || []
  const discountAmount = formValues.discountAmount
  const serviceCharge = formValues.serviceCharge
  const isPaid = formValues.isPaid
  const paymentMethod = formValues.paymentMethod
  const invoiceSource = formValues.invoiceSource
  const linkedAppointmentId = formValues.linkedAppointmentId

  const selectedCustomer = customers.find((c) => c.userId === Number(selectedCustomerId))
  const customerVehicles = selectedCustomer?.vehicles || []

  const selectedVehicle = customerVehicles.find((v) => v.vehicleId === Number(selectedVehicleId))

  const { data: selectedCustomerDetail } = useQuery({
    queryKey: ["staff-customer-detail", selectedCustomerId],
    queryFn: () => getStaffCustomerDetail(accessToken || "", Number(selectedCustomerId)),
    enabled: !!accessToken && Number(selectedCustomerId) > 0,
  })

  const completedAppointmentsForVehicle = useMemo(() => {
    if (!selectedVehicle?.vehicleNumber) return []
    const vn = selectedVehicle.vehicleNumber.trim().toLowerCase()
    return allAppointments.filter((a) => {
      const match =
        (a.vehicleNumber || "").trim().toLowerCase() === vn ||
        (a.vehicleId != null && a.vehicleId === Number(selectedVehicleId))
      return match && a.status === "Completed" && !a.isInvoiced
    })
  }, [allAppointments, selectedVehicle, selectedVehicleId])

  const selectedAppointment = useMemo(
    () => completedAppointmentsForVehicle.find((a) => a.appointmentId === Number(linkedAppointmentId)),
    [completedAppointmentsForVehicle, linkedAppointmentId]
  )

  const serviceRecordsForVisit = useMemo(() => {
    if (!linkedAppointmentId) return []
    return serviceRecords.filter((r: ServiceRecord) => r.appointmentId === Number(linkedAppointmentId))
  }, [serviceRecords, linkedAppointmentId])

  useEffect(() => {
    if (invoiceSource === "parts") {
      addForm.setValue("linkedAppointmentId", 0)
    }
  }, [invoiceSource, addForm])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("action") === "new") {
        setIsAddOpen(true)
        const source = params.get("source")
        if (source === "appointment") {
          addForm.setValue("invoiceSource", "appointment")
          const appId = params.get("linkedAppointmentId")
          const custId = params.get("customerId")
          const vehId = params.get("vehicleId")
          setPendingPreselect({
            customerId: custId ? Number(custId) : null,
            vehicleId: vehId ? Number(vehId) : null,
            linkedAppointmentId: appId ? Number(appId) : null
          })
        }
        // Clear URL so refreshing doesn't reopen modal
        window.history.replaceState({}, "", "/staff/invoices")
      }
    }
  }, [addForm])

  useEffect(() => {
    if (!pendingPreselect || customers.length === 0) return

    const { customerId, vehicleId, linkedAppointmentId } = pendingPreselect

    if (customerId) {
      addForm.setValue("customerId", customerId)
      
      const customer = customers.find(c => c.userId === customerId)
      if (customer && customer.vehicles) {
        if (vehicleId && customer.vehicles.some(v => v.vehicleId === vehicleId)) {
          addForm.setValue("vehicleId", vehicleId)
          
          if (linkedAppointmentId) {
            if (allAppointments.length > 0) {
              addForm.setValue("linkedAppointmentId", linkedAppointmentId)
              setPendingPreselect(null)
            }
          } else {
            setPendingPreselect(null)
          }
        } else {
          setPendingPreselect(null)
        }
      }
    } else {
      setPendingPreselect(null)
    }
  }, [customers, allAppointments, pendingPreselect, addForm])

  const minDateTime = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)

  const subTotal = useMemo(() => {
    return selectedItems.reduce((total, item) => {
      const unit = lineUnitPrice(item, parts)
      return total + unit * (Number(item.quantity) || 0)
    }, 0)
  }, [JSON.stringify(selectedItems), parts])

  const usdServiceCharge = convertToBase(Number(serviceCharge) || 0)
  const usdManualDiscount = convertToBase(Number(discountAmount) || 0)

  const calculatedServiceCharge = usdServiceCharge

  const partsIndices = useMemo(() => {
    return itemFields.map((field, idx) => {
      return { field, idx }
    })
  }, [itemFields, JSON.stringify(selectedItems), parts])

  /** Loyalty: 10% off pre-tax line total if the customer's previous paid invoice total is >= 5000 */
  const LOYALTY_THRESHOLD = 5000
  const LOYALTY_RATE = 0.1
  const loyaltyDiscount = useMemo(() => {
    const previousTotalSpend = selectedCustomerDetail?.totalSpend || selectedCustomer?.totalSpend || 0
    if (previousTotalSpend >= LOYALTY_THRESHOLD) {
      return Math.round(subTotal * LOYALTY_RATE * 100) / 100
    }
    return 0
  }, [subTotal, selectedCustomerDetail, selectedCustomer])

  const manualDiscount = usdManualDiscount
  const finalAmount = Math.max(0, subTotal + calculatedServiceCharge - loyaltyDiscount - manualDiscount)
  const currentBalance = selectedCustomerDetail?.creditsRemaining ?? selectedCustomer?.creditsRemaining ?? 0
  const CREDIT_LIMIT = 50000
  const wouldExceedCredit = !isPaid && Number(currentBalance) + finalAmount > CREDIT_LIMIT

  const createMutation = useMutation({
    mutationFn: async (data: InvoiceFormValues) => {
      const completeItems = data.items.map((item) => ({
        partId: Number(item.partId),
        quantity: Number(item.quantity),
        pricePerUnit: lineUnitPrice(item, parts),
      }))

      const usdManualDiscount = convertToBase(Number(data.discountAmount) || 0)
      const usdServiceCharge = convertToBase(Number(data.serviceCharge) || 0)

      return createStaffInvoice(accessToken || "", {
        customerId: Number(data.customerId),
        vehicleId: Number(data.vehicleId),
        isPaid: Boolean(data.isPaid),
        dueDate: data.dueDate,

        discountAmount: loyaltyDiscount + usdManualDiscount,
        serviceCharge: usdServiceCharge,
        invoiceType: data.invoiceSource === "appointment" ? "Appointment" : "Parts",
        appointmentId:
          data.invoiceSource === "appointment" && data.linkedAppointmentId
            ? Number(data.linkedAppointmentId)
            : undefined,
        items: completeItems,
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["staff-invoices"] })
      queryClient.invalidateQueries({ queryKey: ["staff-customer-detail", variables.customerId] })
      queryClient.invalidateQueries({ queryKey: ["staff-customers-list"] })
      queryClient.invalidateQueries({ queryKey: ["staff-appointments-for-invoice"] })
      queryClient.invalidateQueries({ queryKey: ["staff-service-records-for-invoice"] })
      queryClient.invalidateQueries({ queryKey: ["staff-appointments"] })
      queryClient.invalidateQueries({ queryKey: ["staff-schedule-summary"] })
      addToast({
        title: "Invoice created",
        description: variables.isPaid
          ? "Recorded as paid."
          : "Open balance: customer’s account / credit will reflect this amount when your API posts it.",
        variant: "success",
      })
      setIsAddOpen(false)
      addForm.reset({
        invoiceSource: "parts",
        linkedAppointmentId: 0,
        customerId: 0,
        vehicleId: 0,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isPaid: false,
        discountAmount: 0,
        serviceCharge: 0,
        items: [{ partId: 0, quantity: 1, customUnitPrice: "" }],
      })
    },
    onError: (e) => {
      addToast({ title: (e as Error).message || "Failed to create invoice", variant: "error" })
    },
  })

  const markPaidMutation = useMutation({
    mutationFn: (id: number) => markStaffInvoicePaid(accessToken || "", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-invoices"] })
      addToast({ title: "Invoice marked as paid", variant: "success" })
    },
  })

  const emailMutation = useMutation({
    mutationFn: (id: number) => emailStaffInvoice(accessToken || "", id),
    onSuccess: () => {
      addToast({ title: "Invoice sent to customer email", variant: "success" })
    },
  })



  const { data: invoiceDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["staff-invoice-detail", selectedInvoiceId],
    queryFn: () => getStaffInvoiceDetail(accessToken || "", selectedInvoiceId as number),
    enabled: !!accessToken && selectedInvoiceId !== null,
  })

  return (
    <>
      <UserHeader
        title="Sales Invoices"
        subtitle="Create sales invoices for parts and services, then post to the customer's balance when unpaid."
      >
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="h-10 w-full shrink-0 px-4 sm:w-auto">
              <Plus className="mr-2 size-4" />
              Create invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-4xl overflow-y-auto overflow-x-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Create sales invoice</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={addForm.handleSubmit((data) => {
                if (wouldExceedCredit) {
                  addToast({
                    title: "Credit limit exceeded",
                    description: `Unpaid total would exceed the ${CREDIT_LIMIT.toLocaleString()} cap. Mark paid, discount more, or split the invoice.`,
                    variant: "error",
                  })
                  return
                }
                createMutation.mutate(data)
              })}
              className="space-y-6"
            >
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Invoice is for</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <label
                    className={cn(
                      "flex flex-1 cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                      invoiceSource === "parts"
                        ? "border-zinc-900 bg-white shadow-sm"
                        : "border-zinc-200 bg-white/60 hover:border-zinc-300"
                    )}
                  >
                    <input
                      type="radio"
                      className="mt-1"
                      value="parts"
                      {...addForm.register("invoiceSource")}
                    />
                    <div>
                      <div className="flex items-center gap-2 font-medium text-zinc-950">
                        <Package className="size-4" /> Parts sale
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">Counter sale using catalog parts only.</p>
                    </div>
                  </label>
                  <label
                    className={cn(
                      "flex flex-1 cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                      invoiceSource === "appointment"
                        ? "border-zinc-900 bg-white shadow-sm"
                        : "border-zinc-200 bg-white/60 hover:border-zinc-300"
                    )}
                  >
                    <input
                      type="radio"
                      className="mt-1"
                      value="appointment"
                      {...addForm.register("invoiceSource")}
                    />
                    <div>
                      <div className="flex items-center gap-2 font-medium text-zinc-950">
                        <Wrench className="size-4" /> Appointment visit
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        Link this bill to a completed vehicle service appointment.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerId">Customer</Label>
                  <Select id="customerId" {...addForm.register("customerId", { valueAsNumber: true })} className="mt-1">
                    <option value={0} disabled>
                      Select customer…
                    </option>
                    {customers.map((c) => (
                      <option key={c.userId} value={c.userId}>
                        {c.fullName} ({c.phone})
                      </option>
                    ))}
                  </Select>
                  {addForm.formState.errors.customerId && (
                    <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.customerId.message}</p>
                  )}
                  {Number(selectedCustomerId) > 0 ? (
                    <p className={`mt-2 text-xs ${wouldExceedCredit ? "text-red-600" : "text-zinc-500"}`}>
                      Current balance: {formatCurrency(currentBalance)} • Credit ceiling: {formatCurrency(CREDIT_LIMIT)}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label htmlFor="vehicleId">Vehicle</Label>
                  <Select
                    id="vehicleId"
                    {...addForm.register("vehicleId", { valueAsNumber: true })}
                    className="mt-1"
                    disabled={!selectedCustomerId || selectedCustomerId === 0}
                  >
                    <option value={0} disabled>
                      Select vehicle…
                    </option>
                    {customerVehicles.map((v) => (
                      <option key={v.vehicleId} value={v.vehicleId}>
                        {v.brand} {v.model} ({v.vehicleNumber})
                      </option>
                    ))}
                  </Select>
                  {addForm.formState.errors.vehicleId && (
                    <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.vehicleId.message}</p>
                  )}
                </div>
              </div>

              {invoiceSource === "appointment" && Number(selectedVehicleId) > 0 && (
                <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <Label htmlFor="linkedAppointmentId">Visit (appointment)</Label>
                  </div>
                  <Select
                    id="linkedAppointmentId"
                    {...addForm.register("linkedAppointmentId", { valueAsNumber: true })}
                    className="mt-1"
                    disabled={completedAppointmentsForVehicle.length === 0}
                  >
                    <option value={0}>Select completed visit…</option>
                    {completedAppointmentsForVehicle.map((a) => (
                      <option key={a.appointmentId} value={a.appointmentId}>
                        #{a.appointmentId} · {a.status} · {format(new Date(a.appointmentDate), "MMM d, HH:mm")}
                      </option>
                    ))}
                  </Select>
                  {addForm.formState.errors.linkedAppointmentId && (
                    <p className="text-xs text-red-500">{String(addForm.formState.errors.linkedAppointmentId.message)}</p>
                  )}
                  {completedAppointmentsForVehicle.length === 0 ? (
                    <p className="text-xs text-amber-800">No completed/confirmed appointments for this vehicle yet.</p>
                  ) : null}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dueDate">Due date (UTC)</Label>
                  <Input
                    id="dueDate"
                    type="datetime-local"
                    min={minDateTime}
                    className="mt-1"
                    value={(() => {
                      const iso = addForm.getValues("dueDate")
                      if (!iso) return ""
                      const d = new Date(iso)
                      const pad = (n: number) => String(n).padStart(2, "0")
                      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
                    })()}
                    onChange={(e) => {
                      const v = e.target.value
                      if (!v) return
                      addForm.setValue("dueDate", new Date(v + ":00.000Z").toISOString(), { shouldValidate: true })
                    }}
                  />
                  {addForm.formState.errors.dueDate && (
                    <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.dueDate.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="isPaid">Payment</Label>
                  <Select
                    id="isPaid"
                    className="mt-1"
                    value={String(addForm.getValues("isPaid"))}
                    onChange={(e) => addForm.setValue("isPaid", e.target.value === "true")}
                  >
                    <option value="false">Unpaid (adds to customer balance / AR)</option>
                    <option value="true">Paid now</option>
                  </Select>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Unpaid invoices increase the customer balance.
                  </p>
                  {isPaid && (
                    <div className="mt-3">
                      <Label htmlFor="paymentMethod">Payment Method</Label>
                      <Select id="paymentMethod" className="mt-1" {...addForm.register("paymentMethod")}>
                        <option value="CreditCard">Credit Card</option>
                        <option value="Cash">Cash</option>
                        <option value="BankTransfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
                <h3 className="text-base font-semibold text-zinc-950">Parts</h3>
                <p className="mt-1 max-w-prose text-xs leading-relaxed text-zinc-600">
                  Search catalog and add parts to the invoice.
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Search catalog…"
                    value={partSearch}
                    onChange={(e) => {
                      setPartSearch(e.target.value)
                      setPartsPage(1)
                    }}
                  />
                  <Select
                    value={partCategory}
                    onChange={(e) => {
                      setPartCategory(e.target.value)
                      setPartsPage(1)
                    }}
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </Select>
                </div>

                {addForm.formState.errors.items?.root && (
                  <p className="mt-3 text-xs text-red-500">{addForm.formState.errors.items.root.message}</p>
                )}
                <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                  <div className="border-b border-zinc-100 bg-zinc-50/50 px-4 py-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Items</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-7 w-auto px-2 text-[10px] font-medium"
                      onClick={() => appendItem({ partId: 0, quantity: 1, customUnitPrice: "" })}
                    >
                      <Plus className="mr-1 size-3" />
                      Add Part
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="min-w-[36rem]">
                      <div
                        className={cn(
                          STAFF_PART_ROW_GRID,
                          "border-b border-zinc-100 bg-zinc-50/90 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500"
                        )}
                      >
                        <span></span>
                        <span>Part</span>
                        <span className="text-center">Qty</span>
                        <span className="text-right">Unit ({symbol})</span>
                      </div>
                      <div className="divide-y divide-zinc-100">
                        {partsIndices.map(({ field, idx }) => (
                          <div key={field.id} className={cn(STAFF_PART_ROW_GRID, "px-3 py-2.5")}>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 w-9 shrink-0 p-0 text-zinc-400 hover:border-red-200 hover:text-red-600"
                              onClick={() => removeItem(idx)}
                              disabled={itemFields.length <= 1}
                              aria-label="Remove part"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                            <Controller
                              control={addForm.control}
                              name={`items.${idx}.partId`}
                              render={({ field: f }) => (
                                <Select
                                  className="h-9 min-w-0 w-full bg-white text-sm"
                                  value={String(f.value || 0)}
                                  onChange={(e) => f.onChange(Number(e.target.value))}
                                >
                                  <option value={0} disabled>
                                    Select part…
                                  </option>
                                  {parts.map((p) => (
                                    <option key={p.partId} value={p.partId}>
                                      {p.partName} ({formatCurrency(p.sellingPricePerUnit)})
                                    </option>
                                  ))}
                                </Select>
                              )}
                            />
                            <div>
                               <Input type="number" min={1} className="h-9 w-full min-w-0 text-center" {...addForm.register(`items.${idx}.quantity`)} />
                            </div>
                            <div className="flex h-9 items-center justify-end font-medium text-zinc-700 bg-zinc-50/80 border border-zinc-200 rounded-md px-3">
                              {formatCurrency(
                                selectedItems?.[idx]?.customUnitPrice
                                  ? parseFloat(selectedItems[idx].customUnitPrice)
                                  : (parts.find(p => p.partId === Number(selectedItems?.[idx]?.partId))?.sellingPricePerUnit ?? 0)
                              )}
                            </div>
                            <input type="hidden" {...addForm.register(`items.${idx}.customUnitPrice`)} />
                          </div>
                        ))}
                        {partsIndices.length === 0 && (
                          <p className="p-4 text-center text-xs text-zinc-500 italic">No parts added. Click "Add Part" above.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-zinc-500">
                    Catalog page {partsData?.page ?? partsPage} / {partsData?.totalPages ?? 1}
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="h-8 w-auto px-2 text-xs" disabled={partsPage <= 1} onClick={() => setPartsPage((p) => Math.max(1, p - 1))}>
                      Prev
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 w-auto px-2 text-xs"
                      disabled={Boolean(partsData && !partsData.hasNextPage)}
                      onClick={() => setPartsPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>

              {invoiceSource === "appointment" && (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-zinc-950">Service Charge</h3>
                    <p className="mt-0.5 text-xs text-zinc-500">Labor or service fee, separate from parts.</p>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">{symbol}</span>
                    <Input
                      id="serviceCharge"
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="0.00"
                      className="h-9 w-32 pl-7 pr-3 text-right font-medium"
                      {...addForm.register("serviceCharge")}
                    />
                  </div>
                </div>
              </div>
              )}

              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Subtotal</span>
                    <span className="font-medium">{formatCurrency(subTotal)}</span>
                  </div>
                  {loyaltyDiscount > 0 ? (
                    <div className="flex items-center justify-between text-sm text-emerald-700">
                      <span>Loyalty (10% on purchases over {formatCurrency(5000)})</span>
                      <span className="font-medium">-{formatCurrency(loyaltyDiscount)}</span>
                    </div>
                  ) : null}
                  {(Number(serviceCharge) || 0) > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">Service charge</span>
                      <span className="font-medium">{formatCurrency(serviceCharge)}</span>
                    </div>
                  )}


                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Additional discount ({symbol})</span>
                    <Input type="number" step="0.01" className="h-8 w-24 text-right" {...addForm.register("discountAmount")} />
                  </div>
                  <div className="flex items-center justify-between border-t border-zinc-200 pt-3">
                    <span className="font-semibold text-zinc-950">Total</span>
                    <span className="text-lg font-bold text-zinc-950">{formatCurrency(finalAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-zinc-100 pt-4">
                <Button variant="outline" type="button" className="w-auto" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="w-auto" disabled={createMutation.isPending || wouldExceedCredit}>
                  {createMutation.isPending ? "Saving…" : wouldExceedCredit ? "Over credit limit" : "Create invoice"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </UserHeader>

      <div className="relative mb-6 flex max-w-sm items-center">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
        <Input placeholder="Search by ID or customer…" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white pl-9" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-zinc-500">
                  Loading invoices…
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-zinc-500">
                  No invoices found.
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => (
                <TableRow key={inv.salesInvoiceId}>
                  <TableCell className="font-medium text-zinc-950">#{inv.salesInvoiceId}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-zinc-900">{inv.customerName}</span>
                      <span className="text-xs text-zinc-500">{inv.vehicleNumber}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {inv.invoiceType ? (
                      <Badge variant="outline">{inv.invoiceType}</Badge>
                    ) : inv.appointmentId ? (
                      <Badge variant="secondary">Visit #{inv.appointmentId}</Badge>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-600">{format(new Date(inv.invoiceDate), "MMM d, yyyy")}</TableCell>
                  <TableCell className="font-medium text-zinc-900">{formatCurrency(inv.finalAmount)}</TableCell>
                  <TableCell>
                    {inv.isPaid ? <Badge variant="success">Paid</Badge> : <Badge variant="outline">Unpaid</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button variant="outline" className="h-8 px-2 text-xs" onClick={() => setSelectedInvoiceId(inv.salesInvoiceId)}>
                        <Eye className="mr-1.5 size-3" />
                        View
                      </Button>
                      {!inv.isPaid && (
                        <Button
                          variant="outline"
                          className="h-8 px-2 text-xs"
                          onClick={() => markPaidMutation.mutate(inv.salesInvoiceId)}
                          disabled={markPaidMutation.isPending}
                        >
                          <CheckCircle className="mr-1.5 size-3" />
                          Mark paid
                        </Button>
                      )}
                      <Button variant="outline" className="h-8 px-2 text-xs" onClick={() => emailMutation.mutate(inv.salesInvoiceId)} disabled={emailMutation.isPending}>
                        <Mail className="mr-1.5 size-3" />
                        Email
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          Page {invoicesData?.page ?? page} of {invoicesData?.totalPages ?? 1} • {invoicesData?.totalItems ?? invoices.length} total
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
            disabled={!invoicesData?.hasNextPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={selectedInvoiceId !== null} onOpenChange={(open) => !open && setSelectedInvoiceId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Invoice details</DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="py-10 text-center text-zinc-500">Loading…</div>
          ) : invoiceDetail ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Invoice ID</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-950">#{invoiceDetail.salesInvoiceId}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Status</p>
                  <p className="mt-1">{invoiceDetail.isPaid ? <Badge variant="success">Paid</Badge> : <Badge variant="outline">Unpaid</Badge>}</p>
                </div>
                {invoiceDetail.invoiceType ? (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Type</p>
                    <p className="mt-1">
                      <Badge variant="outline">{invoiceDetail.invoiceType}</Badge>
                    </p>
                  </div>
                ) : null}
                {invoiceDetail.appointmentId ? (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Appointment</p>
                    <p className="mt-1 text-sm text-zinc-950">#{invoiceDetail.appointmentId}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Customer</p>
                  <p className="mt-1 text-sm text-zinc-950">{invoiceDetail.customerName || `#${invoiceDetail.customerId}`}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Vehicle</p>
                  <p className="mt-1 text-sm text-zinc-950">{invoiceDetail.vehicleNumber || `#${invoiceDetail.vehicleId}`}</p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Invoice date</p>
                  <p className="mt-1 text-sm text-zinc-950">
                    {invoiceDetail.invoiceDate ? format(new Date(invoiceDetail.invoiceDate), "PPp") : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Due date</p>
                  <p className="mt-1 text-sm text-zinc-950">
                    {invoiceDetail.dueDate ? format(new Date(invoiceDetail.dueDate), "PPp") : "—"}
                  </p>
                </div>
              </div>

              {invoiceDetail.items && invoiceDetail.items.filter(it => (it.partName || "").toLowerCase() !== "labor").length > 0 && (
                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                  <div className="border-b border-zinc-100 px-4 py-3 bg-zinc-50/50">
                    <p className="text-sm font-semibold text-zinc-950">Parts Used</p>
                  </div>
                  <div className="space-y-2 p-4">
                    {invoiceDetail.items
                      .filter(it => (it.partName || "").toLowerCase() !== "labor")
                      .map((it, idx) => (
                        <div
                          key={`${it.partId}-${idx}`}
                          className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-zinc-950">{it.partName || `Part #${it.partId}`}</p>
                            <p className="text-xs text-zinc-500">
                              Qty {it.quantity} • {formatCurrency(it.pricePerUnit)} each
                            </p>
                          </div>
                          <div className="font-semibold text-zinc-950">
                            {formatCurrency(it.totalPrice ?? it.quantity * it.pricePerUnit)}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {invoiceDetail.items && invoiceDetail.items.filter(it => (it.partName || "").toLowerCase() === "labor").length > 0 && (
                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white mt-4">
                  <div className="border-b border-zinc-100 px-4 py-3 bg-zinc-50/50">
                    <p className="text-sm font-semibold text-zinc-950">Services & Labor</p>
                  </div>
                  <div className="space-y-2 p-4">
                    {invoiceDetail.items
                      .filter(it => (it.partName || "").toLowerCase() === "labor")
                      .map((it, idx) => (
                        <div
                          key={`${it.partId}-${idx}`}
                          className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-zinc-950">{it.partName || `Labor`}</p>
                            <p className="text-xs text-zinc-500">
                              Qty {it.quantity} • {formatCurrency(it.pricePerUnit)} each
                            </p>
                          </div>
                          <div className="font-semibold text-zinc-950">
                            {formatCurrency(it.totalPrice ?? it.quantity * it.pricePerUnit)}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {(!invoiceDetail.items || invoiceDetail.items.length === 0) && (
                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                  <div className="border-b border-zinc-100 px-4 py-3">
                    <p className="text-sm font-semibold text-zinc-950">Items</p>
                  </div>
                  <div className="p-4 text-center text-sm text-zinc-500 italic">
                    No items on this invoice.
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <div className="w-72 space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Subtotal</span>
                    <span className="font-medium">{formatCurrency(invoiceDetail.subTotal ?? 0)}</span>
                  </div>
                  {Number(invoiceDetail.serviceCharge ?? 0) > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-500">Service Charge</span>
                      <span className="font-medium">{formatCurrency(invoiceDetail.serviceCharge)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">Discount</span>
                    <span className="font-medium">-{formatCurrency(invoiceDetail.discountAmount ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-zinc-200 pt-2">
                    <span className="font-semibold text-zinc-950">Total</span>
                    <span className="font-bold text-zinc-950">{formatCurrency(invoiceDetail.finalAmount ?? 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-zinc-500">Could not load invoice.</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
