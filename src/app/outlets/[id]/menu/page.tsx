
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { useParams, useRouter, useSearchParams } from "next/navigation";

import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  Utensils,
  Plus,
  Pencil,
  Power,
  X,
  Eye, 
  EyeOff,
} from "lucide-react";

import { apiRequest } from "@/services/api";

type MenuItem = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  isVeg: boolean;
  isAvailable: boolean;
  isActive: boolean;
};

type Category = {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  menuItems: MenuItem[];
};

type Addon = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  isActive: boolean;
};

type Outlet = {
  id: string;
  name: string;
  code: string;
  city?: string | null;
  isActive?: boolean;
};

type MenuData = {
  outlet: {
    id: string;
    name: string;
    code: string;
  };
  categories: Category[];
  addons: Addon[];
};

function ManageMenuContent() {

  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const outletId = params.id;
  const returnToDashboard = searchParams.get("returnTo") === "dashboard";

  const [outlets, setOutlets] = useState<Outlet[]>([]);
const [outletsLoading, setOutletsLoading] = useState(true);

useEffect(() => {
  let isMounted = true;

  async function loadOutlets() {
    try {
      const result = await apiRequest("/outlets");

      if (isMounted && result?.success && Array.isArray(result.data)) {
        setOutlets(result.data.filter((outlet: Outlet) => outlet.isActive !== false));
      }
    } catch (error) {
      console.error("Unable to load outlets:", error);
    } finally {
      if (isMounted) setOutletsLoading(false);
    }
  }

  loadOutlets();

  return () => {
    isMounted = false;
  };
}, []);


  const [menu, setMenu] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [activeTab, setActiveTab] = useState<
    "categories" | "items" | "addons"
  >("categories");

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  );
  const [categorySaving, setCategorySaving] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(
    null
  );

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    sortOrder: 0,
  });
  const [showItemForm, setShowItemForm] = useState(false);
const [editingItemId, setEditingItemId] = useState<string | null>(null);
const [itemSaving, setItemSaving] = useState(false);
const [itemStatusUpdatingId, setItemStatusUpdatingId] = useState<string | null>(null);

const [itemForm, setItemForm] = useState({
  categoryId: "",
  name: "",
  description: "",
  price: "",
  isVeg: true,
  isAvailable: true,
  sortOrder: 0,
});



const [showAddonForm, setShowAddonForm] = useState(false);
const [editingAddonId, setEditingAddonId] = useState<string | null>(null);
const [addonSaving, setAddonSaving] = useState(false);
const [addonStatusUpdatingId, setAddonStatusUpdatingId] = useState<string | null>(null);

const [addonForm, setAddonForm] = useState({
  name: "",
  description: "",
  price: "",
});

function openAddonForm(addon?: Addon) {
  setActionError("");

  if (addon) {
    setEditingAddonId(addon.id);
    setAddonForm({
      name: addon.name,
      description: addon.description || "",
      price: String(addon.price),
    });
  } else {
    setEditingAddonId(null);
    setAddonForm({
      name: "",
      description: "",
      price: "",
    });
  }

  setShowAddonForm(true);
}

async function handleAddonSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setActionError("");

  const price = Number(addonForm.price);

  if (!addonForm.name.trim()) {
    setActionError("Add-on name is required.");
    return;
  }

  if (!Number.isFinite(price) || price < 0 || addonForm.price.trim() === "") {
    setActionError("Please enter a valid add-on price.");
    return;
  }

  setAddonSaving(true);

  try {
    const endpoint = editingAddonId
      ? `/outlets/${outletId}/menu/addons/${editingAddonId}`
      : `/outlets/${outletId}/menu/addons`;

    const result = await apiRequest(endpoint, {
      method: editingAddonId ? "PATCH" : "POST",
      body: JSON.stringify({
        name: addonForm.name.trim(),
        description: addonForm.description.trim(),
        price,
      }),
    });

    if (!result?.success) {
      throw new Error(result?.message || "Unable to save add-on.");
    }

    setShowAddonForm(false);
    setEditingAddonId(null);
    await loadMenu();
  } catch (err) {
    setActionError(
      err instanceof Error ? err.message : "Unable to save add-on."
    );
  } finally {
    setAddonSaving(false);
  }
}

