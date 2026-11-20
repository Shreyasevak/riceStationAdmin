
"use client";

import { Suspense, useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Loader2,
  Store,
  AlertCircle,
} from "lucide-react";
import { apiRequest } from "@/services/api";

type OutletForm = {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
};

const emptyForm: OutletForm = {
  name: "",
  code: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  phone: "",
  email: "",
};

function EditOutletContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const outletId = params.id;

  const [form, setForm] = useState<OutletForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
        throw new Error(result?.message || "Unable to load outlet.");
      }

      setForm({
        name: result.data.name || "",
        code: result.data.code || "",
        address: result.data.address || "",
        city: result.data.city || "",
        state: result.data.state || "",
        pincode: result.data.pincode || "",
        phone: result.data.phone || "",
        email: result.data.email || "",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load outlet."
      );
    } finally {
      setLoading(false);
    }
  }, [outletId, router]);

  useEffect(() => {
    if (outletId) {
      loadOutlet();
    }
  }, [outletId, loadOutlet]);

  function handleChange(
    field: keyof OutletForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: field === "code" ? value.toUpperCase() : value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.code.trim()) {
      setError("Outlet name and outlet code are required.");
      return;
    }

    setSaving(true);

    try {
      const result = await apiRequest(`/outlets/${outletId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
          address: form.address,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          phone: form.phone,
          email: form.email,
        }),
      });

      if (!result?.success) {
        throw new Error(result?.message || "Unable to update outlet.");
      }

      setSuccess("Outlet updated successfully.");

      setTimeout(() => {
        router.push(`/outlets/${outletId}`);
      }, 800);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update outlet."
      );
    } finally {
      setSaving(false);
    }
  }

  const fields: {
    key: keyof OutletForm;
    label: string;
    placeholder: string;
    required?: boolean;
    type?: string;
  }[] = [
    { key: "name", label: "Outlet Name", placeholder: "Enter outlet name", required: true },
    { key: "code", label: "Outlet Code", placeholder: "Example: RS001", required: true },
    { key: "address", label: "Address", placeholder: "Enter full address" },
    { key: "city", label: "City", placeholder: "Enter city" },
    { key: "state", label: "State", placeholder: "Enter state" },
    { key: "pincode", label: "Pincode", placeholder: "Enter pincode" },
    { key: "phone", label: "Contact Number", placeholder: "10-digit mobile number", type: "tel" },
    { key: "email", label: "Email Address", placeholder: "Enter email address", type: "email" },
  ];

  return (
    <div className="min-h-screen bg-page-background text-brand-primary">
      <header className="flex min-h-20 items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-8">
        <div>
          <button
            type="button"
            onClick={() => router.push(`/outlets/${outletId}`)}
            className="mb-2 flex items-center gap-2 text-sm text-slate-400 hover:text-brand-primary"
          >
            <ArrowLeft size={16} />
            Back to Outlet
          </button>

          <h1 className="text-xl font-bold">Edit Outlet</h1>
        </div>

        <Store size={25} className="text-brand-primary" />
      </header>

      <main className="mx-auto max-w-5xl p-5 md:p-8">
        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={19} />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-slate-400">
            <Loader2 className="animate-spin" size={24} />
            Loading outlet information...
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">
              <h2 className="mb-2 text-lg font-bold">
                Outlet Information
              </h2>

              <p className="mb-6 text-sm text-slate-400">
                Update the outlet's basic information and contact details.
              </p>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {fields.map((field) => (
                  <div
                    key={field.key}
                    className={
                      field.key === "address"
                        ? "md:col-span-2"
                        : ""
                    }
                  >
                    <label className="mb-2 block text-sm font-semibold text-slate-600">
                      {field.label}
                      {field.required && (
                        <span className="ml-1 text-red-500">*</span>
                      )}
                    </label>

                    <input
                      type={field.type || "text"}
                      value={form[field.key]}
                      onChange={(event) =>
                        handleChange(field.key, event.target.value)
                      }
                      placeholder={field.placeholder}
                      required={field.required}
                      maxLength={field.key === "code" ? 20 : undefined}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-button focus:ring-2 focus:ring-brand-button/10"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-6">
                <button
                  type="button"
                  onClick={() => router.push(`/outlets/${outletId}`)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-brand-button px-6 py-3 text-sm font-semibold text-white hover:bg-brand-button/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Save size={17} />
                  )}
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </section>
          </form>
        )}

        <footer className="py-7 text-center text-xs text-slate-400">
          © 2026 ByteBill. All rights reserved.
        </footer>
      </main>
    </div>
  );
}
export default function EditOutletPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-slate-500">
          Loading outlet editor...
        </div>
      }
    >
      <EditOutletContent />
    </Suspense>
  );
}