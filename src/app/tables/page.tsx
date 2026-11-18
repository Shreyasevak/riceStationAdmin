
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Search,
  Table2,
  Users,
  CheckCircle2,
  Clock,
  Wrench,
  Pencil,
  X,
  Loader2,
  Store,
} from "lucide-react";
import { apiRequest } from "@/services/api";

type Outlet = {
  id: string;
  name: string;
  code: string;
  isActive?: boolean;
};

type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "OUT_OF_SERVICE";

type RestaurantTable = {
  id: string;
  tableNumber: number;
  name: string | null;
  capacity: number;
  status: TableStatus;
  activeOrder?: {
    id: string;
    orderNumber: string;
    customerName: string | null;
    total: number;
  } | null;
  outlet?: Outlet;
};

type TableForm = {
  tableNumber: string;
  name: string;
  capacity: string;
  status: "AVAILABLE" | "RESERVED" | "OUT_OF_SERVICE";
};

const emptyForm: TableForm = {
  tableNumber: "",
  name: "",
  capacity: "2",
  status: "AVAILABLE",
};

export default function TablesPage() {
  const router = useRouter();

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [form, setForm] = useState<TableForm>(emptyForm);

  const selectedOutlet = outlets.find(
    (outlet) => outlet.id === selectedOutletId
  );

  const loadTables = useCallback(async (outletId: string) => {
    if (!outletId) {
      setTables([]);
      return;
    }

    const result = await apiRequest(
      `/tables?outletId=${encodeURIComponent(outletId)}`
    );

    if (!result?.success || !Array.isArray(result.data)) {
      throw new Error(result?.message || "Unable to load tables.");
    }

    setTables(result.data);
  }, []);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (!sessionStorage.getItem("bytebill_token")) {
        router.replace("/login");
        return;
      }

      // Super Admin can access the outlets management API.
      // Outlet Admin receives their own outlet through the tables API.
      try {
        const outletResult = await apiRequest("/outlets");

        if (!outletResult?.success || !Array.isArray(outletResult.data)) {
          throw new Error("Unable to load outlets.");
        }

        const activeOutlets = outletResult.data.filter(
          (outlet: Outlet) => outlet.isActive !== false
        );

        setIsSuperAdmin(true);
        setOutlets(outletResult.data);

        const currentSelection =
          selectedOutletId &&
          activeOutlets.some(
            (outlet: Outlet) => outlet.id === selectedOutletId
          )
            ? selectedOutletId
            : activeOutlets[0]?.id || "";

        setSelectedOutletId(currentSelection);

        if (currentSelection) {
          await loadTables(currentSelection);
        } else {
          setTables([]);
        }
      } catch (outletError) {
        const tableResult = await apiRequest("/tables");

        if (!tableResult?.success || !tableResult.meta?.outlet?.id) {
          throw outletError;
        }

        const ownOutlet = tableResult.meta.outlet as Outlet;

        setIsSuperAdmin(false);
        setOutlets([ownOutlet]);
        setSelectedOutletId(ownOutlet.id);
        setTables(tableResult.data || []);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load table management.";

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
  }, [router, selectedOutletId, loadTables]);

  useEffect(() => {
    loadPage();
    // Initial page load only. Outlet changes are handled separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedOutletId || !isSuperAdmin) return;

    let cancelled = false;

    async function refreshSelectedOutlet() {
      try {
        setLoading(true);
        setError("");

        const result = await apiRequest(
          `/tables?outletId=${encodeURIComponent(selectedOutletId)}`
        );

        if (!result?.success || !Array.isArray(result.data)) {
          throw new Error(result?.message || "Unable to load tables.");
        }

        if (!cancelled) setTables(result.data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load tables."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    refreshSelectedOutlet();

    return () => {
      cancelled = true;
    };
  }, [selectedOutletId, isSuperAdmin]);

  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        String(table.tableNumber).includes(searchText) ||
        (table.name || "").toLowerCase().includes(searchText) ||
        (table.activeOrder?.orderNumber || "")
          .toLowerCase()
          .includes(searchText);

      const matchesStatus =
        statusFilter === "ALL" || table.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tables, search, statusFilter]);

  const counts = useMemo(
    () => ({
      total: tables.length,
      available: tables.filter((table) => table.status === "AVAILABLE").length,
      occupied: tables.filter((table) => table.status === "OCCUPIED").length,
      reserved: tables.filter((table) => table.status === "RESERVED").length,
      outOfService: tables.filter(
        (table) => table.status === "OUT_OF_SERVICE"
      ).length,
    }),
    [tables]
  );

  function openAddModal() {
    setEditingTable(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function openEditModal(table: RestaurantTable) {
    setEditingTable(table);
    setForm({
      tableNumber: String(table.tableNumber),
      name: table.name || "",
      capacity: String(table.capacity),
      status:
        table.status === "OCCUPIED" ? "AVAILABLE" : table.status,
    });
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const tableNumber = Number(form.tableNumber);
    const capacity = Number(form.capacity);

    if (!Number.isInteger(tableNumber) || tableNumber <= 0) {
      setError("Enter a valid positive table number.");
      return;
    }

    if (!Number.isInteger(capacity) || capacity <= 0) {
      setError("Enter a valid table capacity.");
      return;
    }

    if (!selectedOutletId) {
      setError("Please select an outlet first.");
      return;
    }

    setSaving(true);

    try {
    //   const payload = {
    //     outletId: selectedOutletId,
    //     tableNumber,
    //     name: form.name.trim() || null,
    //     capacity,
    //     ...(!editingTable ? {} : { status: form.status }),
    //   };
    const payload = editingTable?.activeOrder
  ? {
      // An occupied table can only have its name changed.
      name: form.name.trim() || null,
    }
  : {
      outletId: selectedOutletId,
      tableNumber,
      name: form.name.trim() || null,
      capacity,
      ...(editingTable ? { status: form.status } : {}),
    };

      if (editingTable) {
        await apiRequest(`/tables/${editingTable.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setSuccess("Table updated successfully.");
      } else {
        await apiRequest("/tables", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccess("Table added successfully.");
      }

      setModalOpen(false);
      await loadTables(selectedOutletId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save table."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(
    table: RestaurantTable,
    status: "AVAILABLE" | "RESERVED" | "OUT_OF_SERVICE"
  ) {
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/tables/${table.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setSuccess(`Table ${table.tableNumber} status updated.`);
      await loadTables(selectedOutletId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update table status."
      );
    }
  }

  function statusLabel(status: TableStatus) {
    switch (status) {
      case "AVAILABLE":
        return "Available";
      case "OCCUPIED":
        return "Occupied";
      case "RESERVED":
        return "Reserved";
      case "OUT_OF_SERVICE":
        return "Out of Service";
    }
  }

  function statusClass(status: TableStatus) {
    switch (status) {
      case "AVAILABLE":
        return "bg-emerald-50 text-emerald-700";
      case "OCCUPIED":
        return "bg-red-50 text-red-700";
      case "RESERVED":
        return "bg-amber-50 text-amber-700";
      case "OUT_OF_SERVICE":
        return "bg-slate-100 text-slate-600";
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8f7] text-slate-800">
      <header className="sticky top-0 z-10 flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3 md:px-8">
        <div>
          <button
            onClick={() => router.push("/")}
            className="mb-1 flex items-center gap-1 text-xs text-slate-400 hover:text-[#245b40]"
          >
            <ArrowLeft size={14} /> Dashboard
          </button>
          <h1 className="text-xl font-bold">Table Management</h1>
          <p className="text-xs text-slate-400">
            Manage restaurant tables outlet-wise
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadPage}
            disabled={loading}
            className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={openAddModal}
            disabled={!selectedOutletId}
            className="flex items-center gap-2 rounded-xl bg-[#174b34] px-4 py-3 text-sm font-semibold text-white hover:bg-[#246342] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={18} /> Add Table
          </button>
        </div>
      </header>

      <div className="p-5 md:p-8">
        <section className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Store size={17} className="text-[#39714e]" />
            Select Outlet
          </div>

          <select
            value={selectedOutletId}
            onChange={(event) => setSelectedOutletId(event.target.value)}
            disabled={!isSuperAdmin || outlets.length <= 1}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#39714e] disabled:bg-slate-50 md:max-w-xl"
          >
            {outlets.length === 0 && (
              <option value="">No outlet available</option>
            )}
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name} ({outlet.code})
              </option>
            ))}
          </select>

          <p className="mt-2 text-xs text-slate-400">
            {isSuperAdmin
              ? "Select an outlet to view and manage its tables."
              : "You are viewing tables for your assigned outlet."}
          </p>
        </section>

        {error && (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Dismiss error">
              <X size={17} />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <span>{success}</span>
            <button onClick={() => setSuccess("")} aria-label="Dismiss message">
              <X size={17} />
            </button>
          </div>
        )}

        <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[
            {
              label: "Total Tables",
              value: counts.total,
              icon: Table2,
              color: "bg-violet-50 text-violet-700",
            },
            {
              label: "Available",
              value: counts.available,
              icon: CheckCircle2,
              color: "bg-emerald-50 text-emerald-700",
            },
            {
              label: "Occupied",
              value: counts.occupied,
              icon: Users,
              color: "bg-red-50 text-red-700",
            },
            {
              label: "Reserved",
              value: counts.reserved,
              icon: Clock,
              color: "bg-amber-50 text-amber-700",
            },
            {
              label: "Out of Service",
              value: counts.outOfService,
              icon: Wrench,
              color: "bg-slate-100 text-slate-600",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">{stat.label}</span>
                <span className={`rounded-xl p-2 ${stat.color}`}>
                  <stat.icon size={18} />
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold">
                {loading ? "—" : stat.value}
              </p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center">
            <div>
              <h2 className="font-bold">
                {selectedOutlet?.name || "Outlet Tables"}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Add, edit and manage table availability
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex items-center rounded-xl border border-slate-200 px-3">
                <Search size={17} className="text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search table..."
                  className="h-10 w-full bg-transparent px-2 text-sm outline-none sm:w-44"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="AVAILABLE">Available</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="RESERVED">Reserved</option>
                <option value="OUT_OF_SERVICE">Out of Service</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-4">Table</th>
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">Capacity</th>
                  <th className="px-5 py-4">Active Order</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Change Status</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-slate-400">
                      <Loader2 className="mx-auto mb-2 animate-spin" size={25} />
                      Loading tables...
                    </td>
                  </tr>
                ) : filteredTables.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-slate-400">
                      {tables.length === 0
                        ? "No tables added for this outlet yet."
                        : "No tables match your search."}
                    </td>
                  </tr>
                ) : (
                  filteredTables.map((table) => (
                    <tr key={table.id} className="transition hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-4 font-bold">
                        Table {String(table.tableNumber).padStart(2, "0")}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {table.name || "—"}
                      </td>
                      <td className="px-5 py-4">{table.capacity} people</td>
                      <td className="px-5 py-4">
                        {table.activeOrder ? (
                          <div>
                            <p className="font-medium text-slate-700">
                              {table.activeOrder.orderNumber}
                            </p>
                            <p className="text-xs text-slate-400">
                              {table.activeOrder.customerName || "Customer"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400">No active order</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${statusClass(table.status)}`}
                        >
                          {statusLabel(table.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={
                            table.status === "OCCUPIED"
                              ? "OCCUPIED"
                              : table.status
                          }
                          disabled={Boolean(table.activeOrder)}
                          onChange={(event) =>
                            handleStatusChange(
                              table,
                              event.target.value as
                                | "AVAILABLE"
                                | "RESERVED"
                                | "OUT_OF_SERVICE"
                            )
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                        >
                          <option value="OCCUPIED" disabled>
                            Occupied
                          </option>
                          <option value="AVAILABLE">Available</option>
                          <option value="RESERVED">Reserved</option>
                          <option value="OUT_OF_SERVICE">Out of Service</option>
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => openEditModal(table)}
                          className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-[#e8f0e6] hover:text-[#245b40]"
                          title="Edit table"
                        >
                          <Pencil size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-400">
            Showing {filteredTables.length} of {tables.length} tables
          </div>
        </section>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-lg font-bold">
                  {editingTable ? "Edit Table" : "Add New Table"}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {selectedOutlet?.name || "Selected outlet"}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Outlet
                </label>
                <input
                  value={selectedOutlet?.name || ""}
                  disabled
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Table Number *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    disabled={Boolean(editingTable?.activeOrder)}
                    value={form.tableNumber}
                    onChange={(event) =>
                      setForm({ ...form, tableNumber: event.target.value })
                    }
                    placeholder="e.g. 1"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#39714e] disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Capacity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    disabled={Boolean(editingTable?.activeOrder)}
                    value={form.capacity}
                    onChange={(event) =>
                      setForm({ ...form, capacity: event.target.value })
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#39714e] disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Table Name
                </label>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="e.g. Family Table"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#39714e]"
                />
              </div>

              {editingTable && (
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Table Status
                  </label>
                  <select
                    value={form.status}
                    disabled={Boolean(editingTable.activeOrder)}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        status: event.target.value as TableForm["status"],
                      })
                    }
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#39714e] disabled:bg-slate-50"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="RESERVED">Reserved</option>
                    <option value="OUT_OF_SERVICE">Out of Service</option>
                  </select>
                  {editingTable.activeOrder && (
                    <p className="mt-2 text-xs text-amber-700">
                      This table has an active order. Its number, capacity and
                      status cannot be changed until the order is closed.
                    </p>
                  )}
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-[#174b34] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#246342] disabled:opacity-60"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {editingTable ? "Save Changes" : "Add Table"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
