// src/pages/inventory/AddBatch.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import "../../styles.css";
import InventoryService from "../../services/InventoryService";
import * as ProductsService from "../../services/ProductsService";

/**
 * AddBatch
 * - costPrice is defaulted from selected product's unitPrice and is NOT editable
 * - expiry date validation (no past dates) + Tailwind toast
 * - editing existing batch preserves costPrice but keeps it read-only
 */

export default function AddBatch() {
  const navigate = useNavigate();
  const location = useLocation();
  const editingBatch = location.state?.batch ?? null;

  const [form, setForm] = useState({
    productId: "",
    quantity: "",
    costPrice: "",
    expiryDate: "",
    location: "",
    batchNumber: "",
  });
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [expiryError, setExpiryError] = useState("");

  // Toast state (Tailwind)
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });
  useEffect(() => {
    if (!toast.visible) return;
    const t = setTimeout(() => setToast((s) => ({ ...s, visible: false })), 4000);
    return () => clearTimeout(t);
  }, [toast.visible]);
  const showToast = (message, type = "success") => setToast({ visible: true, message, type });

  // compute today's date string (YYYY-MM-DD) for date input min
  const todayStr = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // helper: is a date string (YYYY-MM-DD) before today
  const isDateBeforeToday = (dateStr) => {
    if (!dateStr) return false;
    const input = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return input.getTime() < today.getTime();
  };

  useEffect(() => {
    async function loadProducts() {
      try {
        const resp = await ProductsService.getProducts(0, 500);
        const list = resp?.content ?? resp?.data ?? resp ?? [];
        const arr = Array.isArray(list) ? list : [];
        setProducts(arr);
      } catch (err) {
        console.warn("Could not load products", err);
      }
    }
    loadProducts();

    if (editingBatch) {
      setForm({
        productId: editingBatch.productId ?? editingBatch.productId ?? "",
        quantity: editingBatch.quantity ?? editingBatch.qty ?? "",
        // preserve existing costPrice when editing
        costPrice:
          editingBatch.costPrice != null
            ? Number(editingBatch.costPrice)
            : editingBatch.cost != null
            ? Number(editingBatch.cost)
            : "",
        expiryDate: editingBatch.expiryDate ? (editingBatch.expiryDate.split?.("T")?.[0] ?? editingBatch.expiryDate) : "",
        location: editingBatch.location ?? "",
        batchNumber: editingBatch.batchNumber ?? editingBatch.batchNo ?? "",
      });

      // if editing and the existing expiry is before today, set expiryError to warn user
      const existingExpiry = editingBatch.expiryDate ? (editingBatch.expiryDate.split?.("T")?.[0] ?? editingBatch.expiryDate) : "";
      if (existingExpiry && isDateBeforeToday(existingExpiry)) {
        setExpiryError("This batch has already expired. Please select a valid future expiry date.");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingBatch]);

  // Called when any input changes. If productId changes, update costPrice from selected product.
  function onChange(e) {
    const { name, value } = e.target;

    // When product selection changes, lookup unitPrice and set costPrice automatically
    if (name === "productId") {
      const productId = value;
      const selected = products.find((p) => String(p.id) === String(productId) || String(p.sku) === String(productId));
      const unitPrice = selected ? Number(selected.unitPrice ?? selected.price ?? selected.sellingPrice ?? selected.cost ?? 0) : "";
      setForm((prev) => ({
        ...prev,
        productId,
        costPrice: unitPrice !== "" ? unitPrice : prev.costPrice, // set unitPrice if found
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === "expiryDate") {
      // clear previous error when user changes the date
      setExpiryError("");
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.productId) {
      showToast("Please select a product", "error");
      return;
    }

    // validate expiry date: if provided and before today, show toast + inline error and don't save
    if (form.expiryDate && isDateBeforeToday(form.expiryDate)) {
      setExpiryError("Expiry date cannot be before today. Please select a valid date.");
      showToast("Expiry date cannot be before today. The batch will not be saved.", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        productId: Number(form.productId),
        quantity: Number(form.quantity || 0),
        // costPrice comes from product's unitPrice or preserved editing value
        costPrice: Number(form.costPrice || 0),
        expiryDate: form.expiryDate ? `${form.expiryDate}T00:00:00` : null,
        location: form.location || "",
        batchNumber: form.batchNumber || "",
      };

      if (editingBatch) {
        await InventoryService.updateBatch({ ...payload, id: editingBatch.id ?? editingBatch.batchId });
        showToast("Batch updated successfully", "success");
      } else {
        await InventoryService.createBatch(payload);
        showToast("Batch added successfully", "success");
      }

      // navigate back after small delay so toast is visible
      setTimeout(() => navigate("/inventory/stock-by-product"), 500);
    } catch (err) {
      console.error("Add batch failed", err);
      showToast("Failed to save batch. See console for details.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard-page">
      <Sidebar />
      <main className="dashboard-main p-6">
        <header className="page-header mb-6">
          <h2 className="text-2xl font-semibold">{editingBatch ? "Edit Batch" : "Add Batch"}</h2>
        </header>

        <div className="form-card bg-white shadow rounded-md p-6 max-w-3xl">
          <form className="batch-form space-y-6" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <div className="text-sm font-medium mb-1">Product</div>
                <select
                  name="productId"
                  value={form.productId}
                  onChange={onChange}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select Product</option>
                  {products.map((p) => (
                    <option key={p.id ?? p.sku} value={p.id ?? p.sku}>
                      {p.name} {p.sku ? `(${p.sku})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <div className="text-sm font-medium mb-1">Batch Number</div>
                <input
                  type="text"
                  name="batchNumber"
                  value={form.batchNumber}
                  onChange={onChange}
                  placeholder="Enter Batch Number"
                  className="w-full border rounded px-3 py-2"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <div className="text-sm font-medium mb-1">Quantity</div>
                <input
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={onChange}
                  placeholder="Quantity"
                  className="w-full border rounded px-3 py-2"
                />
              </label>

              <label className="block">
                <div className="text-sm font-medium mb-1">Cost Price (₹)</div>
                {/* costPrice is read-only and derived from selected product */}
                <input
                  type="number"
                  name="costPrice"
                  value={form.costPrice !== "" ? Number(form.costPrice) : ""}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full border rounded px-3 py-2 bg-gray-50"
                  readOnly
                  disabled
                />
                <div className="text-xs text-gray-500 mt-1">
                  Cost price is taken from the product's unit price and cannot be edited here.
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <div className="text-sm font-medium mb-1">Expiry Date</div>
                <input
                  type="date"
                  name="expiryDate"
                  value={form.expiryDate}
                  onChange={onChange}
                  min={todayStr} /* prevents choosing past dates */
                  className="w-full border rounded px-3 py-2"
                />
                {/* Inline expiry error */}
                {expiryError && (
                  <div className="mt-2 text-sm text-red-600 flex items-start gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path fillRule="evenodd" d="M8.257 3.099c.366-.756 1.42-.756 1.786 0l6.518 13.467A1 1 0 0115.69 18H4.31a1 1 0 01-.87-1.434L8.257 3.1zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-6a1 1 0 00-.993.883L9 8v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>{expiryError}</div>
                  </div>
                )}
              </label>

              <label className="block">
                <div className="text-sm font-medium mb-1">Location</div>
                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={onChange}
                  placeholder="e.g., RACK-A1"
                  className="w-full border rounded px-3 py-2"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={saving}
                className="px-4 py-2 rounded border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded btn bg-blue-600 text-white hover:bg-blue-700"
              >
                {saving ? "Saving..." : editingBatch ? "Save Changes" : "Add Batch"}
              </button>
            </div>
          </form>
        </div>

        {/* Tailwind Toast (bottom-right) */}
        {toast.visible && (
          <div className="fixed right-6 bottom-6 z-50">
            <div
              className={`max-w-xs w-full px-4 py-3 rounded-lg shadow-lg border ${
                toast.type === "success" ? "bg-white border-green-200" : toast.type === "error" ? "bg-white border-red-200" : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 ${toast.type === "success" ? "text-green-500" : toast.type === "error" ? "text-red-500" : "text-gray-500"}`}>
                  {toast.type === "success" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" />
                    </svg>
                  ) : toast.type === "error" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.366-.756 1.42-.756 1.786 0l6.518 13.467A1 1 0 0115.69 18H4.31a1 1 0 01-.87-1.434L8.257 3.1zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-6a1 1 0 00-.993.883L9 8v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016.803 4H3.197a2 2 0 00-1.194.884z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{toast.type === "success" ? "Success" : toast.type === "error" ? "Error" : "Info"}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{toast.message}</div>
                </div>
                <button onClick={() => setToast((s) => ({ ...s, visible: false }))} className="text-gray-400 hover:text-gray-600">
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
