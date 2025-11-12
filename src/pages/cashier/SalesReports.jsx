// src/pages/cashier/SalesReports.jsx
import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import SalesService from "../../services/SalesService";
import "../../styles.css";

/**
 * SalesReports
 * - Fetches sales with SalesService.getSales({ page, size })
 * - Shows loading / error states and simple pagination
 * - Tolerant parsing of different API shapes
 */

export default function SalesReports() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [size] = useState(25); // page size
  const [totalPages, setTotalPages] = useState(null);
  const [totalElements, setTotalElements] = useState(null);

  useEffect(() => {
    loadSales(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function loadSales(pageIndex = 0) {
    setLoading(true);
    setError("");
    try {
      const resp = await SalesService.getSales({ page: pageIndex, size });

      // normalize response into array `list` and optional paging metadata
      let list = [];

      if (Array.isArray(resp)) {
        list = resp;
      } else if (Array.isArray(resp?.content)) {
        list = resp.content;
        setTotalPages(Number.isFinite(resp.totalPages) ? resp.totalPages : null);
        setTotalElements(Number.isFinite(resp.totalElements) ? resp.totalElements : null);
      } else if (Array.isArray(resp?.data?.content)) {
        list = resp.data.content;
        setTotalPages(Number.isFinite(resp.data.totalPages) ? resp.data.totalPages : null);
        setTotalElements(Number.isFinite(resp.data.totalElements) ? resp.data.totalElements : null);
      } else if (Array.isArray(resp?.data)) {
        list = resp.data;
      } else {
        // fallback: try to find first array somewhere in the response object
        const possible = Object.values(resp || {}).find((v) => Array.isArray(v));
        if (Array.isArray(possible)) list = possible;
      }

      setSales(list || []);
    } catch (err) {
      console.error("Failed to load sales:", err);
      setError(err?.message || (err?.msg ?? "Failed to load sales"));
      setSales([]);
    } finally {
      setLoading(false);
    }
  }

  const goPrev = () => setPage((p) => Math.max(0, p - 1));
  const goNext = () => {
    if (totalPages == null) setPage((p) => p + 1);
    else setPage((p) => Math.min(totalPages - 1, p + 1));
  };

  const formatDate = (d) => {
    if (!d) return "-";
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString();
    } catch {
      return String(d);
    }
  };

  return (
    <div className="dashboard-page">
      <Sidebar />
      <main className="dashboard-main">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h1 className="page-title">Sales List</h1>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn btn-ghost" onClick={() => loadSales(page)} disabled={loading}>
              Refresh
            </button>
            <div style={{ fontSize: 13, color: "#666" }}>
              {totalElements != null ? `${totalElements} sales` : `${sales.length} shown`}
            </div>
          </div>
        </div>

        <div className="table-card" style={{ marginTop: 12 }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center" }}>Loading sales…</div>
          ) : error ? (
            <div style={{ padding: 24, color: "var(--danger, #b00020)" }}>Error: {error}</div>
          ) : sales.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center" }}>No sales found.</div>
          ) : (
            <div className="table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>DATE</th>
                    <th>CASHIER</th>
                    <th>ITEMS</th>
                    <th>NET AMOUNT</th>
                    <th>TAX</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => {
                    // normalize fields step-by-step to avoid mixing ?? with || or &&
                    const id = s.id ?? s.saleId ?? s.reference ?? "—";
                    const date = formatDate(s.date ?? s.createdAt ?? s.created_at);

                    // compute cashier safely
                    let cashier = "-";
                    if (s.cashierName) cashier = s.cashierName;
                    else if (s.cashier) cashier = s.cashier;
                    else if (s.createdBy) cashier = s.createdBy.name || s.createdBy.username || "-";

                    // items: if s.items is array use its length, otherwise prefer itemsCount then s.items, fallback to "-"
                    const items = Array.isArray(s.items) ? s.items.length : ((s.itemsCount ?? s.items) || "-");

                    // amounts: display currency-friendly strings (adjust currency symbol as needed)
                    const net = typeof s.net === "number" ? `₹${s.net.toFixed(2)}` : (s.net ?? s.total ?? "-");
                    const tax = typeof s.tax === "number" ? `₹${s.tax.toFixed(2)}` : (s.tax ?? "-");

                    return (
                      <tr key={id}>
                        <td>{id}</td>
                        <td>{date}</td>
                        <td>{cashier}</td>
                        <td>{items}</td>
                        <td>{net}</td>
                        <td>{tax}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination controls */}
        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={goPrev} disabled={loading || page <= 0}>
              Previous
            </button>
            <button
              className="btn"
              onClick={goNext}
              disabled={loading || (totalPages != null && page >= totalPages - 1)}
            >
              Next
            </button>
          </div>

          <div style={{ color: "#666", fontSize: 13 }}>
            Page {page + 1}
            {totalPages != null ? ` of ${totalPages}` : ""}
          </div>
        </div>
      </main>
    </div>
  );
}
