// src/components/Navbar.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import LogoSmall from "./LogoSmall";
import { useAuth } from "../context/AuthContext";
import AuthService from "../services/AuthService";

export default function Navbar() {
  const { user, logout } = useAuth() || {};
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  // displayUser comes from context if available, otherwise fallback to stored user
  const displayUser = user || AuthService.getStoredUser();

  const handleLogout = () => {
    if (logout) logout();
    AuthService.logout();
    navigate("/login", { replace: true });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Normalize role helper:
  // Accepts: "ADMIN" | "ROLE_ADMIN" | ["ADMIN"] | [{ name: "ADMIN" }] | { role: "ADMIN" } etc.
  const normalizeRole = (roleRaw) => {
    if (!roleRaw) return "";
    let r = roleRaw;
    if (Array.isArray(roleRaw) && roleRaw.length) r = roleRaw[0];
    if (typeof r === "object") r = r.name ?? r.role ?? r.authority ?? "";
    return String(r || "").toUpperCase().replace(/^ROLE[_\-]/, "");
  };

  // Determine primary role from user object (tries multiple common property names)
  const getPrimaryRole = (u) => {
    if (!u) return "";
    // common shapes: u.role, u.roles (array), u.authorities, u.authority, u.roles[0].name, etc.
    if (u.roles && Array.isArray(u.roles) && u.roles.length) return normalizeRole(u.roles);
    if (u.authorities && Array.isArray(u.authorities) && u.authorities.length) return normalizeRole(u.authorities);
    if (u.role) return normalizeRole(u.role);
    if (u.authority) return normalizeRole(u.authority);
    // some tokens store role in nested user object
    if (u.user && u.user.role) return normalizeRole(u.user.role);
    // fallback: username-only user has no role
    return "";
  };

  // Map role to route
  const routeForRole = (role) => {
    if (!role) return "/"; // default to main home
    const r = role.toUpperCase();
    if (r.includes("ADMIN")) return "/"; // admin dashboard
    if (r.includes("MANAGER")) return "/manager"; // manager dashboard
    if (r.includes("CASHIER")) return "/cashier"; // cashier dashboard
    // fallback - user-specific dashboard may not exist; go to root
    return "/";
  };

  // Logo click handler: route to role-specific dashboard
  const onLogoClick = (e) => {
    e.preventDefault();
    const primaryRole = getPrimaryRole(displayUser);
    const target = routeForRole(primaryRole);
    navigate(target, { replace: false });
  };

  return (
    <header
      className="navbar"
      style={{
        background: "#1565c0",
        color: "#fff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 24px",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Left: Brand / Logo */}
      <div
        className="navbar-left"
        style={{ display: "flex", alignItems: "center", gap: 10 }}
      >
        {/* Make logo clickable and route based on role */}
        <a
          href="#"
          onClick={onLogoClick}
          aria-label="Go to dashboard"
          style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "inherit" }}
        >
          <LogoSmall text="SR" />
          <span
            style={{
              fontWeight: 600,
              fontSize: 18,
              letterSpacing: "0.5px",
              color: "#fff",
              marginLeft: 6,
            }}
          >
            Smart Retails
          </span>
        </a>
      </div>

      {/* Right: User Section */}
      <div
        ref={dropdownRef}
        className="navbar-profile"
        style={{ position: "relative" }}
      >
        {displayUser ? (
          <div
            onClick={() => setMenuOpen(!menuOpen)}
            className="navbar-user"
            style={{
              cursor: "pointer",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: menuOpen ? "rgba(255,255,255,0.15)" : "transparent",
              padding: "8px 12px",
              borderRadius: 6,
              transition: "background 0.2s ease",
            }}
          >
            👋 Hi,{" "}
            <span style={{ fontWeight: 600 }}>
              {displayUser.username || displayUser.email || "User"}
            </span>
            <span style={{ fontSize: 12 }}>▾</span>

            {/* Dropdown */}
            {menuOpen && (
              <div
                id="logout-dropdown"
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  background: "#ffffff",
                  color: "#111827",
                  borderRadius: 6,
                  boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
                  minWidth: 140,
                  padding: "6px 0",
                  zIndex: 50,
                }}
              >
                <button
                  id="logout-btn"
                  onClick={handleLogout}
                  style={{
                    background: "none",
                    border: "none",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 14px",
                    cursor: "pointer",
                    fontSize: 14,
                    color: "#1f2937",
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.background = "#f3f4f6")
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.background = "transparent")
                  }
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <a
            href="/login"
           
          >
            
          </a>
        )}
      </div>
    </header>
  );
}
