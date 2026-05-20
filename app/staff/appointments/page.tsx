"use client"

import { useMemo, useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ClipboardList, Search } from "lucide-react"

import { useAuthStore } from "@/lib/store/auth-store"
import {
  getStaffAllAppointments,
  getStaffTodayAppointments,
  getStaffUpcomingAppointments,
  getStaffAppointmentDetail,
  getStaffScheduleSummary,
  createStaffServiceRecord,
  approveStaffAppointment,
  rejectStaffAppointment,
  completeStaffAppointment,
  staffAppointmentNoShow,
  rescheduleStaffAppointment,
  type StaffAppointment,
} from "@/lib/api"
import { UserHeader } from "@/components/layout/user-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import { format } from "date-fns"
import { useRouter } from "next/navigation"

const serviceRecordSchema = z.object({
  serviceDescription: z.string().min(1, "Description is required"),
})

type ServiceFormValues = z.infer<typeof serviceRecordSchema>

type StaffAction =
  | { kind: "approve"; appointment: StaffAppointment }
  | { kind: "reject"; appointment: StaffAppointment }
  | { kind: "noshow"; appointment: StaffAppointment }
  | { kind: "staffReschedule"; appointment: StaffAppointment }

function getStatusBadge(status: string) {
  switch (status) {
    case "Pending":
      return <Badge variant="secondary">Pending</Badge>
    case "Confirmed":
      return <Badge variant="outline">Confirmed</Badge>
    case "In Progress":
      return <Badge variant="outline">In Progress</Badge>
    case "Completed":
      return <Badge variant="success">Completed</Badge>
    case "Cancelled":
      return <Badge variant="danger">Cancelled</Badge>
    case "NoShow":
      return <Badge variant="danger">No-show</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="mt-1 text-sm text-zinc-950">{value ?? "—"}</div>
    </div>
  )
}

