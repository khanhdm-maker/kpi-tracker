import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";

const KPI = [
  { month: 1, label: "January",   revenue: 2000000, profit: 181818 },
  { month: 2, label: "February",  revenue: 2060000, profit: 187273 },
  { month: 3, label: "March",     revenue: 2121800, profit: 192891 },
  { month: 4, label: "April",     revenue: 2227890, profit: 202535 },
  { month: 5, label: "May",       revenue: 2339285, profit: 212662 },
  { month: 6, label: "June",      revenue: 2456249, profit: 223295 },
  { month: 7, label: "July",      revenue: 2652749, profit: 241159 },
  { month: 8, label: "August",    revenue: 2864969, profit: 260452 },
  { month: 9, label: "September", revenue: 3094166, profit: 281288 },
  { month: 10, label: "October",  revenue: 3403583, profit: 309417 },
  { month: 11, label: "November", revenue: 3743941, profit: 340358 },
  { month: 12, label: "December", revenue: 4118335, profit: 374394 },
];

const TOTAL_KPI_REV    = KPI.reduce((s, k) => s + k.revenue, 0);
const TOTAL_KPI_PROFIT = KPI.reduce((s, k) => s + k.profit, 0);
const ROI_KPI          = 10;
const DAYS_IN_MONTH    = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const parseMoney = (s) => {
  const c = String(s).replace(/[$,\s]/g, "");
  return c === "" ? null : isNaN(parseFloat(c)) ? null : parseFloat(c);
};

const fmtBig = (v) => {
  if (v === null || v === undefined) return "—";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return `$${Number(v).toLocaleString()}`;
};

const fmtShort = (v) => {
  if (v === null || v === undefined || v === 0) return "$0";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
};

const pct = (actual, target) =>
  target > 0 && actual !== null ? +((actual / target) * 100).toFixed(1) : null;

const statusOf = (p) => {
  if (p === null) return { color: "#94a3b8", bg: "#f1f5f9", label: "PENDING" };
  if (p >= 100)   return { color: "#16a34a", bg: "#dcfce7", label: "ON TRACK" };
  if (p >= 80)    return { color: "#d97706", bg: "#fef3c7", label: "NEAR" };
  return           { color: "#dc2626", bg: "#fee2e2", label: "BEHIND" };
};

