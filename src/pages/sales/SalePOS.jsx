// src/pages/sales/SalePOS.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "../../styles/SalePOS.css";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Search, ShoppingCart, Trash2, LogOut, CreditCard, QrCode } from "lucide-react";
import { getProducts, searchProducts } from "../../services/ProductsService";
import SalesService from "../../services/SalesService";
import AuthService from "../../services/AuthService";
import { useNavigate } from "react-router-dom";

/* Helpers */
function luhnCheck(cardNumber = "") {
  const digits = String(cardNumber).replace(/\D/g, "");
  let sum = 0;
  let toggle = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (toggle) {
      d = d * 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    toggle = !toggle;
  }
  return digits.length > 0 && sum % 10 === 0;
}
function maskCard(number = "") {
  const digits = String(number).replace(/\D/g, "");
  if (digits.length <= 4) return digits;
  return "**** **** **** " + digits.slice(-4);
}

export default function SalePOS() {
  const navigate = useNavigate();

  // products
  const [products, setProducts] = useState([]);
  const [fallbackProducts, setFallbackProducts] = useState([]);

  // search
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  // cart + totals
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  // store paymentMode as UPPERCASE keys to simplify checks
  const [paymentMode, setPaymentMode] = useState("CASH"); // "CASH" | "UPI" | "CARD"

  // cashier id (numeric)
  const [cashierIdInput, setCashierIdInput] = useState("");

  // UPI
  const [upiId, setUpiId] = useState("");
  const [upiError, setUpiError] = useState("");
  const [upiRefreshKey, setUpiRefreshKey] = useState(0);

  // Card
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardError, setCardError] = useState("");

  // submission
  const [loadingFinalize, setLoadingFinalize] = useState(false);

  // QR scanner toggles (off by default)
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const lastScannedRef = useRef(null);
  const scanCooldownRef = useRef(null);

  // load fallback products (small set) on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await getProducts();
        let list = [];
        if (Array.isArray(res)) list = res;
        else if (Array.isArray(res?.data)) list = res.data;
        else if (Array.isArray(res?.content)) list = res.content;
        else if (Array.isArray(res?.data?.content)) list = res.data.content;
        setFallbackProducts(list);
        setProducts(list.slice(0, 20));
      } catch (err) {
        console.warn("Initial product load failed", err);
      }
    })();
  }, []);

  // search
  const performProductSearch = async (term) => {
    const q = (term || "").toString().trim();
    setSearchError("");
    setSearchLoading(true);
    try {
      const resp = await searchProducts({ name: q, sku: q, page: 0, size: 50 });
      const list = Array.isArray(resp) ? resp : resp?.content ?? resp?.data ?? [];
      setProducts(Array.isArray(list) ? list : []);
      if (!list || list.length === 0) {
        setSearchError("No products found.");
      }
    } catch (err) {
      console.error("searchProducts error:", err);
      setSearchError("Search failed — showing local results.");
      const arr = fallbackProducts.length ? fallbackProducts : [];
      const ql = q.toLowerCase();
      const filtered = (arr || []).filter((item) => {
        if (!item) return false;
        return (
          String(item.name || "").toLowerCase().includes(ql) ||
          String(item.sku || "").toLowerCase().includes(ql) ||
          String(item.category || "").toLowerCase().includes(ql)
        );
      });
      setProducts(filtered);
    } finally {
      setSearchLoading(false);
    }
  };

  const onSearchKeyDown = (e) => {
    if (e.key === "Enter") performProductSearch(searchTerm);
  };
  const onSearchClick = () => performProductSearch(searchTerm);

  // cart operations
  const handleAddToCart = (product) => {
    if (!product) return;
    setCart((prev) => {
      const key = product.id ?? product.productId;
      const existing = prev.find((c) => c.id === key);
      if (existing) {
        return prev.map((c) => (c.id === key ? { ...c, qty: c.qty + 1 } : c));
      }
      const unitPrice = Number(product.unitPrice ?? product.price ?? product.mrp ?? 0);
      const taxRate = Number(product.taxRate ?? product.tax ?? 0);
      return [...prev, { id: key, name: product.name ?? product.title ?? "Item", qty: 1, unitPrice, taxRate }];
    });
  };

  const handleRemove = (id) => setCart((prev) => prev.filter((c) => c.id !== id));
  const handleQtyChange = (id, qtyRaw) => {
    const qty = Math.max(1, Math.floor(Number(qtyRaw) || 1));
    setCart((prev) => prev.map((c) => (c.id === id ? { ...c, qty } : c)));
  };

  // totals
  const subtotal = cart.reduce((s, i) => s + Number(i.unitPrice || 0) * Number(i.qty || 0), 0);
  const taxTotal = cart.reduce(
    (s, i) => s + (Number(i.unitPrice || 0) * Number(i.qty || 0) * (Number(i.taxRate || 0) / 100)),
    0
  );
  const discountTotal = (subtotal * Number(discount || 0)) / 100;
  const total = +(subtotal + taxTotal - discountTotal).toFixed(2);

  // validations
  const validateCashierId = () => {
    const v = cashierIdInput === "" ? null : Number(cashierIdInput);
    return Number.isInteger(v) && v > 0;
  };

  const validateUpi = (id) => {
    if (!id || String(id).trim().length < 3) return false;
    if (/@/.test(id)) return true;
    const digits = String(id).replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 20;
  };

  const upiPayloadString = useMemo(() => {
    const vpa = String(upiId || "").trim();
    if (!vpa) return "";
    const pa = encodeURIComponent(vpa);
    const pn = encodeURIComponent("SmartRetails");
    const am = encodeURIComponent(String(total.toFixed(2)));
    const cu = "INR";
    return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=${cu}`;
  }, [upiId, total]);

  const upiQrSrc = useMemo(() => {
    if (!upiPayloadString) return "";
    const data = encodeURIComponent(upiPayloadString);
    const cb = upiRefreshKey || 0;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${data}&t=${cb}`;
  }, [upiPayloadString, upiRefreshKey]);

  const validateCardDetails = () => {
    const num = String(cardNumber).replace(/\s+/g, "");
    if (!luhnCheck(num)) {
      setCardError("Invalid card number (Luhn check failed).");
      return false;
    }
    let mm, yy;
    if (cardExpiry.includes("/")) {
      [mm, yy] = cardExpiry.split("/");
      if (yy.length === 2) yy = "20" + yy;
    } else if (cardExpiry.includes("-")) {
      [yy, mm] = cardExpiry.split("-");
    } else {
      setCardError("Invalid expiry format.");
      return false;
    }
    const mmN = Number(mm);
    const yyN = Number(yy);
    if (!(mmN >= 1 && mmN <= 12)) {
      setCardError("Invalid expiry month.");
      return false;
    }
    const exp = new Date(yyN, mmN, 0, 23, 59, 59);
    if (exp < new Date()) {
      setCardError("Card expired.");
      return false;
    }
    setCardError("");
    return true;
  };

  const handleCancel = () => {
    setCart([]);
    setDiscount(0);
    setPaymentMode("CASH");
    setUpiId("");
    setUpiError("");
    setCardNumber("");
    setCardHolder("");
    setCardExpiry("");
    setCardError("");
  };

  // scanned-code -> add to cart
  const handleScannedCode = async (raw) => {
    if (!raw) return;
    const code = String(raw).trim();
    if (!code) return;
    if (lastScannedRef.current === code) return;
    lastScannedRef.current = code;
    clearTimeout(scanCooldownRef.current);
    try {
      const resp = await searchProducts({ name: code, sku: code, page: 0, size: 10 });
      const list = Array.isArray(resp) ? resp : resp?.content ?? resp?.data ?? [];
      let product = Array.isArray(list) && list.length ? list[0] : null;
      if (!product) {
        const found = (fallbackProducts || []).find(
          (p) => String(p.sku || "").toLowerCase() === code.toLowerCase() || String(p.id || "").toLowerCase() === code.toLowerCase()
        );
        product = found || null;
      }
      if (product) handleAddToCart(product);
    } catch (err) {
      console.error("scan processing error", err);
    } finally {
      scanCooldownRef.current = setTimeout(() => {
        lastScannedRef.current = null;
      }, 900);
    }
  };

  // scanner callbacks
  const onQrScan = (data) => {
    if (data) handleScannedCode(data);
  };
  const onQrError = (err) => {
    console.warn("QR reader error:", err);
  };

  // finalize sale: NOTE -> do NOT include paymentDetails
  const handleFinalizeSale = async () => {
    if (!validateCashierId()) {
      alert("Please enter a valid numeric Cashier ID (positive integer) in the sidebar.");
      return;
    }
    if (cart.length === 0) {
      alert("Add at least one product to cart.");
      return;
    }
    // keep client-side validation but do not send sensitive details
    if (paymentMode === "UPI") {
      if (!validateUpi(upiId)) {
        setUpiError("Invalid UPI ID. Example: username@bank or 10-20 digits.");
        return;
      }
      setUpiError("");
    }
    if (paymentMode === "CARD") {
      if (!validateCardDetails()) return;
    }

    const itemsPayload = cart.map((c) => ({
      productId: Number(c.id),
      quantity: Number(c.qty),
      unitPrice: Number(c.unitPrice || 0),
      taxRate: Number(c.taxRate || 0),
    }));

    // *** Payment details intentionally omitted for privacy/security ***
    const payload = {
      cashierId: Number(cashierIdInput),
      total: Number(total.toFixed(2)),
      taxTotal: Number(taxTotal.toFixed(2)),
      discountTotal: Number(discountTotal.toFixed(2)),
      paymentMode: String(paymentMode).toUpperCase(),
      createdAt: new Date().toISOString(),
      items: itemsPayload,
      // paymentDetails: <REMOVED>
    };

    try {
      setLoadingFinalize(true);
      const res = await SalesService.createSale(payload);
      const saleId = res?.id ?? res?.saleId ?? res?.data?.id ?? null;
      alert(`✅ Sale finalized successfully${saleId ? ` (id: ${saleId})` : ""}`);
      handleCancel();
    } catch (err) {
      console.error("Finalize sale error:", err);
      const message = err?.response?.data?.message ?? err?.message ?? "Failed to finalize sale.";
      alert(`❌ ${message}`);
    } finally {
      setLoadingFinalize(false);
    }
  };

  const handleLogout = () => {
    try {
      AuthService.logout();
    } catch {}
    navigate("/login");
  };

  return (
    <div className="pos-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <h2>Smart Retails</h2>

        <div className="cashier-block">
          <label className="label-small">Cashier ID (number)</label>
          <input
            type="number"
            className="input-small"
            placeholder="Enter cashier id"
            value={cashierIdInput}
            onChange={(e) => {
              const v = e.target.value;
              setCashierIdInput(v === "" ? "" : Number(v));
            }}
            min="1"
            step="1"
          />
        </div>

        <ul className="sidebar-nav">
          <li onClick={() => navigate("/products")} className="nav-item">
            📦 Products
          </li>
          <li onClick={() => navigate("/pos")} className={`nav-item ${window.location.pathname === "/pos" ? "active" : ""}`}>
            🧾 Billing / POS
          </li>
        </ul>

        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={14} /> Logout
        </button>

        {/* QR controls */}
        <div style={{ marginTop: 12 }}>
          <button onClick={() => setCameraEnabled((s) => !s)} className="btn" style={{ display: "block", width: "100%" }}>
            {cameraEnabled ? "Disable Camera Scanner" : "Enable Camera Scanner"}
          </button>

          {cameraEnabled && (
            <div style={{ marginTop: 8 }}>
              <small className="muted">Point the camera at a barcode/QR to auto-add product.</small>
              <div style={{ marginTop: 8 }}>
                <Scanner
                  onResult={(text) => {
                    if (text) onQrScan(text);
                  }}
                  onError={(err) => {
                    onQrError?.(err);
                  }}
                  components={{ finder: false }}
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="pos-main">
        <div className="pos-header">
          <h1>Point of Sale</h1>
        </div>

        <div className="pos-content">
          {/* Product Search */}
          <div className="product-section">
            <div className="search-bar pos-search">
              <input
                type="text"
                placeholder="Search product by name, SKU or barcode and press Enter"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={onSearchKeyDown}
                className="search-input"
              />
              <button className="btn search-btn" onClick={onSearchClick} disabled={searchLoading}>
                {searchLoading ? "Searching…" : <><Search size={14} /> Search</>}
              </button>
            </div>

            {searchError && <div className="search-error">{searchError}</div>}

            <div className="product-list grid">
              {products.length === 0 ? (
                <div className="no-products">No products. Search to load matches.</div>
              ) : (
                products.map((p) => (
                  <div key={p.id ?? p.productId} className="product-card">
                    <div className="product-card-top">
                      <div className="product-title">{p.name}</div>
                      <div className="product-sub">{p.sku ?? p.id ?? p.productId} • {p.category ?? "Uncategorized"}</div>
                    </div>
                    <div className="product-card-bottom">
                      <div className="product-price">₹{(Number(p.unitPrice ?? p.price ?? 0)).toFixed(2)}</div>
                      <button onClick={() => handleAddToCart(p)} className="btn add-btn">+ Add</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cart */}
          <div className="cart-section">
            <div className="cart-header">
              <ShoppingCart size={18} />
              <h3>Cart</h3>
            </div>

            <table className="cart-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Tax %</th>
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>
                      <input type="number" value={item.qty} min="1" onChange={(e) => handleQtyChange(item.id, e.target.value)} />
                    </td>
                    <td>₹{Number(item.unitPrice || 0).toFixed(2)}</td>
                    <td>{Number(item.taxRate || 0).toFixed(2)}%</td>
                    <td>
                      ₹{(Number(item.unitPrice || 0) * Number(item.qty || 0) +
                        (Number(item.unitPrice || 0) * Number(item.qty || 0) * (Number(item.taxRate || 0) / 100))
                      ).toFixed(2)}
                    </td>
                    <td>
                      <button className="remove-btn" onClick={() => handleRemove(item.id)}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
                {cart.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 18 }}>Cart is empty</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="cart-summary">
              <p>Subtotal: ₹{subtotal.toFixed(2)}</p>
              <p>Tax Total: ₹{taxTotal.toFixed(2)}</p>
              <p>Discount ({discount}%): -₹{discountTotal.toFixed(2)}</p>
              <h3>Total: ₹{total.toFixed(2)}</h3>
            </div>

            {/* Payment controls */}
            <div className="discount-payment" style={{ display: "flex", gap: 12, alignItems: "flex-end", marginTop: 12 }}>
              <div className="discount-block">
                <label>Discount (%)</label>
                <input type="number" placeholder="Enter discount " value={discount} onChange={(e) => setDiscount(Number(e.target.value || 0))} />
              </div>

              <div>
                <label>Payment Mode</label>
                <select value={paymentMode} onChange={(e) => setPaymentMode(String(e.target.value).toUpperCase())}>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>
            </div>

            {/* UPI */}
            {paymentMode === "UPI" && (
              <div className="payment-card" style={{ marginTop: 12 }}>
                <div className="payment-card-head"><QrCode size={16} /> <strong>UPI Payment</strong></div>

                <div className="form-row">
                  <label>UPI ID (VPA)</label>
                  <input type="text" placeholder="example@bank" value={upiId} onChange={(e) => { setUpiId(e.target.value); setUpiError(""); }} />
                  {upiError && <div className="field-error">{upiError}</div>}
                </div>

                <div className="upi-qr" style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 8 }}>
                  <div>
                    <div className="muted">Scan to pay</div>
                    <div className="big-amount">₹{total.toFixed(2)}</div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    {!upiPayloadString && <div className="muted">Enter a valid UPI ID to generate QR</div>}
                    {upiPayloadString && !validateUpi(upiId) && <div className="field-error">Invalid UPI ID format — example@bank</div>}
                    {upiPayloadString && validateUpi(upiId) && (
                      <>
                        <img alt="UPI QR" src={upiQrSrc} className="qr-image" onError={() => setUpiRefreshKey((k) => k + 1)} />
                        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                          <button className="btn btn-ghost" onClick={() => { navigator.clipboard?.writeText(upiPayloadString)?.then(() => alert("UPI link copied"))?.catch(() => alert("Copy failed")); }}>
                            Copy link
                          </button>
                          <a className="btn btn-primary" href={upiPayloadString} target="_blank" rel="noreferrer">Open</a>
                          <button className="btn" onClick={() => setUpiRefreshKey((k) => k + 1)} title="Refresh QR">Refresh</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Card */}
            {paymentMode === "CARD" && (
              <div className="payment-card" style={{ marginTop: 12 }}>
                <div className="payment-card-head"><CreditCard size={16} /> <strong>Card Payment</strong></div>

                <div className="form-row">
                  <label>Card Number</label>
                  <input type="text" placeholder="XXXX XXXX XXXX 1234" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label>Card Holder</label>
                    <input type="text" placeholder="Name on card" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} />
                  </div>
                  <div style={{ width: 140 }}>
                    <label>Expiry (MM/YY or MM/YYYY)</label>
                    <input type="text" placeholder="MM/YY" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} />
                  </div>
                </div>

                {cardError && <div className="field-error">{cardError}</div>}

                <div className="card-preview" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                  <div className="card-preview-block">
                    <div className="card-preview-name">{cardHolder || "Card Holder"}</div>
                    <div className="card-preview-num">{maskCard(cardNumber) || "XXXX XXXX XXXX XXXX"}</div>
                    <div className="card-preview-exp">{cardExpiry || "MM/YY"}</div>
                  </div>
                  <div className="big-amount">₹{total.toFixed(2)}</div>
                </div>
              </div>
            )}

            <div className="cart-actions" style={{ marginTop: 16 }}>
              <button className="cancel-btn" onClick={handleCancel} disabled={loadingFinalize}>Cancel</button>
              <button className="finalize-btn" onClick={handleFinalizeSale} disabled={loadingFinalize}>
                {loadingFinalize ? "Processing…" : "Finalize Sale"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
