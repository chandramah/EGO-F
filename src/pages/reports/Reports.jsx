// src/pages/reports/Reports.jsx
import React, { useMemo, useState } from "react";
import axios from "axios";
import "../../styles/Reports.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import Cookies from "js-cookie";
import Sidebar from "../../components/Sidebar";
import { API_BASE } from "../../services/Api";

function formatCurrency(v) {
  if (v == null) return "₹0.00";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return `₹${n.toFixed(2)}`;
}

/**
 * Safe helpers to extract numeric fields from a transaction item.
 * Backend transactions may name fields differently — try common keys.
 */
const extractTxnAmount = (tx) =>
  Number(tx?.amount ?? tx?.total ?? tx?.gross ?? tx?.totalAmount ?? tx?.price ?? 0);

const extractTxnTax = (tx) =>
  Number(tx?.tax ?? tx?.taxAmount ?? tx?.taxTotal ?? 0);

const extractTxnDiscount = (tx) =>
  Number(tx?.discount ?? tx?.discountAmount ?? tx?.discountTotal ?? 0);

/**
 * If the response payload is an array of transaction objects, compute summary totals.
 * If payload is already a summary object, normalize and return it.
 */
function computeSummaryFromPayload(payload, fromDate, toDate) {
  // If payload is an array -> treat as transaction list
  if (Array.isArray(payload)) {
    const txs = payload;
    const transactions = txs.length;
    const grossTotal = txs.reduce((s, t) => s + extractTxnAmount(t), 0);
    const taxTotal = txs.reduce((s, t) => s + extractTxnTax(t), 0);
    const discountTotal = txs.reduce((s, t) => s + extractTxnDiscount(t), 0);
    // net might be provided per txn or computed as gross - tax - discount
    const netTotal =
      txs.reduce((s, t) => s + (Number(t?.net ?? 0)), 0) || grossTotal - taxTotal - discountTotal;

    return {
      from: fromDate,
      to: toDate,
      transactions,
      grossTotal,
      netTotal,
      taxTotal,
      discountTotal,
      source: "transactions",
    };
  }

  // If payload is an object, try to read totals directly, with fallbacks
  if (payload && typeof payload === "object") {
    const transactions = Number(payload.transactions ?? payload.count ?? payload.totalTransactions ?? 0);
    const grossTotal = Number(payload.grossTotal ?? payload.gross ?? payload.total ?? payload.totalAmount ?? 0);
    const netTotal = Number(payload.netTotal ?? payload.net ?? payload.netAmount ?? 0);
    const taxTotal = Number(payload.taxTotal ?? payload.tax ?? payload.totalTax ?? 0);
    const discountTotal = Number(payload.discountTotal ?? payload.discount ?? payload.totalDiscount ?? 0);

    return {
      from: payload.from ?? fromDate,
      to: payload.to ?? toDate,
      transactions,
      grossTotal,
      netTotal,
      taxTotal,
      discountTotal,
      source: "summary",
    };
  }

  // Unknown payload => return null
  return null;
}

