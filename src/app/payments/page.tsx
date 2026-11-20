
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  IndianRupee,
  Store,
  CalendarDays,
  Download,
  Loader2,
  Receipt,
  TrendingUp,
  ShoppingBag,
  Percent,
} from "lucide-react";
import { apiRequest } from "@/services/api";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Outlet = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

type OutletRoyalty = {
  outletId: string;
  outletName: string;
  outletCode: string;
  orderCount: number;
  subtotal: number;
  discount: number;
  netSales: number;
  tax: number;
  royaltyRate: number;
  royaltyAmount: number;
};

type RoyaltyData = {
  period: {
    startDate: string;
    endDate: string;
    timezone: string;
  };
  royaltyRate: number;
  totals: {
    outletCount: number;
    orderCount: number;
    subtotal: number;
    discount: number;
    netSales: number;
    tax: number;
    royaltyAmount: number;
  };
  outlets: OutletRoyalty[];
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

function formatPdfCurrency(value: number) {
  return `INR ${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function getMonthRange(offset = 0) {
  const date = new Date();
  date.setMonth(date.getMonth() + offset);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, date.getMonth() + 1, 0).getDate();

  return {
    startDate: `${year}-${month}-01`,
    endDate:
      offset === 0
        ? localDate()
        : `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

export default function PaymentsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState("ALL");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [today, setToday] = useState("");

  const [report, setReport] = useState<RoyaltyData | null>(null);

  const loadReport = useCallback(async () => {
    if (!startDate || !endDate || startDate > endDate) return;

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

      const result = await apiRequest(
        `/royalty/outlet-report?${query.toString()}`
      );

      if (!result?.success) {
        throw new Error(result?.message || "Unable to load royalty report.");
      }

      setReport(result.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load royalty report."
      );
      setReport(null);
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
              setOutlets(
                result.data.filter((item: Outlet) => item.isActive)
              );
            }
          })
          .catch(() => setError("Unable to load outlets."));
      }
    } catch {
      sessionStorage.removeItem("bytebill_token");
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    const range = getMonthRange(0);
    setToday(localDate());
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }, []);

  useEffect(() => {
    if (
      startDate &&
      endDate &&
      sessionStorage.getItem("bytebill_token")
    ) {
      loadReport();
    }
  }, [startDate, endDate, outletId, loadReport]);

  function applyMonth(offset: number) {
    const range = getMonthRange(offset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }

  function exportCSV() {
    if (!report) return;

    const rows = [
      ["ByteBill Payment & Royalty Report"],
      [`From: ${startDate}`, `To: ${endDate}`],
      [`Royalty Rate: ${report.royaltyRate}%`],
      [],
      ["Outlet", "Outlet Code", "Paid Orders", "Subtotal", "Discount",
        "Net Sales", "GST / Tax", "Royalty Rate", "Royalty Amount"],
      ...report.outlets.map((item) => [
        item.outletName,
        item.outletCode,
        item.orderCount,
        item.subtotal,
        item.discount,
        item.netSales,
        item.tax,
        `${item.royaltyRate}%`,
        item.royaltyAmount,
      ]),
      [],
      ["Total", "", report.totals.orderCount, report.totals.subtotal,
        report.totals.discount, report.totals.netSales,
        report.totals.tax, `${report.royaltyRate}%`,
        report.totals.royaltyAmount],
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
    link.download = `bytebill-royalty-${startDate}-to-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }


function exportExcel() {
  if (!report) return;

  const summaryRows = [
    ["ByteBill Payment & Royalty Report"],
    ["Start Date", startDate],
    ["End Date", endDate],
    ["Royalty Rate", `${report.royaltyRate}%`],
    [],
    ["Metric", "Amount"],
    ["Subtotal", report.totals.subtotal],
    ["Discount", report.totals.discount],
    ["Net Sales", report.totals.netSales],
    ["GST / Tax", report.totals.tax],
    ["Paid Orders", report.totals.orderCount],
    ["Total Royalty", report.totals.royaltyAmount],
  ];

  const outletRows = [
    [
      "Outlet",
      "Outlet Code",
      "Paid Orders",
      "Subtotal",
      "Discount",
      "Net Sales",
      "GST / Tax",
      "Royalty Rate",
      "Royalty Amount",
    ],
    ...report.outlets.map((item) => [
      item.outletName,
      item.outletCode,
      item.orderCount,
      item.subtotal,
      item.discount,
      item.netSales,
      item.tax,
      `${item.royaltyRate}%`,
      item.royaltyAmount,
    ]),
  ];

  const workbook = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  const outletSheet = XLSX.utils.aoa_to_sheet(outletRows);

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
  XLSX.utils.book_append_sheet(workbook, outletSheet, "Outlet Details");

  XLSX.writeFile(
    workbook,
    `bytebill-royalty-${startDate}-to-${endDate}.xlsx`
  );
}

function exportPDF() {
  if (!report) return;

  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("ByteBill - Payment & Royalty Report", 14, 18);

  doc.setFontSize(10);
  doc.text(`Period: ${startDate} to ${endDate}`, 14, 27);
  doc.text(`Royalty Rate: ${report.royaltyRate}%`, 14, 33);

  autoTable(doc, {
    startY: 40,
    head: [["Financial Summary", "Amount"]],
    body: [
      ["Subtotal", formatPdfCurrency(report.totals.subtotal)],
      ["Discount", formatPdfCurrency(report.totals.discount)],
      ["Net Sales", formatPdfCurrency(report.totals.netSales)],
      ["GST / Tax", formatPdfCurrency(report.totals.tax)],
      ["Paid Orders", String(report.totals.orderCount)],
      ["Total Royalty", formatPdfCurrency(report.totals.royaltyAmount)],
    ],
    theme: "grid",
    headStyles: { fillColor: [36, 91, 64] },
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 12,
    head: [[
      "Outlet",
      "Code",
      "Orders",
      "Subtotal",
      "Discount",
      "Net Sales",
      "Tax",
      "Rate",
      "Royalty",
    ]],
    body: report.outlets.map((item) => [
      item.outletName,
      item.outletCode,
      String(item.orderCount),
      formatCurrency(item.subtotal),
      formatCurrency(item.discount),
      formatCurrency(item.netSales),
      formatCurrency(item.tax),
      `${item.royaltyRate}%`,
      formatCurrency(item.royaltyAmount),
    ]),
    theme: "grid",
    headStyles: { fillColor: [36, 91, 64] },
    styles: { fontSize: 7 },
    horizontalPageBreak: true,
  });

  doc.save(`bytebill-royalty-${startDate}-to-${endDate}.pdf`);
}


  const totals = report?.totals;

  const cards = [
    {
      label: "Net Sales",
      value: formatCurrency(totals?.netSales || 0),
      icon: IndianRupee,
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "GST / Tax",
      value: formatCurrency(totals?.tax || 0),
      icon: Receipt,
      color: "bg-brand-highlight/10 text-brand-primary",
    },
    {
      label: "Paid Orders",
      value: String(totals?.orderCount || 0),
      icon: ShoppingBag,
      color: "bg-brand-accent/10 text-brand-accent",
    },
    {
      label: "Royalty Payable",
      value: formatCurrency(totals?.royaltyAmount || 0),
      icon: Percent,
      color: "bg-amber-50 text-amber-700",
    },
  ];

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

          <h1 className="text-2xl font-bold">
            Payment & Royalty Management
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Outlet-wise sales, GST and franchise royalty calculation
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadReport}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50"
            title="Refresh report"
          >
            <RefreshCw size={18} />
          </button>

          
<div className="flex flex-wrap gap-2">
  <button
    onClick={exportCSV}
    disabled={!report || loading}
    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
  >
    <Download size={17} /> CSV
  </button>

  <button
    onClick={exportExcel}
    disabled={!report || loading}
    className="flex items-center gap-2 rounded-xl bg-brand-button px-4 py-3 text-sm font-semibold text-white hover:bg-brand-button/90 disabled:opacity-50"
  >
    <Download size={17} /> Excel
  </button>

  <button
    onClick={exportPDF}
    disabled={!report || loading}
    className="flex items-center gap-2 rounded-xl bg-brand-button px-4 py-3 text-sm font-semibold text-white hover:bg-brand-button/90 disabled:opacity-50"
  >
    <Download size={17} /> PDF
  </button>
</div>

        </div>
      </header>

      <div className="space-y-6 p-5 md:p-8">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays size={19} className="text-brand-primary" />
            <h2 className="font-bold">Report Filters</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => applyMonth(0)}
              className="rounded-lg bg-brand-button px-4 py-2 text-sm font-medium text-white"
            >
              This Month
            </button>
            <button
              onClick={() => applyMonth(-1)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Last Month
            </button>
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
                onChange={(e) => setStartDate(e.target.value)}
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
                onChange={(e) => setEndDate(e.target.value)}
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
                onClick={loadReport}
                disabled={!startDate || !endDate || startDate > endDate || loading}
                className="h-11 w-full rounded-xl bg-brand-highlight/10 px-4 text-sm font-semibold text-brand-primary hover:bg-brand-highlight/20 disabled:opacity-50"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
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
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="font-bold">Sales Summary</h2>
            <p className="mt-1 text-xs text-slate-400">
              Financial details for successfully paid orders
            </p>

            <div className="mt-5 space-y-4">
              {[
                ["Subtotal", totals?.subtotal || 0],
                ["Discount", totals?.discount || 0],
                ["Net Sales", totals?.netSales || 0],
                ["GST / Tax", totals?.tax || 0],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between border-b border-slate-100 pb-3 text-sm last:border-0"
                >
                  <span className="text-slate-500">{label}</span>
                  <span className="font-semibold">
                    {loading ? "—" : formatCurrency(Number(value))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold">Franchise Royalty</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Calculated on net sales excluding GST and discounts
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                <TrendingUp size={22} />
              </div>
            </div>

            <p className="mt-6 text-sm text-slate-500">Royalty Rate</p>
            <p className="mt-1 text-2xl font-bold">
              {report?.royaltyRate ?? 4}%
            </p>

            <div className="mt-5 rounded-xl bg-brand-highlight/10 p-4">
              <p className="text-sm font-medium text-brand-primary">
                Total Royalty Payable
              </p>
              <p className="mt-2 text-3xl font-bold text-brand-primary">
                {loading
                  ? "—"
                  : formatCurrency(totals?.royaltyAmount || 0)}
              </p>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Formula: (Subtotal − Discount) × 4%
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-bold">Outlet-wise Royalty Statement</h2>
            <p className="mt-1 text-xs text-slate-400">
              Sales, tax and royalty breakdown for each outlet
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-4">Outlet</th>
                  <th className="px-5 py-4">Paid Orders</th>
                  <th className="px-5 py-4">Subtotal</th>
                  <th className="px-5 py-4">Discount</th>
                  <th className="px-5 py-4">Net Sales</th>
                  <th className="px-5 py-4">GST / Tax</th>
                  <th className="px-5 py-4">Royalty %</th>
                  <th className="px-5 py-4">Royalty Amount</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Loader2 className="mx-auto mb-2 animate-spin" />
                      Loading royalty report...
                    </td>
                  </tr>
                ) : !report?.outlets.length ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No paid orders found for this period.
                    </td>
                  </tr>
                ) : (
                  report.outlets.map((item) => (
                    <tr key={item.outletId} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold">{item.outletName}</p>
                        <p className="text-xs text-slate-400">{item.outletCode}</p>
                      </td>
                      <td className="px-5 py-4">{item.orderCount}</td>
                      <td className="px-5 py-4">{formatCurrency(item.subtotal)}</td>
                      <td className="px-5 py-4">{formatCurrency(item.discount)}</td>
                      <td className="px-5 py-4 font-semibold">
                        {formatCurrency(item.netSales)}
                      </td>
                      <td className="px-5 py-4">{formatCurrency(item.tax)}</td>
                      <td className="px-5 py-4">{item.royaltyRate}%</td>
                      <td className="px-5 py-4 font-bold text-brand-primary">
                        {formatCurrency(item.royaltyAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              {!loading && report?.outlets.length ? (
                <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                  <tr>
                    <td className="px-5 py-4">Total</td>
                    <td className="px-5 py-4">{totals?.orderCount || 0}</td>
                    <td className="px-5 py-4">{formatCurrency(totals?.subtotal || 0)}</td>
                    <td className="px-5 py-4">{formatCurrency(totals?.discount || 0)}</td>
                    <td className="px-5 py-4">{formatCurrency(totals?.netSales || 0)}</td>
                    <td className="px-5 py-4">{formatCurrency(totals?.tax || 0)}</td>
                    <td className="px-5 py-4">{report.royaltyRate}%</td>
                    <td className="px-5 py-4 text-brand-primary">
                      {formatCurrency(totals?.royaltyAmount || 0)}
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </section>

        <p className="text-center text-xs text-slate-400">
          Only successfully paid orders are included. Payment date is used
          for the selected period. Timezone: Asia/Kolkata.
        </p>
      </div>
    </main>
  );
}
