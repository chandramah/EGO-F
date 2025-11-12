// src/pages/CashierDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import "../../styles/CashierDashboard.css";
import "../../styles/SalePOS.css";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";
import Sidebar from "../../components/Sidebar";
import { API_BASE } from "../../services/Api";

/**
 * Cashier Dashboard
 * - today's sales pulled from /reports/sales (robust parsing)
 * - recent transactions table (last 2 days) with pagination (2 rows/page)
 * - top products table with pagination (3 rows/page)
 */

const TX_PAGE_SIZE = 2; // pagination for recent transactions
const PROD_PAGE_SIZE = 3; // pagination for top products

// helper to format currency
const formatCurrency = (v) => {
  const n = Number(v ?? 0);
  if (Number.isNaN(n)) return String(v);
  return `₹${n.toFixed(2)}`;
};

// Safe extraction when reports endpoint returns different shapes
const extractReportPayload = (res) => {
  const envelope = res?.data ?? res;
  // many backends return { data: { ... } }
  if (envelope && envelope.data !== undefined) return envelope.data;
  return envelope;
};

// If payload is an array of transactions, compute totals
const computeTotalsFromTxList = (txs) => {
  const list = Array.isArray(txs) ? txs : [];
  const totalSales = list.reduce((s, t) => {
    const value = Number(t?.amount ?? t?.total ?? t?.grandTotal ?? t?.gross ?? t?.totalAmount ?? 0);
    return s + (Number.isNaN(value) ? 0 : value);
  }, 0);
  return { totalSales, transactions: list };
};

const normalizeTransaction = (t) => {
  if (!t) return null;
  const id = t.id ?? t.transactionId ?? t.txId ?? t.saleId ?? "-";
  const date = t.date ?? t.transactionDate ?? t.createdAt ?? t.timestamp ?? t.saleDate ?? null;
  const amount = Number(t.amount ?? t.total ?? t.grandTotal ?? t.gross ?? 0) || 0;
  const status = t.status ?? (t.completed ? "Completed" : "Pending") ?? "N/A";
  return { id, date, amount, status, raw: t };
};

const normalizeProduct = (p) => {
  if (!p) return null;
  return {
    id: p.id ?? p.productId ?? p._id ?? null,
    name: p.name ?? p.productName ?? "Unknown",
    unitPrice: Number(p.unitPrice ?? p.price ?? p.sellingPrice ?? 0) || 0,
    taxRate: p.taxRate ?? p.tax ?? null,
   

  };
};

