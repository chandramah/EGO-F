// src/services/UsersService.js
import api from "./Api";
import Cookies from "js-cookie";

function authHeaders() {
  const token = Cookies.get("sr_token") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function registerUser(payload) {
  try {
    const res = await api.post("/auth/signup", payload, {
      headers: { "Content-Type": "application/json", ...authHeaders() },
    });
    return res.data ?? res;
  } catch (err) {
    console.error("registerUser error:", err);
    throw err;
  }
}

export async function getUsers() {
  try {
    const res = await api.get("/api/users", { headers: authHeaders() });
    // normalize shapes: array or page response
    if (Array.isArray(res.data)) return res.data;
    if (res.data?.content) return res.data.content;
    return res.data || [];
  } catch (err) {
    console.error("getUsers error:", err);
    throw err;
  }
}

export async function getUser(id) {
  try {
    const res = await api.get(`/api/users/${id}`, { headers: authHeaders() });
    return res.data ?? res;
  } catch (err) {
    console.error("getUser error:", err);
    throw err;
  }
}

export async function updateUser(id, payload) {
  try {
    const res = await api.put(`/api/users/${id}`, payload, { headers: authHeaders() });
    return res.data ?? res;
  } catch (err) {
    console.error("updateUser error:", err);
    throw err;
  }
}

export async function deleteUser(id) {
  try {
    const res = await api.delete(`/api/users/${id}`, { headers: authHeaders() });
    return res.data ?? res;
  } catch (err) {
    console.error("deleteUser error:", err);
    throw err;
  }
}

const UsersService = { registerUser, getUsers, getUser, updateUser, deleteUser };
export default UsersService;
