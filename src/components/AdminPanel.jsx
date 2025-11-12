// src/components/AdminPanel.jsx
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./adminpanel.css"; // we will create styles below

export default function AdminPanel() {
  const { user, logout } = useAuth() || {};
  const [open, setOpen] = useState(false);

  const handleToggle = () => setOpen((v) => !v);

  return (
    <aside className={`admin-panel card ${open ? "open" : ""}`}>
      <div className="admin-top" onClick={handleToggle} role="button" tabIndex={0}>
        <div className="avatar">{(user?.username || "A").charAt(0).toUpperCase()}</div>
        <div className="admin-meta">
          <div className="admin-name">{user?.username || "Admin User"}</div>
          <div className="admin-role">Administrator</div>
        </div>
      </div>

      <div className="admin-body">
        <div className="admin-row"><strong>Name</strong><div>{user?.username || "Admin User"}</div></div>
        <div className="admin-actions">
          
          <button className="btn small" onClick={() => { logout && logout(); }}>Logout</button>
        </div>
      </div>
    </aside>
  );
}