async function handleAddonStatus(addon: Addon, isActive: boolean) {
  const action = isActive ? "activate" : "deactivate";

  if (!window.confirm(`Are you sure you want to ${action} "${addon.name}"?`)) {
    return;
  }

  setActionError("");
  setAddonStatusUpdatingId(addon.id);

  try {
    const result = await apiRequest(
      `/outlets/${outletId}/menu/addons/${addon.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      }
    );

    if (!result?.success) {
      throw new Error(result?.message || "Unable to update add-on status.");
    }

    await loadMenu();
  } catch (err) {
    setActionError(
      err instanceof Error ? err.message : "Unable to update add-on status."
    );
  } finally {
    setAddonStatusUpdatingId(null);
  }
}

  const loadMenu = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = sessionStorage.getItem("bytebill_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      const result = await apiRequest(`/outlets/${outletId}/menu`);

      if (!result?.success || !result.data) {
        throw new Error(result?.message || "Unable to load menu.");
      }

      setMenu(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load menu."
      );
    } finally {
      setLoading(false);
    }
  }, [outletId, router]);

  useEffect(() => {
    if (outletId) {
      loadMenu();
    }
  }, [outletId, loadMenu]);

  const totalItems =
    menu?.categories.reduce(
      (total, category) => total + category.menuItems.length,
      0
    ) ?? 0;

  function openCategoryForm(category?: Category) {
    setActionError("");

    if (category) {
      setEditingCategoryId(category.id);
      setCategoryForm({
        name: category.name,
        description: category.description || "",
        sortOrder: menu?.categories.findIndex(
          (item) => item.id === category.id
        ) ?? 0,
      });
    } else {
      setEditingCategoryId(null);
      setCategoryForm({
        name: "",
        description: "",
        sortOrder: menu?.categories.length || 0,
      });
    }

    setShowCategoryForm(true);
  }

  async function handleCategorySubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setActionError("");

    if (!categoryForm.name.trim()) {
      setActionError("Category name is required.");
      return;
    }

    setCategorySaving(true);

    try {
      const endpoint = editingCategoryId
        ? `/outlets/${outletId}/menu/categories/${editingCategoryId}`
        : `/outlets/${outletId}/menu/categories`;

      const result = await apiRequest(endpoint, {
        method: editingCategoryId ? "PATCH" : "POST",
        body: JSON.stringify({
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim(),
          sortOrder: Number(categoryForm.sortOrder),
        }),
      });

      if (!result?.success) {
        throw new Error(result?.message || "Unable to save category.");
      }

      setShowCategoryForm(false);
      setEditingCategoryId(null);

      await loadMenu();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Unable to save category."
      );
    } finally {
      setCategorySaving(false);
    }
  }

  // Activate or deactivate a category without permanently deleting it.
  async function handleCategoryStatus(
    category: Category,
    isActive: boolean
  ) {
    const action = isActive ? "activate" : "deactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${category.name}"?`
    );

    if (!confirmed) return;

    setActionError("");
    setStatusUpdatingId(category.id);

    try {
      const result = await apiRequest(
        `/outlets/${outletId}/menu/categories/${category.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ isActive }),
        }
      );

      if (!result?.success) {
        throw new Error(result?.message || "Unable to update category.");
      }

      await loadMenu();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Unable to update category."
      );
    } finally {
      setStatusUpdatingId(null);
    }
  }

  function openItemForm(item?: MenuItem, categoryId?: string) {
  setActionError("");

  if (item) {
    setEditingItemId(item.id);
    setItemForm({
      categoryId: categoryId || "",
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      isVeg: item.isVeg,
      isAvailable: item.isAvailable,
      sortOrder: 0,
    });
  } else {
    setEditingItemId(null);
    setItemForm({
      categoryId: categoryId || menu?.categories[0]?.id || "",
      name: "",
      description: "",
      price: "",
      isVeg: true,
      isAvailable: true,
      sortOrder: 0,
    });
  }

  setShowItemForm(true);
}

async function handleItemSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setActionError("");

  if (!itemForm.categoryId || !itemForm.name.trim()) {
    setActionError("Please select a category and enter an item name.");
    return;
  }

  const price = Number(itemForm.price);

  if (!Number.isFinite(price) || price < 0) {
    setActionError("Please enter a valid item price.");
    return;
  }

  setItemSaving(true);

  try {
    const endpoint = editingItemId
      ? `/outlets/${outletId}/menu/items/${editingItemId}`
      : `/outlets/${outletId}/menu/items`;

    const result = await apiRequest(endpoint, {
      method: editingItemId ? "PATCH" : "POST",
      body: JSON.stringify({
        categoryId: itemForm.categoryId,
        name: itemForm.name.trim(),
        description: itemForm.description.trim(),
        price,
        isVeg: itemForm.isVeg,
        isAvailable: itemForm.isAvailable,
        sortOrder: Number(itemForm.sortOrder),
      }),
    });

    if (!result?.success) {
      throw new Error(result?.message || "Unable to save menu item.");
    }

    setShowItemForm(false);
    setEditingItemId(null);
    await loadMenu();
  } catch (err) {
    setActionError(
      err instanceof Error ? err.message : "Unable to save menu item."
    );
  } finally {
    setItemSaving(false);
  }
}

async function handleItemStatus(item: MenuItem, isActive: boolean) {
  const action = isActive ? "activate" : "deactivate";

  if (!window.confirm(`Are you sure you want to ${action} "${item.name}"?`)) {
    return;
  }

  setActionError("");
  setItemStatusUpdatingId(item.id);

  try {
    const result = await apiRequest(
      `/outlets/${outletId}/menu/items/${item.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          isActive,
          ...(isActive ? {} : { isAvailable: false }),
        }),
      }
    );

    if (!result?.success) {
      throw new Error(result?.message || "Unable to update item status.");
    }

    await loadMenu();
  } catch (err) {
    setActionError(
      err instanceof Error ? err.message : "Unable to update item status."
    );
  } finally {
    setItemStatusUpdatingId(null);
  }
}

