
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Store, Search, Plus, RefreshCw, Users, Table2,
  ShoppingBag, Utensils, MapPin, Pencil, Eye,
  Power, Loader2, ArrowLeft, X
} from "lucide-react";
import { apiRequest } from "@/services/api";

type Outlet = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  _count: {
    users: number;
    tables: number;
    orders: number;
    menuItems: number;
  };
};

export default function OutletsPage() {
  const router = useRouter();

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [selectedOutletId, setSelectedOutletId] = useState("ALL");

  async function loadOutlets() {
    setLoading(true);
    setError("");

    try {
      if (!sessionStorage.getItem("bytebill_token")) {
        router.replace("/login");
        return;
      }

      const result = await apiRequest("/outlets");

      if (!result?.success || !Array.isArray(result.data)) {
        throw new Error(result?.message || "Unable to load outlets.");
      }

      setOutlets(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load outlets.";
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
  const params = new URLSearchParams(window.location.search);
  const outletId = params.get("outletId");

  if (outletId) {
    setSelectedOutletId(outletId);
  }

  loadOutlets();
}, []);

  const filteredOutlets = useMemo(() => {
    return outlets.filter((outlet) => {
      const matchesSearch =
        outlet.name.toLowerCase().includes(search.toLowerCase()) ||
        outlet.code.toLowerCase().includes(search.toLowerCase()) ||
        (outlet.city || "").toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        filter === "ALL" ||
        (filter === "ACTIVE" && outlet.isActive) ||
        (filter === "INACTIVE" && !outlet.isActive);
        
        const matchesOutlet =
  selectedOutletId === "ALL" || outlet.id === selectedOutletId;

      return matchesSearch && matchesStatus && matchesOutlet;
    });
  }, [outlets, search, filter, selectedOutletId]);

  const activeCount = filteredOutlets.filter((o) => o.isActive).length;

  return (
    <main className="min-h-screen bg-page-background text-brand-primary">
      <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 md:px-8">
        <div>
          <button
            onClick={() => router.push("/")}
            className="mb-1 flex items-center gap-1 text-xs text-slate-400 hover:text-brand-primary"
          >
            <ArrowLeft size={14} /> Dashboard
          </button>
          <h1 className="text-xl font-bold">Outlet Management</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadOutlets}
            className="rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => router.push("/outlets/new")}
            className="flex items-center gap-2 rounded-xl bg-brand-button px-4 py-3 text-sm font-semibold text-white hover:bg-brand-button/90"
          >
            <Plus size={18} /> Add Outlet
          </button>
        </div>
      </header>

      <div className="p-5 md:p-8">
        <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Outlets</p>
            <p className="mt-2 text-3xl font-bold">{loading ? "—" : filteredOutlets.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Active Outlets</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">{loading ? "—" : activeCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Inactive Outlets</p>
            <p className="mt-2 text-3xl font-bold text-red-600">{loading ? "—" : filteredOutlets.length - activeCount}</p>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center">
            <div>
              <h2 className="font-bold">All Outlets</h2>
              <p className="mt-1 text-xs text-slate-400">
                Manage all registered restaurant branches
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex items-center rounded-xl border border-slate-200 px-3">
                <Search size={17} className="text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search outlet..."
                  className="h-10 w-full bg-transparent px-2 text-sm outline-none sm:w-52"
                />
              </div>

              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-4">Outlet Information</th>
                  <th className="px-5 py-4">Location</th>
                  <th className="px-5 py-4">Users</th>
                  <th className="px-5 py-4">Tables</th>
                  <th className="px-5 py-4">Orders</th>
                  <th className="px-5 py-4">Menu Items</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-slate-400">
                      <Loader2 className="mx-auto mb-2 animate-spin" size={25} />
                      Loading outlets...
                    </td>
                  </tr>
                ) : filteredOutlets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-slate-400">
                      No outlets found.
                    </td>
                  </tr>
                ) : (
                  filteredOutlets.map((outlet) => (
                    <tr key={outlet.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-highlight/10 text-brand-primary">
                            <Store size={20} />
                          </div>
                          <div>
                            <p className="font-semibold">{outlet.name}</p>
                            <p className="text-xs text-slate-400">{outlet.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin size={14} /> {outlet.city || "Not set"}
                        </span>
                      </td>
                      <td className="px-5 py-4">{outlet._count.users}</td>
                      <td className="px-5 py-4">{outlet._count.tables}</td>
                      <td className="px-5 py-4">{outlet._count.orders}</td>
                      <td className="px-5 py-4">{outlet._count.menuItems}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          outlet.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}>
                          {outlet.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => router.push(`/outlets/${outlet.id}`)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-brand-highlight/10 hover:text-brand-primary"
                          title="View outlet"
                        >
                          <Eye size={17} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-400">
            Showing {filteredOutlets.length} of {outlets.length} outlets
          </div>
        </section>
      </div>
    </main>
  );
}
