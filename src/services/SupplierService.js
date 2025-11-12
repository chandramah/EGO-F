import api from "./Api"; // Make sure api.js exports a configured axios instance
import Cookies from "js-cookie";

export async function loadSuppliers() {
  try {
    const res = await api.get("/api/suppliers", {
      headers: {
        Authorization: `Bearer ${Cookies.get("sr_token")}`,
      },
    });
    const data = res?.data;

    // Support both { content: [...] } and [...] formats
    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.content)
      ? data.content
      : [];

    return list;
  } catch (err) {
    console.error("Error fetching suppliers:", err);
    setSuppliers([]); // fallback to empty array
  }
}
