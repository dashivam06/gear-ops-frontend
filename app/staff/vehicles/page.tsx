"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Search, Car, Calendar, FileText, Plus } from "lucide-react"

import { useAuthStore } from "@/lib/store/auth-store"
import { useCurrency } from "@/lib/hooks/use-currency"
import { getStaffVehicles, getStaffVehicleDetail, searchStaffCustomers, createStaffCustomerVehicle } from "@/lib/api"
import { UserHeader } from "@/components/layout/user-header"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/toast"
import { format } from "date-fns"
import { ImageUpload } from "@/components/ui/image-upload"

const vehicleSchema = z.object({
  customerId: z.coerce.number().min(1, "Customer is required"),
  vehicleNumber: z.string().min(1, "License plate is required"),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  year: z.coerce.number().min(1900, "Invalid year").max(new Date().getFullYear() + 1, "Invalid year"),
  imageUrl: z.string().optional(),
})

type VehicleFormValues = z.infer<typeof vehicleSchema>

export default function VehiclesPage() {
  const { accessToken } = useAuthStore()
  const { format: formatCurrency } = useCurrency()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [search, setSearch] = useState("")
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)

  const { data: allVehicles = [], isLoading } = useQuery({
    queryKey: ["staff-vehicles", search],
    queryFn: () => getStaffVehicles(accessToken || "", search),
    enabled: !!accessToken,
  })

  const { data: customersData } = useQuery({
    queryKey: ["staff-customers-list"],
    queryFn: () => searchStaffCustomers(accessToken || "", ""),
    enabled: !!accessToken && isAddOpen,
  })
  const customers = customersData?.items || []

  const { data: detailData, isLoading: loadingDetails } = useQuery({
    queryKey: ["staff-vehicle-detail", selectedVehicleId],
    queryFn: () => getStaffVehicleDetail(accessToken || "", selectedVehicleId as number),
    enabled: !!accessToken && selectedVehicleId !== null,
  })

  const addVehicleMutation = useMutation({
    mutationFn: (data: VehicleFormValues) => createStaffCustomerVehicle(accessToken || "", data.customerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-vehicles"] })
      addToast({ title: "Vehicle registered", variant: "success" })
      setIsAddOpen(false)
      addForm.reset()
    },
    onError: (err) => {
      addToast({ title: (err as Error).message || "Failed to add vehicle", variant: "error" })
    }
  })

  const addForm = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema) as any,
    defaultValues: { customerId: 0, vehicleNumber: "", brand: "", model: "", year: undefined, imageUrl: "" },
  })


  return (
    <>
      <UserHeader
        title="Vehicle Management"
        subtitle="View customer vehicles and service history."
      >
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 w-full sm:w-auto h-10 px-4">
              <Plus className="mr-2 size-4" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Register New Vehicle</DialogTitle>
            </DialogHeader>
            <form onSubmit={addForm.handleSubmit((data) => addVehicleMutation.mutate(data))} className="space-y-4">
              <div className="flex gap-6">
                <div className="flex-1 space-y-4">
                  <div>
                    <Label htmlFor="customerId">Owner (Customer) *</Label>
                    <Select id="customerId" {...addForm.register("customerId")} className="mt-1">
                      <option value={0} disabled>Select customer...</option>
                      {customers.map(c => (
                        <option key={c.userId} value={c.userId}>{c.fullName} ({c.phone})</option>
                      ))}
                    </Select>
                    {addForm.formState.errors.customerId && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.customerId.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="vehicleNumber">License Plate *</Label>
                    <Input id="vehicleNumber" {...addForm.register("vehicleNumber")} className="mt-1" />
                    {addForm.formState.errors.vehicleNumber && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.vehicleNumber.message}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-center pt-2 w-32 shrink-0">
                  <ImageUpload 
                    value={addForm.watch("imageUrl")} 
                    onChange={(val) => addForm.setValue("imageUrl", val)} 
                    label="VEHICLE PHOTO" 
                    folder="vehicles"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="brand">Brand *</Label>
                  <Input id="brand" {...addForm.register("brand")} className="mt-1" />
                  {addForm.formState.errors.brand && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.brand.message}</p>}
                </div>
                <div>
                  <Label htmlFor="model">Model *</Label>
                  <Input id="model" {...addForm.register("model")} className="mt-1" />
                  {addForm.formState.errors.model && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.model.message}</p>}
                </div>
                <div>
                  <Label htmlFor="year">Year *</Label>
                  <Input id="year" type="number" {...addForm.register("year")} className="mt-1" />
                  {addForm.formState.errors.year && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.year.message}</p>}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={addVehicleMutation.isPending}>{addVehicleMutation.isPending ? "Saving..." : "Save Vehicle"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </UserHeader>

      <div className="flex items-center mb-6 max-w-sm relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
        <Input
          placeholder="Search by vehicle, plate, or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white"
        />
      </div>

      <div className="bg-white rounded-xl border border-zinc-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Plate Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-zinc-500">Loading vehicles...</TableCell>
              </TableRow>
            ) : allVehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                  {search ? "No vehicles found matching your search." : "No vehicles available."}
                </TableCell>
              </TableRow>
            ) : (
              allVehicles.map((vehicle: any) => (
                <TableRow key={vehicle.vehicleId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {((vehicle as any).imageUrl || (vehicle as any).ImageUrl) ? (
                        <img
                          src={(vehicle as any).imageUrl || (vehicle as any).ImageUrl}
                          alt={vehicle.brand}
                          className="size-10 rounded-xl object-cover border border-zinc-200"
                        />
                      ) : (
                        <div className="size-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400">
                          <Car className="size-5 opacity-50" />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-950">{(vehicle as any).modelYear || vehicle.year} {vehicle.brand} {vehicle.model}</span>
                        {vehicle.lastServiceDate ? (
                          <span className="text-xs text-zinc-500">Last service: {format(new Date(vehicle.lastServiceDate), "MMM d, yyyy")}</span>
                        ) : (
                          <span className="text-xs text-zinc-500">Last service: Not provided</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-zinc-900">{vehicle.customerName || "—"}</span>
                      {vehicle.customerPhone && <span className="text-xs text-zinc-500">{vehicle.customerPhone}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm px-2 py-1 bg-zinc-100 rounded border border-zinc-200 text-zinc-800">
                      {vehicle.vehicleNumber}
                    </span>
                  </TableCell>
                  <TableCell className="text-zinc-700">{vehicle.status || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedVehicleId(vehicle.vehicleId)}
                      className="h-8 px-3 text-xs"
                    >
                      View History
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={selectedVehicleId !== null} onOpenChange={(open) => !open && setSelectedVehicleId(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vehicle Details & History</DialogTitle>
          </DialogHeader>
          
          {loadingDetails ? (
             <div className="py-8 text-center text-zinc-500">Loading details...</div>
          ) : detailData ? (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                 {((detailData as any).imageUrl || (detailData as any).ImageUrl) ? (
                   <img src={(detailData as any).imageUrl || (detailData as any).ImageUrl} alt={detailData.brand} className="size-16 rounded-xl object-cover border border-zinc-200" />
                 ) : (
                   <div className="size-16 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400">
                     <Car className="size-8 opacity-50" />
                   </div>
                 )}
                 <div>
                   <h3 className="text-lg font-bold text-zinc-950">{(detailData as any).modelYear || detailData.year} {detailData.brand} {detailData.model}</h3>
                   <span className="inline-block mt-1 font-mono text-xs px-2 py-1 bg-zinc-100 rounded border border-zinc-200 text-zinc-800">
                     {detailData.vehicleNumber}
                   </span>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-200">
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase">Owner Information</p>
                  <p className="mt-1 text-sm font-medium text-zinc-950">{(detailData as any).customerName || "—"}</p>
                  <p className="text-sm text-zinc-600">{(detailData as any).customerPhone || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase">Additional Info</p>
                  <p className="mt-1 text-sm text-zinc-950">{(detailData as any).status || "Active"}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-200">
                <p className="text-xs font-medium text-zinc-500 uppercase mb-3 flex items-center gap-2">
                  <Calendar className="size-4" /> Appointments
                </p>
                {(detailData as any).appointments && (detailData as any).appointments.length > 0 ? (
                  <div className="space-y-2">
                    {(detailData as any).appointments.map((a: any) => (
                       <div key={a.appointmentId} className="flex justify-between items-center bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-sm">
                         <div>
                           <p className="font-medium text-zinc-950">{a.appointmentDate ? format(new Date(a.appointmentDate), "PPP p") : "Date not provided"}</p>
                           <p className="text-xs text-zinc-600 mt-0.5">{a.description || "No description"}</p>
                         </div>
                         <span className="text-xs font-medium px-2 py-1 bg-zinc-200 rounded text-zinc-700">{a.status}</span>
                       </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 italic">No appointments recorded.</p>
                )}
              </div>

              <div className="pt-4 border-t border-zinc-200">
                <p className="text-xs font-medium text-zinc-500 uppercase mb-3 flex items-center gap-2">
                   Service history
                </p>
                {(detailData as any).serviceRecords && (detailData as any).serviceRecords.length > 0 ? (
                  <div className="space-y-2">
                    {(detailData as any).serviceRecords.map((r: any) => (
                       <div key={r.serviceRecordId} className="flex flex-col bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-sm">
                         <div className="flex justify-between items-start mb-1">
                           <p className="font-medium text-zinc-950">{r.serviceDate ? format(new Date(r.serviceDate), "PPP") : "Date not provided"}</p>
                            <span className="font-semibold text-emerald-700">{formatCurrency(r.serviceCost || 0)}</span>
                         </div>
                         <p className="text-xs text-zinc-600">{r.serviceDescription}</p>
                       </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 italic">No service records found.</p>
                )}
              </div>

              <div className="pt-4 border-t border-zinc-200">
                <p className="text-xs font-medium text-zinc-500 uppercase mb-3 flex items-center gap-2">
                  <FileText className="size-4" /> Invoices
                </p>
                {(detailData as any).invoices && (detailData as any).invoices.length > 0 ? (
                  <div className="space-y-2">
                    {(detailData as any).invoices.map((inv: any) => (
                      <div key={inv.salesInvoiceId || inv.invoiceId} className="flex items-center justify-between bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-sm">
                        <div>
                          <p className="font-medium text-zinc-950">#{inv.salesInvoiceId || inv.invoiceId}</p>
                          <p className="text-xs text-zinc-600 mt-0.5">
                            {(inv.invoiceDate ? format(new Date(inv.invoiceDate), "MMM d, yyyy") : "Not provided")} • Due {inv.dueDate ? format(new Date(inv.dueDate), "MMM d, yyyy") : "—"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-zinc-950">{formatCurrency(inv.finalAmount || inv.totalAmount || 0)}</p>
                          <span className="text-xs font-medium px-2 py-1 bg-zinc-200 rounded text-zinc-700">{inv.isPaid ? "Paid" : "Unpaid"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 italic">No invoices found.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-zinc-500">Failed to load vehicle details.</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
