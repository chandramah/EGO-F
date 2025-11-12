// src/services/SalesService.js
import Cookies from "js-cookie";
import api from "./Api";

const SalesService = {
  // Create a new sale
  createSale: (saleRequest) =>
    api.post(
      "/api/sales/create",
      saleRequest, // data
      {
        headers: {
          Authorization: `Bearer ${Cookies.get("sr_token")}`,
        },
      }
    ),

  // Fetch paginated sales list
  getSales: (page = 0, size = 20) =>
    api.get("/api/sales", {
      headers: {
        Authorization: `Bearer ${Cookies.get("sr_token")}`,
      },
      params: { page, size },
    }),

  // Fetch a sale by ID
  getSaleById: (id) =>
    api.get(`/api/sales/${id}`, {
      headers: {
        Authorization: `Bearer ${Cookies.get("sr_token")}`,
      },
    }),
};

export default SalesService;
