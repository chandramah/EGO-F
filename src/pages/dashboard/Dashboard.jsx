// src/pages/dashboard/Dashboard.jsx
import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import AdminPanel from "../../components/AdminPanel";
import SalesService from "../../services/SalesService";
import { getLowStocks } from "../../services/LowStock";
import "../../pages/dashboard/dashboard.css";

/**
 * Simplified Dashboard
 * - Only shows KPI cards (Gross, Net, Tax, Discounts, Transactions)
 * - Shows Low Stock Products table with headings:
 *   Product ID | SKU | Product Name | Available Quantity | Reorder Level
 * - Single Refresh button to reload both KPIs and low-stock
 * - Defensive parsing of API response shapes
 */

function formatCurrency(v) {
  if (v == null) return "₹0.00";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return `₹${n.toFixed(2)}`;
}

function formatCurrencyTotal(v) {
  if (v == null) return "0.00%";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return `${n.toFixed(2)}%`;
}

function normalizePageResponse(raw, defaultSize = 1000) {
  if (!raw) return { content: [], page: 0, size: defaultSize, totalElements: 0, totalPages: 0 };
  const body = raw?.data ?? raw;

  if (!body) return { content: [], page: 0, size: defaultSize, totalElements: 0, totalPages: 0 };

  if (body?.data && Array.isArray(body.data.content)) {
    const d = body.data;
    return {
      content: d.content || [],
      page: Number.isFinite(Number(d.page)) ? d.page : 0,
      size: Number.isFinite(Number(d.size)) ? d.size : defaultSize,
      totalElements: Number.isFinite(Number(d.totalElements)) ? d.totalElements : (Array.isArray(d.content) ? d.content.length : 0),
      totalPages: Number.isFinite(Number(d.totalPages)) ? d.totalPages : 1,
    };
  }

  if (Array.isArray(body.content)) {
    return {
      content: body.content,
      page: Number.isFinite(Number(body.page)) ? body.page : 0,
      size: Number.isFinite(Number(body.size)) ? body.size : defaultSize,
      totalElements: Number.isFinite(Number(body.totalElements)) ? body.totalElements : (Array.isArray(body.content) ? body.content.length : 0),
      totalPages: Number.isFinite(Number(body.totalPages)) ? body.totalPages : 1,
    };
  }

  if (Array.isArray(body)) {
    const total = body.length;
    const size = defaultSize;
    const totalPages = Math.max(1, Math.ceil(total / size));
    return { content: body.slice(0, size), page: 0, size, totalElements: total, totalPages };
  }

  // find first array in object
  for (const k of Object.keys(body)) {
    if (Array.isArray(body[k])) {
      const arr = body[k];
      const size = defaultSize;
      return { content: arr.slice(0, size), page: 0, size, totalElements: arr.length, totalPages: Math.max(1, Math.ceil(arr.length / size)) };
    }
  }

  return { content: [], page: 0, size: defaultSize, totalElements: 0, totalPages: 0 };
}

function normalizeArrayResponse(raw) {
  if (!raw) return [];
  const body = raw?.data ?? raw;
  if (!body) return [];
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.data)) return body.data;
  if (Array.isArray(body.content)) return body.content;
  if (Array.isArray(body.items)) return body.items;
  for (const k of Object.keys(body)) if (Array.isArray(body[k])) return body[k];
  return [];
}

