
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  ShoppingBag,
  IndianRupee,
  Receipt,
  Loader2,
  CalendarDays,
  Store,
  CreditCard,
  Download,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { apiRequest } from "@/services/api";

type Outlet = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

type Summary = {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
};

type PaymentMethod = {
  method: string;
  amount: number;
  orders: number;
};

type Item = {
  itemName: string;
  quantitySold: number;
  totalRevenue: number;
  orderLines: number;
};

type DailySale = {
  date: string;
  revenue: number;
  orders: number;
};

type ReportData = {
  summary: Summary;
  paymentMethods: PaymentMethod[];
};

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function getPreviousDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDate(date);
}

function getPresetRange(preset: string) {
  const today = localDate();

  if (preset === "TODAY") {
    return { startDate: today, endDate: today };
  }

  if (preset === "YESTERDAY") {
    const yesterday = getPreviousDate(1);
    return { startDate: yesterday, endDate: yesterday };
  }

  if (preset === "WEEK") {
    const date = new Date();
    const day = date.getDay();
    const diff = day === 0 ? 6 : day - 1;
    date.setDate(date.getDate() - diff);

    return {
      startDate: localDate(date),
      endDate: today,
    };
  }

  if (preset === "MONTH") {
    const date = new Date();
    date.setDate(1);

    return {
      startDate: localDate(date),
      endDate: today,
    };
  }

  return { startDate: today, endDate: today };
}

export default function ReportsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState("ALL");

  const [preset, setPreset] = useState("TODAY");
  const [startDate, setStartDate] = useState("");
   const [endDate, setEndDate] = useState("");
const [today, setToday] = useState("");

  const [report, setReport] = useState<ReportData | null>(null);
  const [items, setItems] = useState<Item[]>([]);
const [dailySales, setDailySales] = useState<DailySale[]>([]);

  const loadReports = useCallback(async () => {
  if (!startDate || !endDate) return;

    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams({
        startDate,
        endDate,
      });

      if (outletId !== "ALL") {
        query.set("outletId", outletId);
      }

      const [overviewResult, itemResult, dailyResult] = await Promise.all([
  apiRequest(`/reports/sales-overview?${query.toString()}`),
  apiRequest(`/reports/item-sales?${query.toString()}`),
  apiRequest(`/reports/daily-sales?${query.toString()}`),
]);

     if (
  !overviewResult?.success ||
  !itemResult?.success ||
  !dailyResult?.success
) {
  throw new Error("Unable to load reports.");
}

      setReport(overviewResult.data);
setItems(itemResult.data.items || []);
setDailySales(dailyResult.data.dailySales || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load reports."
      );
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, outletId]);

  useEffect(() => {
    const token = sessionStorage.getItem("bytebill_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const payload = JSON.parse(
        atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
      );

      const superAdmin = payload.role === "SUPER_ADMIN";
      setIsSuperAdmin(superAdmin);

      if (superAdmin) {
        apiRequest("/outlets")
          .then((result) => {
            if (result?.success && Array.isArray(result.data)) {
              setOutlets(result.data.filter((item: Outlet) => item.isActive));
            }
          })
          .catch(() => {
            setError("Unable to load outlets.");
          });
      }
    } catch {
      sessionStorage.removeItem("bytebill_token");
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
  const currentDate = localDate();

  setToday(currentDate);
  setStartDate(currentDate);
  setEndDate(currentDate);
}, []);


