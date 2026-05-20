"use client"

import { useEffect, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CalendarDays, CalendarClock, X } from "lucide-react"

import { useAuthStore } from "@/lib/store/auth-store"
import {
  getCustomerAppointments,
  getCustomerVehicles,
  createCustomerAppointment,
  cancelCustomerAppointment,
  updateCustomerAppointment,
  getAvailableAppointmentSlots,
  type Appointment,
  type AvailableTimeSlot,
} from "@/lib/api"
import { UserHeader } from "@/components/layout/user-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

const bookingSchema = z.object({
  vehicleId: z.coerce.number().min(1, "Vehicle is required"),
  bookingDate: z.string().min(1, "Choose a date"),
  remarks: z.string().optional(),
})

type BookingFormValues = z.infer<typeof bookingSchema>

const ACTIVE_STATUSES = new Set(["Pending", "Confirmed", "In Progress"])

const statusConfig: Record<string, { variant: "outline" | "secondary" | "success" | "danger"; border: string }> = {
  Pending: { variant: "outline", border: "border-l-amber-400" },
  Confirmed: { variant: "secondary", border: "border-l-blue-400" },
  "In Progress": { variant: "success", border: "border-l-emerald-400" },
  Completed: { variant: "success", border: "border-l-zinc-300" },
  Cancelled: { variant: "danger", border: "border-l-red-300" },
  NoShow: { variant: "danger", border: "border-l-orange-400" },
}

function badgeProps(status: string) {
  return statusConfig[status] ?? { variant: "outline" as const, border: "border-l-zinc-300" }
}