const C = {
  rev: "#2563eb", cost: "#f97316", profit: "#16a34a", kpi: "#9333ea",
  bg: "#f8fafc", card: "#ffffff", border: "#e2e8f0",
  text: "#1e293b", muted: "#64748b", light: "#f1f5f9",
};

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function SummaryCard({ label, value, sub, pctVal, color }) {
  const st = statusOf(pctVal);
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 3px #0001" }}>
      <div style={{ fontSize: 13, letterSpacing: 2, color: C.muted, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 23, fontWeight: 800, color: color || C.text, marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: pctVal !== null ? 10 : 0 }}>{sub}</div>
      {pctVal !== null && (
        <>
          <div style={{ height: 5, background: C.light, borderRadius: 5, overflow: "hidden", marginBottom: 6 }}>
            <div style={{ height: "100%", width: `${Math.min(pctVal, 100)}%`, background: st.color, borderRadius: 5, transition: "width .6s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: st.color }}>{pctVal}% of KPI</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
          </div>
        </>
      )}
    </div>
  );
}

function ResultCard({ label, actual, target, pctVal, color }) {
  const st = statusOf(pctVal);
  return (
    <div style={{ background: C.card, border: `1.5px solid ${actual !== null ? color + "55" : C.border}`, borderRadius: 12, padding: 18, flex: 1, boxShadow: actual !== null ? `0 2px 12px ${color}15` : "none" }}>
      <div style={{ fontSize: 12, letterSpacing: 3, color: C.muted, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: actual !== null ? C.text : "#cbd5e1" }}>{fmtBig(actual)}</div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>KPI target: {fmtBig(target)}</div>
      <div style={{ height: 6, background: C.light, borderRadius: 6, overflow: "hidden", marginBottom: 8 }}>
        <div style={{ height: "100%", width: pctVal !== null ? `${Math.min(pctVal, 100)}%` : "0%", background: pctVal !== null ? st.color : C.light, borderRadius: 6, transition: "width .7s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 18, fontWeight: 900, color: pctVal !== null ? st.color : "#cbd5e1" }}>{pctVal !== null ? `${pctVal}%` : "—"}</span>
        {pctVal !== null && <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", boxShadow: "0 4px 16px #0002", fontSize: 13 }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: C.text }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: p.fill || p.color }} />
          <span style={{ color: C.muted }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: C.text }}>{fmtShort(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function KPITracker() {
  const [view, setView]               = useState("month");
  const [activeMonth, setActiveMonth] = useState(0);
  const [chartMetric, setChartMetric] = useState("revenue");
  const [chartType, setChartType]     = useState("monthly");
  const [activeDay, setActiveDay]     = useState(1);

  const [monthlyActuals, setMonthlyActuals] = useState(
    Array(12).fill(null).map(() => ({ revenue: "", cost: "", profit: "" }))
  );
  const [dailyActuals, setDailyActuals] = useState(
    Array(12).fill(null).map((_, mi) =>
      Array(DAYS_IN_MONTH[mi]).fill(null).map(() => ({ cost: "", revenue: "" }))
    )
  );

  const derived = monthlyActuals.map((a, i) => {
    const hasDailyRev  = dailyActuals[i].some((d) => parseMoney(d.revenue) !== null);
    const hasDailyCost = dailyActuals[i].some((d) => parseMoney(d.cost)    !== null);
    const dailySumRev  = dailyActuals[i].reduce((s, d) => s + (parseMoney(d.revenue) ?? 0), 0);
    const dailySumCost = dailyActuals[i].reduce((s, d) => s + (parseMoney(d.cost)    ?? 0), 0);
    let rev  = hasDailyRev  ? dailySumRev  : parseMoney(a.revenue);
    let cost = hasDailyCost ? dailySumCost : parseMoney(a.cost);
    let prof = parseMoney(a.profit);
    if (prof === null && rev !== null && cost !== null) prof = rev - cost;
    const roi = rev && rev > 0 && prof !== null ? (prof / rev) * 100 : null;
    return { rev, cost, prof, roi, hasDailyRev, hasDailyCost };
  });

  const totalActualRev    = derived.reduce((s, d) => s + (d.rev  ?? 0), 0);
  const totalActualProfit = derived.reduce((s, d) => s + (d.prof ?? 0), 0);
  const totalActualCost   = derived.reduce((s, d) => s + (d.cost ?? 0), 0);
  const filledCount       = derived.filter((d) => d.rev !== null).length;
  const revPctTotal       = filledCount > 0 ? pct(totalActualRev,    TOTAL_KPI_REV)    : null;
  const profitPctTotal    = filledCount > 0 ? pct(totalActualProfit, TOTAL_KPI_PROFIT) : null;

  const m   = activeMonth;
  const kpi = KPI[m];
  const d   = derived[m];
  const a   = monthlyActuals[m];

  const setField      = (idx, field, val) =>
    setMonthlyActuals((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  const setDailyField = (mi, day, field, val) =>
    setDailyActuals((prev) => prev.map((month, i) =>
      i !== mi ? month : month.map((dd, di) => di === day - 1 ? { ...dd, [field]: val } : dd)
    ));

  const monthlyChartData = KPI.map((k, i) => ({
    name: MONTHS_SHORT[i],
    "KPI Target": chartMetric === "profit" ? k.profit : k.revenue,
    Actual: derived[i][chartMetric === "revenue" ? "rev" : chartMetric === "cost" ? "cost" : "prof"] ?? 0,
  }));

  const dailyChartData = useMemo(() =>
    dailyActuals[m].map((day, i) => ({
      name: `D${i + 1}`,
      Cost:    parseMoney(day.cost)    ?? 0,
      Revenue: parseMoney(day.revenue) ?? 0,
      Profit:  (parseMoney(day.revenue) ?? 0) - (parseMoney(day.cost) ?? 0),
    }))
  , [dailyActuals, m]);

  const inputStyle = (filled) => ({
    width: "100%", boxSizing: "border-box",
    background: filled ? "#eff6ff" : "#f8fafc",
    border: `1.5px solid ${filled ? "#93c5fd" : C.border}`,
    borderRadius: 8, color: C.text,
    fontFamily: "'DM Mono','Courier New',monospace",
    fontSize: 14, padding: "10px 12px", outline: "none",
  });

  const TAB = (key, label) => (
    <button key={key} onClick={() => setView(key)} style={{
      padding: "9px 16px", background: view === key ? "#1e40af" : "transparent",
      color: view === key ? "#fff" : C.muted, border: "none", cursor: "pointer",
      fontFamily: "inherit", fontSize: 13, fontWeight: 700, letterSpacing: 1,
      borderRadius: 8,
    }}>{label}</button>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Mono','Courier New',monospace", color: C.text }}>

      {/* HEADER */}
      <div style={{ background: "#1e3a8a", padding: "18px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: 4, color: "#93c5fd", marginBottom: 3 }}>KPI PHẢI ĐẠT 2026 · $33M REV · $3M PROFIT · 10% ROI</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>Performance Tracker</div>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#1e40af", borderRadius: 10, padding: 4 }}>
          {TAB("month",    "◉ MONTH")}
          {TAB("daily",    "◈ DAILY")}
          {TAB("overview", "▦ OVERVIEW")}
          {TAB("chart",    "▲ CHARTS")}
        </div>
      </div>

      {/* SUMMARY STRIP */}
      <div style={{ padding: "20px 28px 0", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14 }}>
        <SummaryCard label="YTD REVENUE"   value={fmtBig(totalActualRev)}    sub={`Target ${fmtBig(TOTAL_KPI_REV)}`}    pctVal={revPctTotal}    color={C.rev}    />
        <SummaryCard label="YTD PROFIT"    value={fmtBig(totalActualProfit)} sub={`Target ${fmtBig(TOTAL_KPI_PROFIT)}`} pctVal={profitPctTotal} color={C.profit} />
        <SummaryCard label="YTD COST"      value={fmtBig(totalActualCost)}   sub="Total actual spend"                   pctVal={null}                            />
        <SummaryCard label="MONTHS FILED"  value={`${filledCount} / 12`}     sub="months with data"
          pctVal={filledCount > 0 ? +((filledCount / 12) * 100).toFixed(0) : null} />
      </div>

      {/* ── MONTH VIEW ── */}
      {view === "month" && (
        <div style={{ padding: "20px 28px 32px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {KPI.map((k, i) => {
              const d2 = derived[i]; const filled = d2.rev !== null;
              const p = pct(d2.rev, k.revenue); const st = statusOf(p);
              return (
                <button key={i} onClick={() => setActiveMonth(i)} style={{
                  padding: "6px 14px", borderRadius: 8, fontFamily: "inherit", fontSize: 13,
                  fontWeight: activeMonth === i ? 800 : 500,
                  border: activeMonth === i ? `2px solid ${filled ? st.color : "#1e40af"}` : `1px solid ${C.border}`,
                  background: activeMonth === i ? (filled ? st.bg : "#eff6ff") : C.card,
                  color: filled ? st.color : activeMonth === i ? "#1e40af" : C.muted,
                  cursor: "pointer", position: "relative",
                }}>
                  {k.label.slice(0, 3).toUpperCase()}
                  {filled && <span style={{ position: "absolute", top: -4, right: -4, width: 8, height: 8, borderRadius: "50%", background: st.color, border: "2px solid #f8fafc" }} />}
                </button>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {/* Input card */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, boxShadow: "0 2px 8px #0001", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 4, color: C.muted, fontWeight: 600 }}>MONTHLY ACTUALS FOR</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: C.text, marginTop: 2 }}>{kpi.label}</div>
                <div style={{ fontSize: 13, color: C.muted }}>Month {kpi.month} of 12</div>
              </div>
              <div style={{ background: "#eff6ff", borderRadius: 10, padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "KPI REVENUE", val: fmtBig(kpi.revenue), color: C.rev },
                  { label: "KPI PROFIT",  val: fmtBig(kpi.profit),  color: C.profit },
                  { label: "KPI ROI",     val: `${ROI_KPI}%`,        color: C.kpi },
                ].map(({ label, val, color }) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, letterSpacing: 2, color: C.muted, marginBottom: 2, fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color }}>{val}</div>
                  </div>
                ))}
              </div>

              {(d.hasDailyRev || d.hasDailyCost) && (
                <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#92400e" }}>
                  ⚡ Daily entries detected — revenue/cost auto-summed from daily data.
                </div>
              )}

              {[
                { field: "cost",    label: "ACTUAL COST",    placeholder: "e.g. 1800000",    hint: "Total operating cost",        color: C.cost   },
                { field: "revenue", label: "ACTUAL REVENUE", placeholder: "e.g. 2100000",    hint: "Total sales revenue",          color: C.rev    },
                { field: "profit",  label: "ACTUAL PROFIT",  placeholder: "auto-calculated", hint: "Leave blank → auto = Rev−Cost", color: C.profit },
              ].map(({ field, label, placeholder, hint, color }) => (
                <div key={field}>
                  <label style={{ fontSize: 11, letterSpacing: 3, color, display: "block", marginBottom: 5, fontWeight: 700 }}>{label}</label>
                  <input type="text" value={a[field]}
                    onChange={(e) => setField(m, field, e.target.value)}
                    placeholder={placeholder}
                    disabled={field !== "profit" && (field === "revenue" ? d.hasDailyRev : d.hasDailyCost)}
                    style={{ ...inputStyle(!!a[field]), opacity: field !== "profit" && (field === "revenue" ? d.hasDailyRev : d.hasDailyCost) ? 0.5 : 1 }}
                    onFocus={(e) => { e.target.style.border = `1.5px solid ${color}`; }}
                    onBlur={(e)  => { e.target.style.border = a[field] ? "1.5px solid #93c5fd" : `1.5px solid ${C.border}`; }}
                  />
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{hint}</div>
                </div>
              ))}
            </div>

            {/* Results */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <ResultCard label="REVENUE" actual={d.rev}  target={kpi.revenue} pctVal={pct(d.rev,  kpi.revenue)} color={C.rev}    />
              <ResultCard label="PROFIT"  actual={d.prof} target={kpi.profit}  pctVal={pct(d.prof, kpi.profit)}  color={C.profit} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, letterSpacing: 3, color: C.muted, marginBottom: 6, fontWeight: 600 }}>COST</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: d.cost !== null ? C.cost : "#cbd5e1" }}>{fmtBig(d.cost)}</div>
                  {d.rev !== null && d.cost !== null && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{((d.cost / d.rev) * 100).toFixed(1)}% of revenue</div>}
                </div>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, letterSpacing: 3, color: C.muted, marginBottom: 6, fontWeight: 600 }}>ROI</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: d.roi !== null ? statusOf(pct(d.roi, ROI_KPI)).color : "#cbd5e1" }}>
                    {d.roi !== null ? `${d.roi.toFixed(2)}%` : "—"}
                  </div>
                  <div style={{ fontSize: 13, color: C.muted }}>KPI: {ROI_KPI}%</div>
                  {d.roi !== null && (
                    <div style={{ marginTop: 8, height: 4, background: C.light, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min((d.roi / ROI_KPI) * 100, 100)}%`, background: statusOf(pct(d.roi, ROI_KPI)).color, borderRadius: 4, transition: "width .6s" }} />
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[["← PREV", () => setActiveMonth(Math.max(0,  m - 1)), m === 0],
                  ["NEXT →", () => setActiveMonth(Math.min(11, m + 1)), m === 11]
                ].map(([lbl, fn, dis]) => (
                  <button key={lbl} onClick={fn} disabled={dis} style={{
                    flex: 1, padding: "10px 0", borderRadius: 8, fontFamily: "inherit", fontSize: 14, fontWeight: 700,
                    border: `1px solid ${dis ? C.border : "#1e40af"}`,
                    background: dis ? C.light : "#eff6ff", color: dis ? "#cbd5e1" : "#1e40af",
                    cursor: dis ? "not-allowed" : "pointer",
                  }}>{lbl}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DAILY VIEW ── */}
      {view === "daily" && (
        <div style={{ padding: "20px 28px 32px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {KPI.map((k, i) => {
              const filled = dailyActuals[i].some((d2) => parseMoney(d2.revenue) !== null || parseMoney(d2.cost) !== null);
              return (
                <button key={i} onClick={() => { setActiveMonth(i); setActiveDay(1); }} style={{
                  padding: "6px 14px", borderRadius: 8, fontFamily: "inherit", fontSize: 13,
                  fontWeight: activeMonth === i ? 800 : 500,
                  border: activeMonth === i ? "2px solid #1e40af" : `1px solid ${C.border}`,
                  background: activeMonth === i ? "#eff6ff" : C.card,
                  color: activeMonth === i ? "#1e40af" : C.muted,
                  cursor: "pointer", position: "relative",
                }}>
                  {k.label.slice(0, 3).toUpperCase()}
                  {filled && <span style={{ position: "absolute", top: -4, right: -4, width: 8, height: 8, borderRadius: "50%", background: "#f97316", border: "2px solid #f8fafc" }} />}
                </button>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 18 }}>
            {/* Day list */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 12, letterSpacing: 2, color: C.muted, fontWeight: 700 }}>
                {KPI[m].label.toUpperCase()} · DAYS
              </div>
              <div style={{ maxHeight: 460, overflowY: "auto" }}>
                {Array.from({ length: DAYS_IN_MONTH[m] }, (_, i) => {
                  const day = i + 1;
                  const dd  = dailyActuals[m][i];
                  const has = parseMoney(dd.revenue) !== null || parseMoney(dd.cost) !== null;
                  return (
                    <div key={day} onClick={() => setActiveDay(day)} style={{
                      padding: "10px 16px", cursor: "pointer",
                      background: activeDay === day ? "#eff6ff" : "transparent",
                      borderLeft: activeDay === day ? "3px solid #1e40af" : "3px solid transparent",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <span style={{ fontWeight: activeDay === day ? 800 : 500, color: activeDay === day ? "#1e40af" : C.text, fontSize: 13 }}>Day {day}</span>
                      {has && <span style={{ fontSize: 13, color: "#f97316" }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Day input */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
                <div style={{ fontSize: 11, letterSpacing: 4, color: C.muted, fontWeight: 600 }}>DAILY ENTRY</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: C.text, marginBottom: 12 }}>{KPI[m].label} — Day {activeDay}</div>
                <div style={{ display: "flex", gap: 16, marginBottom: 16, background: "#eff6ff", borderRadius: 8, padding: "10px 14px", flexWrap: "wrap" }}>
                  {[
                    { label: "MONTHLY KPI REV",   val: fmtBig(kpi.revenue), color: C.rev    },
                    { label: "MONTHLY KPI PROFIT", val: fmtBig(kpi.profit),  color: C.profit },
                    { label: "DAILY AVG NEEDED",   val: fmtBig(Math.round(kpi.revenue / DAYS_IN_MONTH[m])), color: C.muted },
                  ].map(({ label, val, color }) => (
                    <div key={label}>
                      <div style={{ fontSize: 10, letterSpacing: 1, color: C.muted, fontWeight: 700, marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {[
                    { field: "cost",    label: "DAILY COST",    color: C.cost },
                    { field: "revenue", label: "DAILY REVENUE", color: C.rev  },
                  ].map(({ field, label, color }) => {
                    const val = dailyActuals[m][activeDay - 1][field];
                    return (
                      <div key={field}>
                        <label style={{ fontSize: 11, letterSpacing: 3, color, display: "block", marginBottom: 5, fontWeight: 700 }}>{label}</label>
                        <input type="text" value={val}
                          onChange={(e) => setDailyField(m, activeDay, field, e.target.value)}
                          placeholder="0" style={inputStyle(!!val)}
                          onFocus={(e) => { e.target.style.border = `1.5px solid ${color}`; }}
                          onBlur={(e)  => { e.target.style.border = val ? "1.5px solid #93c5fd" : `1.5px solid ${C.border}`; }}
                        />
                      </div>
                    );
                  })}
                </div>
                {(() => {
                  const dd   = dailyActuals[m][activeDay - 1];
                  const rev  = parseMoney(dd.revenue);
                  const cost = parseMoney(dd.cost);
                  const prof = rev !== null && cost !== null ? rev - cost : null;
                  return prof !== null ? (
                    <div style={{ marginTop: 14, background: prof >= 0 ? "#dcfce7" : "#fee2e2", borderRadius: 8, padding: "10px 14px" }}>
                      <span style={{ fontSize: 13, color: C.muted }}>Day profit: </span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: prof >= 0 ? C.profit : "#dc2626" }}>{fmtBig(prof)}</span>
                    </div>
                  ) : null;
                })()}
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  {[["← PREV DAY", () => setActiveDay(Math.max(1, activeDay - 1)), activeDay === 1],
                    ["NEXT DAY →", () => setActiveDay(Math.min(DAYS_IN_MONTH[m], activeDay + 1)), activeDay === DAYS_IN_MONTH[m]]
                  ].map(([lbl, fn, dis]) => (
                    <button key={lbl} onClick={fn} disabled={dis} style={{
                      flex: 1, padding: "9px 0", borderRadius: 8, fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                      border: `1px solid ${dis ? C.border : "#1e40af"}`,
                      background: dis ? C.light : "#eff6ff", color: dis ? "#cbd5e1" : "#1e40af",
                      cursor: dis ? "not-allowed" : "pointer",
                    }}>{lbl}</button>
                  ))}
                </div>
              </div>

              {/* Cumulative progress */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
                <div style={{ fontSize: 12, letterSpacing: 2, color: C.muted, fontWeight: 700, marginBottom: 4 }}>{KPI[m].label.toUpperCase()} · CUMULATIVE vs KPI</div>
                {[
                  { label: "REVENUE", actual: derived[m].rev,  target: kpi.revenue, color: C.rev    },
                  { label: "COST",    actual: derived[m].cost, target: null,         color: C.cost   },
                  { label: "PROFIT",  actual: derived[m].prof, target: kpi.profit,  color: C.profit },
                ].map(({ label, actual, target, color }) => {
                  const p  = target ? pct(actual, target) : null;
                  const st = statusOf(p);
                  const daysLeft  = DAYS_IN_MONTH[m] - dailyActuals[m].filter((d2) => parseMoney(d2.revenue) !== null || parseMoney(d2.cost) !== null).length;
                  const remaining = target && actual !== null ? target - actual : null;
                  const dailyNeeded = remaining !== null && daysLeft > 0 ? remaining / daysLeft : null;
                  return (
                    <div key={label} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                        <div>
                          <span style={{ fontSize: 11, letterSpacing: 2, color: C.muted, fontWeight: 700 }}>{label} </span>
                          <span style={{ fontSize: 16, fontWeight: 900, color: actual !== null ? color : "#cbd5e1" }}>{fmtBig(actual)}</span>
                        </div>
                        {target && <div style={{ fontSize: 12, color: C.muted }}>KPI: {fmtBig(target)} {p !== null && <span style={{ fontWeight: 800, color: st.color }}>{p}%</span>}</div>}
                      </div>
                      {target && <div style={{ height: 6, background: C.light, borderRadius: 6, overflow: "hidden", marginBottom: 5 }}><div style={{ height: "100%", borderRadius: 6, width: p !== null ? `${Math.min(p, 100)}%` : "0%", background: p !== null ? st.color : C.light, transition: "width .6s" }} /></div>}
                      {dailyNeeded !== null && dailyNeeded > 0 && <div style={{ fontSize: 12, color: C.muted }}>Need <strong style={{ color }}>{fmtBig(dailyNeeded)}/day</strong> for {daysLeft} days to hit KPI</div>}
                      {p !== null && p >= 100 && <div style={{ fontSize: 12, color: C.profit, fontWeight: 700 }}>✓ KPI achieved!</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── OVERVIEW ── */}
      {view === "overview" && (
        <div style={{ padding: "20px 28px 32px", overflowX: "auto" }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  {["MONTH","KPI REV","ACT COST","ACT REV","REV %","KPI PROFIT","ACT PROFIT","PROFIT %","ROI","STATUS"].map((h) => (
                    <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, letterSpacing: 2, color: C.muted, fontWeight: 700, borderBottom: `2px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {KPI.map((k, i) => {
                  const d2 = derived[i]; const rp = pct(d2.rev, k.revenue); const pp = pct(d2.prof, k.profit);
                  const rs = statusOf(rp); const hasData = d2.rev !== null;
                  return (
                    <tr key={i} onClick={() => { setActiveMonth(i); setView("month"); }}
                      style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc", cursor: "pointer", borderBottom: `1px solid ${C.border}` }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#f8fafc")}>
                      <td style={{ padding: "11px 14px", fontWeight: 700, color: "#1e40af" }}>{k.label}</td>
                      <td style={{ padding: "11px 14px", color: C.muted }}>{fmtBig(k.revenue)}</td>
                      <td style={{ padding: "11px 14px", color: hasData ? C.cost : "#cbd5e1" }}>{fmtBig(d2.cost)}</td>
                      <td style={{ padding: "11px 14px", color: hasData ? C.rev  : "#cbd5e1" }}>{fmtBig(d2.rev)}</td>
                      <td style={{ padding: "11px 14px" }}>
                        {rp !== null
                          ? <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ width: 44, height: 5, background: C.light, borderRadius: 5, overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.min(rp, 100)}%`, background: rs.color }} /></div>
                              <span style={{ color: rs.color, fontWeight: 700, fontSize: 11 }}>{rp}%</span>
                            </div>
                          : <span style={{ color: "#cbd5e1" }}>—</span>}
                      </td>
                      <td style={{ padding: "11px 14px", color: C.muted }}>{fmtBig(k.profit)}</td>
                      <td style={{ padding: "11px 14px", color: hasData ? C.profit : "#cbd5e1" }}>{fmtBig(d2.prof)}</td>
                      <td style={{ padding: "11px 14px" }}>{pp !== null ? <span style={{ color: statusOf(pp).color, fontWeight: 700 }}>{pp}%</span> : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                      <td style={{ padding: "11px 14px", color: d2.roi !== null ? "#059669" : "#cbd5e1" }}>{d2.roi !== null ? `${d2.roi.toFixed(1)}%` : "—"}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: hasData ? rs.bg : C.light, color: hasData ? rs.color : C.muted }}>
                          {hasData ? rs.label : "PENDING"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "#e0f2fe", borderTop: "2px solid #bae6fd" }}>
                  <td style={{ padding: "12px 14px", fontWeight: 900, color: "#0369a1", letterSpacing: 1 }}>TOTAL</td>
                  <td style={{ padding: "12px 14px", color: C.muted,   fontWeight: 700 }}>{fmtBig(TOTAL_KPI_REV)}</td>
                  <td style={{ padding: "12px 14px", color: C.cost,    fontWeight: 700 }}>{fmtBig(totalActualCost)}</td>
                  <td style={{ padding: "12px 14px", color: C.rev,     fontWeight: 700 }}>{fmtBig(totalActualRev)}</td>
                  <td style={{ padding: "12px 14px" }}>{revPctTotal    !== null && <span style={{ color: statusOf(revPctTotal).color,    fontWeight: 900 }}>{revPctTotal}%</span>}</td>
                  <td style={{ padding: "12px 14px", color: C.muted,   fontWeight: 700 }}>{fmtBig(TOTAL_KPI_PROFIT)}</td>
                  <td style={{ padding: "12px 14px", color: C.profit,  fontWeight: 700 }}>{fmtBig(totalActualProfit)}</td>
                  <td style={{ padding: "12px 14px" }}>{profitPctTotal !== null && <span style={{ color: statusOf(profitPctTotal).color, fontWeight: 900 }}>{profitPctTotal}%</span>}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: C.muted }}>Click any row to edit that month</div>
        </div>
      )}

      {/* ── CHARTS ── */}
      {view === "chart" && (
        <div style={{ padding: "20px 28px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 4, background: C.light, borderRadius: 8, padding: 4 }}>
              {[["monthly", "12-Month"], ["daily", "Daily"]].map(([t, lbl]) => (
                <button key={t} onClick={() => setChartType(t)} style={{
                  padding: "6px 14px", borderRadius: 6, fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                  background: chartType === t ? "#fff" : "transparent",
                  color: chartType === t ? "#1e40af" : C.muted,
                  border: chartType === t ? `1px solid ${C.border}` : "1px solid transparent",
                  cursor: "pointer",
                }}>{lbl}</button>
              ))}
            </div>
            {chartType === "monthly" && (
              <div style={{ display: "flex", gap: 4, background: C.light, borderRadius: 8, padding: 4 }}>
                {[["revenue","Revenue",C.rev],["cost","Cost",C.cost],["profit","Profit",C.profit]].map(([k, lbl, color]) => (
                  <button key={k} onClick={() => setChartMetric(k)} style={{
                    padding: "6px 14px", borderRadius: 6, fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                    background: chartMetric === k ? "#fff" : "transparent",
                    color: chartMetric === k ? color : C.muted,
                    border: chartMetric === k ? `1px solid ${color}44` : "1px solid transparent",
                    cursor: "pointer",
                  }}>{lbl}</button>
                ))}
              </div>
            )}
            {chartType === "daily" && (
              <div style={{ display: "flex", gap: 4, background: C.light, borderRadius: 8, padding: 4 }}>
                {KPI.map((k, i) => (
                  <button key={i} onClick={() => setActiveMonth(i)} style={{
                    padding: "5px 10px", borderRadius: 6, fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                    background: activeMonth === i ? "#fff" : "transparent",
                    color: activeMonth === i ? "#1e40af" : C.muted,
                    border: activeMonth === i ? `1px solid ${C.border}` : "1px solid transparent",
                    cursor: "pointer",
                  }}>{k.label.slice(0, 3)}</button>
                ))}
              </div>
            )}
          </div>

          {chartType === "monthly" && (
            <>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 20px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: C.muted, marginBottom: 20 }}>
                  {chartMetric.toUpperCase()} — ACTUAL vs KPI TARGET
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyChartData} margin={{ top: 8, right: 20, left: 10, bottom: 8 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: C.muted, fontFamily: "inherit" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: C.muted, fontFamily: "inherit" }} axisLine={false} tickLine={false} width={55} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, fontFamily: "inherit" }} />
                    <Bar dataKey="KPI Target" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Actual" fill={chartMetric === "revenue" ? C.rev : chartMetric === "cost" ? C.cost : C.profit} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 20px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: C.muted, marginBottom: 20 }}>REVENUE · COST · PROFIT — ALL MONTHS</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={KPI.map((k, i) => ({ name: MONTHS_SHORT[i], Revenue: derived[i].rev ?? 0, Cost: derived[i].cost ?? 0, Profit: derived[i].prof ?? 0 }))} margin={{ top: 8, right: 20, left: 10, bottom: 8 }} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: C.muted, fontFamily: "inherit" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: C.muted, fontFamily: "inherit" }} axisLine={false} tickLine={false} width={55} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, fontFamily: "inherit" }} />
                    <Bar dataKey="Revenue" fill={C.rev}    radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Cost"    fill={C.cost}   radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Profit"  fill={C.profit} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {chartType === "daily" && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 20px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: C.muted, marginBottom: 20 }}>DAILY BREAKDOWN — {KPI[m].label.toUpperCase()}</div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyChartData} margin={{ top: 8, right: 20, left: 10, bottom: 8 }} barGap={2} barSize={7}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.muted, fontFamily: "inherit" }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: C.muted, fontFamily: "inherit" }} axisLine={false} tickLine={false} width={55} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, fontFamily: "inherit" }} />
                  <Bar dataKey="Cost"    fill={C.cost}   radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Revenue" fill={C.rev}    radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Profit"  fill={C.profit} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
