// src/pages/auth/UserForm.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar";
import UsersService from "../../services/UsersService";
import "../../styles.css";

export default function UserForm() {
  const { id } = useParams(); // optional id for edit
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", password: "", role: "CASHIER" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadUser() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await UsersService.getUser(id);
        const user = res?.data ?? res;
        if (!mounted) return;
        const roleFromServer = extractRole(user.role);
        setForm({
          username: user.username || "",
          password: "", // never prefill password
          role: (roleFromServer || "CASHIER").toUpperCase(),
        });
      } catch (err) {
        console.error("getUser failed", err);
        alert("Could not load user (see console).");
        navigate(-1);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadUser();
    return () => (mounted = false);
    // eslint-disable-next-line
  }, [id]);

  function extractRole(role) {
    if (!role) return null;
    if (Array.isArray(role)) return String(role[0]);
    if (typeof role === "object") return role.name ?? role.role ?? null;
    return String(role);
  }

  function onChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.username) { alert("Username required"); return; }
    if (!id && !form.password) { alert("Password required for new user"); return; }

    setSaving(true);
    try {
      if (id) {
        const payload = { username: form.username, role: form.role };
        if (form.password) payload.password = form.password;
        await UsersService.updateUser(id, payload);
        alert("Successfully edited");
      } else {
        const payload = { username: form.username, password: form.password, role: form.role };
        const res = await UsersService.registerUser(payload);
        if (res && res.success === false) throw new Error(res.message || "Signup failed");
        alert("User created");
      }

      // Navigate back and indicate list should refresh
      navigate("/user/users", { state: { updated: true } });
    } catch (err) {
      console.error("save error", err);
      alert(err?.response?.data?.message || err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard-page">
      <Sidebar />
      <main className="dashboard-main">
        <div className="page-header"><h2>{id ? "Edit User" : "Create User"}</h2></div>

        <div className="card form-card">
          {loading ? <div className="loading">Loading…</div> : (
            <form className="product-form" onSubmit={onSubmit}>
              <div className="form-grid">
                <label>
                  Username
                  <input name="username" value={form.username} onChange={onChange} placeholder="Username" />
                </label>

                <label>
                  Password
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={onChange}
                    placeholder={id ? "Leave blank to keep current password" : "Password"}
                  />
                </label>

                <label>
                  Role
                  <select name="role" value={form.role} onChange={onChange}>
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="CASHIER">Cashier</option>
                  </select>
                  

                </label>
              </div>

              <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Back</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : (id ? "Save Changes" : "Create User")}</button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
