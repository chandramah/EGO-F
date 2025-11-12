// src/pages/user/UsersList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import UsersService from "../../services/UsersService";
import "../../styles.css";

export default function UsersList() {
  const PAGE_SIZE = 7; // show 7 rows per page
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [page, setPage] = useState(0);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // If navigated back with state.updated, reload list
    if (location && location.state && location.state.updated) {
      loadUsers()
        .then(() => {
          // clear history state so this effect doesn't retrigger repeatedly
          try {
            window.history.replaceState({}, "", location.pathname);
          } catch (e) {
            /* ignore */
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location && location.state && location.state.updated]);

  // normalize many shapes into array
  function normalizeUserList(resp) {
    if (!resp) return [];
    if (Array.isArray(resp)) return resp;
    if (Array.isArray(resp.content)) return resp.content;
    if (Array.isArray(resp.data)) return resp.data;
    if (Array.isArray(resp.users)) return resp.users;
    // sometimes server returns { success:true, data: { ... } }
    if (resp.data && Array.isArray(resp.data.content)) return resp.data.content;
    if (resp.data && Array.isArray(resp.data)) return resp.data;
    // single user object
    if (typeof resp === "object" && (resp.username || resp.id || resp._id)) return [resp];
    console.warn("UsersList: unexpected users response shape", resp);
    return [];
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await UsersService.getUsers();
      const list = normalizeUserList(res);
      setUsers(list || []);
      setPage(0); // reset to first page on fresh load
    } catch (err) {
      console.error("getUsers failed", err);
      setUsers([]);
      setPage(0);
    } finally {
      setLoading(false);
    }
  }

  // Format role into readable text (Admin, Manager, Cashier)
  function formatRole(role) {
    if (!role) return "";
    let r = role;
    if (Array.isArray(role)) r = role[0];
    if (typeof role === "object") {
      r = role.name ?? role.role ?? JSON.stringify(role);
    }
    if (typeof r !== "string") r = String(r);
    r = r.replace(/^ROLE[_\-]/i, "").replace(/^role[_\-]/i, "");
    r = r.toLowerCase();
    return r.charAt(0).toUpperCase() + r.slice(1);
  }

  async function togglePasswordReveal(id) {
    const current = revealedPasswords[id];
    if (current && current.visible) {
      setRevealedPasswords((prev) => ({ ...prev, [id]: { ...prev[id], visible: false } }));
      return;
    }

    try {
      const res = await UsersService.getUser(id);
      const user = res?.data ?? res;
      const pwd = user?.password ?? user?.plainPassword ?? null;
      if (pwd) {
        setRevealedPasswords((prev) => ({ ...prev, [id]: { value: pwd, visible: true } }));
      } else {
        setRevealedPasswords((prev) => ({ ...prev, [id]: { value: null, visible: true } }));
        alert("Password not available from server. Use reset password flow if needed.");
      }
    } catch (err) {
      console.error("Failed to fetch user for password reveal", err);
      alert("Could not retrieve password (see console).");
    }
  }

  function onCreate() {
    navigate("/auth/user/new");
  }

  function onEdit(id) {
    navigate(`/auth/user/${id}/edit`);
  }

  async function onDelete(id) {
    if (!window.confirm("Delete this user?")) return;
    try {
      await UsersService.deleteUser(id);
      // reload users and keep page sensible after deletion
      await loadUsers();
      alert("User deleted");
    } catch (err) {
      console.error("deleteUser error", err);
      alert("Delete failed (see console).");
    }
  }

  // --- Pagination logic ---
  const total = users.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // clamp page to available range
  const safePage = Math.min(Math.max(0, page), Math.max(0, totalPages - 1));
  const startIdx = safePage * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, total);
  const pageUsers = users.slice(startIdx, endIdx);

  // Page navigation helpers
  const handlePrev = () => setPage((p) => Math.max(0, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages - 1, p + 1));
  const goToPage = (p) => setPage(Math.min(Math.max(0, p), totalPages - 1));

  // Render limited page buttons (max 7 visible)
  const pageButtons = useMemo(() => {
    const buttons = [];
    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) buttons.push(i);
      return buttons;
    }
    // center current page in slice
    let start = Math.max(0, safePage - 3);
    let end = Math.min(totalPages, start + 7);
    if (end - start < 7) {
      start = Math.max(0, end - 7);
    }
    for (let i = start; i < end; i++) buttons.push(i);
    return buttons;
  }, [totalPages, safePage]);

  return (
    <div className="dashboard-page">
      <Sidebar />
      <main className="dashboard-main">
        <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Users</h2>
          <div className="header-actions">
            <button className="btn-primary" onClick={onCreate}>
              + Create User
            </button>
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading">Loading…</div>
          ) : (
            <div className="table-wrap">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Password</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {total === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: 28 }}>
                        No users found
                      </td>
                    </tr>
                  ) : (
                    pageUsers.map((u, idx) => {
                      const id = u.id ?? u._id ?? u.username ?? `${startIdx + idx}`;
                      const rp = revealedPasswords[id] || {};
                      const shown = rp.visible && rp.value ? rp.value : null;
                      const noPlaintext = rp.visible && rp.value === null;

                      return (
                        <tr key={id}>
                          <td>{startIdx + idx + 1}</td>
                          <td>{u.username}</td>
                          <td>{formatRole(u.role)}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontFamily: "monospace" }}>{shown ? shown : "••••••••"}</span>
                              <button
                                className="action-btn"
                                onClick={() => togglePasswordReveal(id)}
                                title={rp.visible ? "Hide password" : "Show password"}
                              >
                                {rp.visible ? "🙈" : "👁️"}
                              </button>
                              {noPlaintext && <small style={{ color: "#8b9aa6" }}> (not available)</small>}
                            </div>
                          </td>
                          <td>
                            <button className="action-btn action-edit" onClick={() => onEdit(id)}>
                              Edit
                            </button>
                            <button className="action-btn action-delete" onClick={() => onDelete(id)} style={{ marginLeft: 8 }}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Pagination controls */}
              {total > PAGE_SIZE && (
                <div
                  className="card-footer"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 12,
                  }}
                >
                  <div className="results">
                    Showing {total === 0 ? 0 : startIdx + 1} to {endIdx} of {total} results
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={handlePrev} disabled={safePage === 0} className="btn">
                      Prev
                    </button>

                    <div style={{ display: "flex", gap: 6 }}>
                      {pageButtons.map((p) => (
                        <button
                          key={p}
                          onClick={() => goToPage(p)}
                          className={`btn ${p === safePage ? "active" : ""}`}
                          style={{
                            minWidth: 36,
                            padding: "6px 8px",
                            borderRadius: 4,
                            background: p === safePage ? "#1565c0" : undefined,
                            color: p === safePage ? "#fff" : undefined,
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          {p + 1}
                        </button>
                      ))}
                    </div>

                    <button onClick={handleNext} disabled={safePage >= totalPages - 1} className="btn">
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
