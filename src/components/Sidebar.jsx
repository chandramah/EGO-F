// src/components/Sidebar.jsx
import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LogoSmall from "./LogoSmall";
import "./sidebar.css";
import AuthService from "../services/AuthService";

// Normalize and compare role names (handles ROLE_ADMIN, role arrays, etc.)
function normalizeRole(roleRaw) {
  if (!roleRaw) return "";
  let r = roleRaw;
  if (Array.isArray(r) && r.length) r = r[0];
  if (typeof r === "object") r = r.name ?? r.role ?? r.authority ?? "";
  return String(r || "").toUpperCase().replace(/^ROLE[_-]/, "");
}

export default function Sidebar() {
  const { user } = useAuth() || {};
  const stored = AuthService.getStoredUser();
  const displayUser = user || stored || null;
  const role = normalizeRole(displayUser?.role ?? displayUser?.roles ?? displayUser?.authority ?? displayUser?.authorities ?? displayUser);

  const location = useLocation();

  // Collapse controls for nested menus
  const [inventoryOpen, setInventoryOpen] = useState(location.pathname.startsWith("/inventory"));
  const [purchaseOpen, setPurchaseOpen] = useState(location.pathname.startsWith("/purchase"));
  const [reportsOpen, setReportsOpen] = useState(location.pathname.startsWith("/reports") || location.pathname.startsWith("/sales"));

  useEffect(() => {
    if (location.pathname.startsWith("/inventory")) setInventoryOpen(true);
    if (location.pathname.startsWith("/purchase")) setPurchaseOpen(true);
    if (location.pathname.startsWith("/reports")) setReportsOpen(true);
  }, [location.pathname]);

  const linkClass = ({ isActive }) => (isActive ? "nav-item active" : "nav-item");

  return (
    <aside className="app-sidebar">
      <nav className="sidebar-nav">
        {/* =====================================================================
           ADMIN SIDEBAR
           ===================================================================== */}
        {role === "ADMIN" && (
          <>
            <NavLink to="/" className={linkClass} end>
              <span className="nav-icon">🏠</span>
              <span>Admin</span>
            </NavLink>

            <NavLink to="/sales" className={linkClass}>
              <span className="nav-icon">💳</span>
              <span>Sales</span>
            </NavLink>

            <NavLink to="/products" className={linkClass}>
              <span className="nav-icon">📦</span>
              <span>Products</span>
            </NavLink>

            {/* Inventory group */}
            <div className={`nav-group-parent ${inventoryOpen ? "open" : ""}`}>
              <button
                type="button"
                className={`nav-item inventory-parent ${inventoryOpen ? "active" : ""}`}
                onClick={() => setInventoryOpen((v) => !v)}
                aria-expanded={inventoryOpen}
                aria-controls="inventory-submenu"
              >
                <span className="nav-icon">📚</span>
                <span>Inventory</span>
                <span className="chev" style={{ marginLeft: "auto" }}>
                  {inventoryOpen ? "▾" : "▸"}
                </span>
              </button>

              <div id="inventory-submenu" className={`nav-group ${inventoryOpen ? "open" : "closed"}`}>
                <NavLink to="/inventory/add-batch" className={({ isActive }) => (isActive ? "nav-item sub active" : "nav-item sub")}>
                  <span className="nav-icon">➕</span>
                  <span>Add Batch</span>
                </NavLink>

                <NavLink to="/inventory/stock-by-product" className={({ isActive }) => (isActive ? "nav-item sub active" : "nav-item sub")}>
                  <span className="nav-icon">📊</span>
                  <span>Stock by Product</span>
                </NavLink>
              </div>
            </div>

            <NavLink to="/user/users" className={linkClass}>
              <span className="nav-icon">👥</span>
              <span>User Logins</span>
            </NavLink>

            <NavLink to="/reports" className={linkClass}>
              <span className="nav-icon">📈</span>
              <span>Reports</span>
            </NavLink>
          </>
        )}

        {/* =====================================================================
           MANAGER SIDEBAR
           ===================================================================== */}
        {role === "MANAGER" && (
          <>
            <NavLink to="/manager" className={linkClass} end>
              <span className="nav-icon">🏠</span>
              <span>Dashboard</span>
            </NavLink>

            <NavLink to="/inventory/stock-by-product" className={linkClass}>
              <span className="nav-icon">📊</span>
              <span>Stock by Products</span>
            </NavLink>

            <NavLink to="/suppliers" className={linkClass}>
              <span className="nav-icon">🚚</span>
              <span>Suppliers</span>
            </NavLink>

            {/* Purchase Orders */}
            <NavLink to="/PurchaseOrders" className={linkClass}>
              <span className="nav-icon">📈</span>
              <span>PurchaseOrders</span>
            </NavLink>
            

            <NavLink to="/reports" className={linkClass}>
              <span className="nav-icon">📈</span>
              <span>Reports</span>
            </NavLink>
          </>
        )}

        {/* =====================================================================
           CASHIER SIDEBAR
           ===================================================================== */}
        {role === "CASHIER" && (
          <>
            <NavLink to="/cashier" className={linkClass} end>
              <span className="nav-icon">🏠</span>
              <span>Dashboard</span>
            </NavLink>

            <NavLink to="/products" className={linkClass}>
              <span className="nav-icon">📦</span>
              <span>Products</span>
            </NavLink>
            

            <NavLink to="/pos" className={linkClass}>
              <span className="nav-icon">🧾</span>
              <span>Billing</span>
            </NavLink>

           
          </>
        )}
      </nav>
    </aside>
  );
}
