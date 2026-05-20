"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Search, Pencil, Trash2, UserCheck, UserX } from "lucide-react"

import { useAuthStore } from "@/lib/store/auth-store"
import { getStaffList, createStaff, updateStaff, deleteStaff, toggleStaffStatus, StaffMember } from "@/lib/api"
import { UserHeader } from "@/components/layout/user-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/toast"
import { ImageUpload } from "@/components/ui/image-upload"
import { Switch } from "@/components/ui/switch"

const staffSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().optional(),
  position: z.string().min(1, "Position is required"),
  profileImageUrl: z.string().optional(),
})

type StaffFormValues = z.infer<typeof staffSchema>

const editStaffSchema = staffSchema.extend({
  isActive: z.boolean(),
})

type EditStaffFormValues = z.infer<typeof editStaffSchema>

export default function StaffPage() {
  const { accessToken } = useAuthStore()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null)

  const { data: staffData, isLoading } = useQuery({
    queryKey: ["staff", page],
    queryFn: () => getStaffList(accessToken || "", page, 20),
    enabled: !!accessToken,
  })
  const staffList = staffData?.items || []

  const createMutation = useMutation({
    mutationFn: (data: StaffFormValues) => createStaff(accessToken || "", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] })
      queryClient.invalidateQueries({ queryKey: ["staff", "dashboard"] })
      addToast({ title: "Staff added", variant: "success" })
      setIsAddOpen(false)
      addForm.reset()
    },
    onError: () => {
      addToast({ title: "Failed to add staff", variant: "error" })
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EditStaffFormValues }) => updateStaff(accessToken || "", id, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] })
      queryClient.invalidateQueries({ queryKey: ["staff", "dashboard"] })
      addToast({ title: "Staff updated", variant: "success" })
      setEditingStaff(null)
    },
    onError: () => {
      addToast({ title: "Failed to update staff", variant: "error" })
    }
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => toggleStaffStatus(accessToken || "", id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] })
      queryClient.invalidateQueries({ queryKey: ["staff", "dashboard"] })
      addToast({ title: "Status updated", variant: "success" })
    },
    onError: () => addToast({ title: "Failed to update status", variant: "error" }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteStaff(accessToken || "", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] })
      queryClient.invalidateQueries({ queryKey: ["staff", "dashboard"] })
      addToast({ title: "Staff deleted", variant: "success" })
      setDeletingStaff(null)
    },
    onError: () => {
      addToast({ title: "Failed to delete staff", variant: "error" })
    }
  })

  const addForm = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema) as any,
    defaultValues: { fullName: "", email: "", phone: "", address: "", position: "Staff", profileImageUrl: "" },
  })

  const editForm = useForm<EditStaffFormValues>({
    resolver: zodResolver(editStaffSchema) as any,
  })

  const handleEditClick = (staff: StaffMember) => {
    editForm.reset({
      fullName: staff.fullName,
      email: staff.email,
      phone: staff.phone,
      address: staff.address || "",
      position: staff.position || "Staff",
      profileImageUrl: staff.profileImageUrl || "",
      isActive: staff.isActive,
    })
    setEditingStaff(staff)
  }

  const filteredStaff = staffList.filter(s =>
    s.fullName.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <UserHeader
        title="Staff Management"
        subtitle="Register and manage staff members, roles, and permissions."
      >
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 w-full sm:w-auto h-10 px-4">
              <Plus className="mr-2 size-4" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={addForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <div className="flex gap-6">
                <div className="flex-1 space-y-4">
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" {...addForm.register("fullName")} className="mt-1" />
                    {addForm.formState.errors.fullName && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.fullName.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...addForm.register("email")} className="mt-1" />
                    {addForm.formState.errors.email && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.email.message}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-center pt-2 w-32 shrink-0">
                  <ImageUpload
                    value={addForm.watch("profileImageUrl")}
                    onChange={(val) => addForm.setValue("profileImageUrl", val)}
                    label="PROFILE IMAGE"
                    folder="staff"
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
                  <Label htmlFor="position">Position</Label>
                  <Input id="position" {...addForm.register("position")} className="mt-1" placeholder="e.g. Mechanic, Manager" />
                  {addForm.formState.errors.position && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.position.message}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...addForm.register("address")} className="mt-1" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Saving..." : "Save Staff"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </UserHeader>

      <div className="flex items-center mb-6 max-w-sm relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
        <Input
          placeholder="Search staff..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-white"
        />
      </div>

      <div className="bg-white rounded-xl border border-zinc-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-zinc-500">Loading staff data...</TableCell>
              </TableRow>
            ) : filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-zinc-500">No staff members found.</TableCell>
              </TableRow>
            ) : (
              filteredStaff.map((staff) => (
                <TableRow key={staff.staffId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {staff.profileImageUrl ? (
                        <img src={staff.profileImageUrl} alt={staff.fullName} className="size-10 rounded-full object-cover border border-zinc-200" />
                      ) : (
                        <div className="size-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400">
                          <span className="text-xs font-medium uppercase">{staff.fullName.substring(0, 2)}</span>
                        </div>
                      )}
                      <span className="font-medium text-zinc-950">{staff.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm text-zinc-900">{staff.email}</span>
                      <span className="text-xs text-zinc-500">{staff.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-zinc-900">{staff.position}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={staff.isActive ? "success" : "danger"}>
                      {staff.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        title={staff.isActive ? "Deactivate" : "Activate"}
                        onClick={() => toggleMutation.mutate({ id: staff.staffId, isActive: !staff.isActive })}
                        disabled={toggleMutation.isPending}
                        className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                      >
                        {staff.isActive ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
                      </button>
                      <button
                        onClick={() => handleEditClick(staff)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                        aria-label="Edit staff"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => setDeletingStaff(staff)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        aria-label="Delete staff"
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

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          Page {staffData?.page ?? page} of {staffData?.totalPages ?? 1} • {staffData?.totalItems ?? staffList.length} staff
        </p>
        <div className="flex gap-2">
          <Button variant="outline" className="h-9 px-3" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </Button>
          <Button variant="outline" className="h-9 px-3" disabled={Boolean(staffData && !staffData.hasNextPage)} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>

      <Dialog open={!!editingStaff} onOpenChange={(open) => !open && setEditingStaff(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit((data) => updateMutation.mutate({ id: editingStaff!.staffId, data }))} className="space-y-4">
            <div className="flex gap-6">
              <div className="flex-1 space-y-4">
                <div>
                  <Label htmlFor="edit-fullName">Full Name</Label>
                  <Input id="edit-fullName" {...editForm.register("fullName")} className="mt-1" />
                  {editForm.formState.errors.fullName && <p className="mt-1 text-xs text-red-500">{editForm.formState.errors.fullName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input id="edit-email" type="email" {...editForm.register("email")} className="mt-1" />
                  {editForm.formState.errors.email && <p className="mt-1 text-xs text-red-500">{editForm.formState.errors.email.message}</p>}
                </div>
              </div>
              <div className="flex flex-col items-center pt-2 w-32 shrink-0">
                <ImageUpload
                  value={editForm.watch("profileImageUrl")}
                  onChange={(val) => editForm.setValue("profileImageUrl", val)}
                  label="PROFILE IMAGE"
                  folder="staff"
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
                <Label htmlFor="edit-position">Position</Label>
                <Input id="edit-position" {...editForm.register("position")} className="mt-1" />
                {editForm.formState.errors.position && <p className="mt-1 text-xs text-red-500">{editForm.formState.errors.position.message}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="edit-address">Address</Label>
              <Input id="edit-address" {...editForm.register("address")} className="mt-1" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-100 px-3 py-3">
              <div>
                <Label htmlFor="edit-active" className="text-sm font-medium text-zinc-900">
                  Account active
                </Label>
                <p className="text-xs text-zinc-500">Inactive accounts cannot sign in until re-enabled.</p>
              </div>
              <Switch
                id="edit-active"
                checked={editForm.watch("isActive")}
                onCheckedChange={(c) => editForm.setValue("isActive", c)}
              />
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => setEditingStaff(null)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save Changes"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingStaff} onOpenChange={(open) => !open && setDeletingStaff(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingStaff?.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this staff member? They will lose all access to the system immediately. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white border-transparent"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault()
                if (deletingStaff) deleteMutation.mutate(deletingStaff.staffId)
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Staff"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