async function handleItemAvailability(item: MenuItem, isAvailable: boolean) {
  if (!item.isActive) {
    setActionError("Activate this menu item before changing its availability.");
    return;
  }

  const action = isAvailable ? "make available" : "make unavailable";

  if (!window.confirm(`Are you sure you want to ${action} "${item.name}"?`)) {
    return;
  }

  setActionError("");
  setItemStatusUpdatingId(item.id);

  try {
    const result = await apiRequest(
      `/outlets/${outletId}/menu/items/${item.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ isAvailable }),
      }
    );

    if (!result?.success) {
      throw new Error(result?.message || "Unable to update availability.");
    }

    await loadMenu();
  } catch (err) {
    setActionError(
      err instanceof Error ? err.message : "Unable to update availability."
    );
  } finally {
    setItemStatusUpdatingId(null);
  }
}

  return (
    <div className="min-h-screen bg-page-background text-brand-primary">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 md:px-8">
        <div>
          <button
            type="button"
            onClick={() =>
              router.push(
                returnToDashboard ? "/" : `/outlets/${outletId}`
              )
            }
            className="mb-2 flex items-center gap-2 text-sm text-slate-400 hover:text-brand-primary"
          >
            <ArrowLeft size={16} />
            {returnToDashboard ? "Back to Dashboard" : "Back to Outlet"}
          </button>

          <h1 className="text-xl font-bold">Manage Menu</h1>

          {menu && (
            <p className="mt-1 text-sm text-slate-500">
              {menu.outlet.name} · {menu.outlet.code}
            </p>
          )}
        </div>

        {/* <button
          type="button"
          onClick={loadMenu}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button> */}
        <div className="flex flex-wrap items-center gap-3">
  <select
    value={outletId}
    disabled={outletsLoading}
    onChange={(event) => {
      const selectedOutletId = event.target.value;

      if (selectedOutletId && selectedOutletId !== outletId) {
        router.push(
          `/outlets/${selectedOutletId}/menu${returnToDashboard ? "?returnTo=dashboard" : ""}`
        );
      }
    }}
    className="min-w-[220px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-button"
  >
    <option value={outletId}>
      {menu?.outlet.name || "Current Outlet"}
    </option>

    {outlets
      .filter((outlet) => outlet.id !== outletId)
      .map((outlet) => (
        <option key={outlet.id} value={outlet.id}>
          {outlet.name} ({outlet.code})
          {outlet.city ? ` - ${outlet.city}` : ""}
        </option>
      ))}
  </select>

  <button
    type="button"
    onClick={loadMenu}
    disabled={loading}
    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
  >
    <RefreshCw
      size={16}
      className={loading ? "animate-spin" : ""}
    />
    Refresh
  </button>
</div>
      </header>

      <main className="mx-auto max-w-7xl p-5 md:p-8">
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {actionError && !showCategoryForm && (
          <div className="mb-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError("")}
              className="font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-slate-400">
            <Loader2 size={24} className="animate-spin" />
            Loading outlet menu...
          </div>
        ) : menu ? (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SummaryCard
                label="Categories"
                value={menu.categories.length}
              />
              <SummaryCard label="Menu Items" value={totalItems} />
              <SummaryCard
                label="Add-ons"
                value={menu.addons.length}
              />
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              <TabButton
                active={activeTab === "categories"}
                onClick={() => setActiveTab("categories")}
              >
                Categories
              </TabButton>

              <TabButton
                active={activeTab === "items"}
                onClick={() => setActiveTab("items")}
              >
                Menu Items
              </TabButton>

              <TabButton
                active={activeTab === "addons"}
                onClick={() => setActiveTab("addons")}
              >
                Add-ons
              </TabButton>
            </div>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-7">
              {activeTab === "categories" && (
                <>
                  <SectionHeading
                    title="Menu Categories"
                    description="Manage the categories available at this outlet."
                  />

                  <button
                    type="button"
                    onClick={() => openCategoryForm()}
                    className="mb-5 flex items-center gap-2 rounded-xl bg-brand-button px-5 py-3 text-sm font-semibold text-white hover:bg-brand-button/90"
                  >
                    <Plus size={17} />
                    Add Category
                  </button>

                  {menu.categories.length === 0 ? (
                    <EmptyState message="No categories found for this outlet." />
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {menu.categories.map((category) => (
                        <div
                          key={category.id}
                          className="flex flex-wrap items-center justify-between gap-3 py-4"
                        >
                          <div>
                            <p className="font-semibold">
                              {category.name}
                            </p>

                            <p className="mt-1 text-sm text-slate-400">
                              {category.menuItems.length} menu items
                              {category.description
                                ? ` · ${category.description}`
                                : ""}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Status active={category.isActive} />

                            <button
                              type="button"
                              onClick={() => openCategoryForm(category)}
                              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                              title="Edit category"
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleCategoryStatus(
                                  category,
                                  !category.isActive
                                )
                              }
                              disabled={statusUpdatingId === category.id}
                              className={`rounded-lg border p-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                                category.isActive
                                  ? "border-red-200 text-red-600 hover:bg-red-50"
                                  : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                              }`}
                              title={
                                category.isActive
                                  ? "Deactivate category"
                                  : "Activate category"
                              }
                            >
                              {statusUpdatingId === category.id ? (
                                <Loader2
                                  size={18}
                                  className="animate-spin"
                                />
                              ) : (
                                <Power size={18} />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* {activeTab === "items" && (
                <>
                  <SectionHeading
                    title="Menu Items"
                    description="View menu items and their current prices."
                  />

                  {totalItems === 0 ? (
                    <EmptyState message="No menu items found for this outlet." />
                  ) : (
                    <div className="space-y-6">
                      {menu.categories.map((category) => (
                        <div key={category.id}>
                          <h3 className="mb-3 font-bold text-brand-primary">
                            {category.name}
                          </h3>

                          {category.menuItems.length === 0 ? (
                            <p className="text-sm text-slate-400">
                              No items in this category.
                            </p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[600px] text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500">
                                  <tr>
                                    <th className="p-3">Item</th>
                                    <th className="p-3">Price</th>
                                    <th className="p-3">Type</th>
                                    <th className="p-3">Availability</th>
                                    <th className="p-3">Status</th>
                                  </tr>
                                </thead>

                                <tbody>
                                  {category.menuItems.map((item) => (
                                    <tr
                                      key={item.id}
                                      className="border-b border-slate-100"
                                    >
                                      <td className="p-3 font-medium">
                                        {item.name}
                                      </td>

                                      <td className="p-3">
                                        ₹{Number(item.price).toFixed(2)}
                                      </td>

                                      <td className="p-3">
                                        {item.isVeg ? "Veg" : "Non-veg"}
                                      </td>

                                      <td className="p-3">
                                        {item.isAvailable
                                          ? "Available"
                                          : "Unavailable"}
                                      </td>

                                      <td className="p-3">
                                        <Status active={item.isActive} />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )} */}

              {activeTab === "items" && (
  <>
    <SectionHeading
      title="Menu Items"
      description="Add, edit and manage menu items, prices and availability."
    />

    <button
      type="button"
      onClick={() => openItemForm()}
      disabled={menu.categories.length === 0}
      className="mb-6 flex items-center gap-2 rounded-xl bg-brand-button px-5 py-3 text-sm font-semibold text-white hover:bg-brand-button/90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Plus size={17} />
      Add Menu Item
    </button>

    {totalItems === 0 ? (
      <EmptyState message="No menu items found for this outlet." />
    ) : (
      <div className="space-y-7">
        {menu.categories.map((category) => (
          <div key={category.id}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-brand-primary">
                  {category.name}
                </h3>
                {!category.isActive && (
                  <p className="mt-1 text-xs text-red-500">
                    Category inactive
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => openItemForm(undefined, category.id)}
                disabled={!category.isActive}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-brand-primary hover:bg-slate-50 disabled:opacity-40"
              >
                <Plus size={14} />
                Add to Category
              </button>
            </div>

            {category.menuItems.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-400">
                No items in this category.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="p-3">Item</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Availability</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {category.menuItems.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100"
                      >
                        <td className="p-3 font-medium">
                          <div>{item.name}</div>
                          {item.description && (
                            <p className="mt-1 text-xs text-slate-400">
                              {item.description}
                            </p>
                          )}
                        </td>

                        <td className="p-3 whitespace-nowrap">
                          ₹{Number(item.price).toFixed(2)}
                        </td>

                        <td className="p-3">
                          {item.isVeg ? "Veg" : "Non-veg"}
                        </td>

                        <td className="p-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              item.isAvailable
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {item.isAvailable ? "Available" : "Unavailable"}
                          </span>
                        </td>

                        <td className="p-3">
                          <Status active={item.isActive} />
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openItemForm(item, category.id)}
                              title="Edit menu item"
                              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                            >
                              <Pencil size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleItemAvailability(item, !item.isAvailable)
                              }
                              disabled={
                                !item.isActive ||
                                itemStatusUpdatingId === item.id
                              }
                             title={item.isAvailable ? "Mark as Unavailable" : "Mark as Available"}
                             aria-label={item.isAvailable ? "Mark as Unavailable" : "Mark as Available"}
                              className={`rounded-lg border p-2 disabled:cursor-not-allowed disabled:opacity-40 ${
                                item.isAvailable
                                  ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                                  : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                              }`}
                            >
                              {itemStatusUpdatingId === item.id ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                              item.isAvailable ? <Eye size={20} /> : <EyeOff size={20} />
                              )}
                              
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleItemStatus(item, !item.isActive)
                              }
                              disabled={itemStatusUpdatingId === item.id}
                              title={item.isActive ? "Deactivate Item" : "Activate Item"}
                              aria-label={item.isActive ? "Deactivate Item" : "Activate Item"}
                              className={`rounded-lg border p-2 disabled:opacity-40 ${
                                item.isActive
                                  ? "border-red-200 text-red-600 hover:bg-red-50"
                                  : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                              }`}
                            >
                              {itemStatusUpdatingId === item.id ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                                <Power size={20} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </>
)}

             
{activeTab === "addons" && (
  <>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <SectionHeading
        title="Menu Add-ons"
        description="Add, edit and manage additional items and their prices."
      />

      <button
        type="button"
        onClick={() => openAddonForm()}
        className="flex items-center gap-2 rounded-xl bg-brand-button px-5 py-3 text-sm font-semibold text-white hover:bg-brand-button/90"
      >
        <Plus size={17} />
        Add Add-on
      </button>
    </div>

    {menu.addons.length === 0 ? (
      <EmptyState message="No add-ons found for this outlet. Click Add Add-on to create one." />
    ) : (
      <div className="divide-y divide-slate-100">
        {menu.addons.map((addon) => (
          <div
            key={addon.id}
            className="flex flex-wrap items-center justify-between gap-4 py-4"
          >
            <div>
              <p className="font-semibold">{addon.name}</p>

              <p className="mt-1 text-sm text-slate-400">
                ₹{Number(addon.price).toFixed(2)}
                {addon.description ? ` · ${addon.description}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Status active={addon.isActive} />

              <button
                type="button"
                onClick={() => openAddonForm(addon)}
                title="Edit Add-on"
                className="rounded-lg border border-slate-200 p-2 text-brand-primary hover:bg-slate-50"
              >
                <Pencil size={17} />
              </button>

              <button
                type="button"
                disabled={addonStatusUpdatingId === addon.id}
                onClick={() => handleAddonStatus(addon, !addon.isActive)}
                title={addon.isActive ? "Deactivate Add-on" : "Activate Add-on"}
                className="rounded-lg border border-slate-200 p-2 text-brand-primary hover:bg-slate-50 disabled:opacity-50"
              >
                {addonStatusUpdatingId === addon.id ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Power size={17} />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </>
)}

            </section>
          </>
        ) : null}

        {showCategoryForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold">
                  {editingCategoryId ? "Edit Category" : "Add Category"}
                </h2>

                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryForm(false);
                    setActionError("");
                  }}
                  className="rounded-lg p-2 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              {actionError && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {actionError}
                </div>
              )}

              <form
                onSubmit={handleCategorySubmit}
                className="space-y-4"
              >
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Category Name *
                  </label>

                  <input
                    required
                    value={categoryForm.name}
                    onChange={(event) =>
                      setCategoryForm({
                        ...categoryForm,
                        name: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-button"
                    placeholder="Enter category name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Description
                  </label>

                  <textarea
                    value={categoryForm.description}
                    onChange={(event) =>
                      setCategoryForm({
                        ...categoryForm,
                        description: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-button"
                    rows={3}
                    placeholder="Enter description"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Display Order
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={categoryForm.sortOrder}
                    onChange={(event) =>
                      setCategoryForm({
                        ...categoryForm,
                        sortOrder: Number(event.target.value),
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-button"
                  />
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategoryForm(false);
                      setActionError("");
                    }}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={categorySaving}
                    className="flex items-center gap-2 rounded-xl bg-brand-button px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {categorySaving && (
                      <Loader2 size={16} className="animate-spin" />
                    )}

                    {categorySaving ? "Saving..." : "Save Category"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showItemForm && (
  <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
    <div className="my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold">
          {editingItemId ? "Edit Menu Item" : "Add Menu Item"}
        </h2>

        <button
          type="button"
          onClick={() => {
            setShowItemForm(false);
            setActionError("");
          }}
          className="rounded-lg p-2 hover:bg-slate-100"
        >
          <X size={20} />
        </button>
      </div>

      {actionError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <form onSubmit={handleItemSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold">
            Category *
          </label>

          <select
            required
            value={itemForm.categoryId}
            onChange={(event) =>
              setItemForm({
                ...itemForm,
                categoryId: event.target.value,
              })
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-button"
          >
            <option value="">Select category</option>
            {menu?.categories
              .filter((category) => category.isActive || category.id === itemForm.categoryId)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                  {!category.isActive ? " (Inactive)" : ""}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Item Name *
          </label>

          <input
            required
            value={itemForm.name}
            onChange={(event) =>
              setItemForm({ ...itemForm, name: event.target.value })
            }
            placeholder="Enter item name"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-button"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Description
          </label>

          <textarea
            value={itemForm.description}
            onChange={(event) =>
              setItemForm({
                ...itemForm,
                description: event.target.value,
              })
            }
            rows={3}
            placeholder="Enter item description"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-button"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Price (₹) *
          </label>

          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={itemForm.price}
            onChange={(event) =>
              setItemForm({ ...itemForm, price: event.target.value })
            }
            placeholder="Enter price"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-button"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Item Type
          </label>

          <select
            value={itemForm.isVeg ? "veg" : "nonveg"}
            onChange={(event) =>
              setItemForm({
                ...itemForm,
                isVeg: event.target.value === "veg",
              })
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="veg">Veg</option>
            <option value="nonveg">Non-veg</option>
          </select>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={itemForm.isAvailable}
            onChange={(event) =>
              setItemForm({
                ...itemForm,
                isAvailable: event.target.checked,
              })
            }
            className="h-4 w-4 accent-brand-button"
          />
          Available for ordering
        </label>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            onClick={() => {
              setShowItemForm(false);
              setActionError("");
            }}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={itemSaving}
            className="flex items-center gap-2 rounded-xl bg-brand-button px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {itemSaving && (
              <Loader2 size={16} className="animate-spin" />
            )}
            {itemSaving ? "Saving..." : "Save Menu Item"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}


        {showAddonForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
            <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold">
                  {editingAddonId ? "Edit Add-on" : "Add Add-on"}
                </h2>

                <button
                  type="button"
                  onClick={() => {
                    setShowAddonForm(false);
                    setEditingAddonId(null);
                    setActionError("");
                  }}
                  className="rounded-lg p-2 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              {actionError && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleAddonSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Add-on Name *
                  </label>

                  <input
                    required
                    value={addonForm.name}
                    onChange={(event) =>
                      setAddonForm({
                        ...addonForm,
                        name: event.target.value,
                      })
                    }
                    placeholder="Enter add-on name"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-button"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Description
                  </label>

                  <textarea
                    value={addonForm.description}
                    onChange={(event) =>
                      setAddonForm({
                        ...addonForm,
                        description: event.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Enter description"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-button"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Price (₹) *
                  </label>

                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={addonForm.price}
                    onChange={(event) =>
                      setAddonForm({
                        ...addonForm,
                        price: event.target.value,
                      })
                    }
                    placeholder="Enter add-on price"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-button"
                  />
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddonForm(false);
                      setEditingAddonId(null);
                      setActionError("");
                    }}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={addonSaving}
                    className="flex items-center gap-2 rounded-xl bg-brand-button px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {addonSaving && (
                      <Loader2 size={16} className="animate-spin" />
                    )}
                    {addonSaving
                      ? "Saving..."
                      : editingAddonId
                        ? "Update Add-on"
                        : "Save Add-on"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}



        <footer className="py-7 text-center text-xs text-slate-400">
          © 2026 ByteBill. All rights reserved.
        </footer>
      </main>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-5 py-3 text-sm font-semibold ${
        active
          ? "bg-brand-button text-white"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function Status({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-slate-50 py-12 text-center text-sm text-slate-400">
      <Utensils size={28} className="mx-auto mb-3 opacity-50" />
      {message}
    </div>
  );
}

export default function ManageMenuPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-slate-500">
          Loading menu manager...
        </div>
      }
    >
      <ManageMenuContent />
    </Suspense>
  );
}
