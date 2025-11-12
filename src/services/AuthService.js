// src/services/AuthService.js
import { Navigate } from "react-router-dom";
import api from "./Api";
import Cookies from "js-cookie";

/**
 * AuthService
 * - preserves cookie-based token logic from your original file
 * - adds storing and reading 'user' object from localStorage
 * - exposes getStoredUser(), storeUser(), clearStoredUser()
 */

// --- token helpers (keeps your original behavior) ---
export function setAuthTokens({ token, refreshToken }) {
  if (token) Cookies.set("sr_token", token, { sameSite: "Lax" });
  if (refreshToken) Cookies.set("sr_refresh", refreshToken, { sameSite: "Lax" });
}

export function clearAuthTokens() {
  Cookies.remove("sr_token");
  Cookies.remove("sr_refresh");
}

export function getAuthToken() {
  return Cookies.get("sr_token") || null;
}

export async function refreshAuth() {
  const refreshToken = Cookies.get("sr_refresh");
  if (!refreshToken) throw new Error("no refresh token available");
  const res = await api.post("/auth/refresh", { refreshToken });
  const payload = res.data?.data || res.data;
  const newToken = payload?.token;
  const newRefresh = payload?.refreshToken;
  if (newToken) {
    setAuthTokens({ token: newToken, refreshToken: newRefresh });
    return newToken;
  }
  throw new Error("refresh failed");
}

// --- localStorage helpers for user object ---
export function storeUser(user) {
  try {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  } catch (e) {
    // ignore storage errors
    console.warn("storeUser failed", e);
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function clearStoredUser() {
  try {
    localStorage.removeItem("user");
  } catch (e) {}
}

// --- main API functions (login/logout) ---
async function login({ username, password }) {
  // keep the same call shape as your original file
  const res = await api.post("/auth/login", { username, password });
  const payload = res.data?.data || res.data;

  // server: if token present, set cookies (you had this behavior)
  if (payload?.token) {
    setAuthTokens({ token: payload.token, refreshToken: payload.refreshToken });
  }

  // if payload contains a user object, store it for quick client-side role checks
  // some APIs return { token, refreshToken, user } OR data.user
  const user = payload?.user || payload?.data?.user || payload;
  // Heuristic: if user looks like an object with username/role fields, store it
  if (user && typeof user === "object" && (user.username || user.role || user.id || user.email)) {
    storeUser(user);
  }

  return payload;
}

function logout() {
  clearAuthTokens();
  clearStoredUser();
}

const AuthService = {
  login,
  logout,
  setAuthTokens,
  clearAuthTokens,
  getAuthToken,
  refreshAuth,
  storeUser,
  getStoredUser,
  clearStoredUser,
};

export default AuthService;
