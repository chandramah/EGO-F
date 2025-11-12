// src/pages/sales/SalesList.jsx
import React, { useEffect, useState, useCallback } from "react";
import SalesService from "../../services/SalesService";
import Sidebar from "../../components/Sidebar";
import "../../styles.css";

/**
 * SalesList with centered modal:
 * - backdrop is more transparent so outside looks light/transparent
 * - modal uses slightly translucent background
 * - "Print" button prints the sale details (opens a print window and calls print)
 */

export default function SalesList() {
  const PAGE_SIZE = 6;
  const [page, setPage] = useState(0);
  const [resp, setResp] = useState({
    content: [],
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const normalizePageResponse = (raw) => {
    if (!raw) {
      return { content: [], page: 0, size: PAGE_SIZE, totalElements: 0, totalPages: 0 };
    }
    const body = raw?.data ?? raw;

    if (body && body.data && Array.isArray(body.data.content)) {
      const d = body.data;
      return {
        content: Array.isArray(d.content) ? d.content : [],
        page: Number.isFinite(Number(d.page)) ? d.page : 0,
        size: Number.isFinite(Number(d.size)) ? d.size : PAGE_SIZE,
        totalElements: Number.isFinite(Number(d.totalElements)) ? d.totalElements : (Array.isArray(d.content) ? d.content.length : 0),
        totalPages: Number.isFinite(Number(d.totalPages)) ? d.totalPages : 1,
      };
    }

    if (body && Array.isArray(body.content)) {
      return {
        content: body.content,
        page: Number.isFinite(Number(body.page)) ? body.page : 0,
        size: Number.isFinite(Number(body.size)) ? body.size : PAGE_SIZE,
        totalElements: Number.isFinite(Number(body.totalElements)) ? body.totalElements : (Array.isArray(body.content) ? body.content.length : 0),
        totalPages: Number.isFinite(Number(body.totalPages)) ? body.totalPages : 1,
      };
    }

    if (Array.isArray(body)) {
      const total = body.length;
      const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      const startIndex = 0;
      const pageContent = body.slice(startIndex, startIndex + PAGE_SIZE);
      return {
        content: pageContent,
        page: 0,
        size: PAGE_SIZE,
        totalElements: total,
        totalPages,
      };
    }

    return { content: [], page: 0, size: PAGE_SIZE, totalElements: 0, totalPages: 0 };
  };

  const load = async (p = 0) => {
    setLoading(true);
    setError("");
    try {
      const data = await SalesService.getSales(p, PAGE_SIZE);
      const pageResp = normalizePageResponse(data);
      setResp(pageResp);
      setPage(pageResp.page ?? p);
    } catch (err) {
      console.error("getSales error", err);
      setError("Failed to load sales.");
      setResp({ content: [], page: p, size: PAGE_SIZE, totalElements: 0, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape" && selectedSale) {
      setSelectedSale(null);
    }
  }, [selectedSale]);

  useEffect(() => {
    if (selectedSale) {
      window.addEventListener("keydown", handleKeyDown);
    } else {
      window.removeEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedSale, handleKeyDown]);

  const openDetails = async (id) => {
    setDetailsLoading(true);
    try {
      const raw = await SalesService.getSaleById(id);
      const body = raw?.data ?? raw;
      const sale = (body && body.data) ? body.data : body;
      setSelectedSale(sale);
    } catch (err) {
      console.error("getSaleById", err);
      setSelectedSale(null);
      alert("Failed to load sale details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => setSelectedSale(null);

  const formatCurrency = (v) => {
    if (v == null) return "-";
    const n = Number(v);
    if (Number.isNaN(n)) return String(v);
    return `₹${n.toFixed(2)}`;
  };
  const formatCurrencyTotal = (v) => {
    if (v == null) return "-";
    const n = Number(v);
    if (Number.isNaN(n)) return String(v);
    return `${n.toFixed(2)}%`;
  };

  const formatDate = (d) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleString();
    } catch {
      return String(d);
    }
  };

  const start = resp.totalElements === 0 ? 0 : (resp.page * resp.size) + 1;
  const end = Math.min((resp.page + 1) * resp.size, resp.totalElements);

  // Build printable HTML and open print window
  const handlePrint = () => {
    if (!selectedSale) return;
    const sale = selectedSale;
    const items = Array.isArray(sale.items) ? sale.items : [];

    // Basic inline styles for print (keeps it minimal)
    const styles = `
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; color: #111; padding: 18px; }
        h1,h2,h3 { margin: 0 0 8px 0; }
        .meta { margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #e6e6e6; padding: 8px 6px; text-align: left; }
        th { background: #f7fbff; }
        .totals { margin-top: 12px; font-weight: 700; }
        .right { text-align: right; }
        @media print {
          body { -webkit-print-color-adjust: exact; }
        }
      </style>
    `;

    const rowsHtml = items.map(it => `
      <tr>
        <td>${(it.productName ?? it.name ?? it.productId ?? "")}</td>
        <td style="text-align:center;">${(it.quantity ?? it.qty ?? 0)}</td>
        <td class="right">${formatCurrency(it.unitPrice ?? it.price ?? 0)}</td>
        <td class="right">${Number(it.taxRate ?? 0).toFixed(2)}%</td>
      </tr>
    `).join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Sale #${sale.id} - Print</title>
          ${styles}
        </head>
        <body>
          <h1>Smart Retails</h1>
          <h2>Sale #${sale.id}</h2>
          <div class="meta">
            <div><strong>Date:</strong> ${formatDate(sale.createdAt)}</div>
            <div><strong>Cashier ID:</strong> ${sale.cashierId ?? "-"}</div>
            <div><strong>Payment:</strong> ${(sale.paymentMode || "").toUpperCase()}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Unit</th>
                <th style="text-align:right;">Tax%</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="totals">
            <div>Subtotal: ${formatCurrency(sale.total ? (Number(sale.total) - Number(sale.taxTotal || 0) + Number(sale.discountTotal || 0)) : 0)}</div>
            <div>Tax: ${formatCurrency(sale.taxTotal)}</div>
            <div>Discount: ${formatCurrency(sale.discountTotal)}</div>
            <div style="margin-top:8px; font-size: 18px;">Total: ${formatCurrency(sale.total)}</div>
          </div>
        </body>
      </html>
    `;

    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) {
      alert("Unable to open print window (popup blocked). Please allow popups for this site to print.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    // wait a short moment for resources to render then print
    w.focus();
    setTimeout(() => {
      try {
        w.print();
        // optionally close window after print (comment out if you want user to keep it)
        // w.close();
      } catch (e) {
        console.warn("Print failed", e);
      }
    }, 400);
  };

  return (
    <div className="dashboard-page">
      <Sidebar />
      <main className="dashboard-main">
        <h1 className="page-title">Sales</h1>

        <div className="table-card">
          {loading ? (
            <div style={{ padding: 20 }}>Loading…</div>
          ) : error ? (
            <div style={{ padding: 20, color: "crimson" }}>{error}</div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table className="dash-table" style={{ minWidth: 900 }}>
                  <thead>
                    <tr>
                     
                      <th>Cashier ID</th>
                      <th>Date</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Tax</th>
                      <th>Discount</th>
                      <th>Payment</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resp.content && resp.content.length ? (
                      resp.content.map((s) => {
                        const itemsCount = Array.isArray(s.items) ? s.items.length : s.itemsCount ?? 0;
                        return (
                          <tr key={s.id}>
                            
                            <td>{s.cashierId ?? "-"}</td>
                            <td>{formatDate(s.createdAt)}</td>
                            <td>{itemsCount}</td>
                            <td>{formatCurrency(s.total)}</td>
                            <td>{formatCurrency(s.taxTotal)}</td>
                            <td>{formatCurrency(s.discountTotal)}</td>
                            <td>{(s.paymentMode || "").toUpperCase()}</td>
                            <td style={{ textAlign: "right",}}>
                              <button onClick={() => openDetails(s.id)} className="btn btn-small">Details</button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} style={{ textAlign: "center", padding: 24 }}>No sales found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="card-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="results">Showing {start} to {end} of {resp.totalElements} results</div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    className="btn"
                    onClick={() => { if (resp.page > 0) { load(resp.page - 1); } }}
                    disabled={resp.page === 0}
                  >
                    Prev
                  </button>
                  <button
                    className="btn"
                    onClick={() => { if (resp.page + 1 < (resp.totalPages || 1)) { load(resp.page + 1); } }}
                    disabled={resp.page + 1 >= (resp.totalPages || 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Centered Details Modal */}
        {selectedSale && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sale-details-title"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1400,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              // lighter, more transparent backdrop to show page behind
              background: "rgba(15, 23, 42, 0.15)",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) closeDetails();
            }}
          >
            <div
              style={{
                width: "min(700px, 80%)",
                maxHeight: "90vh",
                overflowY: "auto",
                // slightly translucent modal background
                background: "rgba(255, 255, 255, 0.94)",
                borderRadius: 10,
                padding: 20,
                boxShadow: "0 8px 30px rgba(2,6,23,0.12)",
                border: "4px solid rgba(21,101,192,0.10)", // soft light-blue boundary
                position: "relative",
                backdropFilter: "saturate(120%) blur(2px)", // slight blur behind modal (supported browsers)
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <h3 id="sale-details-title" style={{ margin: 0 }}>Sale #{selectedSale.id}</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-outline" onClick={handlePrint} aria-label="Print details">Print</button>
                  <button className="btn btn-ghost" onClick={closeDetails} aria-label="Close details">Close</button>
                </div>
              </div>

              {detailsLoading ? (
                <div style={{ padding: 12 }}>Loading…</div>
              ) : (
                <>
                  <div style={{ marginTop: 12, display: "flex", gap: 18, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 200 }}>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>Date</div>
                      <div style={{ fontWeight: 600 }}>{formatDate(selectedSale.createdAt)}</div>
                    </div>
                    <div style={{ minWidth: 160 }}>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>Cashier</div>
                      <div style={{ fontWeight: 600 }}>{selectedSale.cashierId ?? "-"}</div>
                    </div>
                    <div style={{ minWidth: 160 }}>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>Payment</div>
                      <div style={{ fontWeight: 600 }}>{(selectedSale.paymentMode || "").toUpperCase()}</div>
                    </div>
                    <div style={{ minWidth: 160 }}>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>Items</div>
                      <div style={{ fontWeight: 600 }}>{Array.isArray(selectedSale.items) ? selectedSale.items.length : "-"}</div>
                    </div>
                  </div>

                  <h4 style={{ marginTop: 18 }}>Items</h4>
                  <div style={{ overflowX: "auto", borderRadius: 8 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                      <thead>
                        <tr style={{ textAlign: "left", color: "#6b7280" }}>
                          <th style={{ padding: "8px 6px" }}>Product</th>
                          <th style={{ padding: "8px 6px", textAlign: "center" }}>Qty</th>
                          <th style={{ padding: "8px 6px", textAlign: "right" }}>Unit</th>
                          <th style={{ padding: "8px 6px", textAlign: "right" }}>Tax%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedSale.items || []).map((it, i) => (
                          <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px 6px" }}>{it.productName ?? it.name ?? it.productId}</td>
                            <td style={{ padding: "10px 6px", textAlign: "center" }}>{it.quantity ?? it.qty}</td>
                            <td style={{ padding: "10px 6px", textAlign: "right" }}>{formatCurrency(it.unitPrice ?? it.price ?? 0)}</td>
                            <td style={{ padding: "10px 6px", textAlign: "right" }}>{Number(it.taxRate ?? 0).toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: 16, borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
                    <div style={{ display: "inline", gap: 12,  }}>
                      <div><strong>Subtotal:</strong> {formatCurrency(selectedSale.total ? (Number(selectedSale.total) - Number(selectedSale.taxTotal || 0) + Number(selectedSale.discountTotal || 0)) : 0)}</div>
                      <div><strong>Tax:</strong> {formatCurrency(selectedSale.taxTotal)}</div>
                      <div><strong>Discount:</strong> {formatCurrencyTotal(selectedSale.discountTotal)}</div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}><strong>Total:</strong> {formatCurrency(selectedSale.total)}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
