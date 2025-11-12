// src/services/InventoryService.js
import api from "./Api";
import Cookies from "js-cookie";

function authHeaders() {
  const token = Cookies.get("sr_token") || localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const InventoryService = {
  createBatch: async (payload) => {
    const res = await api.post("/api/stock/batch", payload, {
      headers: authHeaders(),
    });
    return res.data ?? res;
  },

  getStockByProduct: async (productId) => {
    const res = await api.get(`/api/stock/${productId}`, {
      headers: authHeaders(),
    });
    return res.data ?? res;
  },

  // New: update existing batch
  updateBatch: async (payload) => {
    const res = await api.put("/api/stock/batch", payload, {
      headers: authHeaders(),
    });
    return res.data ?? res;
  },

  //  New: delete batch by batchNumber
  deleteBatch: async (batchNumber) => {
    const res = await api.delete(`/api/stock/batch/${batchNumber}`, {
      headers: authHeaders(),
    });
    return res.data ?? res;
  },
};

export default InventoryService;
