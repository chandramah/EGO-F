// import api from "./Api";
// import Cookies from "js-cookie";

// /**
//  * src/services/ProductsService.js
//  * - Exports named functions: getProducts, searchProducts
//  * - Also exports default ProductsService object
//  *
//  * Handles both response shapes: res.data.data OR res.data
//  * Uses 0-based page indexing by default.
//  */

// function extractPageResponse(res) {
//   if (!res) return null;
//   if (res.data && res.data.data !== undefined) return res.data.data;
//   if (res.data) return res.data;
//   return null;
// }
// // at top, after imports
// export async function getProduct(id) {
//   try {
//     const res = await api.get(`/api/products/${id}`);
//     return res.data ?? res;
//   } catch (err) {
//     console.error("getProduct error:", err);
//     throw err;
//   }
// }

// export async function updateProduct(id, data) {
//   try {
//     const res = await api.put(`/api/products/${id}`, data);
//     return res.data ?? res;
//   } catch (err) {
//     console.error("updateProduct error:", err);
//     throw err;
//   }
// }

// export async function deleteProduct(id) {
//   try {
//     const res = await api.delete(`/api/products/${id}`);
//     return res.data ?? res;
//   } catch (err) {
//     console.error("deleteProduct error:", err);
//     throw err;
//   }
// }

// // then include them in default export at bottom:
// const ProductsService = { getProducts, searchProducts, createProducts, getProduct, updateProduct, deleteProduct };
// export default ProductsService;
// // 
// // 
// // 

// export async function getProducts(page = 0, size = 5) {
//   try {
//     const res = await api.get("/api/products", {
//       params: { page, size }, headers: {
//         Authorization: `Bearer ${Cookies.get('sr_token')}`,   // ✅ send JWT in header
//       }
//     });
//     return extractPageResponse(res) || {
//       content: [],
//       page,
//       size,
//       totalElements: 0,
//       totalPages: 0,
//     };
//   } catch (err) {
//     console.error("getProducts error:", err);
//     return { content: [], page, size, totalElements: 0, totalPages: 0 };
//   }
// }

// export async function searchProducts({ sku, name, page = 0, size = 5 } = {}) {
//   try {
//     const params = { page, size };
//     if (sku) params.sku = sku;
//     if (name) params.name = name;
//     const res = await api.get("/api/products/SearchProducts", { params });
//     return extractPageResponse(res) || {
//       content: [],
//       page,
//       size,
//       totalElements: 0,
//       totalPages: 0,
//     };
//   } catch (err) {
//     console.error("searchProducts error:", err);
//     return { content: [], page, size, totalElements: 0, totalPages: 0 };
//   }
// }

// export async function createProducts(data) {
//   try {
//     const res = await api.post("/api/products", data, {
//       headers: {
//         Authorization: `Bearer ${Cookies.get('sr_token')}`,   // send JWT in header
//       }
//     });
//     return res.data;
//   } catch (err) {
//     console.error("getProducts error:", err);
//     return { content: [], totalElements: 0, totalPages: 0 };
//   }
// }

// const ProductsService = { getProducts, searchProducts, createProducts };
// export default ProductsService;



// src/services/ProductsService.js
import api from "./Api";
import Cookies from "js-cookie";

/**
 * Handles product API requests.
 * - Includes JWT token from cookies in headers.
 * - Supports pagination (page, size).
 */

function extractPageResponse(res) {
  if (!res) return null;
  if (res.data && res.data.data !== undefined) return res.data.data;
  if (res.data) return res.data;
  return null;
}

// ============================================================
// GET paginated products
// ============================================================
export async function getProducts(page = 0, size = 5) {
  try {
    const res = await api.get("/api/products", {
      params: { page, size },
      headers: {
        Authorization: `Bearer ${Cookies.get("sr_token")}`, // send JWT in header
      },
    });

    return (
      extractPageResponse(res) || {
        content: [],
        page,
        size,
        totalElements: 0,
        totalPages: 0,
      }
    );
  } catch (err) {
    console.error("getProducts error:", err);
    return { content: [], page, size, totalElements: 0, totalPages: 0 };
  }
}

// ============================================================
// SEARCH products
// ============================================================

// src/services/ProductsService.js

export async function searchProducts({ name, page = 0, size = 5 } = {}) {
  try {
    const params = { page, size };

    // ✅ Pass only name (no sku)
    if (name) params.name = name;

    const config = {
      params,
      headers: {
        Authorization: `Bearer ${Cookies.get("sr_token")}`,
      },
    };

    // GET /api/products/SearchProducts?name=xyz&page=0&size=5
    const res = await api.get("/api/products/search-products", config);

    return (
      extractPageResponse(res) || {
        content: [],
        page,
        size,
        totalElements: 0,
        totalPages: 0,
      }
    );
  } catch (err) {
    console.error("searchProducts error:", err);
    return { content: [], page, size, totalElements: 0, totalPages: 0 };
  }
}


// ============================================================
//  CREATE product
// ============================================================
export async function createProducts(data) {
  try {
    const res = await api.post("/api/products", data, {
      headers: {
        Authorization: `Bearer ${Cookies.get("sr_token")}`,
      },
    });
    return res.data;
  } catch (err) {
    console.error("createProducts error:", err);
    throw err;
  }
}

// ============================================================
// GET single product
// ============================================================
export async function getProduct(id) {
  try {
    const res = await api.get(`/api/products/${id}`, {
      headers: {
        Authorization: `Bearer ${Cookies.get("sr_token")}`,
      },
    });
    return res.data ?? res;
  } catch (err) {
    console.error("getProduct error:", err);
    throw err;
  }
}

// ============================================================
// UPDATE product
// ============================================================
export async function updateProduct(id, data) {
  try {
    const res = await api.put(`/api/products/${id}`, data, {
      headers: {
        Authorization: `Bearer ${Cookies.get("sr_token")}`,
      },
    });
    return res.data ?? res;
  } catch (err) {
    console.error("updateProduct error:", err);
    throw err;
  }
}

// ============================================================
//  DELETE product
// ============================================================
export async function deleteProduct(id) {
  console.log(id)
  try {
    const baseHeaders = { headers: { Authorization: `Bearer ${Cookies.get("sr_token")}` } };
    const pid = Number.isNaN(Number(id)) ? id : Number(id);
    const res = await api.delete(`/api/products/${pid}`, baseHeaders);
    return res.data ?? res;
  } catch (err) {
    console.error("deleteProduct error:", err);
    throw err;
  }
}

// ============================================================
//  Export all functions and default service object
// ============================================================
const ProductsService = {
  getProducts,
  searchProducts,
  createProducts,
  getProduct,
  updateProduct,
  deleteProduct,
};

export default ProductsService;
