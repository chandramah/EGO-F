// src/pages/cashier/PointOfSale.jsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import "bootstrap/dist/css/bootstrap.min.css";
import "../../styles.css";
import * as ProductsService from "../../services/ProductsService";

const CART_STORAGE_KEY = "pos_cart_v1";

export default function PointOfSale() {
  // cart loads from localStorage (if exists) otherwise starts empty
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("Failed to read cart from storage", e);
      return [];
    }
  });

  const [products, setProducts] = useState([]); // fetched product list
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [search, setSearch] = useState("");

  // persist cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.warn("Failed to persist cart", e);
    }
  }, [cart]);

  // load products (first page, reasonably large size to populate POS)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingProducts(true);
      try {
        const resp = await ProductsService.getProducts(0, 200);
        const list = resp?.content ?? resp ?? [];
        if (mounted) setProducts(list);
      } catch (err) {
        console.warn("Products fetch failed; POS will use empty product list", err);
      } finally {
        if (mounted) setLoadingProducts(false);
      }
    };
    load();
    return () => (mounted = false);
  }, []);

  // derived filtered product list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return (products || []).filter((p) => {
      if (!p) return false;
      const checks = [
        (p.name || "").toString().toLowerCase(),
        (p.sku || "").toString().toLowerCase(),
        (p.category || "").toString().toLowerCase(),
      ];
      return checks.some((s) => s.includes(q));
    });
  }, [products, search]);

  const addToCart = (prod) => {
    if (!prod) return;
    setCart((prev) => {
      const id = prod.id ?? prod.sku ?? Math.random();
      const idx = prev.findIndex((c) => c.id === id);
      const price = prod.unitPrice ?? prod.price ?? 0;
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1, price };
        return next;
      }
      return [...prev, { id, name: prod.name || prod.title || "Item", qty: 1, price }];
    });
  };

  const changeQty = (id, qty) => {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((p) => p.id !== id);
      return prev.map((p) => (p.id === id ? { ...p, qty } : p));
    });
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((p) => p.id !== id));
  };

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.qty * Number(i.price || 0), 0), [cart]);
  const tax = useMemo(() => +(subtotal * 0.1).toFixed(2), [subtotal]);
  const total = useMemo(() => +(subtotal + tax).toFixed(2), [subtotal, tax]);

  const clearCart = () => setCart([]);

  return (
    <div className="dashboard-page">
      <Sidebar />
      <main className="dashboard-main">
        <h1 className="page-title">Point of Sale</h1>

        <div className="pos-grid" style={{ gap: 18 }}>
          <div className="pos-left card" style={{ padding: 12 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input
                className="search-input full-width"
                placeholder="Search products by name / SKU / category"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button className="btn btn-ghost" onClick={() => setSearch("")}>Clear</button>
            </div>

            <div style={{ height: 420, overflowY: "auto" }}>
              {loadingProducts ? (
                <div className="empty-state">Loading products…</div>
              ) : (filtered && filtered.length) ? (
                <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                  {filtered.map((p) => {
                    const price = p.unitPrice ?? p.price ?? 0;
                    return (
                      <div key={p.id ?? p.sku ?? Math.random()} className="pos-product-card" style={{
                        border: "1px solid #eee",
                        borderRadius: 8,
                        padding: 10,
                        width: 220,
                        marginBottom: 10,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between"
                      }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: "#666" }}>{p.sku || p.id} • {p.category}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                          <div style={{ fontWeight: 700 }}>${Number(price).toFixed(2)}</div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn btn-ghost" onClick={() => addToCart(p)}>Add</button>
                            <button className="btn btn-small" onClick={() => {
                              // quick-add 5 for bulk
                              for (let i = 0; i < 4; i++) addToCart(p);
                            }}>+4</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">No products found</div>
              )}
            </div>
          </div>

          <aside className="pos-right">
            <div className="card table-card pos-cart">
              <h4>Cart</h4>
              <div className="cart-rows">
                <table className="cart-table">
                  <thead>
                    <tr><th>Product</th><th>Qty</th><th>Price</th><th></th></tr>
                  </thead>
                  <tbody>
                    {cart.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td style={{ width: 120 }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <button className="btn btn-ghost small" onClick={() => changeQty(p.id, p.qty - 1)}>-</button>
                            <input
                              className="small-input"
                              value={p.qty}
                              style={{ width: 48, textAlign: "center" }}
                              onChange={(e) => {
                                const v = Number(e.target.value || 0);
                                if (Number.isNaN(v)) return;
                                changeQty(p.id, Math.max(0, Math.floor(v)));
                              }}
                            />
                            <button className="btn btn-ghost small" onClick={() => changeQty(p.id, p.qty + 1)}>+</button>
                          </div>
                        </td>
                        <td>{(Number(p.price) * p.qty).toFixed(2)}</td>
                        <td style={{ textAlign: "right" }}>
                          <button className="action-btn action-delete" onClick={() => removeFromCart(p.id)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                    {cart.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: 18 }}>Cart is empty</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div className="cart-summary">
                  <div className="row"><span>Subtotal</span><span>{subtotal.toFixed(2)}</span></div>
                  <div className="row"><span>Tax (10%)</span><span>{tax.toFixed(2)}</span></div>
                  <div className="row total"><span>Total</span><span>{total.toFixed(2)}</span></div>
                </div>
              </div>
            </div>

            <div className="pos-controls">
              <div className="inline-row">
                <input className="small-input" placeholder="Enter coupon code" />
                <button className="btn btn-ghost">Apply</button>
              </div>

              <div className="inline-row" style={{ marginTop: 10 }}>
                <select className="small-input">
                  <option>Cash</option>
                  <option>Card</option>
                </select>
              </div>

              <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
                <button className="btn btn-secondary" onClick={clearCart}>Cancel</button>
                <button className="btn btn-primary" onClick={() => {
                  if (cart.length === 0) { alert("Cart is empty"); return; }
                  // TODO: call backend sale finalization endpoint here
                  alert(`Sale completed. Total: $${total.toFixed(2)}`);
                  clearCart();
                }}>Finalize Sale</button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
