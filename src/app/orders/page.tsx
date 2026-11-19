
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  ShoppingBag,
  IndianRupee,
  Clock,
  CheckCircle,
  Loader2,
  CalendarDays,
} from "lucide-react";
import { apiRequest } from "@/services/api";

type Outlet = {
  id: string;
  name: string;
  code: string;
  city: string | null;
};

type Order = {
  id: string;
  orderNumber: string;
  outletId: string;
  orderType: string;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  total: string | number;
  createdAt: string;
  outlet: Outlet;
  payment: {
    method: string;
    status: string;
    amount: string | number;
  } | null;
  table: {
    tableNumber: number;
    name: string | null;
  } | null;
};

type Summary = {
  totalOrders: number;
  totalRevenue: number;
  paidOrders: number;
  pendingAmount: number;
  pendingOrders: number;
};

const emptySummary: Summary = {
  totalOrders: 0,
  totalRevenue: 0,
  paidOrders: 0,
  pendingAmount: 0,
  pendingOrders: 0,
};

const money = (amount: number | string) =>
  Number(amount || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

export default function OrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [outletId, setOutletId] = useState("");
  const [city, setCity] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  async function loadOutlets() {
    try {
      const result = await apiRequest("/outlets");
      if (result?.success && Array.isArray(result.data)) {
        setOutlets(result.data);
      }
    } catch (err) {
      console.error("Unable to load outlets:", err);
    }
  }

  async function loadOrders() {
    setLoading(true);
    setError("");

    try {
      if (!sessionStorage.getItem("bytebill_token")) {
        router.replace("/login");
        return;
      }

      const params = new URLSearchParams();

      if (outletId) params.set("outletId", outletId);
      if (city) params.set("city", city);
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      if (status) params.set("status", status);
      if (paymentStatus) params.set("paymentStatus", paymentStatus);

      const query = params.toString();
      const result = await apiRequest(
        `/orders/all${query ? `?${query}` : ""}`
      );

      if (!result?.success || !Array.isArray(result.data)) {
        throw new Error(result?.message || "Unable to load orders.");
      }

      setOrders(result.data);
      setSummary(result.summary || emptySummary);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load orders.";

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
    if (!sessionStorage.getItem("bytebill_token")) {
      router.replace("/login");
      return;
    }
    loadOutlets();
  }, []);

  useEffect(() => {
    if (!sessionStorage.getItem("bytebill_token")) return;
    loadOrders();
  }, [outletId, city, fromDate, toDate, status, paymentStatus]);

  const cities = useMemo(
    () =>
      Array.from(
        new Set(
          outlets
            .map((outlet) => outlet.city)
            .filter((value): value is string => Boolean(value))
        )
      ).sort(),
    [outlets]
  );

  const filteredOrders = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return orders;

    return orders.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(term) ||
        (order.customerName || "").toLowerCase().includes(term) ||
        (order.customerPhone || "").includes(term) ||
        order.outlet.name.toLowerCase().includes(term)
    );
  }, [orders, search]);

  function formatDate(date: string) {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function resetFilters() {
    setOutletId("");
    setCity("");
    setFromDate("");
    setToDate("");
    setStatus("");
    setPaymentStatus("");
    setSearch("");
  }

  return (
    <main className="min-h-screen bg-[#f6f8f7] text-slate-800">
      <header className="flex min-h-20 items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-8">
        <div>
          <button
            onClick={() => router.push("/")}
            className="mb-1 flex items-center gap-1 text-xs text-slate-400 hover:text-[#245b40]"
          >
            <ArrowLeft size={14} /> Dashboard
          </button>
          <h1 className="text-xl font-bold">Orders Management</h1>
          <p className="mt-1 text-xs text-slate-400">
            Monitor orders and revenue across all outlets
          </p>
        </div>

        <button
          onClick={loadOrders}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      <div className="p-5 md:p-8">
        {/* Revenue summary */}
        <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Total Orders</p>
              <ShoppingBag className="text-[#245b40]" size={21} />
            </div>
            <p className="mt-3 text-3xl font-bold">
              {loading ? "—" : summary.totalOrders}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Orders matching filters
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Paid Revenue</p>
              <IndianRupee className="text-emerald-700" size={21} />
            </div>
            <p className="mt-3 text-3xl font-bold text-emerald-700">
              {loading ? "—" : money(summary.totalRevenue)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              From paid payments
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Paid Orders</p>
              <CheckCircle className="text-emerald-700" size={21} />
            </div>
            <p className="mt-3 text-3xl font-bold">
              {loading ? "—" : summary.paidOrders}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Successfully paid
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Pending Amount</p>
              <Clock className="text-amber-600" size={21} />
            </div>
            <p className="mt-3 text-3xl font-bold text-amber-600">
              {loading ? "—" : money(summary.pendingAmount)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {summary.pendingOrders} pending payments
            </p>
          </div>
        </div>

        {/* Filters */}
        <section className="mb-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Filter Orders</h2>
              <p className="mt-1 text-xs text-slate-400">
                Select filters to update orders and revenue
              </p>
            </div>

            <button
              onClick={resetFilters}
              className="text-sm font-semibold text-[#245b40] hover:underline"
            >
              Clear Filters
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <select
              value={outletId}
              onChange={(e) => setOutletId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#245b40]"
            >
              <option value="">All Outlets</option>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name} ({outlet.code})
                </option>
              ))}
            </select>

            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#245b40]"
            >
              <option value="">All Cities</option>
              {cities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
              <CalendarDays size={16} className="shrink-0 text-slate-400" />
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full min-w-0 py-3 text-sm outline-none"
                aria-label="From date"
              />
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
              <CalendarDays size={16} className="shrink-0 text-slate-400" />
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full min-w-0 py-3 text-sm outline-none"
                aria-label="To date"
              />
            </label>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#245b40]"
            >
              <option value="">All Order Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PREPARING">Preparing</option>
              <option value="READY">Ready</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#245b40]"
            >
              <option value="">All Payment Status</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          <div className="mt-4 flex items-center rounded-xl border border-slate-200 px-3 sm:max-w-md">
            <Search size={17} className="text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order number, customer or outlet..."
              className="h-11 w-full bg-transparent px-2 text-sm outline-none"
            />
          </div>
        </section>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Orders table */}
        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-5">
            <div>
              <h2 className="font-bold">All Orders</h2>
              <p className="mt-1 text-xs text-slate-400">
                Order records across all registered outlets
              </p>
            </div>
            <span className="rounded-lg bg-[#e8f0e6] px-3 py-2 text-xs font-semibold text-[#245b40]">
              {filteredOrders.length} orders
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-4">Order</th>
                  <th className="px-5 py-4">Outlet</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Order Type</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Payment</th>
                  <th className="px-5 py-4">Order Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-slate-400">
                      <Loader2 className="mx-auto mb-2 animate-spin" size={25} />
                      Loading orders...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-slate-400">
                      No orders found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold">{order.orderNumber}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {order.table
                            ? `Table ${order.table.tableNumber}`
                            : order.orderType.replace("_", " ")}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium">{order.outlet?.name || "—"}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {order.outlet?.city || "City not set"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p>{order.customerName || "Walk-in Customer"}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          {order.customerPhone || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {order.orderType.replace("_", " ")}
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {formatDate(order.createdAt)}
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {money(order.total)}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium">
                          {order.payment?.method || "—"}
                        </p>
                        <span
                          className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                            order.payment?.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700"
                              : order.payment?.status === "PENDING"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {order.payment?.status || "UNPAID"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-[#e8f0e6] px-3 py-1 text-xs font-semibold text-[#245b40]">
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-400">
            Showing {filteredOrders.length} of {orders.length} orders returned by the API
          </div>
        </section>
      </div>
    </main>
  );
}