export default function AppointmentsPage() {
  const { accessToken } = useAuthStore()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<"today" | "upcoming" | "all">("today")
  const [search, setSearch] = useState("")
  const [startingServiceFor, setStartingServiceFor] = useState<StaffAppointment | null>(null)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null)
  const [staffAction, setStaffAction] = useState<StaffAction | null>(null)
  const [actionNotes, setActionNotes] = useState("")
  const [rescheduleLocal, setRescheduleLocal] = useState("")
  const [page, setPage] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState("")

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(handler)
  }, [search])

  const { data: scheduleSummary } = useQuery({
    queryKey: ["staff-schedule-summary"],
    queryFn: () => getStaffScheduleSummary(accessToken || ""),
    enabled: !!accessToken,
  })

  const { data: appointmentsData, isLoading: loadingApps } = useQuery({
    queryKey: ["staff-appointments", activeTab, page, debouncedSearch],
    queryFn: async () => {
      if (activeTab === "today") {
        const res = await getStaffTodayAppointments(accessToken || "")
        return { items: res }
      }
      if (activeTab === "upcoming") {
        const res = await getStaffUpcomingAppointments(accessToken || "")
        return { items: res }
      }
      return getStaffAllAppointments(accessToken || "", page, 20, debouncedSearch)
    },
    enabled: !!accessToken,
  })

  const appointments = appointmentsData?.items || []

  const { data: appointmentDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["staff-appointment-detail", selectedAppointmentId],
    queryFn: () => getStaffAppointmentDetail(accessToken || "", selectedAppointmentId as number),
    enabled: !!accessToken && selectedAppointmentId !== null,
  })

  const invalidateSchedule = () => {
    queryClient.invalidateQueries({ queryKey: ["staff-appointments"] })
    queryClient.invalidateQueries({ queryKey: ["staff-schedule-summary"] })
    queryClient.invalidateQueries({ queryKey: ["staff-appointment-detail"] })
  }

  const startServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormValues) => {
      if (!startingServiceFor) throw new Error("No appointment selected")
      await createStaffServiceRecord(accessToken || "", {
        appointmentId: startingServiceFor.appointmentId,
        serviceDescription: data.serviceDescription,
        serviceCost: 0,
      })
    },
    onSuccess: () => {
      invalidateSchedule()
      addToast({
        title: "Service record saved",
        description: "Billing still runs through invoices after work is priced.",
        variant: "success",
      })
      setStartingServiceFor(null)
      serviceForm.reset()
    },
    onError: () => addToast({ title: "Could not save service record", variant: "error" }),
  })

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!staffAction || staffAction.kind !== "approve") return
      await approveStaffAppointment(accessToken || "", staffAction.appointment.appointmentId, actionNotes.trim() || undefined)
    },
    onSuccess: () => {
      invalidateSchedule()
      addToast({
        title: "Appointment approved",
        description: "The customer receives an email confirmation.",
        variant: "success",
      })
      setStaffAction(null)
      setActionNotes("")
      setSelectedAppointmentId(null)
    },
    onError: (e) => addToast({ title: (e as Error).message || "Approve failed", variant: "error" }),
  })

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!staffAction || staffAction.kind !== "reject") return
      await rejectStaffAppointment(accessToken || "", staffAction.appointment.appointmentId, actionNotes.trim())
    },
    onSuccess: () => {
      invalidateSchedule()
      addToast({
        title: "Appointment declined",
        description: "The customer receives an email with your note.",
        variant: "success",
      })
      setStaffAction(null)
      setActionNotes("")
      setSelectedAppointmentId(null)
    },
    onError: (e) => addToast({ title: (e as Error).message || "Decline failed", variant: "error" }),
  })

  const noShowMutation = useMutation({
    mutationFn: async () => {
      if (!staffAction || staffAction.kind !== "noshow") return
      await staffAppointmentNoShow(
        accessToken || "",
        staffAction.appointment.appointmentId,
        actionNotes.trim() || undefined
      )
    },
    onSuccess: () => {
      invalidateSchedule()
      addToast({ title: "Marked no-show", variant: "success" })
      setStaffAction(null)
      setActionNotes("")
    },
    onError: (e) => addToast({ title: (e as Error).message || "Update failed", variant: "error" }),
  })

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      if (!staffAction || staffAction.kind !== "staffReschedule") return
      const iso = new Date(rescheduleLocal).toISOString()
      await rescheduleStaffAppointment(accessToken || "", staffAction.appointment.appointmentId, iso)
    },
    onSuccess: () => {
      invalidateSchedule()
      addToast({
        title: "Appointment rescheduled",
        description: "Customer is emailed; appointment returns to pending until re-approved.",
        variant: "success",
      })
      setStaffAction(null)
      setRescheduleLocal("")
    },
    onError: (e) => addToast({ title: (e as Error).message || "Reschedule failed", variant: "error" }),
  })

  const completeMutation = useMutation({
    mutationFn: async (appointment: StaffAppointment) => {
      await completeStaffAppointment(accessToken || "", appointment.appointmentId)
      return appointment
    },
    onSuccess: (appointment) => {
      invalidateSchedule()
      addToast({
        title: "Service completed",
        description: "Redirecting to invoice creation...",
        variant: "success",
      })
      setSelectedAppointmentId(null)
      router.push(`/staff/invoices?action=new&source=appointment&linkedAppointmentId=${appointment.appointmentId}&customerId=${appointment.customerId}&vehicleId=${appointment.vehicleId || ""}`)
    },
    onError: (e) => addToast({ title: (e as Error).message || "Could not complete", variant: "error" }),
  })

  const serviceForm = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceRecordSchema) as any,
    defaultValues: { serviceDescription: "" },
  })

  const filteredAppointments = useMemo(() => {
    if (activeTab === "all") return appointments
    const q = search.trim().toLowerCase()
    if (!q) return appointments
    return appointments.filter(
      (a) =>
        String(a.appointmentId).includes(q) ||
        (a.customerName || "").toLowerCase().includes(q) ||
        (a.customerPhone || "").toLowerCase().includes(q) ||
        (a.customerEmail || "").toLowerCase().includes(q) ||
        (a.vehicleNumber || "").toLowerCase().includes(q) ||
        (a.description || "").toLowerCase().includes(q) ||
        (a.status || "").toLowerCase().includes(q)
    )
  }, [appointments, search, activeTab])

  function openAction(kind: StaffAction["kind"], appointment: StaffAppointment) {
    setSelectedAppointmentId(null)
    setStaffAction({ kind, appointment } as StaffAction)
    setActionNotes("")
    if (kind === "staffReschedule") {
      setRescheduleLocal(
        appointment.appointmentDate ? format(new Date(appointment.appointmentDate), "yyyy-MM-dd'T'HH:mm") : ""
      )
    }
  }

  function renderRows() {
    if (loadingApps) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-8 text-center text-zinc-500">
            Loading appointments…
          </TableCell>
        </TableRow>
      )
    }
    if (filteredAppointments.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-8 text-center text-zinc-500">
            No appointments found.
          </TableCell>
        </TableRow>
      )
    }
    return filteredAppointments.map((app) => (
      <TableRow key={app.appointmentId}>
        <TableCell>
          <button
            type="button"
            className="font-medium text-zinc-950 hover:underline"
            onClick={() => setSelectedAppointmentId(app.appointmentId)}
          >
            #{app.appointmentId}
          </button>
        </TableCell>
        <TableCell className="font-medium text-zinc-900">{app.vehicleNumber || "—"}</TableCell>
        <TableCell className="min-w-[200px]">
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-zinc-950">{app.customerName || "—"}</span>
            <span className="text-xs text-zinc-500">
              <span className="font-medium text-zinc-600">Phone:</span> {app.customerPhone || "—"}
            </span>
            {app.customerEmail ? (
              <span className="truncate text-xs text-zinc-500" title={app.customerEmail}>
                <span className="font-medium text-zinc-600">Email:</span> {app.customerEmail}
              </span>
            ) : null}
          </div>
        </TableCell>
        <TableCell className="max-w-xs">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-zinc-900">
              {format(new Date(app.appointmentDate), "MMM d, yyyy · HH:mm")}
            </span>
            <span className="line-clamp-2 text-xs text-zinc-500" title={app.description || ""}>
              {app.description || "No notes"}
            </span>
          </div>
        </TableCell>
        <TableCell>{getStatusBadge(app.status)}</TableCell>
        <TableCell className="text-right">
          <div className="flex flex-wrap justify-end gap-1.5">
            <Button variant="outline" className="h-8 px-2.5 text-xs" onClick={() => setSelectedAppointmentId(app.appointmentId)}>
              View
            </Button>
            {app.status === "Pending" && (
              <>
                <Button className="h-8 px-2.5 text-xs" onClick={() => openAction("approve", app)}>
                  Approve
                </Button>
                <Button variant="outline" className="h-8 px-2.5 text-xs text-red-700 hover:bg-red-50" onClick={() => openAction("reject", app)}>
                  Decline
                </Button>
              </>
            )}
            {app.status === "Confirmed" && (
              <>
                <Button className="h-8 px-2.5 text-xs" onClick={() => completeMutation.mutate(app)}>
                  Complete
                </Button>
                <Button variant="outline" className="h-8 px-2.5 text-xs" onClick={() => openAction("staffReschedule", app)}>
                  Reschedule
                </Button>
                <Button variant="outline" className="h-8 px-2.5 text-xs text-red-700 hover:bg-red-50" onClick={() => openAction("reject", app)}>
                  Cancel appointment
                </Button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
    ))
  }

  const minDateTime = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)

  return (
    <>
      <UserHeader title="Appointments" subtitle="Approve new requests, run the visit, then bill through invoices — not here." />

      <div className="relative mb-6 flex max-w-sm items-center">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
        <Input
          placeholder="Search ID, customer, phone, email, vehicle…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white pl-9"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium text-zinc-500">Today</p>
          <p className="mt-1 text-2xl font-bold text-zinc-950">
            {(scheduleSummary?.todayAppointments ?? scheduleSummary?.today ?? scheduleSummary?.todayCount ?? 0) as number}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium text-zinc-500">Upcoming</p>
          <p className="mt-1 text-2xl font-bold text-zinc-950">
            {(scheduleSummary?.upcomingAppointments ?? scheduleSummary?.upcoming ?? scheduleSummary?.upcomingCount ?? 0) as number}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium text-zinc-500">Completed (month)</p>
          <p className="mt-1 text-2xl font-bold text-zinc-950">
            {(scheduleSummary?.completedAppointmentsThisMonth ?? scheduleSummary?.completedThisMonth ?? 0) as number}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-medium text-zinc-500">In this view</p>
          <p className="mt-1 text-2xl font-bold text-zinc-950">{appointments.length}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as typeof activeTab); setPage(1); setSearch("") }}>
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Schedule & issue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{renderRows()}</TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="upcoming">
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Schedule & issue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{renderRows()}</TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="all">
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Schedule & issue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{renderRows()}</TableBody>
            </Table>
          </div>
          {appointmentsData && 'totalPages' in appointmentsData && (appointmentsData as any).totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-zinc-500">
                Page {page} of {(appointmentsData as any).totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="h-9 px-3" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <Button variant="outline" className="h-9 px-3" disabled={!(appointmentsData as any).hasNextPage} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!startingServiceFor} onOpenChange={(open) => !open && setStartingServiceFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log completed work</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-600">
            Describe what was done. Costs and payment are handled later through{" "}
            <strong className="font-medium text-zinc-900">Sales → invoices</strong> — nothing is charged here.
          </p>
          <form onSubmit={serviceForm.handleSubmit((data) => startServiceMutation.mutate(data))} className="space-y-4">
            <div>
              <p className="text-sm font-medium text-zinc-900">
                Vehicle: <span className="font-normal text-zinc-600">{startingServiceFor?.vehicleNumber}</span>
              </p>
              <p className="text-sm font-medium text-zinc-900">
                Customer: <span className="font-normal text-zinc-600">{startingServiceFor?.customerName}</span>
              </p>
            </div>

            <div>
              <Label htmlFor="serviceDescription">Service description</Label>
              <Input id="serviceDescription" {...serviceForm.register("serviceDescription")} className="mt-1" />
              {serviceForm.formState.errors.serviceDescription && (
                <p className="mt-1 text-xs text-red-500">{serviceForm.formState.errors.serviceDescription.message}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" type="button" onClick={() => setStartingServiceFor(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={startServiceMutation.isPending}>
                {startServiceMutation.isPending ? "Saving…" : "Save record"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={staffAction !== null} onOpenChange={(open) => !open && setStaffAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {staffAction?.kind === "approve" && "Approve appointment"}
              {staffAction?.kind === "reject" && (staffAction.appointment.status === "Pending" ? "Decline appointment" : "Cancel appointment")}
              {staffAction?.kind === "noshow" && "Mark no-show"}
              {staffAction?.kind === "staffReschedule" && "Reschedule (staff)"}
            </DialogTitle>
          </DialogHeader>
          {staffAction?.kind === "staffReschedule" ? (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600">
                Choose the new date and time. The customer gets an email; the booking may return to pending for approval.
              </p>
              <div>
                <Label htmlFor="rescheduleLocal">New date & time</Label>
                <Input
                  id="rescheduleLocal"
                  type="datetime-local"
                  min={minDateTime}
                  value={rescheduleLocal}
                  onChange={(e) => setRescheduleLocal(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setStaffAction(null)}>
                  Cancel
                </Button>
                <Button type="button" disabled={!rescheduleLocal || rescheduleMutation.isPending} onClick={() => rescheduleMutation.mutate()}>
                  {rescheduleMutation.isPending ? "Saving…" : "Reschedule"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600">
                {(staffAction?.kind === "approve" || staffAction?.kind === "reject") && (
                  <>
                    The customer receives an email automatically after you submit
                    {staffAction.kind === "reject" ? " — a clear note helps them understand why." : "."}
                  </>
                )}
                {staffAction?.kind === "noshow" && "Optional note for your records and the customer email."}
              </p>
              <div>
                <Label htmlFor="actionNotes">
                  {staffAction?.kind === "reject" ? "Reason (required)" : "Note (optional)"}
                </Label>
                <textarea
                  id="actionNotes"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  placeholder={
                    staffAction?.kind === "reject"
                      ? "Explain why this time doesn’t work or why it's being cancelled…"
                      : "Instructions for the customer, internal note…"
                  }
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setStaffAction(null)}>
                  Cancel
                </Button>
                {staffAction?.kind === "approve" && (
                  <Button type="button" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate()}>
                    {approveMutation.isPending ? "Sending…" : "Approve & notify"}
                  </Button>
                )}
                {staffAction?.kind === "reject" && (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
                    disabled={!actionNotes.trim() || rejectMutation.isPending}
                    onClick={() => rejectMutation.mutate()}
                  >
                    {rejectMutation.isPending ? "Sending…" : (staffAction.appointment.status === "Pending" ? "Decline & notify" : "Cancel & notify")}
                  </Button>
                )}
                {staffAction?.kind === "noshow" && (
                  <Button type="button" disabled={noShowMutation.isPending} onClick={() => noShowMutation.mutate()}>
                    {noShowMutation.isPending ? "Saving…" : "Confirm no-show"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={selectedAppointmentId !== null} onOpenChange={(open) => !open && setSelectedAppointmentId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Appointment details</DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="py-10 text-center text-zinc-500">Loading…</div>
          ) : appointmentDetail ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Appointment ID" value={`#${appointmentDetail.appointmentId}`} />
                <Field label="Status" value={getStatusBadge(appointmentDetail.status)} />
                <Field label="Vehicle" value={appointmentDetail.vehicleNumber || "—"} />
                <Field label="Customer" value={appointmentDetail.customerName || "—"} />
                <Field label="Phone" value={appointmentDetail.customerPhone || "—"} />
                <Field label="Email" value={appointmentDetail.customerEmail || "—"} />
                <Field label="When" value={format(new Date(appointmentDetail.appointmentDate), "PPP p")} />
                <Field
                  label="Created"
                  value={appointmentDetail.createdAt ? format(new Date(appointmentDetail.createdAt), "PPp") : "—"}
                />
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {appointmentDetail.status === "Pending" ? "Issue / notes" : "Staff Notes / Remarks"}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-900 text-left">
                  {appointmentDetail.status === "Pending"
                    ? (appointmentDetail.description || "—")
                    : (appointmentDetail.approvalNotes || appointmentDetail.description || "—")}
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4">
                <Button variant="outline" onClick={() => setSelectedAppointmentId(null)}>
                  Close
                </Button>
                {appointmentDetail.status === "Pending" && (
                  <>
                    <Button onClick={() => openAction("approve", appointmentDetail)}>Approve</Button>
                    <Button variant="outline" className="text-red-700" onClick={() => openAction("reject", appointmentDetail)}>
                      Decline
                    </Button>
                  </>
                )}
                {appointmentDetail.status === "Confirmed" && (
                  <>
                    <Button onClick={() => completeMutation.mutate(appointmentDetail)}>Mark complete</Button>
                    <Button variant="outline" onClick={() => openAction("staffReschedule", appointmentDetail)}>
                      Reschedule
                    </Button>
                    <Button variant="outline" className="text-red-700" onClick={() => openAction("reject", appointmentDetail)}>
                      Cancel appointment
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-zinc-500">Could not load details.</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
