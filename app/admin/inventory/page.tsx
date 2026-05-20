"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Search, Pencil, Trash2, AlertTriangle } from "lucide-react"

import { useAuthStore } from "@/lib/store/auth-store"
import { useCurrency } from "@/lib/hooks/use-currency"
import { getParts, getAdminPartsByCategory, searchAdminParts, createPart, updatePart, deletePart, getVendors, Part, Vendor } from "@/lib/api"
import { UserHeader } from "@/components/layout/user-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/toast"
import { ImageUpload } from "@/components/ui/image-upload"

const partSchema = z.object({
  vendorId: z.coerce.number().min(1, "Vendor is required"),
  partName: z.string().min(1, "Part Name is required"),
  description: z.string(),
  category: z.string().min(1, "Category is required"),
  stockQuantity: z.coerce.number().min(0, "Stock cannot be negative"),
  unit: z.string().min(1, "Unit is required"),
  costPricePerUnit: z.coerce.number().min(0),
  sellingPricePerUnit: z.coerce.number().min(0),
  imageUrl: z.string().optional(),
})

type PartFormValues = z.infer<typeof partSchema>

export default function InventoryPage() {
  const { accessToken } = useAuthStore()
  const { symbol, format: formatCurrency, convert, convertToBase } = useCurrency()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [page, setPage] = useState(1)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingPart, setEditingPart] = useState<Part | null>(null)
  const [deletingPart, setDeletingPart] = useState<Part | null>(null)

  const { data: partsData, isLoading: isLoadingParts } = useQuery({
    queryKey: ["parts", page, selectedCategory, search],
    queryFn: () => {
      const q = search.trim()
      if (q) return searchAdminParts(accessToken || "", q, page, 20)
      if (selectedCategory !== "All") return getAdminPartsByCategory(accessToken || "", selectedCategory, page, 20)
      return getParts(accessToken || "", page, 20)
    },
    enabled: !!accessToken,
  })
  const parts = partsData?.items || []

  const { data: vendorsData } = useQuery({
    queryKey: ["vendors"],
    queryFn: () => getVendors(accessToken || ""),
    enabled: !!accessToken,
  })
  const vendors = vendorsData?.items || []

  const vendorMap = useMemo(() => {
    return vendors.reduce((acc, v) => ({ ...acc, [v.vendorId]: v.vendorName }), {} as Record<number, string>)
  }, [vendors])

  const createMutation = useMutation({
    mutationFn: (data: PartFormValues) => createPart(accessToken || "", {
      ...data,
      costPricePerUnit: convertToBase(data.costPricePerUnit),
      sellingPricePerUnit: convertToBase(data.sellingPricePerUnit),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parts"] })
      addToast({ title: "Part added", variant: "success" })
      setIsAddOpen(false)
      addForm.reset()
    },
    onError: () => {
      addToast({ title: "Failed to add part", variant: "error" })
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PartFormValues> }) => updatePart(accessToken || "", id, {
      ...data,
      costPricePerUnit: data.costPricePerUnit !== undefined ? convertToBase(data.costPricePerUnit) : undefined,
      sellingPricePerUnit: data.sellingPricePerUnit !== undefined ? convertToBase(data.sellingPricePerUnit) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parts"] })
      addToast({ title: "Part updated", variant: "success" })
      setEditingPart(null)
    },
    onError: () => {
      addToast({ title: "Failed to update part", variant: "error" })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePart(accessToken || "", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parts"] })
      addToast({ title: "Part deleted", variant: "success" })
      setDeletingPart(null)
    },
    onError: () => {
      addToast({ title: "Failed to delete part", variant: "error" })
    }
  })

  const addForm = useForm<PartFormValues>({
    resolver: zodResolver(partSchema) as any,
    defaultValues: { vendorId: 0, partName: "", description: "", category: "", stockQuantity: 0, unit: "Piece", costPricePerUnit: 0, sellingPricePerUnit: 0, imageUrl: "" },
  })

  const editForm = useForm<PartFormValues>({
    resolver: zodResolver(partSchema) as any,
  })

  const handleEditClick = (part: Part) => {
    editForm.reset({
      vendorId: part.vendorId,
      partName: part.partName,
      description: part.description,
      category: part.category,
      stockQuantity: part.stockQuantity,
      unit: part.unit,
      costPricePerUnit: convert(part.costPricePerUnit),
      sellingPricePerUnit: convert(part.sellingPricePerUnit),
      imageUrl: part.imageUrl || "",
    })
    setEditingPart(part)
  }

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(parts.map((p) => p.category).filter(Boolean)))],
    [parts]
  )

  return (
    <>
      <UserHeader
        title="Inventory"
        subtitle="Manage vehicle parts, pricing, and monitor stock levels."
      >
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 w-full sm:w-auto h-10 px-4">
              <Plus className="mr-2 size-4" />
              Add Part
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Part</DialogTitle>
            </DialogHeader>
            <form onSubmit={addForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <div className="flex gap-6">
                <div className="flex-1 space-y-4">
                  <div>
                    <Label htmlFor="partName">Part Name</Label>
                    <Input id="partName" {...addForm.register("partName")} className="mt-1" />
                    {addForm.formState.errors.partName && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.partName.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="vendorId">Vendor</Label>
                    <Select id="vendorId" {...addForm.register("vendorId")} className="mt-1">
                      <option value={0} disabled>Select a vendor...</option>
                      {vendors.map(v => (
                        <option key={v.vendorId} value={v.vendorId}>{v.vendorName}</option>
                      ))}
                    </Select>
                    {addForm.formState.errors.vendorId && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.vendorId.message}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-center pt-2 w-32 shrink-0">
                  <ImageUpload
                    value={addForm.watch("imageUrl")}
                    onChange={(val) => addForm.setValue("imageUrl", val)}
                    label="PART IMAGE"
                    folder="parts"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" {...addForm.register("category")} className="mt-1" />
                  {addForm.formState.errors.category && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.category.message}</p>}
                </div>

                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Input id="unit" {...addForm.register("unit")} className="mt-1" placeholder="e.g., Piece, Set, Quart" />
                  {addForm.formState.errors.unit && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.unit.message}</p>}
                </div>

                <div>
                  <Label htmlFor="stockQuantity">Stock Quantity</Label>
                  <Input id="stockQuantity" type="number" {...addForm.register("stockQuantity")} className="mt-1" />
                  {addForm.formState.errors.stockQuantity && <p className="mt-1 text-xs text-red-500">{addForm.formState.errors.stockQuantity.message}</p>}
                </div>

                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" {...addForm.register("description")} className="mt-1" />
                </div>

                <div>
                  <Label htmlFor="costPricePerUnit">Cost Price ({symbol})</Label>
                  <Input id="costPricePerUnit" type="number" step="0.01" {...addForm.register("costPricePerUnit")} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="sellingPricePerUnit">Selling Price ({symbol})</Label>
                  <Input id="sellingPricePerUnit" type="number" step="0.01" {...addForm.register("sellingPricePerUnit")} className="mt-1" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-100 mt-6">
                <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Saving..." : "Save Part"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </UserHeader>

      <div className="mb-6 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <Input
            placeholder="Search parts by name or category..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9 bg-white"
          />
        </div>
        <Select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value)
            setPage(1)
          }}
          className="bg-white"
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Part</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Pricing</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingParts ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-zinc-500">Loading inventory...</TableCell>
              </TableRow>
            ) : parts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-zinc-500">No parts found.</TableCell>
              </TableRow>
            ) : (
              parts.map((part) => (
                <TableRow key={part.partId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {part.imageUrl ? (
                        <img src={part.imageUrl} alt={part.partName} className="size-10 rounded-lg object-cover border border-zinc-200" />
                      ) : (
                        <div className="size-10 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400">
                          <span className="text-xs font-medium uppercase">{part.partName.substring(0, 2)}</span>
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-950">{part.partName}</span>
                        <span className="text-xs text-zinc-500">{part.category}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-600">{part.vendorName || vendorMap[part.vendorId] || `Vendor #${part.vendorId}`}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900">{part.stockQuantity} {part.unit}</span>
                      {part.stockQuantity < 10 && (
                        <Badge variant="danger" className="px-1.5" title="Low stock alert">
                          <AlertTriangle className="size-3 mr-1" />
                          Low
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm text-zinc-900">{formatCurrency(part.sellingPricePerUnit)} <span className="text-xs text-zinc-500">sell</span></span>
                      <span className="text-xs text-zinc-500">{formatCurrency(part.costPricePerUnit)} cost</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditClick(part)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                        aria-label="Edit part"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => setDeletingPart(part)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        aria-label="Delete part"
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
          Page {partsData?.page ?? page} of {partsData?.totalPages ?? 1} • {partsData?.totalItems ?? parts.length} total
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
            disabled={Boolean(partsData && !partsData.hasNextPage)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={!!editingPart} onOpenChange={(open) => !open && setEditingPart(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Part</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit((data) => updateMutation.mutate({ id: editingPart!.partId, data }))} className="space-y-4">
            <div className="flex gap-6">
              <div className="flex-1 space-y-4">
                <div>
                  <Label htmlFor="edit-partName">Part Name</Label>
                  <Input id="edit-partName" {...editForm.register("partName")} className="mt-1" />
                  {editForm.formState.errors.partName && <p className="mt-1 text-xs text-red-500">{editForm.formState.errors.partName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="edit-vendorId">Vendor</Label>
                  <Select id="edit-vendorId" {...editForm.register("vendorId")} className="mt-1">
                    <option value={0} disabled>Select a vendor...</option>
                    {vendors.map(v => (
                      <option key={v.vendorId} value={v.vendorId}>{v.vendorName}</option>
                    ))}
                  </Select>
                  {editForm.formState.errors.vendorId && <p className="mt-1 text-xs text-red-500">{editForm.formState.errors.vendorId.message}</p>}
                </div>
              </div>
              <div className="flex flex-col items-center pt-2 w-32 shrink-0">
                <ImageUpload
                  value={editForm.watch("imageUrl")}
                  onChange={(val) => editForm.setValue("imageUrl", val)}
                  label="PART IMAGE"
                  folder="parts"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Input id="edit-category" {...editForm.register("category")} className="mt-1" />
                {editForm.formState.errors.category && <p className="mt-1 text-xs text-red-500">{editForm.formState.errors.category.message}</p>}
              </div>

              <div>
                <Label htmlFor="edit-unit">Unit</Label>
                <Input id="edit-unit" {...editForm.register("unit")} className="mt-1" />
                {editForm.formState.errors.unit && <p className="mt-1 text-xs text-red-500">{editForm.formState.errors.unit.message}</p>}
              </div>

              <div>
                <Label htmlFor="edit-stockQuantity">Stock Quantity</Label>
                <Input id="edit-stockQuantity" type="number" {...editForm.register("stockQuantity")} className="mt-1" />
                {editForm.formState.errors.stockQuantity && <p className="mt-1 text-xs text-red-500">{editForm.formState.errors.stockQuantity.message}</p>}
              </div>

              <div className="col-span-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input id="edit-description" {...editForm.register("description")} className="mt-1" />
              </div>

              <div>
                <Label htmlFor="edit-costPricePerUnit">Cost Price ({symbol})</Label>
                <Input id="edit-costPricePerUnit" type="number" step="0.01" {...editForm.register("costPricePerUnit")} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="edit-sellingPricePerUnit">Selling Price ({symbol})</Label>
                <Input id="edit-sellingPricePerUnit" type="number" step="0.01" {...editForm.register("sellingPricePerUnit")} className="mt-1" />
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-3 border-t border-zinc-100 mt-6">
              <Button variant="outline" type="button" onClick={() => setEditingPart(null)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save Changes"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingPart} onOpenChange={(open) => !open && setDeletingPart(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingPart?.partName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this part from the inventory? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white border-transparent"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault()
                if (deletingPart) deleteMutation.mutate(deletingPart.partId)
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Part"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
