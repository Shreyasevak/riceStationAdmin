"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Store, MapPin, Users, Table2, Utensils,
  Loader2, Save, Copy, CheckCircle2, AlertCircle,
} from "lucide-react";
import { apiRequest } from "@/services/api";

type OutletOption = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

type UserRole = "ADMIN" | "STAFF" | "KITCHEN";
type InitialUser = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

const initialUsers: Record<UserRole, InitialUser> = {
  ADMIN: { name: "", email: "", phone: "", password: "" },
  STAFF: { name: "", email: "", phone: "", password: "" },
  KITCHEN: { name: "", email: "", phone: "", password: "" },
};

const inputClass =
  "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-brand-primary outline-none transition placeholder:text-slate-400 focus:border-brand-button focus:ring-2 focus:ring-brand-button/10";
const labelClass = "text-sm font-medium text-slate-700";

export default function NewOutletPage() {
  const router = useRouter();
  const [outlets, setOutlets] = useState<OutletOption[]>([]);
  const [loadingOutlets, setLoadingOutlets] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Gujarat");
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tableCount, setTableCount] = useState("8");
  const [users, setUsers] = useState<Record<UserRole, InitialUser>>(initialUsers);
  const [copyMenu, setCopyMenu] = useState(false);
  const [sourceOutletId, setSourceOutletId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!sessionStorage.getItem("bytebill_token")) {
        router.replace("/login");
        return;
      }

      try {
        const result = await apiRequest("/outlets");
        if (!result?.success || !Array.isArray(result.data)) {
          throw new Error(result?.message || "Unable to load existing outlets.");
        }
        if (!cancelled) {
          setOutlets(
            result.data.map((outlet: OutletOption) => ({
              id: outlet.id,
              name: outlet.name,
              code: outlet.code,
              isActive: outlet.isActive,
            }))
          );
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Unable to load outlets.";
          setError(message);
          if (message.toLowerCase().includes("token") || message.toLowerCase().includes("unauthorized")) {
            sessionStorage.removeItem("bytebill_token");
            router.replace("/login");
          }
        }
      } finally {
        if (!cancelled) setLoadingOutlets(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function updateUser(role: UserRole, field: keyof InitialUser, value: string) {
    setUsers((current) => ({
      ...current,
      [role]: { ...current[role], [field]: value },
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normalizedCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{2,20}$/.test(normalizedCode)) {
      setError("Outlet code must be 2–20 characters and contain only letters, numbers, hyphens or underscores.");
      return;
    }

    const parsedTableCount = Number(tableCount);
    if (!Number.isInteger(parsedTableCount) || parsedTableCount < 1 || parsedTableCount > 100) {
      setError("Table count must be a whole number between 1 and 100.");
      return;
    }

    for (const role of ["ADMIN", "STAFF", "KITCHEN"] as const) {
      const user = users[role];
      if (!user.name.trim() || !user.email.trim() || !/^\S+@\S+\.\S+$/.test(user.email.trim())) {
        setError(`Please enter a valid name and email for the ${role} account.`);
        return;
      }
      if (user.password.length < 8 || user.password.length > 128) {
        setError(`${role} password must be between 8 and 128 characters.`);
        return;
      }
      if (user.phone.trim() && !/^[6-9]\d{9}$/.test(user.phone.trim())) {
        setError(`${role} mobile number must be a valid 10-digit Indian number.`);
        return;
      }
    }

    if (copyMenu && !sourceOutletId) {
      setError("Please select an outlet from which to copy the menu.");
      return;
    }

    const payload = {
      name: name.trim(),
      code: normalizedCode,
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      tableCount: parsedTableCount,
      copyMenu,
      ...(copyMenu ? { sourceOutletId } : {}),
      users: (["ADMIN", "STAFF", "KITCHEN"] as const).map((role) => ({
        name: users[role].name.trim(),
        email: users[role].email.trim().toLowerCase(),
        phone: users[role].phone.trim() || undefined,
        password: users[role].password,
        role,
      })),
    };

    setSubmitting(true);
    try {
      const result = await apiRequest("/outlets", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!result?.success) {
        throw new Error(result?.message || "Outlet could not be created.");
      }
      setSuccess(result.message || "Outlet created successfully.");
      const createdId = result?.data?.outlet?.id || result?.data?.id;
      if (createdId) {
        window.setTimeout(() => router.push(`/outlets/${createdId}`), 900);
      } else {
        window.setTimeout(() => router.push("/outlets"), 900);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create outlet.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-page-background text-brand-primary">
      <header className="flex min-h-20 items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-8">
        <div>
          <button
            type="button"
            onClick={() => router.push("/outlets")}
            className="mb-1 flex items-center gap-1 text-xs text-slate-400 hover:text-brand-primary"
          >
            <ArrowLeft size={14} /> Back to Outlets
          </button>
          <h1 className="text-xl font-bold">Create New Outlet</h1>
          <p className="mt-1 text-xs text-slate-400">Register a new branch in ByteBill</p>
        </div>
        <div className="hidden items-center gap-2 rounded-xl bg-brand-highlight/10 px-3 py-2 text-xs font-medium text-brand-primary sm:flex">
          <Store size={16} /> Super Admin
        </div>
      </header>

      <div className="mx-auto max-w-6xl p-5 md:p-8">
        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-7">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-brand-highlight/10 p-2.5 text-brand-primary"><Store size={20} /></div>
              <div><h2 className="font-bold">Outlet Information</h2><p className="mt-1 text-xs text-slate-400">Basic details and contact information</p></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className={labelClass}>Outlet Name *<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rice Station - Branch 3" className={inputClass} /></label>
              <label className={labelClass}>Outlet Code *<input required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. RS003" maxLength={20} className={inputClass} /><span className="mt-1 block text-xs font-normal text-slate-400">2–20 letters, numbers, hyphens or underscores</span></label>
              <label className={labelClass}>Address<input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street / building / area" className={inputClass} /></label>
              <label className={labelClass}>City<input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className={inputClass} /></label>
              <label className={labelClass}>State<input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className={inputClass} /></label>
              <label className={labelClass}>Pincode<input value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit pincode" inputMode="numeric" className={inputClass} /></label>
              <label className={labelClass}>Contact Number<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Outlet contact number" className={inputClass} /></label>
              <label className={labelClass}>Email Address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="outlet@example.com" className={inputClass} /></label>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-7">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-violet-50 p-2.5 text-violet-700"><Table2 size={20} /></div>
              <div><h2 className="font-bold">Restaurant Tables</h2><p className="mt-1 text-xs text-slate-400">Tables will be created automatically and start as Available</p></div>
            </div>
            <label className={`${labelClass} block max-w-xs`}>Number of Tables *<input required type="number" min={1} max={100} value={tableCount} onChange={(e) => setTableCount(e.target.value)} className={inputClass} /></label>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-7">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Users size={20} /></div>
              <div><h2 className="font-bold">Initial User Accounts</h2><p className="mt-1 text-xs text-slate-400">Create one account for each required role</p></div>
            </div>
            <div className="space-y-5">
              {(["ADMIN", "STAFF", "KITCHEN"] as const).map((role) => (
                <div key={role} className="rounded-xl border border-slate-200 p-4 md:p-5">
                  <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-bold">{role} Account</h3><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">Required</span></div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className={labelClass}>Full Name *<input required value={users[role].name} onChange={(e) => updateUser(role, "name", e.target.value)} placeholder={`${role} user name`} className={inputClass} /></label>
                    <label className={labelClass}>Email Address *<input required type="email" value={users[role].email} onChange={(e) => updateUser(role, "email", e.target.value)} placeholder={`${role.toLowerCase()}@example.com`} className={inputClass} /></label>
                    <label className={labelClass}>Mobile Number<input inputMode="numeric" value={users[role].phone} onChange={(e) => updateUser(role, "phone", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile number" className={inputClass} /></label>
                    <label className={labelClass}>Temporary Password *<input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={users[role].password} onChange={(e) => updateUser(role, "password", e.target.value)} placeholder="At least 8 characters" className={inputClass} /></label>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-7">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-amber-50 p-2.5 text-amber-700"><Utensils size={20} /></div>
              <div><h2 className="font-bold">Menu Setup</h2><p className="mt-1 text-xs text-slate-400">Choose whether this outlet starts with an existing menu</p></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => { setCopyMenu(false); setSourceOutletId(""); }} className={`rounded-xl border p-4 text-left transition ${!copyMenu ? "border-brand-button bg-brand-highlight/10 ring-1 ring-brand-button" : "border-slate-200 hover:bg-slate-50"}`}>
                <span className="flex items-center justify-between"><span className="font-semibold">No — Start with empty menu</span>{!copyMenu && <CheckCircle2 size={18} className="text-brand-primary" />}</span>
                <span className="mt-1 block text-xs text-slate-500">Recommended default. No categories, items or addons will be copied.</span>
              </button>
              <button type="button" onClick={() => setCopyMenu(true)} className={`rounded-xl border p-4 text-left transition ${copyMenu ? "border-brand-button bg-brand-highlight/10 ring-1 ring-brand-button" : "border-slate-200 hover:bg-slate-50"}`}>
                <span className="flex items-center justify-between"><span className="font-semibold">Yes — Copy an existing menu</span>{copyMenu && <CheckCircle2 size={18} className="text-brand-primary" />}</span>
                <span className="mt-1 block text-xs text-slate-500">Copies categories, menu items and addons into this new outlet.</span>
              </button>
            </div>
            {copyMenu && (
              <div className="mt-4 max-w-xl rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className={labelClass}>Select Menu Source Outlet *
                  <select required value={sourceOutletId} onChange={(e) => setSourceOutletId(e.target.value)} disabled={loadingOutlets} className={inputClass}>
                    <option value="">{loadingOutlets ? "Loading outlets..." : "Select an outlet"}</option>
                    {outlets.filter((outlet) => outlet.isActive).map((outlet) => (
                      <option key={outlet.id} value={outlet.id}>{outlet.name} ({outlet.code})</option>
                    ))}
                  </select>
                </label>
                <p className="mt-2 flex items-start gap-2 text-xs text-slate-500"><Copy size={14} className="mt-0.5 shrink-0" />Existing outlet data will not be changed. A separate copy will be created for this new outlet.</p>
              </div>
            )}
          </section>

          <div className="flex flex-col-reverse justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center md:p-5">
            <p className="flex items-center gap-2 text-xs text-slate-500"><MapPin size={15} /> Review the details before creating the outlet.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => router.push("/outlets")} disabled={submitting} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={submitting || loadingOutlets} className="flex items-center justify-center gap-2 rounded-xl bg-brand-button px-6 py-3 text-sm font-semibold text-white hover:bg-brand-button/90 disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                {submitting ? "Creating Outlet..." : "Create Outlet"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