useEffect(() => {
  if (
    startDate &&
    endDate &&
    sessionStorage.getItem("bytebill_token")
  ) {
    loadReports();
  }
}, [startDate, endDate, loadReports]);

  function applyPreset(value: string) {
    const range = getPresetRange(value);
    setPreset(value);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }

  function applyCustomDate() {
    setPreset("CUSTOM");
    loadReports();
  }

  function exportCSV() {
    if (!items.length || !report) return;

    const rows = [
      ["ByteBill Sales Report"],
      [`From: ${startDate}`, `To: ${endDate}`],
      [],
      ["Sales Summary"],
      ["Total Revenue", report.summary.totalRevenue],
      ["Paid Orders", report.summary.totalOrders],
      ["Average Order Value", report.summary.averageOrderValue],
      ["Discount", report.summary.totalDiscount],
      ["Tax", report.summary.totalTax],
      [],
      ["Payment Method", "Amount", "Orders"],
      ...report.paymentMethods.map((method) => [
        method.method,
        method.amount,
        method.orders,
      ]),
      [],
      ["Item Name", "Quantity Sold", "Revenue", "Order Lines"],
      ...items.map((item) => [
        item.itemName,
        item.quantitySold,
        item.totalRevenue,
        item.orderLines,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bytebill-report-${startDate}-to-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const summary = report?.summary;

  const paymentTotal =
    report?.paymentMethods.reduce((sum, item) => sum + item.amount, 0) || 0;

  const maxItemRevenue = Math.max(
    ...items.map((item) => item.totalRevenue),
    1
  );

  const maxPayment = Math.max(
    ...(report?.paymentMethods.map((item) => item.amount) || [1]),
    1
  );

  return (
    <main className="min-h-screen bg-page-background text-brand-primary">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 md:flex-row md:items-center md:px-8">
        <div>
          <button
            onClick={() => router.push("/")}
            className="mb-2 flex items-center gap-1 text-xs text-slate-400 hover:text-brand-primary"
          >
            <ArrowLeft size={14} /> Dashboard
          </button>

          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-slate-400">
            Monitor your sales, payments and item performance
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadReports}
            className="rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"
            title="Refresh reports"
          >
            <RefreshCw size={18} />
          </button>

          <button
            onClick={exportCSV}
            disabled={!report || loading}
            className="flex items-center gap-2 rounded-xl bg-brand-button px-4 py-3 text-sm font-semibold text-white hover:bg-brand-button/90 disabled:opacity-50"
          >
            <Download size={17} /> Export CSV
          </button>
        </div>
      </header>

      <div className="space-y-6 p-5 md:p-8">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays size={19} className="text-brand-primary" />
            <h2 className="font-bold">Report Filters</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              ["TODAY", "Today"],
              ["YESTERDAY", "Yesterday"],
              ["WEEK", "This Week"],
              ["MONTH", "This Month"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => applyPreset(value)}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${
                  preset === value
                    ? "bg-brand-button text-white"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPreset("CUSTOM");
                }}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand-button"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={today}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPreset("CUSTOM");
                }}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand-button"
              />
            </div>

            {isSuperAdmin && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  <Store size={13} className="mr-1 inline" />
                  Select Outlet
                </label>
                <select
                  value={outletId}
                  onChange={(e) => setOutletId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand-button"
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

            <div className="flex items-end">
              <button
                onClick={applyCustomDate}
                disabled={!startDate || !endDate || startDate > endDate}
                className="h-11 w-full rounded-xl bg-brand-highlight/10 px-4 text-sm font-semibold text-brand-primary hover:bg-brand-highlight/20 disabled:opacity-50"
              >
                Apply Filters
              </button>
            </div>
          </div>

          {isSuperAdmin && (
            <p className="mt-3 text-xs text-slate-400">
              {outletId === "ALL"
                ? "Showing combined sales across all outlets."
                : `Showing sales for ${outlets.find((item) => item.id === outletId)?.name || "selected outlet"}.`}
            </p>
          )}
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Revenue",
              value: formatCurrency(summary?.totalRevenue || 0),
              icon: IndianRupee,
              color: "bg-emerald-50 text-emerald-700",
            },
            {
              label: "Paid Orders",
              value: String(summary?.totalOrders || 0),
              icon: ShoppingBag,
              color: "bg-brand-highlight/10 text-brand-primary",
            },
            {
              label: "Average Order Value",
              value: formatCurrency(summary?.averageOrderValue || 0),
              icon: TrendingUp,
              color: "bg-brand-accent/10 text-brand-accent",
            },
            {
              label: "Total Discount",
              value: formatCurrency(summary?.totalDiscount || 0),
              icon: Receipt,
              color: "bg-amber-50 text-amber-700",
            },
          ].map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <div className={`rounded-xl p-3 ${card.color}`}>
                    <Icon size={21} />
                  </div>
                </div>

                <p className="mt-4 text-2xl font-bold">
                  {loading ? "—" : card.value}
                </p>
              </div>
            );
          })}
        </section>


