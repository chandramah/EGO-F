// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import AuthService from "../services/AuthService";

/**
 * ProtectedRoute
 * Props:
 * - allowedRoles: array of role strings (e.g. ["ADMIN","MANAGER"])
 * - children: component(s) to render when allowed
 *
 * Role normalization: handles string/array/object role shapes and strips ROLE_ prefix.
 */

function normalizeRole(roleRaw) {
  if (!roleRaw) return "";
  let r = roleRaw;
  if (Array.isArray(roleRaw) && roleRaw.length) r = roleRaw[0];
  if (typeof r === "object") r = r.name ?? r.role ?? r.authority ?? "";
  r = String(r || "").toUpperCase().replace(/^ROLE[_\-]/, "");
  return r;
}

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const stored = AuthService.getStoredUser();

  if (!stored) {
    // not logged in
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles || allowedRoles.length === 0) {
    return children;
  }

  const roleRaw = stored?.role ?? stored?.roles ?? stored?.authority ?? stored?.authorities;
  const role = normalizeRole(roleRaw);

  const ok = allowedRoles.some(ar => role.includes(String(ar).toUpperCase()));
  if (!ok) {
    // redirect unauthorized users to login (or show a NotAuthorized page)
    return <Navigate to="/login" replace />;
  }

  return children;
}
