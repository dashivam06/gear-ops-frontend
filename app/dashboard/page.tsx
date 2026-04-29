"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  Bell,
  Boxes,
  ClipboardList,
  CreditCard,
  FileBarChart2,
  LayoutGrid,
  LogOut,
  PackageCheck,
  Settings,
  Users
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { logoutAuth } from "@/lib/api";
import { useAuthStore } from "@/lib/store/auth-store";
import { useToast } from "@/components/ui/toast";

const kpis = [
  { label: "Active Customers", value: "2,340", change: "+6.4%" },
  { label: "Monthly Revenue", value: "$124,300", change: "+2.1%" },
  { label: "Open Invoices", value: "84", change: "-3.2%" },
  { label: "Low Stock Alerts", value: "12", change: "+1.5%" }
];

const revenueData = [
  { month: "Jan", value: 72000 },
  { month: "Feb", value: 68000 },
  { month: "Mar", value: 79000 },
  { month: "Apr", value: 86000 },
  { month: "May", value: 82000 },
  { month: "Jun", value: 91000 },
  { month: "Jul", value: 96000 },
  { month: "Aug", value: 102000 },
  { month: "Sep", value: 99000 },
  { month: "Oct", value: 112000 },
  { month: "Nov", value: 120000 },
  { month: "Dec", value: 131000 }
];

const salesData = [
  { week: "W1", parts: 420, services: 260 },
  { week: "W2", parts: 380, services: 290 },
  { week: "W3", parts: 460, services: 310 },
  { week: "W4", parts: 520, services: 340 }
];

const inventoryData = [
  { name: "Filters", stock: 120 },
  { name: "Belts", stock: 60 },
  { name: "Brakes", stock: 42 },
  { name: "Batteries", stock: 25 },
  { name: "Sensors", stock: 18 }
];

const adminModules = [
  {
    title: "Financial Reports",
    description: "Generate daily, monthly, and yearly performance reports."
  },
  {
    title: "Staff Management",
    description: "Register staff, assign roles, and manage permissions."
  },
  {
    title: "Parts Inventory",
    description: "Purchase, edit, delete, and invoice stock updates."
  },
  {
    title: "Vendor Directory",
    description: "Maintain vendor profiles with full CRUD operations."
  }
];

const staffModules = [
  "Register customers with vehicle details",
  "Sell vehicle parts and create sales invoices",
  "View customer history, vehicles, and service details",
  "Generate customer reports (regulars, high spenders, pending credits)",
  "Search customers by vehicle number, phone, ID, or name",
  "Send invoices to customers by email"
];

const customerModules = [
  "Self-register and manage profile and vehicle details",
  "Book appointments and request unavailable parts",
  "Review services and view purchase history",
  "Loyalty program: 10% discount over $5000 spend"
];

const automationModules = [
  "Low stock alerts when inventory falls below 10 units",
  "Email reminders for unpaid credits over 30 days",
  "AI insights to predict upcoming part failures"
];

const sidebarItems = [
  { label: "Overview", icon: LayoutGrid },
  { label: "Reports", icon: FileBarChart2 },
  { label: "Inventory", icon: Boxes },
  { label: "Vendors", icon: PackageCheck },
  { label: "Invoices", icon: CreditCard },
  { label: "Staff", icon: Users },
  { label: "Tasks", icon: ClipboardList },
  { label: "Alerts", icon: Bell },
  { label: "Settings", icon: Settings }
];

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const { addToast } = useToast();
  const displayName = user?.fullName || user?.email?.split("@")[0] || "Admin";
  const displayEmail = user?.email || "admin@gearops.com";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="h-screen bg-white text-zinc-950">
      <div className="flex h-screen w-full">
        <aside className="sticky top-0 flex h-screen w-72 shrink-0 flex-col rounded-r-xl border border-zinc-900 bg-zinc-950 p-4 text-white">
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
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Admin Console
              </p>
              <h1 className="mt-1 text-lg font-semibold tracking-[0.08em]">
                GEAR OPS
              </h1>
            </div>
          </div>
          <div className="flex-1 space-y-1">
            {sidebarItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = index === 0;
              return (
                <button
                  key={item.label}
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
          <div className="mt-6 rounded-xl border border-zinc-800 p-4">
            <div className="flex items-center gap-3">
              {user?.profileImageUrl ? (
                <div className="size-12 shrink-0 overflow-hidden rounded-full border border-zinc-800 bg-zinc-900 aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={user.profileImageUrl}
                    alt={displayName}
                    className="block h-full w-full object-cover object-center"
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
          <header className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  Dashboard
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Vehicle Parts & Inventory Management
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Admin overview with reporting, staff, vendors, and customer service coverage.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold">
                  Export
                </button>
                <button className="rounded-lg border border-zinc-950 bg-zinc-950 px-4 py-2 text-sm font-semibold text-white">
                  New Report
                </button>
              </div>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl border border-zinc-200 bg-white p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  {kpi.label}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-2xl font-semibold">{kpi.value}</span>
                  <span className="rounded-full border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-600">
                    {kpi.change}
                  </span>
                </div>
              </div>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="mb-4">
                <h3 className="text-sm font-semibold">Yearly Revenue</h3>
                <p className="text-xs text-zinc-500">
                  Admin view of financial performance by month.
                </p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={12} />
                    <YAxis stroke="#71717a" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        borderColor: "#e4e4e7",
                        boxShadow: "none"
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#09090b"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="mb-4">
                <h3 className="text-sm font-semibold">Inventory Health</h3>
                <p className="text-xs text-zinc-500">
                  Top categories with current stock levels.
                </p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={inventoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
                    <YAxis stroke="#71717a" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        borderColor: "#e4e4e7",
                        boxShadow: "none"
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="stock"
                      stroke="#09090b"
                      fill="#d4d4d8"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="mb-4">
                <h3 className="text-sm font-semibold">Parts vs Services</h3>
                <p className="text-xs text-zinc-500">
                  Weekly sales mix across departments.
                </p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData} barGap={6}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="week" stroke="#71717a" fontSize={12} />
                    <YAxis stroke="#71717a" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        borderColor: "#e4e4e7",
                        boxShadow: "none"
                      }}
                    />
                    <Bar dataKey="parts" fill="#09090b" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="services" fill="#d4d4d8" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="mb-4">
                <h3 className="text-sm font-semibold">Development Features</h3>
                <p className="text-xs text-zinc-500">
                  Requirements mapped for Admin, Staff, and Customers.
                </p>
              </div>
              <div className="space-y-3">
                {adminModules.map((module) => (
                  <div key={module.title} className="rounded-lg border border-zinc-200 p-3">
                    <p className="text-sm font-semibold">{module.title}</p>
                    <p className="mt-1 text-xs text-zinc-500">{module.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <h3 className="text-sm font-semibold">Staff Capabilities</h3>
              <ul className="mt-3 space-y-2 text-sm text-zinc-600">
                {staffModules.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 size-1.5 rounded-full bg-zinc-900" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <h3 className="text-sm font-semibold">Customer Experience</h3>
              <ul className="mt-3 space-y-2 text-sm text-zinc-600">
                {customerModules.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 size-1.5 rounded-full bg-zinc-900" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <h3 className="text-sm font-semibold">Automation & Alerts</h3>
              <ul className="mt-3 space-y-2 text-sm text-zinc-600">
                {automationModules.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 size-1.5 rounded-full bg-zinc-900" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
