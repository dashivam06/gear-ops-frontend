"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Car, Pencil, Trash2 } from "lucide-react"

import { useAuthStore } from "@/lib/store/auth-store"
import { getCustomerVehicles, createCustomerVehicle, updateCustomerVehicle, deleteCustomerVehicle, Vehicle } from "@/lib/api"
import { UserHeader } from "@/components/layout/user-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/toast"
import { ImageUpload } from "@/components/ui/image-upload"

const vehicleSchema = z.object({
  vehicleNumber: z.string().min(1, "Plate number is required"),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
  imageUrl: z.string().min(1, "Vehicle image is required"),
})

type VehicleFormValues = z.infer<typeof vehicleSchema>

export default function MyVehiclesPage() {
  const { accessToken } = useAuthStore()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null)

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["my-vehicles"],
    queryFn: () => getCustomerVehicles(accessToken || ""),
    enabled: !!accessToken,
  })

  const createMutation = useMutation({
    mutationFn: (data: VehicleFormValues) => createCustomerVehicle(accessToken || "", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-vehicles"] })
      addToast({ title: "Vehicle added", variant: "success" })
      setIsAddOpen(false)
      addForm.reset()
    },
    onError: (err) => addToast({ title: (err as Error).message || "Failed to add vehicle", variant: "error" })
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<VehicleFormValues> }) => updateCustomerVehicle(accessToken || "", id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-vehicles"] })
      addToast({ title: "Vehicle updated", variant: "success" })
      setEditingVehicle(null)
    },
    onError: (err) => addToast({ title: (err as Error).message || "Failed to update vehicle", variant: "error" })
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCustomerVehicle(accessToken || "", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-vehicles"] })
      addToast({ title: "Vehicle removed", variant: "success" })
      setDeletingVehicle(null)
    },
    onError: (err) => addToast({ title: (err as Error).message || "Failed to remove vehicle", variant: "error" })
  })

  const addForm = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema) as any,
    defaultValues: { vehicleNumber: "", brand: "", model: "", year: new Date().getFullYear(), imageUrl: "" },
  })

  const editForm = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema) as any,
  })

  const handleEditClick = (vehicle: Vehicle) => {
    editForm.reset({
      vehicleNumber: vehicle.vehicleNumber,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      imageUrl: vehicle.imageUrl || "",
    })
    setEditingVehicle(vehicle)
  }

  return (
    <>
      <UserHeader title="My Vehicles" subtitle="View and manage your registered vehicles.">
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 w-full sm:w-auto h-10 px-4">
              <Plus className="mr-2 size-4" /> Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Register New Vehicle</DialogTitle></DialogHeader>
            <form onSubmit={addForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <div className="flex gap-6">
                <div className="flex-1 space-y-4">
                  <div>
                    <Label htmlFor="vehicleNumber">Plate / Reg. Number</Label>
                    <Input id="vehicleNumber" {...addForm.register("vehicleNumber")} className="mt-1" placeholder="e.g. ABC-123" />
                    {addForm.formState.errors.vehicleNumber && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.vehicleNumber.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="brand">Brand</Label>
                    <Input id="brand" {...addForm.register("brand")} className="mt-1" placeholder="Honda" />
                    {addForm.formState.errors.brand && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.brand.message}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-center pt-2 w-32 shrink-0">
                  <ImageUpload value={addForm.watch("imageUrl")} onChange={(val) => addForm.setValue("imageUrl", val, { shouldValidate: true })} label="VEHICLE IMAGE" folder="vehicles" className="rounded-xl" />
                  {addForm.formState.errors.imageUrl && <p className="mt-2 text-xs text-red-500 text-center">{addForm.formState.errors.imageUrl.message}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="model">Model</Label>
                  <Input id="model" {...addForm.register("model")} className="mt-1" placeholder="Civic" />
                  {addForm.formState.errors.model && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.model.message}</p>}
                </div>
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Input id="year" type="number" {...addForm.register("year")} className="mt-1" />
                  {addForm.formState.errors.year && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.year.message}</p>}
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Saving..." : "Add Vehicle"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </UserHeader>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-zinc-500">Loading vehicles...</div>
      ) : vehicles.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
          <Car className="mx-auto size-12 text-zinc-300 mb-4" />
          <h3 className="text-lg font-semibold text-zinc-950 mb-1">No vehicles yet</h3>
          <p className="text-sm text-zinc-500">Add your first vehicle to get started with appointments and services.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {vehicles.map((v) => (
            <div key={v.vehicleId} className="rounded-xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md overflow-hidden">
              <div className="flex items-stretch h-56">
                {/* Left: Vehicle Details */}
                <div className="flex-1 p-5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wide">Brand</p>
                      <p className="text-lg font-bold text-zinc-950">{v.brand}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wide">Year</p>
                        <p className="text-base font-semibold text-zinc-900">{v.year}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wide">Model</p>
                        <p className="text-base font-semibold text-zinc-900">{v.model}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wide">Plate</p>
                      <p className="font-mono text-sm px-3 py-1.5 bg-zinc-100 rounded-lg border border-zinc-200 text-zinc-700 inline-block">{v.vehicleNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                    <button onClick={() => handleEditClick(v)} className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors" aria-label="Edit">
                      <Pencil className="size-4" />
                    </button>
                    <button onClick={() => setDeletingVehicle(v)} className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors" aria-label="Delete">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                
                {/* Right: Vehicle Image */}
                <div className="w-80 bg-gradient-to-br from-zinc-50 to-zinc-100 border-l border-zinc-200 flex items-center justify-center overflow-hidden">
                  {v.imageUrl ? (
                    <img src={v.imageUrl} alt={`${v.year} ${v.brand} ${v.model}`} className="h-full w-full object-cover" />
                  ) : (
                    <Car className="size-16 text-zinc-300" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingVehicle} onOpenChange={(open) => !open && setEditingVehicle(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Vehicle</DialogTitle></DialogHeader>
          <form onSubmit={editForm.handleSubmit((data) => updateMutation.mutate({ id: editingVehicle!.vehicleId, data }))} className="space-y-4">
            <div className="flex gap-6">
              <div className="flex-1 space-y-4">
                <div>
                  <Label htmlFor="edit-vehicleNumber">Plate / Reg. Number</Label>
                  <Input id="edit-vehicleNumber" {...editForm.register("vehicleNumber")} className="mt-1" />
                  {editForm.formState.errors.vehicleNumber && <p className="mt-1 text-xs text-red-500">{editForm.formState.errors.vehicleNumber.message}</p>}
                </div>
                <div>
                  <Label htmlFor="edit-brand">Brand</Label>
                  <Input id="edit-brand" {...editForm.register("brand")} className="mt-1" />
                  {editForm.formState.errors.brand && <p className="mt-1 text-xs text-red-500">{editForm.formState.errors.brand.message}</p>}
                </div>
              </div>
              <div className="flex flex-col items-center pt-2 w-32 shrink-0">
                <ImageUpload value={editForm.watch("imageUrl")} onChange={(val) => editForm.setValue("imageUrl", val, { shouldValidate: true })} label="VEHICLE IMAGE" folder="vehicles" className="rounded-xl" />
                {editForm.formState.errors.imageUrl && <p className="mt-2 text-xs text-red-500 text-center">{editForm.formState.errors.imageUrl.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-model">Model</Label>
                <Input id="edit-model" {...editForm.register("model")} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="edit-year">Year</Label>
                <Input id="edit-year" type="number" {...editForm.register("year")} className="mt-1" />
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => setEditingVehicle(null)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save Changes"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingVehicle} onOpenChange={(open) => !open && setDeletingVehicle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deletingVehicle?.year} {deletingVehicle?.brand} {deletingVehicle?.model}?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the vehicle from your profile. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white border-transparent" disabled={deleteMutation.isPending} onClick={(e) => { e.preventDefault(); if (deletingVehicle) deleteMutation.mutate(deletingVehicle.vehicleId) }}>
              {deleteMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
