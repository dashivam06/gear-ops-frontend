"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Search, ShoppingBag, ShoppingCart, Package } from "lucide-react"

import { useAuthStore } from "@/lib/store/auth-store"
import {
  getCustomerPartRequests,
  createCustomerPartRequest,
  getCustomerVehicles,
  getCustomerParts,
  getCustomerPartsByCategory,
  searchCustomerParts,
  buyPartsDirectly,
} from "@/lib/api"
import type { CatalogPart } from "@/lib/api"
import { UserHeader } from "@/components/layout/user-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import { useCurrency } from "@/lib/hooks/use-currency"

const requestSchema = z.object({
  partName: z.string().min(1, "Part name is required"),
  description: z.string().optional(),
  vehicleId: z.coerce.number().min(1, "Vehicle is required"),
})

type RequestFormValues = z.infer<typeof requestSchema>

const statusConfig: Record<string, { label: string; variant: "outline" | "secondary" | "success" | "danger"; color: string }> = {
  Pending: { label: "Pending", variant: "outline", color: "bg-amber-100 text-amber-800" },
  Available: { label: "Available", variant: "success", color: "bg-emerald-100 text-emerald-800" },
  PendingAdminReview: { label: "Under Review", variant: "secondary", color: "bg-blue-100 text-blue-800" },
  Ordered: { label: "Ordered", variant: "secondary", color: "bg-violet-100 text-violet-800" },
  Rejected: { label: "Rejected", variant: "danger", color: "bg-red-100 text-red-800" },
}

interface CartItem {
  part: CatalogPart
  quantity: number
}

