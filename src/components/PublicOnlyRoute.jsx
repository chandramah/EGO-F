// src/components/PublicOnlyRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import AuthService from "../services/AuthService";

/**
 * PublicOnlyRoute
 * - Renders children only when NOT authenticated
 * - If a user is already logged in, redirects to the dashboard ("/")
 */
export default function PublicOnlyRoute({ children }) {
  const stored = AuthService.getStoredUser();
  if (stored) {
    return <Navigate to="/" replace />;
  }
  return children;
}
