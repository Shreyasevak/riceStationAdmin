"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  ShoppingBag,
  Utensils,
  Table2,
  Users,
  Store,
  Wallet,
  ChartNoAxesCombined,
  Settings,
  ShieldCheck,
  Search,
  Bell,
  ChevronDown,
  IndianRupee,
  Clock,
  CheckCircle2,
  CircleAlert,
  CalendarDays,
  Loader2,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { apiRequest } from "@/services/api";

type Outlet = {
  id: string;
  name: string;
  code: string;
  city: string | null;
  isActive: boolean;
  _count: {
    users: number;
    tables: number;
    orders: number;
    menuItems: number;
  };
};

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Outlets", icon: Store },
  { label: "Menu Management", icon: Utensils },
  { label: "Table Management", icon: Table2 },
  { label: "Orders", icon: ShoppingBag },
  { label: "User Management", icon: Users },
  { label: "Payment & Royalty Management", icon: Wallet },
  { label: "Reports & Analytics", icon: ChartNoAxesCombined },
];

export default function DashboardPage() {
  const router = useRouter();

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState("ALL");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const token = sessionStorage.getItem("bytebill_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const result = await apiRequest("/outlets");

      if (!result?.success || !Array.isArray(result.data)) {
        throw new Error(result?.message || "Unable to load outlets.");
      }

      setOutlets(result.data);

      const payload = JSON.parse(
  atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
);

setIsSuperAdmin(payload.role === "SUPER_ADMIN");

    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load dashboard.";

      setError(message);

      if (
        message.toLowerCase().includes("token") ||
        message.toLowerCase().includes("unauthorized")
      ) {
        sessionStorage.removeItem("bytebill_token");
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const filteredOutlets =
  selectedOutletId === "ALL"
    ? outlets
    : outlets.filter((outlet) => outlet.id === selectedOutletId);

    const totalUsers = filteredOutlets.reduce(
  (sum, outlet) => sum + outlet._count.users,
  0
);

const totalTables = filteredOutlets.reduce(
  (sum, outlet) => sum + outlet._count.tables,
  0
);

const totalOrders = filteredOutlets.reduce(
  (sum, outlet) => sum + outlet._count.orders,
  0
);

const totalMenuItems = filteredOutlets.reduce(
  (sum, outlet) => sum + outlet._count.menuItems,
  0
);

const activeOutlets = filteredOutlets.filter(
  (outlet) => outlet.isActive
).length;

const stats = [
  {
    title: "Total Outlets",
    value: filteredOutlets.length,
    icon: Store,
    color: "bg-emerald-50 text-emerald-700",
    href: "/outlets",
  },
  {
    title: "Total Users",
    value: totalUsers,
    icon: Users,
    color: "bg-brand-highlight/10 text-brand-primary",
    href: "/users",
  },
  {
    title: "Total Tables",
    value: totalTables,
    icon: Table2,
    color: "bg-brand-accent/10 text-brand-accent",
    href: "/tables",
  },
  {
    title: "Total Orders",
    value: totalOrders,
    icon: ShoppingBag,
    color: "bg-amber-50 text-amber-700",
    href: "/orders",
  },
];


  return (
    <div className="min-h-screen bg-page-background text-brand-primary">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-brand-primary text-white lg:flex">
        <div className="flex h-20 items-center border-b border-white/10 px-4">
          <div className="flex h-[60px] w-full items-center justify-center rounded-xl bg-white px-2 py-1">
            <Image
              src="/bytebill-logo-cropped.png"
              alt="Bitebill"
              width={1469}
              height={402}
              className="h-full w-full object-contain"
            />
          </div>
        </div>

        <div className="px-5 py-6">
          <nav className="space-y-1">
            {navigation.map((item) => (
              <a
                key={item.label}
                href={
                  item.label === "Dashboard" ? "/" :
                  item.label === "Outlets" ? "/outlets" :
                  item.label === "Menu Management" ? "/menu?returnTo=dashboard" :
                  item.label === "Table Management" ? "/tables" :
                  item.label === "Orders" ? "/orders" :
                  item.label === "User Management" ? "/users" :
                  item.label === "Royalty Management" ? "/payments" :
                  item.label === "Reports & Analytics" ? "/reports" : "#"
                }
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                  item.label === "Dashboard"
                    ? "bg-brand-highlight font-semibold text-brand-primary"
                    : "text-emerald-50/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon size={19} />
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-auto px-5 pb-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck size={17} className="text-brand-highlight" />
              System Settings
            </div>
            <p className="text-xs leading-5 text-emerald-100/60">
              Manage permissions and configuration.
            </p>
            <p className="mt-3 text-xs font-semibold text-brand-highlight">
              Platform administration
            </p>
          </div>
          <p className="mt-5 text-center text-[10px] text-emerald-100/40">
            BYTEBILL v1.0.0
          </p>
        </div>
      </aside>

      <main className="min-h-screen lg:ml-64">
       <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur md:px-8">
  <div>
    <p className="text-xs text-slate-400">Pages / Dashboard</p>
    <h2 className="text-xl font-bold text-brand-primary">
      Dashboard Overview
    </h2>
  </div>

  <div className="flex items-center gap-3">

    <button
      aria-label="Refresh dashboard"
      onClick={loadDashboard}
      className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50"
    >
      <RefreshCw size={19} />
    </button>

    <div className="relative border-l border-slate-200 pl-3">
      <button
        type="button"
        onClick={() => setProfileMenuOpen(!profileMenuOpen)}
        className="flex items-center gap-2"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-highlight/10 font-bold text-brand-primary">
          A
        </div>

        <div className="hidden text-left sm:block">
          <p className="text-sm font-semibold">Administrator</p>
          <p className="text-xs text-slate-400">Super Admin</p>
        </div>

        <ChevronDown size={16} className="text-slate-400" />
      </button>

      {profileMenuOpen && (
        <div className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem("bytebill_token");
              setProfileMenuOpen(false);
              router.replace("/login");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      )}
    </div>
  </div>
</header>

        <div className="p-5 md:p-8">
          <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-bold">Welcome Back, Admin 👋</h3>
              <p className="mt-1 text-sm text-slate-500">
                Here's your ByteBill platform overview.
              </p>
            </div>
            {isSuperAdmin && (
  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
    <Store size={17} className="text-brand-primary" />

    <select
      value={selectedOutletId}
      onChange={(e) => setSelectedOutletId(e.target.value)}
      className="bg-transparent text-sm font-medium text-slate-700 outline-none"
    >
      <option value="ALL">All Outlets</option>

      {outlets.map((outlet) => (
        <option key={outlet.id} value={outlet.id}>
          {outlet.name}
        </option>
      ))}
    </select>
  </div>
)}
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
              <button
                onClick={loadDashboard}
                className="ml-3 font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
           {stats.map((stat) => (
  <button
    key={stat.title}
    type="button"
    onClick={() => {
  const query =
    selectedOutletId === "ALL"
      ? ""
      : `?outletId=${encodeURIComponent(selectedOutletId)}`;

  router.push(`${stat.href}${query}`);
}}
    className="w-full cursor-pointer rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-button"
  >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">{stat.title}</span>
                  <span className={`rounded-xl p-2.5 ${stat.color}`}>
                    <stat.icon size={20} />
                  </span>
                </div>
                <div className="mt-4">
                  <h4 className="text-2xl font-bold tracking-tight">
                    {loading ? (
                      <Loader2 className="animate-spin" size={22} />
                    ) : (
                      stat.value.toLocaleString("en-IN")
                    )}
                  </h4>
                </div>
              </button>
            ))}
          </section>

          <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm xl:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold">Outlet Overview</h4>
                  <p className="mt-1 text-xs text-slate-400">
                    Menu items available across your outlets
                  </p>
                </div>
                <span className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500">
                  {totalMenuItems.toLocaleString("en-IN")} items
                </span>
              </div>

              <div className="mt-6 space-y-5">
                {loading ? (
                  <p className="text-sm text-slate-400">
                    Loading outlet information...
                  </p>
                ) : (
                  outlets.map((outlet) => (
                    <div key={outlet.id}>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{outlet.name}</p>
                          <p className="text-xs text-slate-400">
                            {outlet.code} · {outlet.city || "Location not set"}
                          </p>
                        </div>
                        <span className="text-sm font-semibold">
                          {outlet._count.menuItems} menu items
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-brand-button"
                          style={{
                            width: `${totalMenuItems ? (outlet._count.menuItems / totalMenuItems) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
                {!loading && outlets.length === 0 && (
                  <p className="text-sm text-slate-400">No outlets found.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-brand-primary p-6 text-white shadow-sm">
              <h4 className="font-semibold">Platform Summary</h4>
              <p className="mt-7 text-sm text-brand-highlight/70">Active outlets</p>
              <h3 className="mt-1 text-4xl font-bold">
                {loading ? "—" : activeOutlets}
              </h3>
              <div className="mt-7 space-y-5">
                <div className="flex justify-between text-sm">
                  <span className="text-brand-highlight/70">Inactive outlets</span>
                  <span>{loading ? "—" : outlets.length - activeOutlets}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-brand-highlight/70">Menu items</span>
                  <span>{loading ? "—" : totalMenuItems}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-brand-highlight/70">Orders recorded</span>
                  <span>{loading ? "—" : totalOrders}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h4 className="font-bold">Outlet Details</h4>
              <p className="mt-1 text-xs text-slate-400">
                Live information from your backend
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-medium">Outlet</th>
                    <th className="px-5 py-4 font-medium">Code</th>
                    <th className="px-5 py-4 font-medium">Users</th>
                    <th className="px-5 py-4 font-medium">Tables</th>
                    <th className="px-5 py-4 font-medium">Orders</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {outlets.map((outlet) => (
                    <tr key={outlet.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-4 font-semibold">
                        {outlet.name}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                        {outlet.code}
                      </td>
                      <td className="px-5 py-4">{outlet._count.users}</td>
                      <td className="px-5 py-4">{outlet._count.tables}</td>
                      <td className="px-5 py-4">{outlet._count.orders}</td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            outlet.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {outlet.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!loading && outlets.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-8 text-center text-slate-400"
                      >
                        No outlets available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="py-7 text-center text-xs text-slate-400">
            © 2026 ByteBill. All rights reserved.
          </footer>
        </div>
      </main>
    </div>
  );
}