export default function Dashboard() {
  // KPI state
  const [kpis, setKpis] = useState({ gross: 0, net: 0, tax: 0, discounts: 0, transactions: 0 });
  const [loadingKpis, setLoadingKpis] = useState(false);
  const [kpiError, setKpiError] = useState("");

  // Low stock state
  const [lowStock, setLowStock] = useState([]);
  const [loadingLowStock, setLoadingLowStock] = useState(false);
  const [lowStockError, setLowStockError] = useState("");

  // fetch and aggregate sales into KPIs
  const fetchKPIs = async () => {
    setLoadingKpis(true);
    setKpiError("");
    try {
      // fetch many records to compute KPIs
      const raw = await SalesService.getSales(0, 1000);
      const pageResp = normalizePageResponse(raw, 1000);
      const list = Array.isArray(pageResp.content) ? pageResp.content : [];

      let gross = 0, net = 0, tax = 0, discounts = 0;
      for (let i = 0; i < list.length; i++) {
        const s = list[i] ?? {};
        const total = Number(s.total ?? 0) || 0;
        const taxTotal = Number(s.taxTotal ?? 0) || 0;
        const discountTotal = Number(s.discountTotal ?? 0) || 0;

        net += total;
        tax += taxTotal;
        discounts += discountTotal;
        gross += (total - taxTotal + discountTotal);
      }

      setKpis({
        gross: Number(gross.toFixed(2)),
        net: Number(net.toFixed(2)),
        tax: Number(tax.toFixed(2)),
        discounts: Number(discounts.toFixed(2)),
        transactions: list.length,
      });
    } catch (err) {
      console.error("fetchKPIs error:", err);
      setKpiError("Failed to load KPI data.");
      setKpis({ gross: 0, net: 0, tax: 0, discounts: 0, transactions: 0 });
    } finally {
      setLoadingKpis(false);
    }
  };

  // fetch low-stock items
  const fetchLowStock = async () => {
    setLoadingLowStock(true);
    setLowStockError("");
    try {
      const raw = await getLowStocks();
      const arr = normalizeArrayResponse(raw);
      setLowStock(arr);
      if (!arr || arr.length === 0) {
        setLowStockError("No low-stock items found.");
      }
    } catch (err) {
      console.error("fetchLowStock error:", err);
      setLowStock([]);
      setLowStockError("Failed to load low-stock items.");
    } finally {
      setLoadingLowStock(false);
    }
  };

  // initial load
  useEffect(() => {
    fetchKPIs();
    fetchLowStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshAll = () => {
    fetchKPIs();
    fetchLowStock();
  };

  return (
    <div className="dashboard-page">
      <Sidebar />

      <div className="dashboard-main">
        <div className="page-title">Dashboard</div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={refreshAll} disabled={loadingKpis || loadingLowStock}>
              {loadingKpis || loadingLowStock ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="kpi-cards">
          <div className="kpi-card">
            <div className="kpi-title">Gross (subtotal)</div>
            <div className="kpi-value">{loadingKpis ? "…" : formatCurrency(kpis.gross)}</div>
            <div className="kpi-sub">{kpiError ? kpiError : `${kpis.transactions} txns`}</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-title">Net (total)</div>
            <div className="kpi-value">{loadingKpis ? "…" : formatCurrency(kpis.net)}</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-title">Tax</div>
            <div className="kpi-value">{loadingKpis ? "…" : formatCurrencyTotal(kpis.tax)}</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-title">Discounts</div>
            <div className="kpi-value">{loadingKpis ? "…" : formatCurrencyTotal(kpis.discounts)}</div>
          </div>
        </div>

        {/* Low Stock table */}
        <div className="table-card" style={{ marginTop: 18 }}>
          <h3 className="section-title">Low Stock Products</h3>

          <div className="table-wrap">
            {loadingLowStock ? (
              <div style={{ padding: 18 }}>Loading low stock products…</div>
            ) : lowStock.length === 0 ? (
              <div style={{ padding: 18, color: "#6b7280" }}>{lowStockError || "No low-stock products."}</div>
            ) : (
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Product ID</th>
                    <th>SKU</th>
                    <th>Product Name</th>
                    <th style={{ textAlign: "right" }}>Available Quantity</th>
                    <th style={{ textAlign: "right" }}>Reorder Level</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((p) => {
                    const avail = Number.isFinite(Number(p.availableQty)) ? Number(p.availableQty) : p.availableQty ?? "-";
                    const reorder = Number.isFinite(Number(p.reorderLevel)) ? Number(p.reorderLevel) : p.reorderLevel ?? "-";
                    const critical = typeof avail === "number" && typeof reorder === "number" && avail <= reorder;
                    return (
                      <tr key={p.productId ?? `${p.sku}-${p.name}`} style={critical ? { background: "rgba(255,235,238,0.9)" } : undefined}>
                        <td>{p.productId ?? "-"}</td>
                        <td>{p.sku ?? "-"}</td>
                        <td>{p.name ?? "-"}</td>
                        <td style={{ textAlign: "right", fontWeight: critical ? 700 : 500, color: critical ? "#b91c1c" : undefined }}>{avail}</td>
                        <td style={{ textAlign: "right" }}>{reorder}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <AdminPanel />
    </div>
  );
}
