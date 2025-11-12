// src/pages/auth/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthService from "../../services/AuthService";
import { useAuth } from "../../context/AuthContext";
import "../../styles.css";

function normalizeRole(roleRaw) {
  if (!roleRaw) return "";
  let r = roleRaw;
  if (Array.isArray(roleRaw) && roleRaw.length) r = roleRaw[0];
  if (typeof r === "object") r = r.name ?? r.role ?? r.authority ?? "";
  return String(r || "").toUpperCase().replace(/^ROLE[_\-]/, "");
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const auth = useAuth();

  // central login helper: calls AuthService and tries to update context if available
  const doLogin = async (usernm, pwd) => {
    setError("");
    try {
      // 1) call AuthService.login (will set cookies / token if implemented)
      const payload = await AuthService.login({ username: usernm, password: pwd });

      // 2) try to let AuthContext manage login if it exposes login()
      //    (some projects store user in context & call profile endpoint)
      if (auth && typeof auth.login === "function") {
        try {
          await auth.login(usernm, pwd);
        } catch (e) {
          // ignore; we'll still try to get user from stored user below
        }
      }

      // 3) try to determine the user object (payload may be token/user/combined)
      const possibleUser =
        payload?.user || // common shape
        payload?.data?.user ||
        payload?.data ||
        payload;

      // 4) check stored user from AuthService (login may have stored it)
      const stored = AuthService.getStoredUser();
      const finalUser =
        possibleUser && typeof possibleUser === "object" && (possibleUser.username || possibleUser.role || possibleUser.id || possibleUser.email)
          ? possibleUser
          : stored;

      // 5) if we still have a finalUser, ensure it's stored (idempotent)
      if (finalUser) AuthService.storeUser(finalUser);

      // 6) compute normalized role and route accordingly
      const role = normalizeRole(finalUser?.role ?? finalUser?.roles ?? finalUser?.authority ?? finalUser?.authorities);
      if (role.includes("ADMIN")) {
        navigate("/", { replace: true }); // admin -> main dashboard
      } else if (role.includes("MANAGER")) {
        navigate("/manager", { replace: true });
      } else if (role.includes("CASHIER")) {
        navigate("/cashier", { replace: true });
      } else {
        // fallback to home
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Login failed");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    await doLogin(username, password);
  };

  
  return (
    <div className="login-page">
      <main className="login-main">
        <div className="login-card" role="main" aria-labelledby="login-title">
          <h1 id="login-title" className="login-title">Sign in</h1>
          <p className="login-subtitle">Inventory & POS — enter credentials to continue</p>

          <form className="login-form" onSubmit={submit} noValidate>
            <label className="field">
              <span className="field-label">Username</span>
              <div className="input-wrap">
                <input
                  className="input"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </label>

            <label className="field">
              <span className="field-label">Password</span>
              <div className="input-wrap">
                <input
                  className="input"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </label>

            <div className="login-row">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary" type="submit">Log in</button>
              
            </div>

          

            {error && <div className="form-error" role="alert" style={{ marginTop: 12 }}>{error}</div>}
          </form>

          <footer className="login-footer">
            <small>© {new Date().getFullYear()} Small Business — Inventory & POS</small>
          </footer>
        </div>
      </main>
    </div>
  );
}
