import { useState } from "react";

const C = {
  bg: "#f8fafc", card: "#ffffff", border: "#e2e8f0",
  text: "#1e293b", muted: "#64748b",
};

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const BASE = 'https://kpi-tracker-worker.khanhdm.workers.dev/api';
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const body = mode === "login"
        ? { email, password }
        : { email, password, name };

      const res = await fetch(`${BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      // Lưu token vào localStorage
      localStorage.setItem("kpi_token", data.token);
      localStorage.setItem("kpi_user", JSON.stringify({
        email,
        name: data.name,
        role: data.role,
      }));

      onLogin(data.token);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#1e3a8a",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Mono','Courier New',monospace",
    }}>
      <div style={{
        background: C.card, borderRadius: 16, padding: "40px 36px",
        width: "100%", maxWidth: 400, boxShadow: "0 20px 60px #0004",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 12, letterSpacing: 4, color: C.muted, marginBottom: 8 }}>
            KPI TRACKER 2026
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#1e3a8a" }}>
            {mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "#fee2e2", border: "1px solid #fca5a5",
            borderRadius: 8, padding: "10px 14px",
            fontSize: 13, color: "#dc2626", marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {/* Name field (register only) */}
        {mode === "register" && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, letterSpacing: 3, color: C.muted, fontWeight: 700, display: "block", marginBottom: 6 }}>
              FULL NAME
            </label>
            <input
              type="text" value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nguyen Van A"
              style={{
                width: "100%", boxSizing: "border-box",
                border: `1.5px solid ${C.border}`, borderRadius: 8,
                padding: "11px 14px", fontSize: 14, fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>
        )}

        {/* Email */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, letterSpacing: 3, color: C.muted, fontWeight: 700, display: "block", marginBottom: 6 }}>
            EMAIL
          </label>
          <input
            type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
            style={{
              width: "100%", boxSizing: "border-box",
              border: `1.5px solid ${C.border}`, borderRadius: 8,
              padding: "11px 14px", fontSize: 14, fontFamily: "inherit",
              outline: "none",
            }}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 11, letterSpacing: 3, color: C.muted, fontWeight: 700, display: "block", marginBottom: 6 }}>
            PASSWORD
          </label>
          <input
            type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={{
              width: "100%", boxSizing: "border-box",
              border: `1.5px solid ${C.border}`, borderRadius: 8,
              padding: "11px 14px", fontSize: 14, fontFamily: "inherit",
              outline: "none",
            }}
          />
          {mode === "register" && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
              Tối thiểu 6 ký tự
            </div>
          )}
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%", padding: "13px 0",
            background: loading ? "#93c5fd" : "#1e40af",
            color: "#fff", border: "none", borderRadius: 8,
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit", fontSize: 15, fontWeight: 800,
            letterSpacing: 1, transition: "background .2s",
          }}
        >
          {loading ? "..." : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
        </button>

        {/* Switch mode */}
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: C.muted }}>
          {mode === "login" ? (
            <>Chưa có tài khoản?{" "}
              <span onClick={() => { setMode("register"); setError(null); }}
                style={{ color: "#1e40af", cursor: "pointer", fontWeight: 700 }}>
                Đăng ký
              </span>
            </>
          ) : (
            <>Đã có tài khoản?{" "}
              <span onClick={() => { setMode("login"); setError(null); }}
                style={{ color: "#1e40af", cursor: "pointer", fontWeight: 700 }}>
                Đăng nhập
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}