export default function PartRequestsPage() {
  const { accessToken } = useAuthStore()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const { format } = useCurrency()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [catalogPage, setCatalogPage] = useState(1)
  const [category, setCategory] = useState("All")
  const [search, setSearch] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [buyVehicleId, setBuyVehicleId] = useState<number>(0)
  const [activeView, setActiveView] = useState<"shop" | "history">("shop")

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["my-part-requests"],
    queryFn: () => getCustomerPartRequests(accessToken || ""),
    enabled: !!accessToken,
  })

  const { data: vehicles = [] } = useQuery({
    queryKey: ["my-vehicles"],
    queryFn: () => getCustomerVehicles(accessToken || ""),
    enabled: !!accessToken,
  })

  const { data: partsCatalog, isLoading: loadingCatalog } = useQuery({
    queryKey: ["customer-parts-catalog", catalogPage, category, search],
    queryFn: () => {
      const q = search.trim()
      if (q) return searchCustomerParts(accessToken || "", q, catalogPage, 20)
      if (category !== "All") return getCustomerPartsByCategory(accessToken || "", category, catalogPage, 20)
      return getCustomerParts(accessToken || "", catalogPage, 20)
    },
    enabled: !!accessToken,
  })
  const catalogParts = partsCatalog?.items || []
  const categories = ["All", ...Array.from(new Set(catalogParts.map((p) => p.category).filter(Boolean)))]

  const vehicleById = Object.fromEntries(
    vehicles.map((vehicle) => [vehicle.vehicleId, vehicle])
  ) as Record<number, (typeof vehicles)[number]>

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema) as any,
    defaultValues: { partName: "", description: "", vehicleId: 0 },
  })

  const createMutation = useMutation({
    mutationFn: (data: RequestFormValues) => createCustomerPartRequest(accessToken || "", {
      partName: data.partName,
      description: data.description || "",
      vehicleId: Number(data.vehicleId),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-part-requests"] })
      addToast({ title: "Part request submitted!", variant: "success" })
      setIsAddOpen(false)
      form.reset()
    },
    onError: () => addToast({ title: "Failed to submit request", variant: "error" })
  })

  const buyMutation = useMutation({
    mutationFn: () => buyPartsDirectly(accessToken || "", {
      vehicleId: buyVehicleId || undefined,
      items: cart.map(c => ({ partId: c.part.partId, quantity: c.quantity })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-parts-catalog"] })
      queryClient.invalidateQueries({ queryKey: ["my-purchases"] })
      addToast({ title: "Parts purchased successfully!", variant: "success" })
      setCart([])
      setIsCartOpen(false)
      setBuyVehicleId(0)
    },
    onError: (err) => addToast({ title: (err as Error).message || "Failed to purchase parts", variant: "error" })
  })

  const addToCart = (part: CatalogPart) => {
    setCart(prev => {
      const existing = prev.find(c => c.part.partId === part.partId)
      if (existing) {
        return prev.map(c => c.part.partId === part.partId ? { ...c, quantity: c.quantity + 1 } : c)
      }
      return [...prev, { part, quantity: 1 }]
    })
    addToast({ title: `${part.partName} added to cart`, variant: "success" })
  }

  const removeFromCart = (partId: number) => {
    setCart(prev => prev.filter(c => c.part.partId !== partId))
  }

  const updateCartQty = (partId: number, qty: number) => {
    if (qty <= 0) return removeFromCart(partId)
    setCart(prev => prev.map(c => c.part.partId === partId ? { ...c, quantity: qty } : c))
  }

  const cartTotal = cart.reduce((sum, c) => sum + c.quantity * c.part.sellingPricePerUnit, 0)

  return (
    <>
      <UserHeader title="Parts & Requests" subtitle="Browse parts, add to cart, or review your request history.">
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-1">
            <Button
              variant={activeView === "shop" ? "primary" : "outline"}
              className="h-8 px-3 text-xs"
              onClick={() => setActiveView("shop")}
            >
              Shop Parts
            </Button>
            <Button
              variant={activeView === "history" ? "primary" : "outline"}
              className="h-8 px-3 text-xs"
              onClick={() => setActiveView("history")}
            >
              My Requests
            </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="relative h-8 px-3 text-xs"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart className="mr-2 size-4" />
              Cart
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white">
                  {cart.length}
                </span>
              )}
            </Button>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="shrink-0 w-full sm:w-auto h-8 px-3 text-xs">
                  <Plus className="mr-2 size-4" /> Request Part
                </Button>
              </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Request a Part</DialogTitle></DialogHeader>
                  <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                    <div>
                      <Label htmlFor="partName">Part Name</Label>
                      <Input id="partName" {...form.register("partName")} className="mt-1" placeholder="e.g. Headlight Bulb H7" />
                      {form.formState.errors.partName && <p className="mt-1 text-xs text-red-500">{form.formState.errors.partName.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="vehicleId">Vehicle</Label>
                      <Select id="vehicleId" {...form.register("vehicleId")} className="mt-1">
                        <option value={0} disabled>Choose a vehicle...</option>
                        {vehicles.map(v => (
                          <option key={v.vehicleId} value={v.vehicleId}>{v.year} {v.brand} {v.model} ({v.vehicleNumber})</option>
                        ))}
                      </Select>
                      {form.formState.errors.vehicleId && <p className="mt-1 text-xs text-red-500">{form.formState.errors.vehicleId.message}</p>}
                    </div>
                    <div>
                      <Label htmlFor="description">Description / Details</Label>
                      <textarea id="description" {...form.register("description")} className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400" rows={3} placeholder="Provide details like vehicle model, year, or specific part number..." />
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                      <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Submitting..." : "Submit Request"}</Button>
                    </div>
                  </form>
                </DialogContent>
            </Dialog>
          </div>
        </div>
      </UserHeader>

      {activeView === "shop" ? (
        <>
          <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="size-5 text-zinc-600" />
              <p className="text-sm font-semibold text-zinc-900">Browse & Buy Parts</p>
            </div>
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCatalogPage(1) }}
                  placeholder="Search parts..."
                  className="pl-9"
                />
              </div>
              <Select value={category} onChange={(e) => { setCategory(e.target.value); setCatalogPage(1) }}>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </Select>
            </div>
            {loadingCatalog ? (
              <p className="text-sm text-zinc-500">Loading parts...</p>
            ) : catalogParts.length === 0 ? (
              <p className="text-sm text-zinc-500">No parts found. You can submit a request above.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {catalogParts.map((part) => {
                  const inCart = cart.find(c => c.part.partId === part.partId)
                  return (
                    <div key={part.partId} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2.5 hover:bg-zinc-50 transition-colors">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-900">{part.partName}</p>
                        <p className="text-xs text-zinc-500">
                          {part.category} • {part.stockQuantity} {part.unit} in stock
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold text-zinc-900">{format(part.sellingPricePerUnit)}</p>
                        {part.stockQuantity > 0 ? (
                          inCart ? (
                            <span className="text-xs text-emerald-600 font-medium">In cart ({inCart.quantity})</span>
                          ) : (
                            <Button
                              variant="outline"
                              className="h-8 px-3 text-xs border-zinc-300"
                              onClick={() => addToCart(part)}
                            >
                              <ShoppingCart className="mr-1 size-3" /> Add
                            </Button>
                          )
                        ) : (
                          <span className="text-xs text-red-500 font-medium">Out of stock</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-zinc-500">
                Page {partsCatalog?.page ?? catalogPage} of {partsCatalog?.totalPages ?? 1}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="h-8 px-2 text-xs" disabled={catalogPage <= 1} onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}>
                  Prev
                </Button>
                <Button type="button" variant="outline" className="h-8 px-2 text-xs" disabled={Boolean(partsCatalog && !partsCatalog.hasNextPage)} onClick={() => setCatalogPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </div>

          <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Your Cart</DialogTitle></DialogHeader>
              {cart.length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-500">Your cart is empty. Browse parts and add items.</p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {cart.map(item => (
                      <div key={item.part.partId} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-zinc-900">{item.part.partName}</p>
                          <p className="text-xs text-zinc-500">{format(item.part.sellingPricePerUnit)} each</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" className="h-7 w-7 p-0 text-xs" onClick={() => updateCartQty(item.part.partId, item.quantity - 1)}>-</Button>
                          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                          <Button variant="outline" className="h-7 w-7 p-0 text-xs" onClick={() => updateCartQty(item.part.partId, item.quantity + 1)}>+</Button>
                          <Button variant="outline" className="h-7 px-2 text-xs text-red-500 ml-2" onClick={() => removeFromCart(item.part.partId)}>✕</Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <Label>Vehicle (optional)</Label>
                    <Select className="mt-1" value={buyVehicleId} onChange={(e) => setBuyVehicleId(Number(e.target.value))}>
                      <option value={0}>No vehicle selected</option>
                      {vehicles.map(v => (
                        <option key={v.vehicleId} value={v.vehicleId}>{v.year} {v.brand} {v.model} ({v.vehicleNumber})</option>
                      ))}
                    </Select>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-3">
                    <span className="text-sm font-medium text-zinc-700">Total</span>
                    <span className="text-lg font-bold text-zinc-900">{format(cartTotal)}</span>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCartOpen(false)}>Close</Button>
                    <Button onClick={() => buyMutation.mutate()} disabled={buyMutation.isPending || cart.length === 0}>
                      {buyMutation.isPending ? "Processing..." : "Buy Now"}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-zinc-500">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
              <ShoppingBag className="mx-auto size-12 text-zinc-300 mb-4" />
              <h3 className="text-lg font-semibold text-zinc-950 mb-1">No part requests</h3>
              <p className="text-sm text-zinc-500">Can&apos;t find a part? Submit a request and we&apos;ll source it for you.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(req => {
                const config = statusConfig[req.status] || statusConfig["Pending"]
                const vehicle = vehicleById[req.vehicleId]
                return (
                  <div key={req.partRequestId} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
                            {config.label}
                          </span>
                          <span className="text-xs text-zinc-400">{new Date(req.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h3 className="text-base font-semibold text-zinc-950">{req.partName}</h3>
                        <p className="text-sm text-zinc-600">{req.description || "No details"}</p>
                        {req.decisionNote && (
                          <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                            <span className="font-medium">Staff note:</span> {req.decisionNote}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm">
                        <p className="text-xs text-zinc-500">Vehicle</p>
                        <p className="font-medium text-zinc-900">
                          {vehicle ? `${vehicle.brand} ${vehicle.model}` : req.vehicleNumber || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </>
  )
}
