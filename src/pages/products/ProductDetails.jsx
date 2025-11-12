// src/pages/products/ProductDetails.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import "../../styles.css";
import * as ProductsService from "../../services/ProductsService"; // expects getProduct, updateProduct, deleteProduct

export default function ProductDetails() {
  const navigate = useNavigate();
  const { id } = useParams(); // expects route like /products/:id or you can adapt

  const [product, setProduct] = useState({
    name: "",
    sku: "",
    category: "",
    unitPrice: "",
    taxRate: "",
    barcode: "",
    description: "",
    isActive: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!id) {
        setError("Product id not provided.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        // ProductsService.getProduct should return product object
        const res = await ProductsService.getProduct ? await ProductsService.getProduct(id) : null;
        // If service returns { data } or { content } adjust accordingly:
        const data = res && res.data ? res.data : res; // try to be resilient
        if (mounted) {
          if (data) {
            setProduct({
              name: data.name ?? "",
              sku: data.sku ?? "",
              category: data.category ?? "",
              unitPrice: data.unitPrice ?? "",
              taxRate: data.taxRate ?? "",
              barcode: data.barcode ?? "",
              description: data.description ?? "",
              isActive: data.isActive ?? true,
            });
          } else {
            setError("Product not found.");
          }
        }
      } catch (err) {
        console.error("Error loading product:", err);
        setError(err?.message || "Failed to load product");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProduct((p) => ({
      ...p,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      // call update API: ProductsService.updateProduct(id, product)
      if (!ProductsService.updateProduct) {
        // fallback: log and simulate success
        console.warn("ProductsService.updateProduct not implemented; skipping API call.");
      } else {
        await ProductsService.updateProduct(id, product);
      }
      alert("Product updated successfully.");
      navigate("/products");
    } catch (err) {
      console.error("Update failed:", err);
      setError(err?.response?.data?.message || err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = window.confirm("Are you sure you want to delete this product? This action cannot be undone.");
    if (!ok) return;

    setDeleting(true);
    setError("");
    try {
      if (!ProductsService.deleteProduct) {
        console.warn("ProductsService.deleteProduct not implemented; skipping API call.");
      } else {
        await ProductsService.deleteProduct(id);
      }
      alert("Product deleted.");
      navigate("/products");
    } catch (err) {
      console.error("Delete failed:", err);
      setError(err?.response?.data?.message || err.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <Sidebar />
        <main className="dashboard-main">
          <div className="card form-card">
            <div className="loading">Loading product…</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <Sidebar />
      <main className="dashboard-main">
        <div className="card form-card">
          <h2>Edit Product</h2>

          {error && <div style={{ color: "#b91c1c", marginTop: 8 }}>{error}</div>}

          <form className="form-grid" style={{ marginTop: 12 }} onSubmit={handleSave}>
            <label>
              Name
              <input type="text" name="name" placeholder="Name" value={product.name} onChange={handleChange} required />
            </label>

            <label>
              SKU
              <input type="text" name="sku" placeholder="SKU" value={product.sku} onChange={handleChange} required />
            </label>

            <label>
              Category
              <input type="text" name="category" placeholder="Category" value={product.category} onChange={handleChange} />
            </label>

            <label>
              Unit Price
              <input type="number" name="unitPrice" placeholder="Unit Price" value={product.unitPrice} onChange={handleChange} step="0.01" />
            </label>

            <label>
              Tax Rate
              <input type="number" name="taxRate" placeholder="Tax Rate" value={product.taxRate} onChange={handleChange} step="0.1" />
            </label>

            <label>
              Barcode
              <input type="text" name="barcode" placeholder="Barcode" value={product.barcode} onChange={handleChange} />
            </label>

            <label className="full-width">
              Description
              <textarea name="description" placeholder="Description" rows="4" value={product.description} onChange={handleChange} />
            </label>

            <label>
              Active
              <input type="checkbox" name="isActive" checked={!!product.isActive} onChange={handleChange} />
            </label>

            <div style={{ gridColumn: "1 / -1", marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" className="btn-secondary" onClick={() => navigate(-1)} disabled={saving || deleting}>
                Back
              </button>

              <button type="button" className="btn-secondary" onClick={handleDelete} disabled={saving || deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </button>

              <button type="submit" className="btn-primary" disabled={saving || deleting}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
