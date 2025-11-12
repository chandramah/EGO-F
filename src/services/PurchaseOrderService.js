import api from "./Api"; // Make sure api.js exports a configured axios instance
import Cookies from "js-cookie";

export async function getPurchaseOrders() {
  try {
    const res = await api.get("/api/purchase-orders", {
      headers: {
        Authorization: `Bearer ${Cookies.get("sr_token")}`,
      },
    });
    return res.data;
  } catch (err) {
    console.error("getPurchaseOrders error:", err);
    return [];
  }
}