export default function CashierDashboard() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);

  const [dailySales, setDailySales] = useState(0);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [error, setError] = useState(null);

  // pagination state
  const [txPage, setTxPage] = useState(0);
  const [prodPage, setProdPage] = useState(0);

  const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${Cookies.get("sr_token")}` } });

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async () => {
    setLoadingDashboard(true);
    setError(null);

    try {
      await Promise.all([loadProducts(), loadTransactionsLastTwoDays(), loadTodaySales()]);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError("Failed to load dashboard data.");
    } finally {
      setLoadingDashboard(false);
    }
  };

  // fetch top products (page size 5 server-side) but we'll paginate client-side to 3 per page
  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/products?page=0&size=10`, getAuthHeaders());
      const payload = extractReportPayload(res);
      // payload may be { content: [...] } or an array or { data: [...] }
      let list = [];
      if (Array.isArray(payload)) list = payload;
      else if (Array.isArray(payload?.content)) list = payload.content;
      else if (Array.isArray(payload?.data)) list = payload.data;
      else if (Array.isArray(res?.data)) list = res.data;
      else list = [];

      const normalized = list.map(normalizeProduct).filter(Boolean);
      // sort by id ascending (as you previously asked)
      normalized.sort((a, b) => {
        const ida = Number(a.id ?? 0);
        const idb = Number(b.id ?? 0);
        return ida - idb;
      });

      setProducts(normalized);
      setProdPage(0);
    } catch (err) {
      console.error("loadProducts error:", err);
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  // fetch transactions from reports endpoint for last two days (yesterday 00:00 -> today 23:59)
  const loadTransactionsLastTwoDays = async () => {
    setTxLoading(true);
    try {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      const from = start.toISOString();
      const to = end.toISOString();

      const res = await axios.get(`${API_BASE}/reports/sales`, {
        params: { from, to },
        ...getAuthHeaders(),
      });

      const payload = extractReportPayload(res);

      // payload could be:
      // - an object with transactions/sales/records array
      // - an array of transaction objects
      // - a summary object (no transactions)
      let txList = [];
      if (Array.isArray(payload)) {
        txList = payload;
      } else if (Array.isArray(payload?.transactions)) {
        txList = payload.transactions;
      } else if (Array.isArray(payload?.sales)) {
        txList = payload.sales;
      } else if (Array.isArray(payload?.records)) {
        txList = payload.records;
      } else if (Array.isArray(payload?.data)) {
        txList = payload.data;
      } else if (Array.isArray(res?.data)) {
        txList = res.data;
      } else {
        // if server returned an object but with nested content
        const maybeContent = payload?.content ?? payload?.items ?? payload?.results;
        if (Array.isArray(maybeContent)) txList = maybeContent;
      }

      // normalize and sort desc by date
      const normalized = (Array.isArray(txList) ? txList : [])
        .map(normalizeTransaction)
        .filter(Boolean)
        .sort((a, b) => {
          const da = a.date ? new Date(a.date).getTime() : 0;
          const db = b.date ? new Date(b.date).getTime() : 0;
          return db - da;
        });

      setTransactions(normalized);
      setTxPage(0);
    } catch (err) {
      console.error("loadTransactionsLastTwoDays error:", err);
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  };

  // load today's sales from reports endpoint. handles both summary object and transaction list
  const loadTodaySales = async () => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const from = `${todayStr}T00:00:00`;
      const to = `${todayStr}T23:59:59`;

      const res = await axios.get(`${API_BASE}/reports/sales`, {
        params: { from, to },
        ...getAuthHeaders(),
      });

      const payload = extractReportPayload(res);

      // If payload is an array of transactions -> sum them
      if (Array.isArray(payload)) {
        const { totalSales } = computeTotalsFromTxList(payload);
        setDailySales(Number(totalSales));
        return;
      }

      // If payload contains transactions array, sum that
      if (Array.isArray(payload?.transactions)) {
        const { totalSales } = computeTotalsFromTxList(payload.transactions);
        setDailySales(Number(totalSales));
        return;
      }

      // If payload is summary object with totalSales or total fields
      const totalFromSummary =
        Number(payload?.totalSales ?? payload?.total ?? payload?.grossTotal ?? 0) || 0;
      if (totalFromSummary > 0) {
        setDailySales(Number(totalFromSummary));
        return;
      }

      // fallback: server didn't return totals — try to compute from nested arrays if present
      const nested = payload?.data ?? payload?.content ?? payload?.sales ?? null;
      if (Array.isArray(nested)) {
        const { totalSales } = computeTotalsFromTxList(nested);
        setDailySales(Number(totalSales));
        return;
      }

      // nothing usable
      setDailySales(0);
    } catch (err) {
      console.error("loadTodaySales error:", err);
      setDailySales(0);
    }
  };

  const gotoPOS = () => navigate("/pos");

  // --- Transactions pagination derived values ---
  const txTotal = transactions.length;
  const txTotalPages = Math.max(1, Math.ceil(txTotal / TX_PAGE_SIZE));
  const txSafePage = Math.min(Math.max(0, txPage), Math.max(0, txTotalPages - 1));
  const txStartIdx = txSafePage * TX_PAGE_SIZE;
  const txEndIdx = Math.min(txStartIdx + TX_PAGE_SIZE, txTotal);
  const txPageRows = transactions.slice(txStartIdx, txEndIdx);

  // --- Products pagination derived values ---
  const prodTotal = products.length;
  const prodTotalPages = Math.max(1, Math.ceil(prodTotal / PROD_PAGE_SIZE));
  const prodSafePage = Math.min(Math.max(0, prodPage), Math.max(0, prodTotalPages - 1));
  const prodStartIdx = prodSafePage * PROD_PAGE_SIZE;
  const prodEndIdx = Math.min(prodStartIdx + PROD_PAGE_SIZE, prodTotal);
  const prodPageRows = products.slice(prodStartIdx, prodEndIdx);

  return (
    <div className="cashier-container">
      <Sidebar />

      <main className="main-content">
        <header className="header">
          <h1>Cashier Dashboard</h1>
        </header>

        {/* Sales summary */}
        <section className="sales-summary">
          <div className="sales-card">
            <h3>Today's Sales</h3>
            <p className="sales-amount">{formatCurrency(dailySales)}</p>
          </div>

          <button className="pos-button" onClick={gotoPOS} disabled={loadingDashboard}>
            Go to POS
          </button>
        </section>
{/* 
        {/* Recent Transactions (paginated, 2 rows/page) */}
        <section className="transactions-section" style={{ marginTop: 18 }}>
          {/* <h2>Recent Transactions (last 2 days)</h2> */}
{/* 
          {txLoading ? (
            <p>Loading transactions...</p>
          ) : txTotal === 0 ? (
            <p style={{ textAlign: "center", color: "#555" }}>No transactions found.</p>
          ) : ( */} 
            <>
              {/* <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {txPageRows.map((tx) => (
                    <tr key={tx.id}>
                      <td>{tx.id}</td>
                      <td>{tx.date ? tx.date.split("T")[0] : "-"}</td>
                      <td>{formatCurrency(tx.amount)}</td>
                      <td>
                        <span className={`status-badge ${String(tx.status).toLowerCase() === "completed" ? "completed" : "pending"}`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table> */}

              {/* transactions pagination */}
              {txTotal > TX_PAGE_SIZE && (
                <div className="card-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                  <div className="results">
                    Showing {txTotal === 0 ? 0 : txStartIdx + 1} to {txEndIdx} of {txTotal} results
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => setTxPage((p) => Math.max(0, p - 1))} disabled={txSafePage === 0} className="btn">Prev</button>

                    <div style={{ display: "flex", gap: 6 }}>
                      {Array.from({ length: txTotalPages }).map((_, i) => {
                        if (txTotalPages > 7) {
                          const start = Math.max(0, txSafePage - 3);
                          const end = Math.min(txTotalPages, start + 7);
                          if (i < start || i >= end) return null;
                        }
                        return (
                          <button
                            key={i}
                            onClick={() => setTxPage(i)}
                            className={`btn ${i === txSafePage ? "active" : ""}`}
                            style={{
                              minWidth: 36,
                              padding: "6px 8px",
                              borderRadius: 4,
                              background: i === txSafePage ? "#1565c0" : undefined,
                              color: i === txSafePage ? "#fff" : undefined,
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            {i + 1}
                          </button>
                        );
                      })}
                    </div>

                    <button onClick={() => setTxPage((p) => Math.min(txTotalPages - 1, p + 1))} disabled={txSafePage >= txTotalPages - 1} className="btn">Next</button>
                  </div>
                </div>
              )}
            </>
        </section>

        {/* Top Products (paginated, 3 rows/page) */}
        <section className="products-section" style={{ marginTop: 18 }}>
          <h2>Top Products</h2>

          {productsLoading ? (
            <p>Loading products...</p>
          ) : prodTotal === 0 ? (
            <p style={{ textAlign: "center", color: "#555" }}>No products found.</p>
          ) : (
            <>
              <table className="products-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Price (₹)</th>
                    <th>Tax</th>
                
                  </tr>
                </thead>
                <tbody>
                  {prodPageRows.map((p) => (
                    <tr key={p.id}>
                      <td>{p.id}</td>
                      <td>{p.name}</td>
                      <td>{p.unitPrice != null ? formatCurrency(p.unitPrice) : "-"}</td>
                      <td>{p.taxRate ? `${p.taxRate}%` : "-"}</td>
                     
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* products pagination */}
              {prodTotal > PROD_PAGE_SIZE && (
                <div className="card-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                  <div className="results">
                    Showing {prodTotal === 0 ? 0 : prodStartIdx + 1} to {prodEndIdx} of {prodTotal} results
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => setProdPage((p) => Math.max(0, p - 1))} disabled={prodSafePage === 0} className="btn">Prev</button>

                    <div style={{ display: "flex", gap: 6 }}>
                      {Array.from({ length: prodTotalPages }).map((_, i) => {
                        if (prodTotalPages > 7) {
                          const start = Math.max(0, prodSafePage - 3);
                          const end = Math.min(prodTotalPages, start + 7);
                          if (i < start || i >= end) return null;
                        }
                        return (
                          <button
                            key={i}
                            onClick={() => setProdPage(i)}
                            className={`btn ${i === prodSafePage ? "active" : ""}`}
                            style={{
                              minWidth: 36,
                              padding: "6px 8px",
                              borderRadius: 4,
                              background: i === prodSafePage ? "#1565c0" : undefined,
                              color: i === prodSafePage ? "#fff" : undefined,
                              border: "1px solid #e5e7eb",
                            }}
                          >
                            {i + 1}
                          </button>
                        );
                      })}
                    </div>

                    <button onClick={() => setProdPage((p) => Math.min(prodTotalPages - 1, p + 1))} disabled={prodSafePage >= prodTotalPages - 1} className="btn">Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
