"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Play, CheckCircle, Search } from "lucide-react"

import { useAuthStore } from "@/lib/store/auth-store"
import { useCurrency } from "@/lib/hooks/use-currency"
import {
  getStaffAllAppointments, getStaffServiceRecords, createStaffServiceRecord, updateStaffServiceRecord,
  StaffAppointment, ServiceRecord
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

const serviceRecordSchema = z.object({
  serviceDescription: z.string().min(1, "Description is required"),
  serviceCost: z.coerce.number().min(0, "Cost must be a positive number"),
})

type ServiceFormValues = z.infer<typeof serviceRecordSchema>

function getStatusBadge(status: string) {
  switch (status) {
    case "Pending": return <Badge variant="secondary">Pending</Badge>
    case "Confirmed": return <Badge variant="outline">Confirmed</Badge>
    case "In Progress": return <Badge variant="outline">In Progress</Badge>
    case "Completed": return <Badge variant="success">Completed</Badge>
    default: return <Badge variant="outline">{status}</Badge>
  }
}

export default function TasksPage() {
  const { accessToken, user } = useAuthStore()
  const { symbol, format: formatCurrency, convertToBase } = useCurrency()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [activeTab, setActiveTab] = useState("appointments")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [startingServiceFor, setStartingServiceFor] = useState<StaffAppointment | null>(null)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(handler)
  }, [search])

  const { data: appointmentsData, isLoading: loadingApps } = useQuery({
    queryKey: ["admin-appointments", page, debouncedSearch],
    queryFn: () => getStaffAllAppointments(accessToken || "", page, 20, debouncedSearch),
    enabled: !!accessToken,
  })
  
  const appointments = appointmentsData?.items || []

  const { data: serviceRecordsData, isLoading: loadingRecords } = useQuery({
    queryKey: ["admin-service-records", page, debouncedSearch],
    queryFn: () => getStaffServiceRecords(accessToken || "", page, 20, debouncedSearch),
    enabled: !!accessToken,
  })
  
  const serviceRecords = serviceRecordsData?.items || []

  const startServiceMutation = useMutation({
    mutationFn: async (data: ServiceFormValues) => {
      if (!startingServiceFor) throw new Error("No appointment selected")
      await createStaffServiceRecord(accessToken || "", {
        appointmentId: startingServiceFor.appointmentId,
        serviceDescription: data.serviceDescription,
        serviceCost: convertToBase(data.serviceCost),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-appointments"] })
      queryClient.invalidateQueries({ queryKey: ["admin-service-records"] })
      addToast({ title: "Service started", variant: "success" })
      setStartingServiceFor(null)
      serviceForm.reset()
      setActiveTab("services")
    },
    onError: () => {
      addToast({ title: "Failed to start service", variant: "error" })
    }
  })

  const completeServiceMutation = useMutation({
    mutationFn: async (record: ServiceRecord) => {
      await updateStaffServiceRecord(accessToken || "", record.serviceRecordId, {
        status: "Completed",
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-appointments"] })
      queryClient.invalidateQueries({ queryKey: ["admin-service-records"] })
      addToast({ title: "Service marked as complete", variant: "success" })
    },
    onError: () => {
      addToast({ title: "Failed to complete service", variant: "error" })
    }
  })

  const serviceForm = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceRecordSchema) as any,
    defaultValues: { serviceDescription: "", serviceCost: 0 },
  })

  const filteredAppointments = appointments

  const filteredServices = serviceRecords

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <UserHeader
          title="Tasks"
          subtitle="Manage customer appointments and active service jobs."
        />
      </div>

      <div className="flex items-center mb-6 max-w-sm relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
        <Input
          placeholder="Search by customer or vehicle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="services">Active Services</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments">
          <div className="bg-white rounded-xl border border-zinc-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Date / Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingApps ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-zinc-500">Loading appointments...</TableCell>
                  </TableRow>
                ) : filteredAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-zinc-500">No appointments found.</TableCell>
                  </TableRow>
                ) : (
                  filteredAppointments.map((app) => (
                    <TableRow key={app.appointmentId}>
                      <TableCell className="font-medium text-zinc-950">{app.customerName}</TableCell>
                      <TableCell className="text-zinc-900">{app.vehicleNumber}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm text-zinc-900">{format(new Date(app.appointmentDate), "MMM d, yyyy HH:mm")}</span>
                          <span className="text-xs text-zinc-500">{app.description}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(app.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(app.status === "Pending" || app.status === "Confirmed") && (
                          <Button
                            variant="outline"
                            className="h-8 px-3 text-xs w-auto inline-flex"
                            onClick={() => setStartingServiceFor(app)}
                          >
                            <Play className="mr-1.5 size-3" />
                            Start Service
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              Page {appointmentsData?.page ?? page} of {appointmentsData?.totalPages ?? 1} • {appointmentsData?.totalItems ?? appointments.length} appointments
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="h-9 px-3" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <Button variant="outline" className="h-9 px-3" disabled={Boolean(appointmentsData && !appointmentsData.hasNextPage)} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="services">
          <div className="bg-white rounded-xl border border-zinc-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingRecords ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-zinc-500">Loading active services...</TableCell>
                  </TableRow>
                ) : filteredServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-zinc-500">No active services.</TableCell>
                  </TableRow>
                ) : (
                  filteredServices.map((record) => (
                    <TableRow key={record.serviceRecordId}>
                      <TableCell className="font-medium text-zinc-950">{record.vehicleNumber}</TableCell>
                      <TableCell className="text-zinc-900">{record.customerName}</TableCell>
                      <TableCell className="text-zinc-600 max-w-xs truncate" title={record.serviceDescription}>
                        {record.serviceDescription}
                      </TableCell>
                      <TableCell className="text-zinc-900">{formatCurrency(record.serviceCost)}</TableCell>
                      <TableCell>
                        {record.status === "In Progress" ? (
                          <Badge variant="outline">In Progress</Badge>
                        ) : (
                          <Badge variant="success">Completed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {record.status === "In Progress" && (
                          <Button
                            className="h-8 px-3 text-xs w-auto inline-flex"
                            onClick={() => completeServiceMutation.mutate(record)}
                            disabled={completeServiceMutation.isPending}
                          >
                            <CheckCircle className="mr-1.5 size-3" />
                            Complete
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              Page {serviceRecordsData?.page ?? page} of {serviceRecordsData?.totalPages ?? 1} • {serviceRecordsData?.totalItems ?? serviceRecords.length} records
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="h-9 px-3" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <Button variant="outline" className="h-9 px-3" disabled={Boolean(serviceRecordsData && !serviceRecordsData.hasNextPage)} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!startingServiceFor} onOpenChange={(open) => !open && setStartingServiceFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Service Job</DialogTitle>
          </DialogHeader>
          <form onSubmit={serviceForm.handleSubmit((data) => startServiceMutation.mutate(data))} className="space-y-4">
            <div>
              <p className="text-sm font-medium text-zinc-900">Vehicle: <span className="font-normal text-zinc-600">{startingServiceFor?.vehicleNumber}</span></p>
              <p className="text-sm font-medium text-zinc-900">Customer: <span className="font-normal text-zinc-600">{startingServiceFor?.customerName}</span></p>
            </div>

            <div>
              <Label htmlFor="serviceDescription">Service Description</Label>
              <Input id="serviceDescription" {...serviceForm.register("serviceDescription")} className="mt-1" />
              {serviceForm.formState.errors.serviceDescription && <p className="mt-1 text-xs text-red-500">{serviceForm.formState.errors.serviceDescription.message}</p>}
            </div>
            <div>
              <Label htmlFor="serviceCost">Estimated Cost ({symbol})</Label>
              <Input id="serviceCost" type="number" step="0.01" {...serviceForm.register("serviceCost")} className="mt-1" />
              {serviceForm.formState.errors.serviceCost && <p className="mt-1 text-xs text-red-500">{serviceForm.formState.errors.serviceCost.message}</p>}
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => setStartingServiceFor(null)} className="w-auto">Cancel</Button>
              <Button type="submit" disabled={startServiceMutation.isPending} className="w-auto">
                {startServiceMutation.isPending ? "Starting..." : "Start Service"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
