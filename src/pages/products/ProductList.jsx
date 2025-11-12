// src/pages/products/ProductList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import Pagination from "../../components/Pagination";
import useDebounce from "../../utils/useDebounce";
import * as ProductsService from "../../services/ProductsService";
import AuthService from "../../services/AuthService";
import "../../styles.css";

/**
 * ProductList (updated)
 * - Ensures deleted products are removed from the visible list immediately
 * - Guarantees search results contain only matching items (server-first, then client-side)
 * - Adds a small Tailwind-based toast notification for success / error messages
 */

export default function ProductList() {
  const PAGE_SIZE = 6;
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 400);

  const [pageResp, setPageResp] = useState({
    content: [],
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const sizeFallback = 1000;

  // Use native alerts for notifications
  const showAlert = (message) => window.alert(message);

  // Role
  const getNormalizedRole = (roleRaw) => {
    if (!roleRaw) return "";
    let r = roleRaw;
    if (Array.isArray(roleRaw) && roleRaw.length) r = roleRaw[0];
    if (typeof r === "object") r = r.name ?? r.role ?? r.authority ?? "";
    return String(r || "").toUpperCase().replace(/^ROLE[_\-]/, "");
  };

  const storedUser = AuthService.getStoredUser();
  const normalizedRole = getNormalizedRole(
    storedUser?.role ?? storedUser?.roles ?? storedUser?.authority ?? storedUser?.authorities
  );
  const isAdmin = normalizedRole.includes("ADMIN");

  // normalize product and filter out deleted/malformed
  const normalizeProduct = (raw) => {
    if (!raw || (typeof raw === "object" && Object.keys(raw).length === 0)) return null;
    const id = raw.id ?? raw.productId ?? raw._id ?? raw.sku ?? null;
    const name = (raw.name ?? raw.productName ?? "").toString();
    const category = typeof raw.category === "string" ? raw.category : raw.category?.name ?? raw.category?.title ?? raw.category ?? "";
    const sku = raw.sku ?? raw.code ?? raw.SKU ?? "";
    const unitPrice = raw.unitPrice ?? raw.price ?? raw.cost ?? 0;
    const taxRate = raw.taxRate ?? raw.tax ?? raw.vat ?? null;
    const isActive = raw.isActive ?? raw.active ?? raw.status === "active" ?? raw.deleted === false ?? true;
    const deleted = raw.deleted ?? raw.isDeleted ?? false;
    if (!id || deleted) return null;
    return { id, name, sku, category, unitPrice: Number(unitPrice ?? 0), taxRate, isActive: !!isActive, raw };
  };

  const buildPageResp = (items, pageIndex = 0) => {
    const totalElements = items.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));
    const start = pageIndex * PAGE_SIZE;
    const content = items.slice(start, start + PAGE_SIZE);
    return { content, page: pageIndex, size: PAGE_SIZE, totalElements, totalPages };
  };

  // unified load function
  const load = async (p = 0) => {
    setLoading(true);
    try {
      const q = debouncedQuery?.trim();
      if (q) {
        // Try server search. If server returns items, filter them to ensure they match query across name/sku/category.
        try {
          const res = await ProductsService.searchProducts({ q, page: p, size: PAGE_SIZE });
          // extract list
          let serverList = res?.content ?? res?.data?.content ?? res?.data ?? res ?? [];
          if (!Array.isArray(serverList) && typeof serverList === "object") {
            serverList = serverList?.items ?? serverList?.results ?? [];
          }
          serverList = Array.isArray(serverList) ? serverList : [];

          const normalized = serverList.map(normalizeProduct).filter(Boolean);

          // enforce matching filter client-side to guarantee only matching items are shown
          const lowq = q.toLowerCase();
          const matched = normalized.filter((it) => {
            const checks = [(it.name || "").toString().toLowerCase(), (it.sku || "").toString().toLowerCase(), (it.category || "").toString().toLowerCase()];
            return checks.some((s) => s.includes(lowq));
          });

          if (matched.length > 0) {
            setPageResp(buildPageResp(matched, p));
            setPage(p);
          } else {
            // server returned nothing matching -> fallback to client-side large fetch
            await clientSideFilter(q, p);
          }
        } catch (err) {
          console.warn("Server search failed, falling back to client-side", err);
          await clientSideFilter(q, p);
        }
      } else {
        // no search: normal paged server list
        try {
          const res = await ProductsService.getProducts(p, PAGE_SIZE);
          const serverContent = res?.content ?? res?.data?.content ?? res?.data ?? res ?? [];
          const normalized = (Array.isArray(serverContent) ? serverContent : []).map(normalizeProduct).filter(Boolean);

          const totalElements = typeof res?.totalElements === "number" ? res.totalElements : typeof res?.data?.totalElements === "number" ? res.data.totalElements : Math.max(0, normalized.length);
          const totalPages = typeof res?.totalPages === "number" ? res.totalPages : typeof res?.data?.totalPages === "number" ? res.data.totalPages : Math.max(1, Math.ceil(totalElements / PAGE_SIZE));
          const safePage = p >= totalPages ? 0 : p;

          setPageResp({ content: normalized, page: safePage, size: PAGE_SIZE, totalElements, totalPages });
          setPage(safePage);
        } catch (err) {
          console.error("Failed loading products:", err);
          setPageResp({ content: [], page: 0, size: PAGE_SIZE, totalElements: 0, totalPages: 1 });
          setPage(0);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // client-side fallback: load a large set, normalize, filter, then paginate
  const clientSideFilter = async (q, p = 0) => {
    try {
      const resAll = await ProductsService.getProducts(0, sizeFallback);
      const allRaw = resAll?.content ?? resAll?.data?.content ?? resAll?.data ?? [];
      const normalizedAll = (Array.isArray(allRaw) ? allRaw : []).map(normalizeProduct).filter(Boolean);

      const lowq = q.toString().toLowerCase();
      const filtered = normalizedAll.filter((it) => {
        const checks = [(it.name || "").toString().toLowerCase(), (it.sku || "").toString().toLowerCase(), (it.category || "").toString().toLowerCase()];
        return checks.some((s) => s.includes(lowq));
      });

      const resp = buildPageResp(filtered, p);
      setPageResp(resp);
      setPage(p);
    } catch (err) {
      console.error("Client-side filter failed:", err);
      setPageResp({ content: [], page: 0, size: PAGE_SIZE, totalElements: 0, totalPages: 1 });
      setPage(0);
    }
  };

  useEffect(() => {
    setPage(0);
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = pageResp.totalElements === 0 ? 0 : pageResp.page * pageResp.size + 1;
  const end = Math.min((pageResp.page + 1) * pageResp.size, pageResp.totalElements);

  // Delete with optimistic UI update and toast
  const handleDelete = async (idOrSku) => {
    const ok = window.confirm("Delete this product?");
    if (!ok) return;

    // optimistic removal from current page
    const prevResp = pageResp;
    const newContent = (pageResp.content || []).filter((p) => {
      const serverId = p?.raw?.id ?? p?.raw?.productId ?? p?.id;
      return String(serverId) !== String(idOrSku) && String(p.id) !== String(idOrSku);
    });
    const newTotal = Math.max(0, (pageResp.totalElements || 0) - 1);
    const newTotalPages = Math.max(1, Math.ceil(newTotal / PAGE_SIZE));

    setPageResp({ content: newContent, page: pageResp.page, size: PAGE_SIZE, totalElements: newTotal, totalPages: newTotalPages });

    try {
      // Prefer backend id if present
      const target = (() => {
        const found = (pageResp.content || []).find((p) => String(p.id) === String(idOrSku) || String(p?.raw?.id ?? p?.raw?.productId) === String(idOrSku));
        const sid = found?.raw?.id ?? found?.raw?.productId ?? found?.id ?? idOrSku;
        return sid;
      })();

      await ProductsService.deleteProduct(target);
      showAlert("Product deleted");

      // If current page became empty and there are previous pages, load previous page
      if (newContent.length === 0 && pageResp.page > 0) {
        await load(pageResp.page - 1);
      } else {
        // try to reload current page from server to keep consistent
        await load(pageResp.page);
      }
    } catch (err) {
      console.error("Delete failed", err);
      const msg = err?.response?.data?.message || err?.message || "Delete failed";
      const ref = err?.response?.data?.data;
      showAlert(ref ? `${msg} (ref: ${ref})` : msg);
      // rollback optimistic update by reloading previous state
      setPageResp(prevResp);
    }
  };

  const colCount = isAdmin ? 7 : 6;

  const visibleContent = useMemo(() => (pageResp.content || []).filter(Boolean), [pageResp.content]);

  return (
    <div className="dashboard-page">
      <Sidebar />
      <main className="dashboard-main">
        <div className="products-page">
          <div className="page-header">
            <h2>Products</h2>
            <div className="header-actions">
              <input
                className="search-input"
                placeholder="Search by product name, SKU, category..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

              {isAdmin && (
                <Link to="/products/new" className="btn-primary" style={{ marginLeft: 12 }}>
                  + Add Product
                </Link>
              )}
            </div>
          </div>

          <div className="card">
            {loading ? (
              <div className="empty-state">Loading…</div>
            ) : (
              <>
                <div className="table-wrap">
                  <table className="products-table">
                    <thead>
                      <tr>
                        <th>NAME</th>
                        <th>SKU</th>
                        <th>CATEGORY</th>
                        <th>UNIT PRICE</th>
                        <th>TAX</th>
                        <th>ACTIVE</th>
                        {isAdmin && <th style={{ width: 160, textAlign: "right" }}>ACTIONS</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleContent && visibleContent.length ? (
                        visibleContent.map((p) => (
                          <tr key={p.id ?? p.sku}>
                            <td className="name-col">{p.name || "-"}</td>
                            <td>{p.sku || "-"}</td>
                            <td>{p.category || "-"}</td>
                            <td>{p.unitPrice ? `₹${Number(p.unitPrice).toFixed(2)}` : "-"}</td>
                            <td>{p.taxRate ? `${p.taxRate}%` : "-"}</td>
                            <td>
                              <input type="checkbox" checked={!!p.isActive} readOnly />
                            </td>

                            {isAdmin ? (
                              <td style={{ textAlign: "right" }}>
                                <Link to={`/products/${p.id}/edit`} className="action-btn action-edit">
                                  Edit
                                </Link>
                                <button
                                  className="action-btn action-delete"
                                  onClick={() => handleDelete(p?.raw?.id ?? p?.raw?.productId ?? p.id)}
                                  style={{ marginLeft: 8 }}
                                >
                                  Delete
                                </button>
                              </td>
                            ) : null}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={colCount} style={{ textAlign: "center", padding: 36 }}>
                            No products
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="card-footer">
                  <div className="results">Showing {start} to {end} of {pageResp.totalElements} results</div>
                  <Pagination
                    page={pageResp.page || 0}
                    totalPages={Math.max(1, pageResp.totalPages || 1)}
                    onChange={(p) => {
                      setPage(p);
                      load(p);
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>


      </main>
    </div>
  );
}