export default function Reports() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState(null); // normalized summary object or null
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadReports = async () => {
    setError("");
    setReport(null);

    if (!from || !to) {
      setError("Please select both From and To dates.");
      return;
    }
    if (new Date(from) > new Date(to)) {
      setError("'From' date cannot be after 'To' date.");
      return;
    }

    try {
      setLoading(true);

      const fromISO = `${from}T00:00:00`;
      const toISO = `${to}T23:59:59`;

      const res = await axios.get(`${API_BASE}/reports/sales`, {
        params: { from: fromISO, to: toISO },
        headers: { Authorization: `Bearer ${Cookies.get("sr_token")}` },
      });

      // backend may return envelope: { success, message, data } or array/data or direct object
      const envelope = res?.data ?? res;
      const payload = envelope?.data ?? envelope;

      // compute normalized summary (either from array or object)
      const summary = computeSummaryFromPayload(payload, from, to);

      if (!summary) {
        // If payload is empty array or null, explicitly set report=null and show a friendly message
        setReport(null);
        if (!payload || (Array.isArray(payload) && payload.length === 0)) {
          setError("No report data found for the selected dates.");
        } else {
          setError("Unexpected report format received from server. Check console for details.");
          // log payload for debugging
          console.warn("Reports: unexpected payload:", payload);
        }
      } else {
        setReport(summary);
      }
    } catch (err) {
      console.error("Error loading sales report:", err);
      // prefer server message when available
      const serverMsg = err?.response?.data?.message ?? err?.response?.data ?? err?.message;
      setError(String(serverMsg) || "Failed to fetch sales report.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  // prepare chart data (single bar group) using numeric values (ensure numbers)
  const chartData = useMemo(() => {
    if (!report) return [];
    return [
      {
        name: `${report.from} → ${report.to}`,
        Gross: Number(report.grossTotal ?? 0),
        Tax: Number(report.taxTotal ?? 0),
        Net: Number(report.netTotal ?? 0),
      },
    ];
  }, [report]);

  return (
    <div className="page-container">
      <Sidebar />

      <div className="main-content" style={{ padding: 24 }}>
        <h1 className="page-title">Sales Report Summary</h1>

        <div
          className="filter-bar"
          style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 18, flexWrap: "wrap" }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            From
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            To
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>

          <div>
            <button onClick={loadReports} disabled={loading} className="btn btn-primary">
              {loading ? "Loading…" : "Load Report"}
            </button>
          </div>

          {error && <div style={{ color: "crimson", marginLeft: 12 }}>{error}</div>}
        </div>

        {/* If no report found */}
        {!report && !loading && (
          <div style={{ marginBottom: 16, color: "#374151" }}>
            {error ? null : "No summary data: please select a date range and click 'Load Report'."}
          </div>
        )}

        {/* KPIs */}
        {report && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div className="kpi-card" style={{ padding: 12 }}>
              <div className="kpi-title">Date Range</div>
              <div className="kpi-value" style={{ fontSize: 16 }}>
                {report.from} → {report.to}
              </div>
            </div>

            <div className="kpi-card" style={{ padding: 12 }}>
              <div className="kpi-title">Transactions</div>
              <div className="kpi-value">{Number(report.transactions ?? 0)}</div>
            </div>

            <div className="kpi-card" style={{ padding: 12 }}>
              <div className="kpi-title">Gross Total</div>
              <div className="kpi-value">{formatCurrency(report.grossTotal)}</div>
            </div>

            <div className="kpi-card" style={{ padding: 12 }}>
              <div className="kpi-title">Net Total</div>
              <div className="kpi-value">{formatCurrency(report.netTotal)}</div>
            </div>

            <div className="kpi-card" style={{ padding: 12 }}>
              <div className="kpi-title">Tax Total</div>
              <div className="kpi-value">{formatCurrency(report.taxTotal)}</div>
            </div>

            <div className="kpi-card" style={{ padding: 12 }}>
              <div className="kpi-title">Discount Total</div>
              <div className="kpi-value">{formatCurrency(report.discountTotal)}</div>
            </div>
          </div>
        )}

        {/* Chart */}
        {report && (
          <div className="report-chart" style={{ marginBottom: 18, background: "#fff", borderRadius: 8, padding: 12 }}>
            <h2 style={{ marginTop: 0 }}>Sales Overview</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => (value == null ? "-" : `₹${Number(value).toFixed(2)}`)} />
                <Legend />
                <Bar dataKey="Gross" fill="#1565c0" name="Gross (₹)" />
                <Bar dataKey="Tax" fill="#f59e0b" name="Tax (₹)" />
                <Bar dataKey="Net" fill="#10b981" name="Net (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Summary Table */}
        <div className="report-table" style={{ background: "#fff", padding: 12, borderRadius: 8 }}>
          <h2 style={{ marginTop: 0 }}>Sales Summary Details</h2>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#6b7280", fontSize: 13 }}>
                <th style={{ padding: 8 }}>From</th>
                <th style={{ padding: 8 }}>To</th>
                <th style={{ padding: 8 }}>Transactions</th>
                <th style={{ padding: 8 }}>Gross (₹)</th>
                <th style={{ padding: 8 }}>Tax (₹)</th>
                <th style={{ padding: 8 }}>Net (₹)</th>
                <th style={{ padding: 8 }}>Discount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {report ? (
                <tr>
                  <td style={{ padding: 8 }}>{report.from}</td>
                  <td style={{ padding: 8 }}>{report.to}</td>
                  <td style={{ padding: 8 }}>{Number(report.transactions ?? 0)}</td>
                  <td style={{ padding: 8 }}>{(Number(report.grossTotal ?? 0)).toFixed(2)}</td>
                  <td style={{ padding: 8 }}>{(Number(report.taxTotal ?? 0)).toFixed(2)}</td>
                  <td style={{ padding: 8 }}>{(Number(report.netTotal ?? 0)).toFixed(2)}</td>
                  <td style={{ padding: 8 }}>{(Number(report.discountTotal ?? 0)).toFixed(2)}</td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: 18, textAlign: "center", color: "#6b7280" }}>
                    {loading ? "Loading…" : error ? error : "No summary available for the selected date range."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
