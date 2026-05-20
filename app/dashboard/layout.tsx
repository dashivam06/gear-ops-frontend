"use client";

import {
  CarFront,
  LayoutGrid,
  LogOut,
  CalendarDays,
  Settings,
  ShoppingBag,
  History
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { logoutAuth, getProfile } from "@/lib/api";
import { useAuthStore } from "@/lib/store/auth-store";
import { useToast } from "@/components/ui/toast";
import { nameInitials } from "@/lib/utils";
import { CurrencyToggle } from "@/components/layout/currency-toggle";
import { useCurrency } from "@/lib/hooks/use-currency";

const sidebarItems = [
  { label: "Overview", icon: LayoutGrid, href: "/dashboard" },
  { label: "My Vehicles", icon: CarFront, href: "/dashboard/vehicles" },
  { label: "Appointments", icon: CalendarDays, href: "/dashboard/appointments" },
  { label: "History & Reviews", icon: History, href: "/dashboard/history" },
  { label: "Part Requests", icon: ShoppingBag, href: "/dashboard/requests" },
  { label: "Profile", icon: Settings, href: "/dashboard/profile" }
];

export default function CustomerDashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const clearSession = useAuthStore((state) => state.clearSession);
  const { addToast } = useToast();
  const { format } = useCurrency();
  const displayName = user?.fullName || user?.email?.split("@")[0] || "Customer";
  const displayEmail = user?.email || "user@gearops.com";
  const initials = nameInitials(displayName);
  const [avatarBroken, setAvatarBroken] = useState(false);

  useEffect(() => {
    setAvatarBroken(false);
  }, [user?.profileImageUrl]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!accessToken) {
      router.replace("/login");
    }
  }, [accessToken, router, hasHydrated]);

  const { data: profile } = useQuery({
    queryKey: ["customer-profile"],
    queryFn: () => getProfile(accessToken || "", user || undefined),
    enabled: !!accessToken && hasHydrated,
  });

  if (!hasHydrated) return null;

  return (
    <div className="h-screen bg-white text-zinc-950">
      <div className="flex h-screen w-full">
        <aside className="sticky top-0 flex h-screen w-72 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 p-4 text-white">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-zinc-800">
              <Image
                src="/corerouter-logo.png"
                alt="Gear Ops"
                width={28}
                height={28}
                className="size-7 object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-[0.08em]">
                GEAR OPS
              </h1>
              <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Customer Portal
              </p>
            </div>
          </div>
          <div className="flex-1 space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="mt-auto pt-6 border-t border-zinc-900">
            <CurrencyToggle />
          </div>
          <div className="mt-6 rounded-xl border border-zinc-800 p-4">
            <div className="flex items-center gap-3">
              {user?.profileImageUrl && !avatarBroken ? (
                <div className="size-12 shrink-0 overflow-hidden rounded-full border border-zinc-800 bg-zinc-900 aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.profileImageUrl}
                    alt={displayName}
                    className="block h-full w-full object-cover object-center"
                    onError={() => setAvatarBroken(true)}
                  />
                </div>
              ) : (
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-200 aspect-square">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                <p className="truncate text-xs text-zinc-400">{displayEmail}</p>
                {profile && (
                  <p className={`mt-1 truncate text-[11px] font-medium ${profile.creditsRemaining < 0 ? "text-red-400" : "text-emerald-400"}`}>
                    Available Credit: {format(profile.creditsRemaining)}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-zinc-500 hover:text-white"
              onClick={async () => {
                try {
                  await logoutAuth();
                  addToast({ title: "Logout successful", variant: "success", duration: 3000 });
                } catch (err) {
                  addToast({ title: "Logout failed", description: (err as Error)?.message ?? "Please try again", variant: "error", duration: 4000 });
                } finally {
                  clearSession();
                  router.push("/login");
                }
              }}
            >
              <LogOut className="size-4" />
              Logout
            </button>
          </div>
        </aside>
        <main className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