<section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
  {/* Daily Revenue Chart */}
  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    <div className="mb-5">
      <h2 className="font-bold">Daily Revenue</h2>
      <p className="mt-1 text-xs text-slate-400">
        Paid sales amount for each day
      </p>
    </div>

    {loading ? (
      <div className="flex h-72 items-center justify-center">
        <Loader2 className="animate-spin text-brand-primary" />
      </div>
    ) : (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={dailySales} margin={{ top: 10, right: 10, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => value.slice(5)}
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(value: number) => `₹${value}`}
            width={65}
          />
          <Tooltip
            formatter={(value) => [
              formatCurrency(Number(value)),
              "Revenue",
            ]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Bar
            dataKey="revenue"
            name="Revenue"
            fill="#1769FF"
            radius={[5, 5, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    )}
  </div>

  {/* Daily Paid Orders Chart */}
  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    <div className="mb-5">
      <h2 className="font-bold">Daily Paid Orders</h2>
      <p className="mt-1 text-xs text-slate-400">
        Number of successfully paid orders each day
      </p>
    </div>

    {loading ? (
      <div className="flex h-72 items-center justify-center">
        <Loader2 className="animate-spin text-brand-primary" />
      </div>
    ) : (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={dailySales} margin={{ top: 10, right: 10, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => value.slice(5)}
            tick={{ fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11 }}
            width={35}
          />
          <Tooltip
            formatter={(value) => [
              `${Number(value)} orders`,
              "Paid Orders",
            ]}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Bar
            dataKey="orders"
            name="Paid Orders"
            fill="#00C8F0"
            radius={[5, 5, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    )}
  </div>
</section>


        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-bold">Payment Breakdown</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Revenue by payment method
                </p>
              </div>
              <CreditCard className="text-brand-primary" size={21} />
            </div>

            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="animate-spin text-brand-primary" />
              </div>
            ) : report?.paymentMethods.length ? (
              <div className="space-y-5">
                {report.paymentMethods.map((method) => (
                  <div key={method.method}>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="font-medium">{method.method}</span>
                      <span className="font-semibold">
                        {formatCurrency(method.amount)}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-brand-button"
                        style={{
                          width: `${(method.amount / maxPayment) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {method.orders} paid payment(s)
                    </p>
                  </div>
                ))}
                <div className="border-t border-slate-100 pt-3 text-sm font-bold">
                  Total: {formatCurrency(paymentTotal)}
                </div>
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-slate-400">
                No paid payments for this period.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="font-bold">Sales Summary</h2>
              <p className="mt-1 text-xs text-slate-400">
                Financial details for selected period
              </p>
            </div>

            <div className="space-y-4">
              {[
                ["Subtotal", summary?.subtotal || 0],
                ["Discount", summary?.totalDiscount || 0],
                ["Tax", summary?.totalTax || 0],
                ["Paid Revenue", summary?.totalRevenue || 0],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm last:border-0"
                >
                  <span className="text-slate-500">{label}</span>
                  <span className="font-semibold">
                    {formatCurrency(Number(value))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-bold">Top Selling Items</h2>
            <p className="mt-1 text-xs text-slate-400">
              Item quantities and revenue from paid orders
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-4">Item Name</th>
                  <th className="px-5 py-4">Quantity Sold</th>
                  <th className="px-5 py-4">Order Lines</th>
                  <th className="px-5 py-4">Revenue</th>
                  <th className="px-5 py-4">Performance</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <Loader2 className="mx-auto mb-2 animate-spin" />
                      Loading item sales...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No item sales found for this period.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.itemName} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-semibold">
                        {item.itemName}
                      </td>
                      <td className="px-5 py-4">{item.quantitySold}</td>
                      <td className="px-5 py-4">{item.orderLines}</td>
                      <td className="px-5 py-4 font-semibold">
                        {formatCurrency(item.totalRevenue)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-brand-button"
                            style={{
                              width: `${(item.totalRevenue / maxItemRevenue) * 100}%`,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-center text-xs text-slate-400">
          Reports are calculated using paid payments and India Standard Time.
        </p>
      </div>
    </main>
  );
}
