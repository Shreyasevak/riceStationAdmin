
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Store,
  Users,
  Table2,
  ShoppingBag,
  Utensils,
  MapPin,
  Phone,
  Mail,
  CalendarDays,
  RefreshCw,
  Loader2,
  AlertCircle,
  Pencil,
} from "lucide-react";
import { apiRequest } from "@/services/api";

type Outlet = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    users: number;
    tables: number;
    orders: number;
    menuItems: number;
  };
};

function OutletDetailsContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const outletId = params.id;

  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOutlet = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = sessionStorage.getItem("bytebill_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const result = await apiRequest(`/outlets/${outletId}`);

      if (!result?.success || !result.data) {
        throw new Error(result?.message || "Unable to load outlet details.");
      }

      setOutlet(result.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load outlet details.";

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
  }, [outletId, router]);

  useEffect(() => {
    if (outletId) {
      loadOutlet();
    }
  }, [outletId, loadOutlet]);

  const stats = outlet
    ? [
        {
          title: "Total Users",
          value: outlet._count.users,
          icon: Users,
          color: "bg-brand-highlight/10 text-brand-primary",
        },
        {
          title: "Restaurant Tables",
          value: outlet._count.tables,
          icon: Table2,
          color: "bg-brand-accent/10 text-brand-accent",
        },
        {
          title: "Total Orders",
          value: outlet._count.orders,
          icon: ShoppingBag,
          color: "bg-amber-50 text-amber-700",
        },
        {
          title: "Menu Items",
          value: outlet._count.menuItems,
          icon: Utensils,
          color: "bg-emerald-50 text-emerald-700",
        },
      ]
    : [];

  function formatDate(date?: string) {
    if (!date) return "Not available";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  function DetailItem({
    label,
    value,
    icon: Icon,
  }: {
    label: string;
    value: string;
    icon?: React.ElementType;
  }) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-4">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <div className="mt-2 flex items-center gap-2">
          {Icon && <Icon size={17} className="text-slate-400" />}
          <p className="break-all text-sm font-semibold text-slate-700">
            {value}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page-background text-brand-primary">
      <header className="sticky top-0 z-10 flex min-h-20 items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-8">
        <div>
          <button
            onClick={() => router.push("/outlets")}
            className="mb-2 flex items-center gap-2 text-sm text-slate-400 hover:text-brand-primary"
          >
            <ArrowLeft size={16} />
            Back to Outlets
          </button>
          <h1 className="text-xl font-bold">Outlet Details</h1>
        </div>

       <div className="flex flex-wrap items-center gap-2">
  <button
    onClick={() => router.push(`/outlets/${outletId}/menu`)}
    className="flex items-center gap-2 rounded-xl bg-brand-button px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-button/90"
  >
    <Utensils size={17} />
    Manage Menu
  </button>

  <button
    onClick={() => router.push(`/outlets/${outletId}/edit`)}
    className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
  >
    <Pencil size={17} />
    Edit Outlet
  </button>

  <button
    onClick={loadOutlet}
    disabled={loading}
    className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
  >
    <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
    Refresh
  </button>
</div>
      </header>

      <main className="p-5 md:p-8">
        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={19} />
            <span>{error}</span>
            <button
              onClick={loadOutlet}
              className="ml-auto font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {loading && !outlet ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-slate-400">
            <Loader2 className="animate-spin" size={24} />
            Loading outlet details...
          </div>
        ) : outlet ? (
          <>
            <section className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-highlight/10 text-brand-primary">
                    <Store size={30} />
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold">{outlet.name}</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Outlet Code: {outlet.code}
                    </p>
                    <p className="mt-2 flex items-center gap-1 text-sm text-slate-500">
                      <MapPin size={15} />
                      {[outlet.city, outlet.state].filter(Boolean).join(", ") ||
                        "Location not set"}
                    </p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    outlet.isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {outlet.isActive ? "Active Outlet" : "Inactive Outlet"}
                </span>
              </div>
            </section>

            <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.title}
                  className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{stat.title}</p>
                    <div className={`rounded-xl p-3 ${stat.color}`}>
                      <stat.icon size={20} />
                    </div>
                  </div>
                  <h3 className="mt-4 text-3xl font-bold">
                    {stat.value.toLocaleString("en-IN")}
                  </h3>
                </div>
              ))}
            </section>

            <section className="mb-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="mb-5 text-lg font-bold">Outlet Information</h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <DetailItem label="Outlet Name" value={outlet.name} icon={Store} />
                <DetailItem label="Outlet Code" value={outlet.code} />
                <DetailItem
                  label="Address"
                  value={outlet.address || "Not provided"}
                  icon={MapPin}
                />
                <DetailItem
                  label="City"
                  value={outlet.city || "Not provided"}
                />
                <DetailItem
                  label="State"
                  value={outlet.state || "Not provided"}
                />
                <DetailItem
                  label="Pincode"
                  value={outlet.pincode || "Not provided"}
                />
                <DetailItem
                  label="Contact Number"
                  value={outlet.phone || "Not provided"}
                  icon={Phone}
                />
                <DetailItem
                  label="Email Address"
                  value={outlet.email || "Not provided"}
                  icon={Mail}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="mb-5 text-lg font-bold">Outlet Record</h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DetailItem
                  label="Outlet Created"
                  value={formatDate(outlet.createdAt)}
                  icon={CalendarDays}
                />
                <DetailItem
                  label="Last Updated"
                  value={formatDate(outlet.updatedAt)}
                  icon={CalendarDays}
                />
              </div>
            </section>
          </>
        ) : (
          !error && (
            <div className="rounded-xl bg-white p-8 text-center text-slate-500">
              Outlet information not found.
            </div>
          )
        )}

        <footer className="py-7 text-center text-xs text-slate-400">
          © 2026 ByteBill. All rights reserved.
        </footer>
      </main>
    </div>
  );
}

export default function OutletDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-page-background">
          <Loader2 className="animate-spin text-brand-primary" size={28} />
        </div>
      }
    >
      <OutletDetailsContent />
    </Suspense>
  );
}