export default function CustomerAppointmentsPage() {
  const { accessToken } = useAuthStore()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<AvailableTimeSlot | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState("")
  const [rescheduleSlot, setRescheduleSlot] = useState<AvailableTimeSlot | null>(null)
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null)

  function openAppointmentDetails(appointment: Appointment) {
    setDetailAppointment(appointment)
  }

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["my-appointments"],
    queryFn: () => getCustomerAppointments(accessToken || ""),
    enabled: !!accessToken,
  })

  const { data: vehicles = [] } = useQuery({
    queryKey: ["my-vehicles"],
    queryFn: () => getCustomerVehicles(accessToken || ""),
    enabled: !!accessToken,
  })

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema) as any,
    defaultValues: { vehicleId: 0, bookingDate: "", remarks: "" },
  })

  const bookingDate = form.watch("bookingDate")

  const { data: slotsResponse, isLoading: loadingSlots } = useQuery({
    queryKey: ["appointment-slots", bookingDate],
    queryFn: () => getAvailableAppointmentSlots(bookingDate),
    enabled: Boolean(bookingDate && bookingDate.length >= 8),
  })

  const {
    data: rescheduleSlotsResponse,
    isLoading: loadingRescheduleSlots,
  } = useQuery({
    queryKey: ["appointment-slots-reschedule", rescheduleDate],
    queryFn: () => getAvailableAppointmentSlots(rescheduleDate),
    enabled: Boolean(rescheduleTarget && rescheduleDate && rescheduleDate.length >= 8),
  })

  useEffect(() => {
    setSelectedSlot(null)
  }, [bookingDate])

  useEffect(() => {
    setRescheduleSlot(null)
  }, [rescheduleDate, rescheduleTarget])

  const createMutation = useMutation({
    mutationFn: (data: BookingFormValues & { slot: AvailableTimeSlot }) =>
      createCustomerAppointment(accessToken || "", {
        vehicleId: Number(data.vehicleId),
        requestedDate: data.slot.startTime,
        remarks: data.remarks || "",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-appointments"] })
      addToast({ title: "Appointment requested", description: "You’ll get an email when staff responds.", variant: "success" })
      setIsAddOpen(false)
      form.reset()
      setSelectedSlot(null)
    },
    onError: (err) => addToast({ title: (err as Error).message || "Could not book appointment", variant: "error" }),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelCustomerAppointment(accessToken || "", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-appointments"] })
      addToast({ title: "Appointment cancelled", variant: "success" })
    },
    onError: (err) => addToast({ title: (err as Error).message || "Could not cancel", variant: "error" }),
  })

  const rescheduleMutation = useMutation({
    mutationFn: (payload: { appointmentId: number; slot: AvailableTimeSlot }) =>
      updateCustomerAppointment(accessToken || "", payload.appointmentId, {
        requestedDate: payload.slot.startTime,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-appointments"] })
      addToast({
        title: "Reschedule submitted",
        description: "Your appointment is pending approval again. Watch your inbox.",
        variant: "success",
      })
      setRescheduleTarget(null)
      setRescheduleDate("")
      setRescheduleSlot(null)
    },
    onError: (err) => addToast({ title: (err as Error).message || "Could not reschedule", variant: "error" }),
  })

  const upcoming = appointments.filter((a) => ACTIVE_STATUSES.has(a.status))
  const past = appointments.filter((a) => !ACTIVE_STATUSES.has(a.status))

  const slots = slotsResponse?.timeSlots ?? []
  const rescheduleSlots = rescheduleSlotsResponse?.timeSlots ?? []

  function submitBooking(values: BookingFormValues) {
    if (!selectedSlot) {
      addToast({ title: "Pick a time slot", variant: "error" })
      return
    }
    if (selectedSlot.isBooked || selectedSlot.isBreak) {
      addToast({ title: "That slot isn’t available", variant: "error" })
      return
    }
    createMutation.mutate({ ...values, slot: selectedSlot })
  }

  function openReschedule(apt: Appointment) {
    setRescheduleTarget(apt)
    const d = apt.appointmentDate ? apt.appointmentDate.slice(0, 10) : ""
    setRescheduleDate(d || "")
    setRescheduleSlot(null)
  }

  const canCustomerEdit = (status: string) => status === "Pending" || status === "Confirmed"
  
  const minDate = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0]

  return (
    <>
      <UserHeader title="Appointments" subtitle="Pick an open slot, book service, reschedule or cancel anytime before work starts.">
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="h-10 w-full shrink-0 px-4 sm:w-auto">
              <CalendarDays className="mr-2 size-4" /> Book appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Book service appointment</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(submitBooking)} className="space-y-4">
              <div>
                <Label htmlFor="vehicleId">Vehicle</Label>
                <Select id="vehicleId" {...form.register("vehicleId")} className="mt-1">
                  <option value={0} disabled>
                    Choose a vehicle…
                  </option>
                  {vehicles.map((v) => (
                    <option key={v.vehicleId} value={v.vehicleId}>
                      {v.year} {v.brand} {v.model} ({v.vehicleNumber})
                    </option>
                  ))}
                </Select>
                {form.formState.errors.vehicleId && (
                  <p className="mt-1 text-xs text-red-500">{form.formState.errors.vehicleId.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="bookingDate">Date</Label>
                <Input id="bookingDate" type="date" min={minDate} {...form.register("bookingDate")} className="mt-1" />
                {form.formState.errors.bookingDate && (
                  <p className="mt-1 text-xs text-red-500">{form.formState.errors.bookingDate.message}</p>
                )}
              </div>

              <div>
                <Label>Time slot</Label>
                <p className="mt-1 text-xs text-zinc-500">
                  Grey = lunch break or taken. Dark slot = your selection.
                </p>
                {!bookingDate ? (
                  <p className="mt-3 text-sm text-zinc-400">Choose a date to load slots.</p>
                ) : loadingSlots ? (
                  <p className="mt-3 text-sm text-zinc-500">Loading availability…</p>
                ) : slots.length === 0 ? (
                  <p className="mt-3 text-sm text-amber-700">No slots returned for that day.</p>
                ) : (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {slots.map((slot) => {
                      const blocked = slot.isBreak || slot.isBooked
                      const selected = selectedSlot?.slotNumber === slot.slotNumber
                      return (
                        <button
                          key={slot.slotNumber}
                          type="button"
                          disabled={blocked}
                          onClick={() => !blocked && setSelectedSlot(slot)}
                          className={cn(
                            "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                            blocked &&
                              "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-400 line-through decoration-zinc-300",
                            !blocked &&
                              !selected &&
                              "border-zinc-300 bg-white text-zinc-900 hover:border-zinc-900 hover:bg-zinc-950 hover:text-white",
                            !blocked && selected && "border-zinc-950 bg-zinc-950 text-white shadow-sm"
                          )}
                        >
                          <span className="font-medium">{slot.displayTime}</span>
                          {slot.isBreak ? (
                            <span className="mt-0.5 block text-xs opacity-80">Break — not bookable</span>
                          ) : slot.isBooked ? (
                            <span className="mt-0.5 block text-xs opacity-80">Not available</span>
                          ) : (
                            <span className="mt-0.5 block text-xs opacity-90">Available</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="remarks">What should we know?</Label>
                <textarea
                  id="remarks"
                  {...form.register("remarks")}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  rows={3}
                  placeholder="Describe the issue or requested service…"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Booking…" : "Book appointment"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </UserHeader>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-zinc-500">Loading appointments…</div>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">Active</h2>
            {upcoming.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
                <CalendarClock className="mx-auto mb-3 size-10 text-zinc-300" />
                <p>No active appointments.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((apt) => {
                  const cfg = badgeProps(apt.status)
                  return (
                    <div
                      key={apt.appointmentId}
                      className={cn(
                        "rounded-xl border border-zinc-200 bg-white p-5 shadow-sm border-l-4 flex flex-col justify-between",
                        cfg.border
                      )}
                    >
                      <div className="mb-4">
                        <h3 className="font-semibold text-zinc-950">{apt.vehicleNumber}</h3>
                        <p className="mt-1 text-sm text-zinc-600 line-clamp-2 break-words">
                          {apt.status === "Completed" || apt.status === "Cancelled" || apt.status === "Rejected"
                            ? apt.approvalNotes || apt.description || "—"
                            : apt.description || "—"}
                        </p>
                        <button
                          type="button"
                          className="mt-2 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                          onClick={() => openAppointmentDetails(apt)}
                        >
                          View details
                        </button>
                        <p className="mt-2 text-xs text-zinc-400">
                          Scheduled: {new Date(apt.appointmentDate).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3 mt-auto">
                        <Badge variant={cfg.variant}>{apt.status}</Badge>
                        {canCustomerEdit(apt.status) && (
                          <div className="flex items-center gap-2">
                            <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => openReschedule(apt)}>
                              Reschedule
                            </Button>
                            <Button
                              variant="outline"
                              className="h-8 px-3 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => cancelMutation.mutate(apt.appointmentId)}
                              disabled={cancelMutation.isPending}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">Past</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((apt) => {
                  const cfg = badgeProps(apt.status)
                  return (
                    <div
                      key={apt.appointmentId}
                      className={cn(
                        "rounded-xl border border-zinc-200 bg-white p-5 opacity-90 shadow-sm border-l-4 flex flex-col justify-between",
                        cfg.border
                      )}
                    >
                      <div className="mb-4">
                        <h3 className="font-semibold text-zinc-950">{apt.vehicleNumber}</h3>
                        <p className="mt-1 text-sm text-zinc-600 line-clamp-2 break-words">
                          {apt.status === "Completed" || apt.status === "Cancelled" || apt.status === "Rejected"
                            ? apt.approvalNotes || apt.description || "—"
                            : apt.description || "—"}
                        </p>
                        <button
                          type="button"
                          className="mt-2 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                          onClick={() => openAppointmentDetails(apt)}
                        >
                          View details
                        </button>
                        <p className="mt-2 text-xs text-zinc-400">
                          {new Date(apt.appointmentDate).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center justify-between border-t border-zinc-100 pt-3 mt-auto">
                        <Badge variant={cfg.variant}>{apt.status}</Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}

      <Dialog open={!!rescheduleTarget} onOpenChange={(open) => !open && setRescheduleTarget(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reschedule appointment</DialogTitle>
          </DialogHeader>
          {rescheduleTarget ? (
            <div className="space-y-4">
              <p className="text-sm text-zinc-600">
                Pick a new open slot. After you save, the shop may need to confirm again — you’ll get an email.
              </p>
              <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm">
                <span className="font-medium text-zinc-900">{rescheduleTarget.vehicleNumber}</span>
                <span className="text-zinc-500"> · current </span>
                <span className="text-zinc-700">{new Date(rescheduleTarget.appointmentDate).toLocaleString()}</span>
              </div>
              <div>
                <Label htmlFor="rescheduleDate">New date</Label>
                <Input
                  id="rescheduleDate"
                  type="date"
                  min={minDate}
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              {!rescheduleDate ? (
                <p className="text-sm text-zinc-400">Choose a date.</p>
              ) : loadingRescheduleSlots ? (
                <p className="text-sm text-zinc-500">Loading slots…</p>
              ) : rescheduleSlots.length === 0 ? (
                <p className="text-sm text-amber-700">No slots for that day.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {rescheduleSlots.map((slot) => {
                    const blocked = slot.isBreak || slot.isBooked
                    const selected = rescheduleSlot?.slotNumber === slot.slotNumber
                    return (
                      <button
                        key={slot.slotNumber}
                        type="button"
                        disabled={blocked}
                        onClick={() => !blocked && setRescheduleSlot(slot)}
                        className={cn(
                          "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                          blocked &&
                            "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-400 line-through",
                          !blocked &&
                            !selected &&
                            "border-zinc-300 bg-white hover:border-zinc-900 hover:bg-zinc-950 hover:text-white",
                          !blocked && selected && "border-zinc-950 bg-zinc-950 text-white"
                        )}
                      >
                        <span className="font-medium">{slot.displayTime}</span>
                        {blocked ? (
                          <span className="mt-0.5 block text-xs opacity-80">Unavailable</span>
                        ) : (
                          <span className="mt-0.5 block text-xs opacity-90">Available</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setRescheduleTarget(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!rescheduleSlot || rescheduleMutation.isPending}
                  onClick={() => {
                    if (!rescheduleTarget || !rescheduleSlot) return
                    rescheduleMutation.mutate({
                      appointmentId: rescheduleTarget.appointmentId,
                      slot: rescheduleSlot,
                    })
                  }}
                >
                  {rescheduleMutation.isPending ? "Saving…" : "Save new time"}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailAppointment} onOpenChange={(open) => !open && setDetailAppointment(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Appointment details</DialogTitle>
          </DialogHeader>
          {detailAppointment ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Vehicle</p>
                <p className="mt-1 font-semibold text-zinc-900">{detailAppointment.vehicleNumber}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Scheduled</p>
                <p className="mt-1 font-semibold text-zinc-900">{new Date(detailAppointment.appointmentDate).toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Status</p>
                <p className="mt-1 font-semibold text-zinc-900">{detailAppointment.status}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm text-zinc-500">Details</p>
                <p className="mt-1 text-sm text-zinc-700 whitespace-pre-wrap">
                  {detailAppointment.status === "Completed" || detailAppointment.status === "Cancelled" || detailAppointment.status === "Rejected"
                    ? detailAppointment.approvalNotes || detailAppointment.description || "—"
                    : detailAppointment.description || "—"}
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <Button variant="outline" type="button" onClick={() => setDetailAppointment(null)}>
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
