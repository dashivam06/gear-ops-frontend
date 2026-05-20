"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Search, Pencil, Trash2 } from "lucide-react"

import { useAuthStore } from "@/lib/store/auth-store"
import { getVendors, createVendor, updateVendor, deleteVendor, Vendor } from "@/lib/api"
import { UserHeader } from "@/components/layout/user-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/toast"
import { ImageUpload } from "@/components/ui/image-upload"

const vendorSchema = z.object({
  vendorName: z.string().min(1, "Vendor Name is required"),
  contactPerson: z.string().min(1, "Contact Person is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(1, "Address is required"),
  imageUrl: z.string().optional(),
})

type VendorFormValues = z.infer<typeof vendorSchema>

export default function VendorsPage() {
  const { accessToken } = useAuthStore()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [search, setSearch] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [deletingVendor, setDeletingVendor] = useState<Vendor | null>(null)

  const { data: vendorsData, isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => getVendors(accessToken || ""),
    enabled: !!accessToken,
  })
  const vendors = vendorsData?.items || []

  const createMutation = useMutation({
    mutationFn: (data: VendorFormValues) => createVendor(accessToken || "", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] })
      addToast({ title: "Vendor added", variant: "success" })
      setIsAddOpen(false)
      addForm.reset()
    },
    onError: () => {
      addToast({ title: "Failed to add vendor", variant: "error" })
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<VendorFormValues> }) => updateVendor(accessToken || "", id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] })
      addToast({ title: "Vendor updated", variant: "success" })
      setEditingVendor(null)
    },
    onError: () => {
      addToast({ title: "Failed to update vendor", variant: "error" })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteVendor(accessToken || "", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] })
      addToast({ title: "Vendor deleted", variant: "success" })
      setDeletingVendor(null)
    },
    onError: () => {
      addToast({ title: "Failed to delete vendor", variant: "error" })
    }
  })

  const addForm = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema) as any,
    defaultValues: { vendorName: "", contactPerson: "", phone: "", email: "", address: "", imageUrl: "" },
  })

  const editForm = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema) as any,
  })

  const handleEditClick = (vendor: Vendor) => {
    editForm.reset({
      vendorName: vendor.vendorName,
      contactPerson: vendor.contactPerson,
      phone: vendor.phone,
      email: vendor.email,
      address: vendor.address,
      imageUrl: vendor.imageUrl || "",
    })
    setEditingVendor(vendor)
  }

  const filteredVendors = vendors.filter(v =>
    v.vendorName.toLowerCase().includes(search.toLowerCase()) ||
    v.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
    v.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <UserHeader
        title="Vendors"
        subtitle="Manage parts suppliers and vendor contact information."
      >
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 w-full sm:w-auto h-10 px-4">
              <Plus className="mr-2 size-4" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Vendor</DialogTitle>
            </DialogHeader>
            <form onSubmit={addForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <div className="flex gap-6">
                <div className="flex-1 space-y-4">
                  <div>
                    <Label htmlFor="vendorName">Vendor Name</Label>
                    <Input id="vendorName" {...addForm.register("vendorName")} className="mt-1" />
                    {addForm.formState.errors.vendorName && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.vendorName.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input id="contactPerson" {...addForm.register("contactPerson")} className="mt-1" />
                    {addForm.formState.errors.contactPerson && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.contactPerson.message}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-center pt-2 w-32 shrink-0">
                  <ImageUpload
                    value={addForm.watch("imageUrl")}
                    onChange={(val) => addForm.setValue("imageUrl", val)}
                    label="VENDOR IMAGE"
                    folder="vendors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...addForm.register("phone")} className="mt-1" />
                  {addForm.formState.errors.phone && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.phone.message}</p>}
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...addForm.register("email")} className="mt-1" />
                  {addForm.formState.errors.email && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.email.message}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...addForm.register("address")} className="mt-1" />
                {addForm.formState.errors.address && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.address.message}</p>}
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Saving..." : "Save Vendor"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </UserHeader>

      <div className="flex items-center mb-6 max-w-sm relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
        <Input
          placeholder="Search vendors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white"
        />
      </div>

      <div className="bg-white rounded-xl border border-zinc-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Contact Details</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-zinc-500">Loading vendors...</TableCell>
              </TableRow>
            ) : filteredVendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-zinc-500">No vendors found.</TableCell>
              </TableRow>
            ) : (
              filteredVendors.map((vendor) => (
                <TableRow key={vendor.vendorId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {vendor.imageUrl ? (
                        <img src={vendor.imageUrl} alt={vendor.vendorName} className="size-10 rounded-lg object-cover border border-zinc-200" />
                      ) : (
                        <div className="size-10 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400">
                          <span className="text-xs font-medium uppercase">{vendor.vendorName.substring(0, 2)}</span>
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-950">{vendor.vendorName}</span>
                        <span className="text-xs text-zinc-500">{vendor.address}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-900">{vendor.contactPerson}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm text-zinc-900">{vendor.email}</span>
                      <span className="text-xs text-zinc-500">{vendor.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditClick(vendor)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                        aria-label="Edit vendor"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => setDeletingVendor(vendor)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        aria-label="Delete vendor"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingVendor} onOpenChange={(open) => !open && setEditingVendor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit((data) => updateMutation.mutate({ id: editingVendor!.vendorId, data }))} className="space-y-4">
            <div className="flex gap-6">
              <div className="flex-1 space-y-4">
                <div>
                  <Label htmlFor="edit-vendorName">Vendor Name</Label>
                  <Input id="edit-vendorName" {...editForm.register("vendorName")} className="mt-1" />
                  {editForm.formState.errors.vendorName && <p className="mt-1 text-xs text-red-500">{editForm.formState.errors.vendorName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="edit-contactPerson">Contact Person</Label>
                  <Input id="edit-contactPerson" {...editForm.register("contactPerson")} className="mt-1" />
                  {editForm.formState.errors.contactPerson && <p className="mt-1 text-xs text-red-500">{editForm.formState.errors.contactPerson.message}</p>}
                </div>
              </div>
              <div className="flex flex-col items-center pt-2 w-32 shrink-0">
                <ImageUpload
                  value={editForm.watch("imageUrl")}
                  onChange={(val) => editForm.setValue("imageUrl", val)}
                  label="VENDOR IMAGE"
                  folder="vendors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input id="edit-phone" {...editForm.register("phone")} className="mt-1" />
                {editForm.formState.errors.phone && <p className="mt-1 text-xs text-red-500">{editForm.formState.errors.phone.message}</p>}
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" type="email" {...editForm.register("email")} className="mt-1" />
                {editForm.formState.errors.email && <p className="mt-1 text-xs text-red-500">{editForm.formState.errors.email.message}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="edit-address">Address</Label>
              <Input id="edit-address" {...editForm.register("address")} className="mt-1" />
              {editForm.formState.errors.address && <p className="mt-1 text-xs text-red-500">{editForm.formState.errors.address.message}</p>}
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => setEditingVendor(null)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save Changes"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingVendor} onOpenChange={(open) => !open && setDeletingVendor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingVendor?.vendorName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this vendor? This will delete their contact information from the system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white border-transparent"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault()
                if (deletingVendor) deleteMutation.mutate(deletingVendor.vendorId)
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Vendor"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
