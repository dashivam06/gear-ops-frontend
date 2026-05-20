"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Search } from "lucide-react"

import { useAuthStore } from "@/lib/store/auth-store"
import { useCurrency } from "@/lib/hooks/use-currency"
import { searchStaffCustomers, createStaffCustomer, getStaffCustomerDetail, createStaffCustomerVehicle, Customer } from "@/lib/api"
import { UserHeader } from "@/components/layout/user-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import { ImageUpload } from "@/components/ui/image-upload"

const customerSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().optional(),
  profileImageUrl: z.string().optional(),
  vehicleNumber: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.coerce.number().optional(),
  vehicleImageUrl: z.string().optional(),
})

type CustomerFormValues = z.infer<typeof customerSchema>

const vehicleSchema = z.object({
  vehicleNumber: z.string().min(1, "License plate is required"),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  year: z.coerce.number().min(1900, "Invalid year").max(new Date().getFullYear() + 1, "Invalid year"),
  imageUrl: z.string().optional(),
})

type VehicleFormValues = z.infer<typeof vehicleSchema>

export default function CustomersPage() {
  const { accessToken } = useAuthStore()
  const { format: formatCurrency } = useCurrency()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  
  const [search, setSearch] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [isAddingVehicle, setIsAddingVehicle] = useState(false)
  const [page, setPage] = useState(1)
  const [debouncedSearch, setDebouncedSearch] = useState("")

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(handler)
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ["staff-customers", debouncedSearch, page],
    queryFn: () => {
      if (debouncedSearch.trim()) return searchStaffCustomers(accessToken || "", debouncedSearch)
      return searchStaffCustomers(accessToken || "", "", page, 20)
    },
    enabled: !!accessToken,
  })
  
  // If search returns an array, use it directly. Otherwise it's a paginated response so use data.items.
  const customerList = data?.items || []

  const { data: selectedCustomerDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["staff-customer-detail", selectedCustomerId],
    queryFn: () => getStaffCustomerDetail(accessToken || "", selectedCustomerId as number),
    enabled: !!accessToken && selectedCustomerId !== null,
  })

  const createMutation = useMutation({
    mutationFn: (data: CustomerFormValues) => createStaffCustomer(accessToken || "", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-customers"] })
      addToast({ title: "Customer registered", variant: "success" })
      setIsAddOpen(false)
      addForm.reset()
    },
    onError: (err) => {
      addToast({ title: (err as Error).message || "Failed to register customer", variant: "error" })
    }
  })

  const addVehicleMutation = useMutation({
    mutationFn: (data: VehicleFormValues) => createStaffCustomerVehicle(accessToken || "", selectedCustomerId as number, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-customer-detail", selectedCustomerId] })
      addToast({ title: "Vehicle added successfully", variant: "success" })
      addVehicleForm.reset()
      setIsAddingVehicle(false)
    },
    onError: (err) => {
      addToast({ title: (err as Error).message || "Failed to add vehicle", variant: "error" })
    }
  })

  const addForm = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: { fullName: "", email: "", phone: "", address: "", profileImageUrl: "", vehicleNumber: "", brand: "", model: "", year: undefined, vehicleImageUrl: "" },
  })

  const addVehicleForm = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema) as any,
    defaultValues: { vehicleNumber: "", brand: "", model: "", year: undefined, imageUrl: "" },
  })

  return (
    <>
      <UserHeader 
        title="Customer Management" 
        subtitle="Register new customers and search existing profiles." 
      >
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 w-full sm:w-auto h-10 px-4">
              <Plus className="mr-2 size-4" />
              Register Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Register New Customer</DialogTitle>
            </DialogHeader>
            <form onSubmit={addForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-zinc-900 border-b pb-1">Customer Details</h3>
                <div className="flex gap-6">
                  <div className="flex-1 space-y-4">
                    <div>
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input id="fullName" {...addForm.register("fullName")} className="mt-1" />
                      {addForm.formState.errors.fullName && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.fullName.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" type="email" {...addForm.register("email")} className="mt-1" />
                      {addForm.formState.errors.email && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.email.message}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-center pt-2 w-32 shrink-0">
                    <ImageUpload 
                      value={addForm.watch("profileImageUrl")} 
                      onChange={(val) => addForm.setValue("profileImageUrl", val)} 
                      label="PROFILE IMAGE" 
                      folder="customers"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input id="phone" {...addForm.register("phone")} className="mt-1" />
                    {addForm.formState.errors.phone && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.phone.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" {...addForm.register("address")} className="mt-1" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-zinc-900 border-b pb-1">Vehicle Details (Optional)</h3>
                <div className="flex gap-6">
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vehicleNumber">License Plate</Label>
                      <Input id="vehicleNumber" {...addForm.register("vehicleNumber")} className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="brand">Brand</Label>
                      <Input id="brand" {...addForm.register("brand")} className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="model">Model</Label>
                      <Input id="model" {...addForm.register("model")} className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="year">Year</Label>
                      <Input id="year" type="number" {...addForm.register("year")} className="mt-1" />
                    </div>
                  </div>
                  <div className="flex flex-col items-center pt-2 w-32 shrink-0">
                    <ImageUpload 
                      value={addForm.watch("vehicleImageUrl")} 
                      onChange={(val) => addForm.setValue("vehicleImageUrl", val)} 
                      label="VEHICLE PHOTO" 
                      folder="vehicles"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Saving..." : "Register Customer"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </UserHeader>

      <div className="flex items-center mb-6 max-w-sm relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
        <Input 
          placeholder="Search by name, email, phone, or vehicle..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white"
        />
      </div>

      <div className="bg-white rounded-xl border border-zinc-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Credit Balance</TableHead>
              <TableHead>Vehicles</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-zinc-500">Loading customers...</TableCell>
              </TableRow>
            ) : customerList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-zinc-500">No customers found.</TableCell>
              </TableRow>
            ) : (
              customerList.map((customer) => (
                <TableRow key={customer.userId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {customer.profileImageUrl ? (
                        <img src={customer.profileImageUrl} alt={customer.fullName} className="size-10 rounded-full object-cover border border-zinc-200" />
                      ) : (
                        <div className="size-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400">
                          <span className="text-xs font-medium uppercase">{customer.fullName.substring(0, 2)}</span>
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-950">{customer.fullName}</span>
                        <span className="text-xs text-zinc-500">ID: {customer.userId}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm text-zinc-900">{customer.email}</span>
                      <span className="text-xs text-zinc-500">{customer.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`font-semibold ${customer.creditsRemaining > 0 ? "text-red-600" : "text-zinc-900"}`}>
                      {formatCurrency(customer.creditsRemaining)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {customer.vehicles && customer.vehicles.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        {customer.vehicles.map(v => (
                          <span key={v.vehicleId} className="text-xs text-zinc-600">{v.vehicleNumber} — {v.brand} {v.model}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">No vehicles</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedCustomerId(customer.userId)}
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

      {!search.trim() ? (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Page {data?.page ?? page} of {data?.totalPages ?? 1} • {data?.totalItems ?? customerList.length} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-9 px-3"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              className="h-9 px-3"
              disabled={Boolean(data && !data.hasNextPage)}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={selectedCustomerId !== null} onOpenChange={(open) => !open && setSelectedCustomerId(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="py-10 text-center text-zinc-500">Loading details...</div>
          ) : selectedCustomerDetail ? (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                {selectedCustomerDetail.profileImageUrl ? (
                   <img src={selectedCustomerDetail.profileImageUrl} alt={selectedCustomerDetail.fullName} className="size-16 rounded-full object-cover border border-zinc-200" />
                 ) : (
                   <div className="size-16 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400">
                     <span className="text-xl font-medium uppercase">{selectedCustomerDetail.fullName.substring(0, 2)}</span>
                   </div>
                 )}
                 <div>
                   <h3 className="text-lg font-bold text-zinc-950">{selectedCustomerDetail.fullName}</h3>
                   <p className="text-sm text-zinc-500">Customer ID: {selectedCustomerDetail.userId}</p>
                   {selectedCustomerDetail.createdAt && (
                     <p className="text-xs text-zinc-400 mt-1">Joined: {new Date(selectedCustomerDetail.createdAt).toLocaleDateString()}</p>
                   )}
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-200">
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase">Contact Information</p>
                  <p className="mt-1 text-sm font-medium text-zinc-950">{selectedCustomerDetail.email}</p>
                  <p className="text-sm text-zinc-600">{selectedCustomerDetail.phone}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase">Address</p>
                  <p className="mt-1 text-sm text-zinc-950">{selectedCustomerDetail.address || "Not provided"}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-200">
                <p className="text-xs font-medium text-zinc-500 uppercase mb-1">Credit / Balance</p>
                <p className={`text-lg font-bold ${selectedCustomerDetail.creditsRemaining > 0 ? "text-red-600" : "text-zinc-950"}`}>
                  {formatCurrency(selectedCustomerDetail.creditsRemaining || 0)}
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-200">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-zinc-500 uppercase">Vehicles</p>
                  <Button variant="outline"  className="h-7 text-xs" onClick={() => setIsAddingVehicle(!isAddingVehicle)}>
                    {isAddingVehicle ? "Cancel" : "Add Vehicle"}
                  </Button>
                </div>

                {isAddingVehicle ? (
                  <div className="bg-zinc-50 p-4 rounded-lg border border-zinc-200 mb-4">
                    <h4 className="text-sm font-semibold text-zinc-900 mb-3">Add New Vehicle</h4>
                    <form onSubmit={addVehicleForm.handleSubmit((data) => addVehicleMutation.mutate(data))} className="space-y-4">
                      <div className="flex gap-6">
                        <div className="flex-1 space-y-4">
                          <div>
                            <Label htmlFor="newVehicleNumber">License Plate</Label>
                            <Input id="newVehicleNumber" {...addVehicleForm.register("vehicleNumber")} className="mt-1" />
                            {addVehicleForm.formState.errors.vehicleNumber && <p className="mt-1 text-xs text-red-500">{addVehicleForm.formState.errors.vehicleNumber.message}</p>}
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor="newBrand">Brand</Label>
                              <Input id="newBrand" {...addVehicleForm.register("brand")} className="mt-1" />
                              {addVehicleForm.formState.errors.brand && <p className="mt-1 text-xs text-red-500">{addVehicleForm.formState.errors.brand.message}</p>}
                            </div>
                            <div>
                              <Label htmlFor="newModel">Model</Label>
                              <Input id="newModel" {...addVehicleForm.register("model")} className="mt-1" />
                              {addVehicleForm.formState.errors.model && <p className="mt-1 text-xs text-red-500">{addVehicleForm.formState.errors.model.message}</p>}
                            </div>
                            <div>
                              <Label htmlFor="newYear">Year</Label>
                              <Input id="newYear" type="number" {...addVehicleForm.register("year")} className="mt-1" />
                              {addVehicleForm.formState.errors.year && <p className="mt-1 text-xs text-red-500">{addVehicleForm.formState.errors.year.message}</p>}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-center pt-2 w-32 shrink-0">
                          <ImageUpload 
                            value={addVehicleForm.watch("imageUrl")} 
                            onChange={(val) => addVehicleForm.setValue("imageUrl", val)} 
                            label="VEHICLE PHOTO" 
                            folder="vehicles"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline"  onClick={() => setIsAddingVehicle(false)}>Cancel</Button>
                        <Button type="submit"  disabled={addVehicleMutation.isPending}>{addVehicleMutation.isPending ? "Adding..." : "Save Vehicle"}</Button>
                      </div>
                    </form>
                  </div>
                ) : null}

                {selectedCustomerDetail.vehicles && selectedCustomerDetail.vehicles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedCustomerDetail.vehicles.map(v => (
                       <div key={v.vehicleId} className="border border-zinc-200 rounded-lg p-3 bg-zinc-50 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-zinc-950">{v.vehicleNumber}</p>
                            <p className="text-sm text-zinc-600">{v.brand} {v.model} ({(v as any).modelYear || v.year})</p>
                          </div>
                          {v.imageUrl && (
                            <img src={v.imageUrl} alt={v.vehicleNumber} className="w-12 h-12 object-cover rounded-md border border-zinc-200" />
                          )}
                       </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 italic">No vehicles registered.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-zinc-500">Failed to load customer details.</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
