"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { FileText, Star, Wrench } from "lucide-react"

import { useAuthStore } from "@/lib/store/auth-store"
import {
  getCustomerPurchases,
  getCustomerAppointments,
  getCustomerServices,
  getCustomerReviews,
  createCustomerReview,
} from "@/lib/api"
import { UserHeader } from "@/components/layout/user-header"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useCurrency } from "@/lib/hooks/use-currency"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"

const reviewSchema = z.object({
  appointmentId: z.coerce.number().min(1, "Select an appointment"),
  rating: z.coerce.number().min(1).max(5),
  comment: z.string().optional(),
})

type ReviewFormValues = z.infer<typeof reviewSchema>

export default function HistoryPage() {
  const { accessToken } = useAuthStore()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const { format } = useCurrency()
  const [activeTab, setActiveTab] = useState<"invoices" | "services" | "reviews">("invoices")
  const [isReviewOpen, setIsReviewOpen] = useState(false)

  const { data: purchases = [] } = useQuery({
    queryKey: ["my-purchases"],
    queryFn: () => getCustomerPurchases(accessToken || ""),
    enabled: !!accessToken,
  })

  const { data: appointments = [] } = useQuery({
    queryKey: ["my-appointments"],
    queryFn: () => getCustomerAppointments(accessToken || ""),
    enabled: !!accessToken,
  })

  const { data: serviceRecords = [] } = useQuery({
    queryKey: ["my-service-records"],
    queryFn: () => getCustomerServices(accessToken || ""),
    enabled: !!accessToken,
  })

  const { data: reviews = [] } = useQuery({
    queryKey: ["my-reviews"],
    queryFn: () => getCustomerReviews(accessToken || ""),
    enabled: !!accessToken,
  })

  const completedAppointments = appointments.filter(a => a.status === "Completed")
  const reviewedAppointmentIds = reviews.map(r => r.appointmentId)
  const unreviewedAppointments = completedAppointments.filter(a => !reviewedAppointmentIds.includes(a.appointmentId))

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema) as any,
    defaultValues: { appointmentId: 0, rating: 5, comment: "" },
  })

  const createMutation = useMutation({
    mutationFn: (data: ReviewFormValues) => createCustomerReview(accessToken || "", {
      appointmentId: Number(data.appointmentId),
      rating: Number(data.rating),
      comment: data.comment || "",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] })
      addToast({ title: "Review submitted! Thank you.", variant: "success" })
      setIsReviewOpen(false)
      form.reset()
    },
    onError: () => addToast({ title: "Failed to submit review", variant: "error" })
  })

  const tabs = [
    { id: "invoices" as const, label: "Invoices", count: purchases.length },
    { id: "services" as const, label: "Service Records", count: serviceRecords.length },
    { id: "reviews" as const, label: "My Reviews", count: reviews.length },
  ]

  return (
    <>
      <UserHeader title="History & Reviews" subtitle="View your purchase history, service records, and submit feedback.">
        {unreviewedAppointments.length > 0 && (
          <Button className="shrink-0 w-full sm:w-auto h-10 px-4" onClick={() => setIsReviewOpen(true)}>
            <Star className="mr-2 size-4" /> Write a Review
          </Button>
        )}
      </UserHeader>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-zinc-100 p-1 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Invoices Tab */}
      {activeTab === "invoices" && (
        purchases.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
            <FileText className="mx-auto size-12 text-zinc-300 mb-4" />
            <h3 className="text-lg font-semibold text-zinc-950 mb-1">No invoices yet</h3>
            <p className="text-sm text-zinc-500">Your purchase invoices will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map((inv) => {
              const invoiceKey = inv.salesInvoiceId ?? inv.invoiceId ?? 0
              const label = inv.invoiceNumber?.trim()
                ? inv.invoiceNumber
                : `Invoice #${invoiceKey}`
              const payStatus = inv.paymentStatus ?? inv.status ?? "—"
              const isPaid = String(payStatus).toLowerCase() === "paid"
              const items = inv.items ?? []
              return (
                <div key={invoiceKey} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-zinc-950">{label}</h3>
                        <Badge variant={isPaid ? "success" : "outline"}>{payStatus}</Badge>
                      </div>
                      <p className="text-xs text-zinc-400">
                        {new Date(inv.invoiceDate).toLocaleString()}
                      </p>
                      {(inv.vehicleNumber || inv.vehicleId != null) && (
                        <p className="text-sm text-zinc-600">
                          <span className="font-medium text-zinc-800">Vehicle: </span>
                          <span className="font-mono">{inv.vehicleNumber ?? `ID ${inv.vehicleId}`}</span>
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total</p>
                      <p className="text-lg font-bold text-zinc-950">{format(inv.totalAmount)}</p>
                    </div>
                  </div>

                  {items.length > 0 && (
                    <div className="mt-4 border-t border-zinc-100 pt-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Items
                      </p>
                      <div className="overflow-x-auto rounded-lg border border-zinc-100 bg-white">
                        <table className="w-full min-w-[320px] text-left text-sm">
                          <thead>
                            <tr className="border-b border-zinc-100 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
                              <th className="px-3 py-2">Item</th>
                              <th className="px-3 py-2 text-right">Qty</th>
                              <th className="px-3 py-2 text-right">Each</th>
                              <th className="px-3 py-2 text-right">Line</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items
                              .map((line, idx) => {
                                const unit = line.pricePerUnit ?? line.unitPrice ?? 0;
                                const lineTotal = line.totalPrice ?? Number(unit) * Number(line.quantity ?? 0);
                                return (
                                  <tr
                                    key={`${line.partId}-${idx}`}
                                    className="border-b border-zinc-50 last:border-0"
                                  >
                                    <td className="px-3 py-2.5">
                                      <span className="font-medium text-zinc-950">
                                        {line.partName || `Item #${line.partId}`}
                                      </span>
                                      <span className="ml-2 text-xs text-zinc-400">#{line.partId}</span>
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums text-zinc-700">
                                      {line.quantity}
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums text-zinc-700">
                                      {format(unit)}
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-medium tabular-nums text-zinc-950">
                                      {format(lineTotal)}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Service Records Tab */}
      {activeTab === "services" && (
        serviceRecords.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
            <Wrench className="mx-auto size-12 text-zinc-300 mb-4" />
            <h3 className="text-lg font-semibold text-zinc-950 mb-1">No service records</h3>
            <p className="text-sm text-zinc-500">Your completed service details will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {serviceRecords.map(sr => {
              const issueReported = sr.issueReported;
              const staffAnswer = sr.staffAnswer;
              
              return (
              <div key={sr.serviceRecordId} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs text-zinc-500 font-medium">Service #{sr.serviceRecordId}</p>
                    <p className="text-xs text-zinc-400 mt-1">Vehicle: {sr.vehicleNumber || "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-zinc-950">{format(sr.cost)}</p>
                    <Badge variant={sr.status === "Completed" ? "success" : "default"} className="mt-1">
                      {sr.status || "—"}
                    </Badge>
                  </div>
                </div>
                
                {issueReported && (
                  <div className="border-l-2 border-amber-300 bg-amber-50 rounded p-3 mb-3">
                    <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide">Issue Reported</p>
                    <p className="text-sm text-amber-900 mt-2 leading-relaxed">{issueReported}</p>
                  </div>
                )}

                {staffAnswer && (
                  <div className="border-l-2 border-sky-300 bg-sky-50 rounded p-3 mb-3">
                    <p className="text-xs text-sky-700 font-semibold uppercase tracking-wide">Staff Answer</p>
                    <p className="text-sm text-sky-900 mt-2 leading-relaxed whitespace-pre-wrap">{staffAnswer}</p>
                  </div>
                )}
                
                <div className="bg-zinc-50 rounded-lg p-3 mb-3">
                  <p className="text-xs text-zinc-600 font-semibold mb-2 uppercase tracking-wide">Work Completed</p>
                  <p className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap">{sr.description || "—"}</p>
                </div>
                <p className="text-xs text-zinc-400">
                  {sr.serviceDate ? new Date(sr.serviceDate).toLocaleDateString() : "—"}
                </p>
              </div>
              );
            })}
          </div>
        )
      )}

      {/* Reviews Tab */}
      {activeTab === "reviews" && (
        reviews.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
            <Star className="mx-auto size-12 text-zinc-300 mb-4" />
            <h3 className="text-lg font-semibold text-zinc-950 mb-1">No reviews yet</h3>
            <p className="text-sm text-zinc-500">Complete a service appointment to leave a review.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map(rev => {
              // Find the related appointment to show context
              const relatedAppt = appointments.find(a => a.appointmentId === rev.appointmentId);
              const relatedService = serviceRecords.find(sr => sr.appointmentId === rev.appointmentId);
              
              return (
                <div key={rev.reviewId} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className={`size-4 ${i < rev.rating ? "fill-amber-400 text-amber-400" : "text-zinc-200"}`} />
                      ))}
                      <span className="ml-2 text-sm font-medium text-zinc-600">{rev.rating}/5</span>
                    </div>
                    <p className="text-xs text-zinc-400">Appointment #{rev.appointmentId}</p>
                  </div>
                  
                  {/* Issue Reported & Service Work Done */}
                  <div className="space-y-3 mb-3">
                    {relatedAppt && (
                      <div className="border-l-2 border-amber-300 bg-amber-50 rounded p-3">
                        <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide">Issue Reported</p>
                        <p className="text-sm text-amber-900 mt-2 leading-relaxed">{relatedAppt.description || "—"}</p>
                        <p className="text-xs text-amber-600 mt-2">{relatedAppt.vehicleNumber || "—"} • {relatedAppt.appointmentDate ? new Date(relatedAppt.appointmentDate).toLocaleDateString() : "—"}</p>
                      </div>
                    )}
                    {relatedService && (
                      <div className="border-l-2 border-green-300 bg-green-50 rounded p-3">
                        <p className="text-xs text-green-700 font-semibold uppercase tracking-wide">Work Completed</p>
                        <p className="text-sm text-green-900 mt-2 leading-relaxed whitespace-pre-wrap">{relatedService.description || "—"}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-zinc-50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-zinc-600 font-semibold mb-1">Review Comment</p>
                    <p className="text-sm text-zinc-800">{rev.comment}</p>
                  </div>
                  <p className="text-xs text-zinc-400">Reviewed on {new Date(rev.createdAt).toLocaleDateString()}</p>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Review Modal */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit a Review</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div>
              <Label htmlFor="appointmentId">Select Appointment</Label>
              <Select id="appointmentId" {...form.register("appointmentId")} className="mt-1">
                <option value={0} disabled>Choose an appointment...</option>
                {unreviewedAppointments.map(a => (
                  <option key={a.appointmentId} value={a.appointmentId}>
                    {a.vehicleNumber} — {new Date(a.appointmentDate).toLocaleDateString()}
                  </option>
                ))}
              </Select>
              {form.formState.errors.appointmentId && <p className="mt-1 text-xs text-red-500">{form.formState.errors.appointmentId.message}</p>}
            </div>
            <div>
              <Label>Rating</Label>
              <div className="flex items-center gap-2 mt-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => form.setValue("rating", star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star className={`size-7 ${star <= form.watch("rating") ? "fill-amber-400 text-amber-400" : "text-zinc-200"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="comment">Comment (Optional)</Label>
              <textarea id="comment" {...form.register("comment")} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400" rows={3} placeholder="Share your experience..." />
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => setIsReviewOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Submitting..." : "Submit Review"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
