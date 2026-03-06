import { useState, useEffect } from "react";
import KPITracker from "./KPITracker";
import AdminDashboard from "./components/AdminDashboard";
import TeamView from "./components/TeamView";
import LoginPage from "./components/LoginPage";

const BASE = 'https://kpi-tracker-worker.khanhdm.workers.dev/api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("kpi_token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("tracker");

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetchMe();
  }, [token]);

  async function fetchMe() {
    try {
      const res = await fetch(`${BASE}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Invalid token");
      const data = await res.json();
      setUser(data.user);
    } catch {
      localStorage.removeItem("kpi_token");
      setToken(null);
    } finally {
      setLoading(false);
    }
  }

  function handleLogin(newToken) {
    setToken(newToken);
    setLoading(true);
  }

  function handleLogout() {
    localStorage.removeItem("kpi_token");
    localStorage.removeItem("kpi_user");
    setToken(null);
    setUser(null);
  }

  if (loading) return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#f8fafc",
      fontFamily: "'DM Mono','Courier New',monospace",
    }}>
      <div style={{ textAlign: "center", color: "#64748b" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <div style={{ fontSize: 16, letterSpacing: 2 }}>LOADING...</div>
      </div>
    </div>
  );

  if (!token || !user) return <LoginPage onLogin={handleLogin} />;

  const isAdmin = user.role === "admin";
  const isLeaderOrAdmin = user.role === "team_leader" || user.role === "admin";

  const ROLE_COLORS = {
    admin: { bg: "#fef3c7", color: "#d97706" },
    team_leader: { bg: "#dbeafe", color: "#1d4ed8" },
    member: { bg: "#f1f5f9", color: "#64748b" },
  };
  const rc = ROLE_COLORS[user.role] || ROLE_COLORS.member;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Top nav */}
      <div style={{
        background: "#1e3a8a", padding: "14px 28px",
        display: "flex", alignItems: "center",
        justifyContent: "space-between", flexWrap: "wrap", gap: 10,
      }}>
        {/* View switcher */}
        <div style={{ display: "flex", gap: 4, background: "#1e40af", borderRadius: 10, padding: 4 }}>
          {[
            { key: "tracker", label: "◉ TRACKER" },
            ...(isLeaderOrAdmin ? [{ key: "team", label: "◈ TEAM" }] : []),
            ...(isAdmin ? [{ key: "admin", label: "▦ ADMIN" }] : []),
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveView(key)} style={{
              padding: "8px 18px",
              background: activeView === key ? "#fff" : "transparent",
              color: activeView === key ? "#1e40af" : "#93c5fd",
              border: "none", cursor: "pointer",
              fontFamily: "'DM Mono','Courier New',monospace",
              fontSize: 14, fontWeight: 700, letterSpacing: 1, borderRadius: 8,
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* User badge + logout */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "#1e40af", borderRadius: 10, padding: "8px 14px",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "#3b82f6", display: "flex", alignItems: "center",
              justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14,
            }}>
              {(user.name || user.email || "?")[0].toUpperCase()}
            </div>
            <div>
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
                {user.name || user.email}
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "1px 6px",
                borderRadius: 10, background: rc.bg,