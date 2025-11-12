// src/pages/products/ProductForm.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import "../../styles.css";
import * as ProductsService from "../../services/ProductsService";

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    unitPrice: "",
    taxRate: "",
    reorderLevel: "",
    barcode: "",
    description: "",
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!id) return;
      setLoading(true);
      setError("");
      try {
        const res = await ProductsService.getProduct(id);
        const data = res?.data || res;
        if (mounted && data) {
          setFormData({
            name: data.name ?? "",
            sku: data.sku ?? "",
            category: data.category ?? "",
            unitPrice: data.unitPrice ?? "",
            taxRate: data.taxRate ?? "",
            reorderLevel: data.reorderLevel ?? "",
            barcode: data.barcode ?? "",
            description: data.description ?? "",
            isActive: data.isActive ?? true,
          });
        }
      } catch (err) {
        console.error("Failed to load product", err);
        setError("Failed to load product");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (id) {
        await ProductsService.updateProduct(id, formData);
        alert("Product updated successfully");
      } else {
        await ProductsService.createProducts(formData);
        alert("Product created successfully");
      }
      navigate("/products");
    } catch (err) {
      console.error("Save failed", err);
      setError(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-page">
      <Sidebar />
      <main className="dashboard-main">
        <div className="product-form-page" style={{ height: "90vh", overflowY: "auto" }}>
          <div className="form-card" style={{ padding: "20px 30px" }}>
            <h2 className="form-title">{id ? "Edit Product" : "Add Product"}</h2>

            {loading ? (
              <div className="empty-state">Loading…</div>
            ) : (
              <form className="product-form" onSubmit={handleSubmit}>
                {error && <div style={{ color: "#b91c1c", marginBottom: 8 }}>{error}</div>}

                <div
                  className="form-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "16px",
                    marginBottom: "20px",
                  }}
                >
                  <label>
                    Name
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Name"
                      required
                    />
                  </label>

                  <label>
                    SKU
                    <input
                      name="sku"
                      value={formData.sku}
                      onChange={handleChange}
                      placeholder="SKU"
                      required
                    />
                  </label>

                  <label>
                    Barcode
                    <input
                      name="barcode"
                      value={formData.barcode}
                      onChange={handleChange}
                      placeholder="Barcode"
                    />
                  </label>

                  <label>
                    Category
                    <input
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      placeholder="Category"
                    />
                  </label>

                  <label>
                    Unit Price
                    <input
                      name="unitPrice"
                      type="number"
                      step="0.01"
                      value={formData.unitPrice}
                      onChange={handleChange}
                      placeholder="Unit Price"
                    />
                  </label>

                  <label>
                    Tax Rate %
                    <input
                      name="taxRate"
                      type="number"
                      step="0.1"
                      value={formData.taxRate}
                      onChange={handleChange}
                      placeholder="Tax Rate %"
                    />
                  </label>

                  <label>
                    Reorder Level
                    <input
                      name="reorderLevel"
                      type="number"
                      value={formData.reorderLevel}
                      onChange={handleChange}
                      placeholder="Reorder Level"
                    />
                  </label>

                  <label className="full-width" style={{ gridColumn: "1 / -1" }}>
                    Description
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Enter product description"
                    />
                  </label>

                  <label className="checkbox-label" style={{ display: "flex", alignItems: "center" }}>
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      style={{ marginRight: "8px" }}
                    />
                    Is Active
                  </label>
                </div>

                {/* Buttons aligned to left */}
                <div
                  className="form-footer"
                  style={{
                    display: "flex",
                    justifyContent: "flex-start",
                    gap: "10px",
                    paddingTop: "10px",
                    borderTop: "1px solid #eee",
                  }}
                >
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => navigate(-1)}
                    disabled={saving}
                    style={{ padding: "8px 16px" }}
                  >
                    ← Back
                  </button>

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={saving}
                    style={{ padding: "8px 16px" }}
                  >
                    {saving
                      ? id
                        ? "Saving…"
                        : "Creating…"
                      : id
                      ? "Save Changes"
                      : "Create Product"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
