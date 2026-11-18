
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/services/api";
import { Eye, EyeOff, LockKeyhole, Mail, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!identifier.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const result = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const token =
        result?.token ??
        result?.accessToken ??
        result?.data?.token ??
        result?.data?.accessToken;

      if (!token) {
        console.error("Login response:", result);
        setError(
          result?.message ||
          "Login response did not contain an authentication token. Please check the API response."
        );
        return;
      }

      // Temporary development storage. We will replace this
      // with a secure HTTP-only cookie before production.
      sessionStorage.setItem("bytebill_token", token);

      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7f4] px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl lg:grid-cols-2">

        <section className="hidden flex-col justify-between bg-[#123b2b] p-12 text-white lg:flex">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#d9edbb] text-2xl font-black text-[#123b2b]">
                B
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-wider">BYTEBILL</h1>
                <p className="text-xs tracking-[4px] text-emerald-200">ADMIN PANEL</p>
              </div>
            </div>

            <div className="mt-24">
              <h2 className="text-4xl font-bold leading-tight">
                Manage your restaurant business with confidence.
              </h2>
              <p className="mt-5 max-w-sm leading-7 text-emerald-100/70">
                Manage orders, menus, tables, payments and reports from one
                centralized dashboard.
              </p>
            </div>
          </div>

          <p className="text-sm text-emerald-100/50">
            © 2026 ByteBill. All rights reserved.
          </p>
        </section>

        <section className="flex items-center justify-center px-7 py-12 sm:px-12">
          <div className="w-full max-w-md">
            <div className="mb-9 lg:hidden">
              <h1 className="text-2xl font-bold text-[#123b2b]">BYTEBILL</h1>
              <p className="text-xs tracking-[3px] text-slate-500">ADMIN PANEL</p>
            </div>

            <p className="text-sm font-semibold text-[#39714e]">WELCOME BACK</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-800">
              Admin Login
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Sign in using your registered administrator account.
            </p>

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email or mobile number
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 px-4 focus-within:border-[#39714e]">
                  <Mail size={18} className="text-slate-400" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter email or mobile number"
                    autoComplete="username"
                    className="h-12 w-full bg-transparent px-3 text-sm outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 px-4 focus-within:border-[#39714e]">
                  <LockKeyhole size={18} className="text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="h-12 w-full bg-transparent px-3 text-sm outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#174b34] font-semibold text-white transition hover:bg-[#246342] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-slate-400">
              Authorized administrators only
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
