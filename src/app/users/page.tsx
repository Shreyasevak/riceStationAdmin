
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Pencil,
  Power,
  Loader2,
  ArrowLeft,
  X,
  KeyRound,
} from "lucide-react";
import { apiRequest } from "@/services/api";

type UserRole = "SUPER_ADMIN" | "ADMIN" | "STAFF" | "KITCHEN" | "CASHIER";

type User = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  outletId: string | null;
  outlet?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
};

type Outlet = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

const roles: UserRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "STAFF",
  "KITCHEN",
  "CASHIER",
];

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "STAFF" as UserRole,
  outletId: "",
};

export default function UsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [outletFilter, setOutletFilter] = useState("ALL");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setError("");

    try {
      if (!sessionStorage.getItem("bytebill_token")) {
        router.replace("/login");
        return;
      }

      const result = await apiRequest("/users");

      if (!result?.success || !Array.isArray(result.data)) {
        throw new Error(result?.message || "Unable to load users.");
      }

      setUsers(result.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load users.";

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

  async function loadOutlets() {
    try {
      const result = await apiRequest("/outlets");
      if (result?.success && Array.isArray(result.data)) {
        setOutlets(result.data);
      }
    } catch {
      // Outlet selection is optional for users who cannot manage all outlets.
    }
  }

  useEffect(() => {
    loadUsers();
    loadOutlets();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const term = search.toLowerCase();

      const matchesSearch =
        user.name.toLowerCase().includes(term) ||
        (user.email || "").toLowerCase().includes(term) ||
        (user.phone || "").toLowerCase().includes(term) ||
        (user.outlet?.name || "").toLowerCase().includes(term);

      const matchesRole =
        roleFilter === "ALL" || user.role === roleFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && user.isActive) ||
        (statusFilter === "INACTIVE" && !user.isActive);

        const matchesOutlet =
  outletFilter === "ALL" || user.outletId === outletFilter;

      return matchesSearch && matchesRole && matchesStatus && matchesOutlet;
    });
  }, [users, search, roleFilter, statusFilter, outletFilter]);

  const activeCount = users.filter((user) => user.isActive).length;
  const inactiveCount = users.length - activeCount;

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(user: User) {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email || "",
      phone: user.phone || "",
      password: "",
      role: user.role,
      outletId: user.outletId || "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Please enter the user's name.");
      return;
    }

    if (!form.email.trim() && !form.phone.trim()) {
      setError("Enter at least an email address or phone number.");
      return;
    }

    if (!editingId && !form.password.trim()) {
      setError("Please enter a password for the new user.");
      return;
    }

    if (form.password && form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSaving(true);

    try {
      const payload: Record<string, string> = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
      };

      if (form.password) {
        payload.password = form.password;
      }

      if (form.outletId) {
        payload.outletId = form.outletId;
      }

      const result = editingId
        ? await apiRequest(`/users/${editingId}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          })
        : await apiRequest("/users", {
            method: "POST",
            body: JSON.stringify(payload),
          });

      if (!result?.success) {
        throw new Error(result?.message || "Unable to save user.");
      }

      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save user.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(user: User) {
    const action = user.isActive ? "deactivate" : "activate";

    if (!window.confirm(`Are you sure you want to ${action} ${user.name}?`)) {
      return;
    }

    setStatusUpdatingId(user.id);
    setError("");

    try {
      const result = await apiRequest(`/users/${user.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      if (!result?.success) {
        throw new Error(result?.message || "Unable to update user status.");
      }

      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update user status."
      );
    } finally {
      setStatusUpdatingId(null);
    }
  }

  async function handlePasswordReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!passwordUser) return;

    setPasswordSaving(true);
    setError("");

    try {
      const result = await apiRequest(`/users/${passwordUser.id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ password: newPassword }),
      });

      if (!result?.success) {
        throw new Error(result?.message || "Unable to reset password.");
      }

      setPasswordUser(null);
      setNewPassword("");
      alert("Password updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to reset password."
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8f7] text-slate-800">
      <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 md:px-8">
        <div>
          <button
            onClick={() => router.push("/")}
            className="mb-1 flex items-center gap-1 text-xs text-slate-400 hover:text-[#245b40]"
          >
            <ArrowLeft size={14} /> Dashboard
          </button>
          <h1 className="text-xl font-bold">User Management</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            className="rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>

          <button
            onClick={openAddForm}
            className="flex items-center gap-2 rounded-xl bg-[#174b34] px-4 py-3 text-sm font-semibold text-white hover:bg-[#246342]"
          >
            <Plus size={18} /> Add User
          </button>
        </div>
      </header>

      <div className="p-5 md:p-8">
        <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Users</p>
            <p className="mt-2 text-3xl font-bold">
              {loading ? "—" : users.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Active Users</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {loading ? "—" : activeCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Inactive Users</p>
            <p className="mt-2 text-3xl font-bold text-red-600">
              {loading ? "—" : inactiveCount}
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center">
            <div>
              <h2 className="font-bold">All Users</h2>
              <p className="mt-1 text-xs text-slate-400">
                Manage registered users and their access
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex items-center rounded-xl border border-slate-200 px-3">
                <Search size={17} className="text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users..."
                  className="h-10 w-full bg-transparent px-2 text-sm outline-none sm:w-48"
                />
              </div>

               <select
  value={outletFilter}
  onChange={(e) => setOutletFilter(e.target.value)}
  className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
>
  <option value="ALL">All Outlets</option>

  {outlets.map((outlet) => (
    <option key={outlet.id} value={outlet.id}>
      {outlet.name}
    </option>
  ))}
</select>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
              >
                <option value="ALL">All Roles</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role.replace("_", " ")}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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
                  <th className="px-5 py-4">User Information</th>
                  <th className="px-5 py-4">Contact</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Outlet</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-slate-400">
                      <Loader2 className="mx-auto mb-2 animate-spin" size={25} />
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-slate-400">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f0e6] text-[#245b40]">
                            <Users size={19} />
                          </div>
                          <div>
                            <p className="font-semibold">{user.name}</p>
                            <p className="text-xs text-slate-400">
                              {user.id.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        <p>{user.email || "—"}</p>
                        <p className="mt-1 text-xs">{user.phone || "—"}</p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-[#e8f0e6] px-3 py-1 text-xs font-semibold text-[#245b40]">
                          {user.role.replace("_", " ")}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {user.outlet?.name || "All Outlets"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            user.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditForm(user)}
                            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-[#e8f0e6] hover:text-[#245b40]"
                            title="Edit user"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            onClick={() => {
                              setPasswordUser(user);
                              setNewPassword("");
                              setError("");
                            }}
                            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                            title="Reset password"
                          >
                            <KeyRound size={16} />
                          </button>

                          <button
                            onClick={() => handleStatus(user)}
                            disabled={statusUpdatingId === user.id}
                            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title={user.isActive ? "Deactivate user" : "Activate user"}
                          >
                            {statusUpdatingId === user.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Power size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-400">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </section>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-lg font-bold">
                  {editingId ? "Edit User" : "Add New User"}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Enter user details and access role
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-sm font-medium">Full Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Enter full name"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#245b40]"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="user@example.com"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#245b40]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="Mobile number"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#245b40]"
                  />
                </div>
              </div>

              <p className="text-xs text-slate-400">
                Enter at least an email address or phone number.
              </p>

              {!editingId && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Password *</label>
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Minimum 8 characters"
                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#245b40]"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium">User Role *</label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value as UserRole })
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#245b40]"
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Outlet</label>
                <select
                  value={form.outletId}
                  onChange={(e) => setForm({ ...form, outletId: e.target.value })}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#245b40]"
                >
                  <option value="">Use account's default outlet / no outlet</option>
                  {outlets
                    .filter((outlet) => outlet.isActive)
                    .map((outlet) => (
                      <option key={outlet.id} value={outlet.id}>
                        {outlet.name} ({outlet.code})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-[#174b34] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#246342] disabled:opacity-60"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {editingId ? "Update User" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {passwordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-lg font-bold">Reset Password</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Change password for {passwordUser.name}
                </p>
              </div>
              <button
                onClick={() => setPasswordUser(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePasswordReset} className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-sm font-medium">New Password *</label>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#245b40]"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPasswordUser(null)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="flex items-center gap-2 rounded-xl bg-[#174b34] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#246342] disabled:opacity-60"
                >
                  {passwordSaving && <Loader2 size={16} className="animate-spin" />}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
