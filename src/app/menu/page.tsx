
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Utensils } from "lucide-react";
import { apiRequest } from "@/services/api";

type Outlet = {
  id: string;
  name: string;
  isActive: boolean;
};

export default function MenuPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function openMenu() {
      try {
        const token = sessionStorage.getItem("bytebill_token");

        if (!token) {
          router.replace("/login");
          return;
        }

        const result = await apiRequest("/outlets");

        if (!result?.success || !Array.isArray(result.data)) {
          throw new Error("Unable to load outlets.");
        }

        const outlets: Outlet[] = result.data.filter(
          (outlet: Outlet) => outlet.isActive !== false
        );

        if (!mounted) return;

        if (outlets.length === 0) {
          setError("No active outlets are available.");
          return;
        }

        // Open the existing menu manager for the first outlet.
        // Use Dashboard-selected outlet, otherwise use the first active outlet.
const params = new URLSearchParams(window.location.search);
const dashboardOutletId = params.get("outletId");
const returnToDashboard = params.get("returnTo") === "dashboard";

const selectedOutlet = dashboardOutletId
  ? outlets.find((outlet) => outlet.id === dashboardOutletId)
  : null;

const targetOutlet = selectedOutlet || outlets[0];

router.replace(
  `/outlets/${targetOutlet.id}/menu${returnToDashboard ? "?returnTo=dashboard" : ""}`
);
        // router.replace(`/outlets/${outlets[0].id}/menu`);
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to open Menu Management."
          );
        }
      }
    }

    openMenu();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-page-background">
      <div className="text-center">
        {error ? (
          <p className="text-sm font-medium text-red-600">{error}</p>
        ) : (
          <>
            <Utensils
              size={36}
              className="mx-auto mb-4 text-brand-primary"
            />
            <Loader2
              size={25}
              className="mx-auto animate-spin text-brand-primary"
            />
            <p className="mt-4 text-sm text-slate-500">
              Loading Menu Management...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
