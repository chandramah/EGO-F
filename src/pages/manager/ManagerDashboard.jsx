// src/pages/manager/ManagerDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import "../../styles/ManagerDashboard.css";
import { NavLink } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";
import Sidebar from "../../components/Sidebar";
import { API_BASE } from "../../services/Api";

/**
 * ManagerDashboard
 * - Fixes pending orders counting (case / field tolerant)
 * - Renders recent purchase orders in a paginated table (3 rows per page)
 * - Defensive about API response shapes and logs unexpected payloads
 */

const PAGE_SIZE = 3; // <-- 3 rows per page for recent orders

const ManagerDashboard = () => {
  const [suppliersCount, setSuppliersCount] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [lowStockItems, setLowStockItems] = useState(0);
  const [recentOrdersRaw, setRecentOrdersRaw] = useState([]); // raw array (sorted)
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // pagination state for recent orders
  const [page, setPage] = useState(0);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboardData = async () => {
    setError(null);
    setLoading(true);
    try {
      // fetch several bits in parallel, but be defensive with shapes
      const [supRes, poRes, lowRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/suppliers`, { headers: { Authorization: `Bearer ${Cookies.get("sr_token")}` } }),
        // fetch a reasonably large page of purchase orders and we'll sort/paginate client-side
        axios.get(`${API_BASE}/purchase-orders?page=0&size=100`, { headers: { Authorization: `Bearer ${Cookies.get("sr_token")}` } }),
        axios.get(`${API_BASE}/reports/low-stock`, { headers: { Authorization: `Bearer ${Cookies.get("sr_token")}` } }),
      ]);

      // suppliers count
      if (supRes.status === "fulfilled") {
        const supPayload = supRes.value?.data ?? supRes.value;
        const supList = supPayload?.data ?? supPayload ?? [];
        setSuppliersCount(Array.isArray(supList) ? supList.length : 0);
      } else {
        console.warn("fetch suppliers failed:", supRes.reason);
        setSuppliersCount(0);
      }

      // purchase orders (we'll compute pending & recent)
      if (poRes.status === "fulfilled") {
        const poPayload = poRes.value?.data ?? poRes.value;
        // try common shapes: { data: { content: [...] } } OR { data: [...] } OR [...]
        let allOrders = [];
        if (Array.isArray(poPayload?.data)) {
          allOrders = poPayload.data;
        } else if (Array.isArray(poPayload?.data?.content)) {
          allOrders = poPayload.data.content;
        } else if (Array.isArray(poPayload?.content)) {
          allOrders = poPayload.content;
        } else if (Array.isArray(poPayload)) {
          allOrders = poPayload;
        } else {
          // fallback: try to read value.data, value.content
          allOrders = poPayload?.data ?? poPayload?.content ?? [];
          if (!Array.isArray(allOrders)) allOrders = [];
        }

        // compute pending orders count (tolerant to different field names / casing)
        const isPendingStatus = (o) => {
          if (!o) return false;
          const status =
            (o.status ?? o.orderStatus ?? o.state ?? "").toString().trim().toLowerCase();
          // consider these as pending
          return ["pending", "created", "awaiting", "open"].includes(status);
        };
        const pending = allOrders.filter(isPendingStatus).length;
        setPendingOrdersCount(pending);

        // prepare recent orders: sort by expectedDate / createdAt / orderDate (desc)
        const getDateForOrder = (o) => {
          const d =
            o.expectedDate ??
            o.orderDate ??
            o.createdAt ??
            o.createdAtDate ??
            o.date ??
            null;
          return d ? new Date(d) : null;
        };

        const normalized = allOrders
          .map((o) => ({
            id: o.id ?? o._id ?? o.orderId ?? o.poNumber ?? Math.random().toString(36).slice(2, 9),
            poNumber: o.poNumber ?? o.orderNumber ?? o.number ?? "N/A",
            supplierName: (o.supplier && (o.supplier.name ?? o.supplierName)) || o.supplierName || o.supplier?.name || "N/A",
            expectedDate: (() => {
              const dt = getDateForOrder(o);
              return dt ? dt.toISOString() : null;
            })(),
            status: (o.status ?? o.orderStatus ?? o.state ?? "Pending"),
            raw: o,
          }))
          .sort((a, b) => {
            const da = a.expectedDate ? new Date(a.expectedDate).getTime() : 0;
            const db = b.expectedDate ? new Date(b.expectedDate).getTime() : 0;
            return db - da; // newest first
          });

        setRecentOrdersRaw(normalized);
        setPage(0);
      } else {
        console.warn("fetch purchase-orders failed:", poRes.reason);
        setRecentOrdersRaw([]);
        setPendingOrdersCount(0);
      }

      // low stock items
      if (lowRes.status === "fulfilled") {
        const lowPayload = lowRes.value?.data ?? lowRes.value;
        const lowList = lowPayload?.data ?? lowPayload ?? [];
        setLowStockItems(Array.isArray(lowList) ? lowList.length : 0);
      } else {
        console.warn("fetch low stock failed:", lowRes.reason);
        setLowStockItems(0);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError("Failed to load data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // pagination derived values for recent orders
  const total = recentOrdersRaw.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(0, page), Math.max(0, totalPages - 1));
  const startIdx = safePage * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, total);
  const pageItems = recentOrdersRaw.slice(startIdx, endIdx);

  const handlePrev = () => setPage((p) => Math.max(0, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages - 1, p + 1));
  const goToPage = (p) => setPage(Math.min(Math.max(0, p), totalPages - 1));

  // small helper for pretty date
  const formatDate = (iso) => {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      return d.toISOString().split("T")[0];
    } catch {
      return String(iso);
    }
  };

  return (
    <div className="manager-dashboard">
      <Sidebar />

      <div className="main-content">
        <header className="navbar">
          <h1>Manager Dashboard</h1>
          <div className="user-icon">🔔</div>
        </header>

        {error && <p className="error-message">{error}</p>}

        <section className="kpi-cards">
          <div className="kpi-card">
            <h3>Total Suppliers</h3>
            <p>{suppliersCount}</p>
          </div>

          <div className="kpi-card">
            <h3>Pending Orders</h3>
            <p>{pendingOrdersCount}</p>
          </div>

          <div className="kpi-card">
            <h3>Low Stock Items</h3>
            <p>{lowStockItems}</p>
          </div>
        </section>

        <section className="table-section">
          <h2>Recent Purchase Orders</h2>

          {total === 0 && !loading ? (
            <p style={{ textAlign: "center" }}>No purchase orders found.</p>
          ) : (
            <>
              <table className="recent-orders-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 8 }}>S.No</th>
                    <th style={{ textAlign: "left", padding: 8 }}>Order ID</th>
                    <th style={{ textAlign: "left", padding: 8 }}>Supplier</th>
                    <th style={{ textAlign: "left", padding: 8 }}>Date</th>
                    <th style={{ textAlign: "left", padding: 8 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((order, idx) => (
                    <tr key={order.id}>
                      <td style={{ padding: 8 }}>{startIdx + idx + 1}</td>
                      <td style={{ padding: 8 }}>{order.poNumber}</td>
                      <td style={{ padding: 8 }}>{order.supplierName}</td>
                      <td style={{ padding: 8 }}>{formatDate(order.expectedDate)}</td>
                      <td style={{ padding: 8 }}>
                        <span className={`status ${String(order.status).toLowerCase()}`.replace(/\s+/g, "-")}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* pagination controls for recent orders */}
              {total > PAGE_SIZE && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                  <div className="results">
                    Showing {total === 0 ? 0 : startIdx + 1} to {endIdx} of {total} results
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={handlePrev} disabled={safePage === 0} className="btn">
                      Prev
                    </button>

                    <div style={{ display: "flex", gap: 6 }}>
                      {Array.from({ length: totalPages }).map((_, i) => {
                        // show limited range when many pages
                        if (totalPages > 7) {
                          const start = Math.max(0, safePage - 3);
                          const end = Math.min(totalPages, start + 7);
                          if (i < start || i >= end) return null;
                        }
                        return (
                          <button
                            key={i}
                            onClick={() => goToPage(i)}
                            className={`btn ${i === safePage ? "active" : ""}`}
                            style={{
                              minWidth: 36,
                              padding: "6px 8px",
                              borderRadius: 4,
                              background: i === safePage ? "#1565c0" : undefined,
                              color: i === safePage ? "#fff" : undefined,
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            {i + 1}
                          </button>
                        );
                      })}
                    </div>

                    <button onClick={handleNext} disabled={safePage >= totalPages - 1} className="btn">
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default ManagerDashboard;
