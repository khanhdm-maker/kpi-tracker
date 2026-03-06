import { useState, useEffect, useMemo, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LineChart, Line, ReferenceLine } from "recharts";

if (typeof document !== "undefined" && !document.getElementById("inter-font")) {
  const link = document.createElement("link");
  link.id = "inter-font"; link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap";
  document.head.appendChild(link);
}

const REPORT_CHANNELS = ["Organic","Google","Tiktok","Facebook","Applovin"];
const CHANNEL_COLORS  = { Organic:"#16a34a", Google:"#2563eb", Tiktok:"#000000", Facebook:"#1877f2", Applovin:"#ef4444" };

const DEFAULT_MANAGER_PIN = "admin2026";
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS_IN_MONTH = [31,28,31,30,31,30,31,31,30,31,30,31];

const C = {
  rev:"#2563eb", cost:"#ea580c", profit:"#15803d", kpi:"#7c3aed",
  bg:"#f0f4f8", card:"#ffffff", border:"#dde3ed",
  text:"#0d1b2e", muted:"#4a5568", light:"#e4eaf2",
  navy:"#1e3a8a", navyDark:"#1e40af",
};
const MEMBER_COLORS = ["#2563eb","#9333ea","#db2777","#d97706","#059669","#0891b2","#7c3aed","#dc2626"];

const parseMoney = (s) => { const c=String(s??"").replace(/[$,\s]/g,""); return c===""?null:isNaN(parseFloat(c))?null:parseFloat(c); };
const fmtInput = (v) => { if(!v&&v!==0)return""; return Number(v).toLocaleString(); };
const fmtBig = (v) => { if(v===null||v===undefined)return"—"; const a=Math.abs(v); if(a>=1_000_000)return`$${(v/1_000_000).toFixed(2)}M`; if(a>=1_000)return`$${(v/1_000).toFixed(1)}K`; return`$${Number(v).toLocaleString()}`; };
const fmtShort = (v) => { if(!v&&v!==0)return"$0"; const a=Math.abs(v); if(a>=1_000_000)return`$${(v/1_000_000).toFixed(1)}M`; if(a>=1_000)return`$${(v/1_000).toFixed(0)}K`; return`$${v}`; };
const pct = (actual,target) => target>0&&actual!==null?+((actual/target)*100).toFixed(1):null;
const statusOf = (p) => { if(p===null)return{color:"#94a3b8",bg:"#f1f5f9",label:"PENDING"}; if(p>=100)return{color:"#16a34a",bg:"#dcfce7",label:"ON TRACK"}; if(p>=80)return{color:"#d97706",bg:"#fef3c7",label:"NEAR"}; return{color:"#dc2626",bg:"#fee2e2",label:"BEHIND"}; };
const initMonthlyActuals = () => Array(12).fill(null).map(()=>({revenue:"",cost:"",profit:""}));
const initDailyActuals = () => Array(12).fill(null).map((_,i)=>Array(DAYS_IN_MONTH[i]).fill(null).map(()=>({channels:{}})));
const defaultKPI = () => Array(12).fill(null).map(()=>({revenue:0,profit:0}));

// ─── Derive monthly totals from daily or monthly input ─────────────────────
function deriveMonthly(monthly, daily, kpi) {
  return kpi.map((_,i) => {
    const a = monthly[i] || {};
    const dailyArr = daily[i] || [];
    // Sum daily channel data
    let dailyRev=0, dailyCost=0, hasDailyData=false;
    dailyArr.forEach(d => {
      Object.values(d.channels||{}).forEach(ch => {
        const r=parseFloat(ch.revenue)||0, c=parseFloat(ch.cost)||0;
        if(r||c) hasDailyData=true;
        dailyRev+=r; dailyCost+=c;
      });
    });
    let rev  = hasDailyData ? dailyRev  : parseMoney(a.revenue);
    let cost = hasDailyData ? dailyCost : parseMoney(a.cost);
    let prof = hasDailyData ? (dailyRev-dailyCost) : parseMoney(a.profit);
    if(!hasDailyData && prof===null && rev!==null && cost!==null) prof=rev-cost;
    const roi = prof!==null&&rev!==null&&(rev-prof)>0?(prof/(rev-prof))*100:null;
    return {rev,cost,prof,roi,hasDailyData};
  });
}

// ─── Sub-components ────────────────────────────────────────────────────────
const Badge = ({p}) => { const st=statusOf(p); return <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:st.bg,color:st.color}}>{st.label}</span>; };
const ProgressBar = ({p,height=6}) => { const st=statusOf(p); return <div style={{height,background:C.light,borderRadius:height,overflow:"hidden"}}><div style={{height:"100%",width:p!==null?`${Math.min(p,100)}%`:"0%",background:p!==null?st.color:C.light,borderRadius:height,transition:"width .7s"}}/></div>; };
const ResultCard = ({label,actual,target,color}) => { const p=pct(actual,target); const st=statusOf(p); return <div style={{background:C.card,border:`1.5px solid ${actual!==null?color+"44":C.border}`,borderRadius:12,padding:18,flex:1}}><div style={{fontSize:12,letterSpacing:2,color:C.muted,marginBottom:6,fontWeight:700}}>{label}</div><div style={{fontSize:26,fontWeight:900,color:actual!==null?C.text:"#cbd5e1"}}>{fmtBig(actual)}</div><div style={{fontSize:13,color:C.muted,marginBottom:10}}>KPI: {fmtBig(target)}</div><ProgressBar p={p}/><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}><span style={{fontSize:14,fontWeight:900,color:p!==null?st.color:"#cbd5e1"}}>{p!==null?`${p}%`:"—"}</span>{p!==null&&<Badge p={p}/>}</div></div>; };
const CustomTooltip = ({active,payload,label}) => { if(!active||!payload?.length)return null; return <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 16px",fontSize:13}}><div style={{fontWeight:700,marginBottom:8}}>{label}</div>{payload.map(p=><div key={p.name} style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}><div style={{width:10,height:10,borderRadius:3,background:p.fill||p.color}}/><span style={{color:C.muted}}>{p.name}:</span><span style={{fontWeight:700}}>{fmtShort(p.value)}</span></div>)}</div>; };
const inputSt = (filled) => ({ width:"100%",boxSizing:"border-box",background:filled?"#eff6ff":"#f8fafc",border:`1.5px solid ${filled?"#93c5fd":C.border}`,borderRadius:8,color:C.text,fontFamily:"'Inter','Segoe UI',sans-serif",fontSize:15,padding:"10px 12px",outline:"none" });

// ═══════════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════════
function LoginScreen({members,onLogin,onManagerLogin}) {
  const [selected,setSelected]=useState("");
  const [pin,setPin]=useState("");
  const [mgrPin,setMgrPin]=useState("");
  const [tab,setTab]=useState("member");
  const [error,setError]=useState("");
  const [storedPin,setStoredPin]=useState(null);

  useEffect(()=>{ (async()=>{ try{const r=await window.storage.get("mgr_pin",true);setStoredPin(r?.value||DEFAULT_MANAGER_PIN);}catch{setStoredPin(DEFAULT_MANAGER_PIN);} })(); },[]);

  const handleMemberLogin=()=>{
    if(!selected){setError("Please select your name.");return;}
    const member=members.find(m=>m.id===selected);if(!member)return;
    if(member.pin&&pin!==member.pin){setError("Incorrect PIN.");return;}
    setError("");onLogin(member);
  };
  const handleManagerLogin=()=>{
    if(storedPin===null)return;
    if(mgrPin===(storedPin??DEFAULT_MANAGER_PIN)){setError("");onManagerLogin();}
    else setError("Incorrect manager PIN.");
  };

  const isDefaultPin=(storedPin??DEFAULT_MANAGER_PIN)===DEFAULT_MANAGER_PIN;

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1e3a8a 0%,#1e40af 50%,#1d4ed8 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter','Segoe UI',sans-serif",padding:20}}>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:11,letterSpacing:6,color:"#93c5fd",marginBottom:8}}>PUMA PERFORMANCE TRACKER 2026</div>
          <div style={{fontSize:30,fontWeight:900,color:"#fff",letterSpacing:-1}}>Puma Performance Tracker</div>
          <div style={{fontSize:14,color:"#93c5fd",marginTop:6}}>Team Edition</div>
        </div>
        <div style={{background:"#fff",borderRadius:20,padding:32,boxShadow:"0 20px 60px #0003"}}>
          <div style={{display:"flex",gap:0,marginBottom:28,background:C.light,borderRadius:10,padding:4}}>
            {[["member","👤 Member"],["sublead","⭐ Sublead"],["manager","🔑 Manager"]].map(([t,l])=>(
              <button key={t} onClick={()=>{setTab(t);setError("");setSelected("");setPin("");}} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",cursor:"pointer",background:tab===t?"#fff":"transparent",color:tab===t?C.navyDark:C.muted,fontFamily:"inherit",fontSize:13,fontWeight:700,boxShadow:tab===t?"0 1px 4px #0001":"none"}}>{l}</button>
            ))}
          </div>
          {(tab==="member"||tab==="sublead")&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div>
                <label style={{fontSize:12,letterSpacing:2,color:C.muted,fontWeight:700,display:"block",marginBottom:8}}>SELECT YOUR NAME</label>
                <select value={selected} onChange={e=>{setSelected(e.target.value);setPin("");setError("");}} style={{...inputSt(!!selected),cursor:"pointer"}}>
                  <option value="">— Choose name —</option>
                  {(tab==="sublead"
                    ? members.filter(m=>m.role==="sublead")
                    : members.filter(m=>m.role!=="sublead")
                  ).map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              {selected&&members.find(m=>m.id===selected)?.pin&&(
                <div>
                  <label style={{fontSize:12,letterSpacing:2,color:C.muted,fontWeight:700,display:"block",marginBottom:8}}>PIN</label>
                  <input type="password" value={pin} onChange={e=>{setPin(e.target.value);setError("");}} placeholder="Enter your PIN" style={inputSt(!!pin)} onKeyDown={e=>e.key==="Enter"&&handleMemberLogin()}/>
                </div>
              )}
              {error&&<div style={{fontSize:13,color:"#dc2626",fontWeight:600}}>{error}</div>}
              <button onClick={handleMemberLogin} disabled={!selected} style={{padding:"13px 0",borderRadius:10,border:"none",background:selected?C.navyDark:C.light,color:selected?"#fff":C.muted,cursor:selected?"pointer":"not-allowed",fontFamily:"inherit",fontSize:15,fontWeight:800,marginTop:4}}>Enter My Dashboard →</button>
            </div>
          )}
          {tab==="manager"&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              {isDefaultPin&&<div style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#92400e",fontWeight:500}}>⚠️ Using default PIN <strong>(admin2026)</strong>. Change in ⚙ Settings.</div>}
              <div>
                <label style={{fontSize:12,letterSpacing:2,color:C.muted,fontWeight:700,display:"block",marginBottom:8}}>MANAGER PIN</label>
                <input type="password" value={mgrPin} onChange={e=>{setMgrPin(e.target.value);setError("");}} placeholder="Enter manager PIN" style={inputSt(!!mgrPin)} onKeyDown={e=>e.key==="Enter"&&handleManagerLogin()} autoFocus/>
              </div>
              {error&&<div style={{fontSize:13,color:"#dc2626",fontWeight:600}}>{error}</div>}
              <button onClick={handleManagerLogin} disabled={storedPin===null} style={{padding:"13px 0",borderRadius:10,border:"none",background:C.navyDark,color:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:15,fontWeight:800}}>Enter Manager Panel →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBLEAD PANEL
// ═══════════════════════════════════════════════════════════════════════════
// SUBLEAD PANEL
// ═══════════════════════════════════════════════════════════════════════════
function SubleadPanel({currentUser,members,allData,onLogout,onViewMember,onUpdatePin,onUpdateKPI,onUpdateName}) {
  const myMembers=members.filter(m=>m.id!==currentUser.id&&m.subleadId===currentUser.id);
  const [tab,setTab]=useState("overview");
  const [pinOld,setPinOld]=useState("");const[pinNew1,setPinNew1]=useState("");const[pinNew2,setPinNew2]=useState("");const[pinMsg,setPinMsg]=useState("");
  const [newName,setNewName]=useState("");const[nameMsg,setNameMsg]=useState("");
  const self=members.find(m=>m.id===currentUser.id)||currentUser;
  const [localKpi,setLocalKpi]=useState(()=>self.kpi||defaultKPI());
  const [kpiSaved,setKpiSaved]=useState(false);
  useEffect(()=>{setLocalKpi(self.kpi||defaultKPI());},[self.id]);

  const handleChangePin=()=>{
    if(currentUser.pin&&pinOld!==currentUser.pin){setPinMsg("❌ Current PIN is incorrect.");return;}
    if(pinNew1.length<4){setPinMsg("❌ New PIN must be at least 4 characters.");return;}
    if(pinNew1!==pinNew2){setPinMsg("❌ New PINs don't match.");return;}
    onUpdatePin(currentUser.id,pinNew1);setPinMsg("✅ PIN changed!");setPinOld("");setPinNew1("");setPinNew2("");
  };

  const TAB=(key,label)=><button key={key} onClick={()=>setTab(key)} style={{padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",background:tab===key?"#4c1d95":"transparent",color:tab===key?"#fff":"#c4b5fd",fontFamily:"inherit",fontSize:13,fontWeight:700}}>{label}</button>;

  // Build team list including self
  const allMembers=[self,...myMembers];

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Inter','Segoe UI',sans-serif",color:C.text}}>
      <div style={{background:"linear-gradient(90deg,#0f172a,#7c3aed)",padding:"16px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div><div style={{fontSize:12,letterSpacing:3,color:"#c4b5fd",fontWeight:600}}>SUBLEAD · PUMA PERFORMANCE TRACKER 2026</div><div style={{fontSize:22,fontWeight:900,color:"#fff"}}>{currentUser.name}</div></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{display:"flex",gap:4,background:"#3b0764",borderRadius:10,padding:4}}>{TAB("overview","📊 Overview")}{TAB("targets","🎯 My Targets")}{TAB("settings","⚙ Settings")}</div>
          <button onClick={onLogout} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #7c3aed",background:"transparent",color:"#c4b5fd",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700}}>← Logout</button>
        </div>
      </div>

      {/* ── OVERVIEW ── */}
      {tab==="overview"&&(
        <div style={{padding:"20px 28px 40px",display:"flex",flexDirection:"column",gap:20}}>
          {allMembers.map((mem,mi)=>{
            const kpi=mem.kpi||defaultKPI();
            const data=allData[mem.id]||{monthly:initMonthlyActuals(),daily:initDailyActuals()};
            const derived=deriveMonthly(data.monthly,data.daily,kpi);
            const totalKpiRev=kpi.reduce((s,k)=>s+(k.revenue||0),0);
            const totalKpiProfit=kpi.reduce((s,k)=>s+(k.profit||0),0);
            const totalRev=derived.reduce((s,d)=>s+(d.rev??0),0);
            const totalProfit=derived.reduce((s,d)=>s+(d.prof??0),0);
            const totalCost=derived.reduce((s,d)=>s+(d.cost??0),0);
            const filledCount=derived.filter(d=>d.rev!==null).length;
            const isSelf=mem.id===currentUser.id;
            const color=isSelf?"#7c3aed":MEMBER_COLORS[mi%MEMBER_COLORS.length];
            return (
              <div key={mem.id} style={{background:C.card,border:`2px solid ${isSelf?"#7c3aed":C.border}`,borderRadius:16,overflow:"hidden"}}>
                {/* Member header */}
                <div style={{padding:"14px 22px",background:isSelf?"#f5f3ff":"#f8fafc",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:36,height:36,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:16}}>{mem.name.charAt(0).toUpperCase()}</div>
                    <div>
                      <div style={{fontSize:16,fontWeight:800,color:isSelf?"#4c1d95":C.text}}>{mem.name}{isSelf&&<span style={{fontSize:11,fontWeight:700,background:"#ede9fe",color:"#7c3aed",borderRadius:20,padding:"2px 8px",marginLeft:8}}>⭐ You</span>}</div>
                      <div style={{fontSize:12,color:C.muted}}>KPI: {fmtBig(totalKpiRev)} rev · {fmtBig(totalKpiProfit)} profit · {filledCount}/12 months filed</div>
                    </div>
                  </div>
                  <button onClick={()=>onViewMember(mem)} style={{padding:"7px 16px",borderRadius:8,border:`1px solid ${color}44`,background:color+"11",color,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700}}>View Detail →</button>
                </div>
                {/* Monthly table */}
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead>
                      <tr style={{background:C.light}}>
                        {["MONTH","KPI REV","ACT COST","ACT REV","REV %","KPI PROFIT","ACT PROFIT","PROFIT %","ROI","STATUS"].map(h=>(
                          <th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:10,letterSpacing:1,color:C.muted,fontWeight:700,borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MONTHS.map((mo,i)=>{
                        const d=derived[i];const rp=pct(d.rev,kpi[i].revenue);const pp=pct(d.prof,kpi[i].profit);const rs=statusOf(rp);const hasData=d.rev!==null;
                        return(
                          <tr key={i} style={{background:i%2===0?"#fff":"#f8fafc",borderBottom:`1px solid ${C.border}`}}>
                            <td style={{padding:"8px 12px",fontWeight:700,color:C.navyDark}}>{mo.slice(0,3)}</td>
                            <td style={{padding:"8px 12px",color:C.muted}}>{fmtBig(kpi[i].revenue)}</td>
                            <td style={{padding:"8px 12px",color:hasData?C.cost:"#cbd5e1",fontWeight:hasData?600:400}}>{fmtBig(d.cost)}</td>
                            <td style={{padding:"8px 12px",color:hasData?C.rev:"#cbd5e1",fontWeight:hasData?600:400}}>{fmtBig(d.rev)}</td>
                            <td style={{padding:"8px 12px"}}>{rp!==null?<div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:40,height:4,background:C.light,borderRadius:4,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(rp,100)}%`,background:rs.color,borderRadius:4}}/></div><span style={{color:rs.color,fontWeight:700,fontSize:11}}>{rp}%</span></div>:<span style={{color:"#cbd5e1"}}>—</span>}</td>
                            <td style={{padding:"8px 12px",color:C.muted}}>{fmtBig(kpi[i].profit)}</td>
                            <td style={{padding:"8px 12px",color:hasData?C.profit:"#cbd5e1",fontWeight:hasData?600:400}}>{fmtBig(d.prof)}</td>
                            <td style={{padding:"8px 12px"}}>{pp!==null?<span style={{color:statusOf(pp).color,fontWeight:700}}>{pp}%</span>:<span style={{color:"#cbd5e1"}}>—</span>}</td>
                            <td style={{padding:"8px 12px",color:d.roi!==null?"#059669":"#cbd5e1"}}>{d.roi!==null?`${d.roi.toFixed(1)}%`:"—"}</td>
                            <td style={{padding:"8px 12px"}}><span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:12,background:hasData?rs.bg:C.light,color:hasData?rs.color:C.muted}}>{hasData?rs.label:"PENDING"}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{background:"#e0f2fe",borderTop:`2px solid #bae6fd`}}>
                        <td style={{padding:"9px 12px",fontWeight:900,color:"#0369a1",fontSize:11}}>TOTAL</td>
                        <td style={{padding:"9px 12px",color:C.muted,fontWeight:700}}>{fmtBig(totalKpiRev)}</td>
                        <td style={{padding:"9px 12px",color:C.cost,fontWeight:700}}>{fmtBig(totalCost)}</td>
                        <td style={{padding:"9px 12px",color:C.rev,fontWeight:700}}>{fmtBig(totalRev)}</td>
                        <td style={{padding:"9px 12px"}}>{filledCount>0&&<span style={{color:statusOf(pct(totalRev,totalKpiRev)).color,fontWeight:900,fontSize:11}}>{pct(totalRev,totalKpiRev)}%</span>}</td>
                        <td style={{padding:"9px 12px",color:C.muted,fontWeight:700}}>{fmtBig(totalKpiProfit)}</td>
                        <td style={{padding:"9px 12px",color:C.profit,fontWeight:700}}>{fmtBig(totalProfit)}</td>
                        <td colSpan={3}/>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
          {/* Team Revenue Chart */}
          {allMembers.length>0&&(()=>{
            const chartData=MONTHS_SHORT.map((_,i)=>{
              const row={name:MONTHS_SHORT[i]};
              allMembers.forEach(mem=>{
                const data=allData[mem.id]||{monthly:initMonthlyActuals(),daily:initDailyActuals()};
                const derived=deriveMonthly(data.monthly,data.daily,mem.kpi||defaultKPI());
                row[mem.name]=derived[i].rev??0;
              });
              return row;
            });
            return(
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"24px 20px"}}>
                <div style={{fontSize:12,letterSpacing:2,color:C.muted,fontWeight:700,marginBottom:20}}>TEAM REVENUE · MONTHLY COMPARISON</div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{top:8,right:20,left:10,bottom:8}} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false}/>
                    <XAxis dataKey="name" tick={{fontSize:12,fill:C.muted,fontFamily:"inherit"}} axisLine={false} tickLine={false}/>
                    <YAxis tickFormatter={fmtShort} tick={{fontSize:11,fill:C.muted,fontFamily:"inherit"}} axisLine={false} tickLine={false} width={60}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Legend wrapperStyle={{fontSize:13,fontFamily:"inherit"}}/>
                    {allMembers.map((mem,mi)=><Bar key={mem.id} dataKey={mem.name} fill={mem.id===currentUser.id?"#7c3aed":MEMBER_COLORS[mi%MEMBER_COLORS.length]} radius={[4,4,0,0]}/>)}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </div>
      )}
      {tab==="targets"&&(
        <div style={{padding:"24px 28px 60px",maxWidth:700}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden"}}>
            <div style={{padding:"20px 28px",borderBottom:`1px solid ${C.border}`,background:"#f5f3ff"}}>
              <div style={{fontSize:20,fontWeight:900,color:"#4c1d95",marginBottom:4}}>🎯 Set My Monthly KPI Targets</div>
              <div style={{fontSize:13,color:C.muted}}>Set your own revenue and profit targets. Manager can also override from their panel.</div>
            </div>
            <div style={{padding:"20px 28px"}}>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{background:C.light}}>
                      {["MONTH","KPI REVENUE ($)","KPI PROFIT ($)","ROI (%)","STATUS"].map(h=>(
                        <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,letterSpacing:1,color:C.muted,fontWeight:700,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MONTHS.map((mo,i)=>{
                      const data=allData[self.id]||{monthly:initMonthlyActuals(),daily:initDailyActuals()};
                      const derived=deriveMonthly(data.monthly,data.daily,localKpi);
                      const revPct=pct(derived[i].rev,localKpi[i].revenue);const st=statusOf(revPct);
                      const roi=localKpi[i].revenue>0&&localKpi[i].profit>0&&(localKpi[i].revenue-localKpi[i].profit)>0?((localKpi[i].profit/(localKpi[i].revenue-localKpi[i].profit))*100).toFixed(2):null;
                      return(
                        <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"#fff":"#f8fafc"}}>
                          <td style={{padding:"9px 14px",fontWeight:700,color:C.navyDark}}>{mo.slice(0,3)}</td>
                          <td style={{padding:"9px 14px"}}><input type="text" value={fmtInput(localKpi[i].revenue)} onChange={e=>{const next=[...localKpi];next[i]={...next[i],revenue:parseFloat(e.target.value.replace(/,/g,""))||0};setLocalKpi(next);setKpiSaved(false);}} placeholder="0" style={{...inputSt(!!(localKpi[i].revenue)),maxWidth:160,fontSize:13,padding:"7px 10px"}}/></td>
                          <td style={{padding:"9px 14px"}}><input type="text" value={fmtInput(localKpi[i].profit)} onChange={e=>{const next=[...localKpi];next[i]={...next[i],profit:parseFloat(e.target.value.replace(/,/g,""))||0};setLocalKpi(next);setKpiSaved(false);}} placeholder="0" style={{...inputSt(!!(localKpi[i].profit)),maxWidth:160,fontSize:13,padding:"7px 10px"}}/></td>
                          <td style={{padding:"9px 14px",fontWeight:700,color:roi!==null?"#059669":"#cbd5e1",fontSize:13}}>{roi!==null?`${roi}%`:"—"}</td>
                          <td style={{padding:"9px 14px"}}>{revPct!==null?<div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:60,height:5,background:C.light,borderRadius:5,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(revPct,100)}%`,background:st.color,borderRadius:5}}/></div><span style={{fontSize:12,fontWeight:700,color:st.color}}>{revPct}%</span></div>:<span style={{fontSize:12,color:"#cbd5e1"}}>No data yet</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{background:"#f5f3ff",borderTop:`2px solid #ddd6fe`}}>
                      <td style={{padding:"10px 14px",fontWeight:900,color:"#4c1d95"}}>ANNUAL TOTAL</td>
                      <td style={{padding:"10px 14px",fontWeight:800,color:C.rev}}>{fmtBig(localKpi.reduce((s,k)=>s+(k.revenue||0),0))}</td>
                      <td style={{padding:"10px 14px",fontWeight:800,color:C.profit}}>{fmtBig(localKpi.reduce((s,k)=>s+(k.profit||0),0))}</td>
                      <td/><td/>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div style={{marginTop:20,display:"flex",alignItems:"center",gap:14}}>
                <button onClick={()=>{if(onUpdateKPI)onUpdateKPI(self.id,localKpi);setKpiSaved(true);setTimeout(()=>setKpiSaved(false),3000);}} style={{padding:"12px 28px",borderRadius:10,border:"none",background:"#7c3aed",color:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:15,fontWeight:800}}>💾 Save My Targets</button>
                {kpiSaved&&<div style={{fontSize:13,fontWeight:700,color:"#15803d",background:"#dcfce7",borderRadius:8,padding:"8px 16px"}}>✅ Targets saved!</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SETTINGS ── */}
      {tab==="settings"&&(
        <div style={{padding:"28px 28px 60px",maxWidth:520}}>
          <div style={{background:"#fff",border:"1px solid #dde3ed",borderRadius:16,overflow:"hidden"}}>
            <div style={{padding:"22px 28px",borderBottom:"1px solid #dde3ed",background:"#f8fafc"}}>
              <div style={{fontSize:20,fontWeight:900}}>⚙️ Account Information</div>
              <div style={{fontSize:13,color:C.muted,marginTop:4}}>Update your name and PIN in one place.</div>
            </div>
            <div style={{padding:"28px",display:"flex",flexDirection:"column",gap:24}}>
              <div>
                <div style={{fontSize:12,letterSpacing:2,color:"#4c1d95",fontWeight:800,marginBottom:14}}>✏️ CHANGE NAME</div>
                <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Current name: <strong style={{color:C.text}}>{currentUser.name}</strong></div>
                <label style={{fontSize:11,letterSpacing:2,color:C.muted,fontWeight:700,display:"block",marginBottom:7}}>NEW NAME</label>
                <input type="text" value={newName} onChange={e=>{setNewName(e.target.value);setNameMsg("");}} placeholder="Enter new name" style={inputSt(!!newName)} onKeyDown={e=>e.key==="Enter"&&(()=>{if(!newName.trim()){setNameMsg("❌ Name cannot be empty.");return;}if(onUpdateName)onUpdateName(currentUser.id,newName.trim());setNameMsg("✅ Name updated!");setNewName("");})()}/>
                {nameMsg&&<div style={{fontSize:13,fontWeight:600,color:nameMsg.startsWith("✅")?"#15803d":"#dc2626",background:nameMsg.startsWith("✅")?"#dcfce7":"#fee2e2",borderRadius:9,padding:"10px 14px",marginTop:10}}>{nameMsg}</div>}
              </div>
              <div style={{height:1,background:"#dde3ed"}}/>
              <div>
                <div style={{fontSize:12,letterSpacing:2,color:"#4c1d95",fontWeight:800,marginBottom:14}}>🔐 CHANGE PIN</div>
                <div style={{fontSize:12,color:C.muted,marginBottom:12}}>{currentUser.pin?"Update your login PIN.":"No PIN set yet — set one to secure your account."}</div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {currentUser.pin&&<div><label style={{fontSize:11,letterSpacing:2,color:C.muted,fontWeight:700,display:"block",marginBottom:7}}>CURRENT PIN</label><input type="password" value={pinOld} onChange={e=>{setPinOld(e.target.value);setPinMsg("");}} placeholder="Enter current PIN" style={inputSt(!!pinOld)}/></div>}
                  {[["NEW PIN",pinNew1,setPinNew1,"At least 4 characters"],["CONFIRM PIN",pinNew2,setPinNew2,"Repeat new PIN"]].map(([label,val,set,ph])=>(
                    <div key={label}><label style={{fontSize:11,letterSpacing:2,color:C.muted,fontWeight:700,display:"block",marginBottom:7}}>{label}</label><input type="password" value={val} onChange={e=>{set(e.target.value);setPinMsg("");}} placeholder={ph} onKeyDown={e=>e.key==="Enter"&&handleChangePin()} style={inputSt(!!val)}/></div>
                  ))}
                  {pinMsg&&<div style={{fontSize:13,fontWeight:600,color:pinMsg.startsWith("✅")?"#15803d":"#dc2626",background:pinMsg.startsWith("✅")?"#dcfce7":"#fee2e2",borderRadius:9,padding:"10px 14px"}}>{pinMsg}</div>}
                </div>
              </div>
              <div style={{height:1,background:"#dde3ed"}}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <button onClick={()=>{if(!newName.trim()){setNameMsg("❌ Name cannot be empty.");return;}if(onUpdateName)onUpdateName(currentUser.id,newName.trim());setNameMsg("✅ Name updated!");setNewName("");}} style={{padding:"13px 0",borderRadius:10,border:"2px solid #7c3aed",background:"#fff",color:"#7c3aed",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:800}}>✏️ Save Name</button>
                <button onClick={handleChangePin} style={{padding:"13px 0",borderRadius:10,border:"none",background:"#7c3aed",color:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:800}}>🔐 Save PIN</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MANAGER PANEL
// ═══════════════════════════════════════════════════════════════════════════
function ManagerPanel({members,setMembers,allData,onLogout,onViewMember}) {
  const [tab,setTab]=useState("overview");
  const [editingMember,setEditingMember]=useState(null);
  const [newMemberName,setNewMemberName]=useState("");
  const [newMemberPin,setNewMemberPin]=useState("");
  const [mgrStoredPin,setMgrStoredPin]=useState(null);
  const [mgrOld,setMgrOld]=useState("");const[mgrNew1,setMgrNew1]=useState("");const[mgrNew2,setMgrNew2]=useState("");const[mgrMsg,setMgrMsg]=useState("");

  useEffect(()=>{ (async()=>{ try{const r=await window.storage.get("mgr_pin",true);setMgrStoredPin(r?.value||DEFAULT_MANAGER_PIN);}catch{setMgrStoredPin(DEFAULT_MANAGER_PIN);} })(); },[]);

  const isDefaultPin=(mgrStoredPin??DEFAULT_MANAGER_PIN)===DEFAULT_MANAGER_PIN;

  const handleMgrPin=async()=>{
    const active=mgrStoredPin??DEFAULT_MANAGER_PIN;
    if(mgrOld!==active){setMgrMsg("❌ Current PIN is incorrect.");return;}
    if(mgrNew1.length<4){setMgrMsg("❌ New PIN must be at least 4 characters.");return;}
    if(mgrNew1!==mgrNew2){setMgrMsg("❌ New PINs don't match.");return;}
    try{await window.storage.set("mgr_pin",mgrNew1,true);setMgrStoredPin(mgrNew1);setMgrMsg("✅ PIN changed!");setMgrOld("");setMgrNew1("");setMgrNew2("");}
    catch{setMgrMsg("❌ Failed to save.");}
  };

  const exportCSV=()=>{
    const rows=[["Member","Month","KPI Revenue","KPI Profit","Actual Cost","Actual Revenue","Actual Profit","Rev %","Profit %","Status"]];
    members.forEach(member=>{
      const kpi=member.kpi||defaultKPI();
      const data=allData[member.id]||{monthly:initMonthlyActuals(),daily:initDailyActuals()};
      const derived=deriveMonthly(data.monthly,data.daily,kpi);
      MONTHS.forEach((mo,i)=>{
        const d=derived[i];
        const revPct=kpi[i].revenue>0&&d.rev!==null?((d.rev/kpi[i].revenue)*100).toFixed(1):"";
        const proPct=kpi[i].profit>0&&d.prof!==null?((d.prof/kpi[i].profit)*100).toFixed(1):"";
        const status=revPct===""?"PENDING":parseFloat(revPct)>=100?"ON TRACK":parseFloat(revPct)>=80?"NEAR":"BEHIND";
        rows.push([member.name,mo,kpi[i].revenue||0,kpi[i].profit||0,d.cost??"",d.rev??"",d.prof??"",revPct,proPct,status]);
      });
    });
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`KPI_Export_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
  };

  const addMember=()=>{
    if(!newMemberName.trim())return;
    const id=newMemberName.trim().toLowerCase().replace(/\s+/g,"_")+"_"+Date.now();
    setMembers(prev=>[...prev,{id,name:newMemberName.trim(),pin:newMemberPin.trim()||"",kpi:defaultKPI()}]);
    setNewMemberName("");setNewMemberPin("");
  };

  const updateKPI=(memberId,monthIdx,field,val)=>{
    setMembers(prev=>prev.map(m=>{
      if(m.id!==memberId)return m;
      const kpi=[...(m.kpi||defaultKPI())];
      kpi[monthIdx]={...kpi[monthIdx],[field]:parseFloat(val)||0};
      return{...m,kpi};
    }));
  };

  const [teamActiveMonth,setTeamActiveMonth]=useState(new Date().getMonth());

  const [ovChartType,setOvChartType]=useState("column");
  const [ovMetric,setOvMetric]=useState("revenue");

  // ── Aggregate all members' data into team totals ──
  const teamDerived = useMemo(()=>{
    return Array(12).fill(null).map((_,i)=>{
      let totRev=0,totCost=0,totProfit=0,totKpiRev=0,totKpiProfit=0,hasAny=false;
      members.forEach(mem=>{
        const kpi=mem.kpi||defaultKPI();
        const data=allData[mem.id]||{monthly:initMonthlyActuals(),daily:initDailyActuals()};
        const derived=deriveMonthly(data.monthly,data.daily,kpi);
        totKpiRev+=kpi[i].revenue||0;
        totKpiProfit+=kpi[i].profit||0;
        if(derived[i].rev!==null){totRev+=derived[i].rev??0;totCost+=derived[i].cost??0;totProfit+=derived[i].prof??0;hasAny=true;}
      });
      const rev=hasAny?totRev:null;
      const cost=hasAny?totCost:null;
      const prof=hasAny?totProfit:null;
      const roi=prof!==null&&rev!==null&&(rev-prof)>0?(prof/(rev-prof))*100:null;
      return {rev,cost,prof,roi,kpiRev:totKpiRev,kpiProfit:totKpiProfit,hasData:hasAny};
    });
  },[members,allData]);

  const teamTotalKpiRev=teamDerived.reduce((s,d)=>s+d.kpiRev,0);
  const teamTotalKpiProfit=teamDerived.reduce((s,d)=>s+d.kpiProfit,0);
  const teamTotalRev=teamDerived.reduce((s,d)=>s+(d.rev??0),0);
  const teamTotalProfit=teamDerived.reduce((s,d)=>s+(d.prof??0),0);
  const teamTotalCost=teamDerived.reduce((s,d)=>s+(d.cost??0),0);
  const teamFilledCount=teamDerived.filter(d=>d.hasData).length;

  const TAB=(key,label)=><button key={key} onClick={()=>setTab(key)} style={{padding:"8px 18px",borderRadius:8,border:"none",cursor:"pointer",background:tab===key?C.navyDark:"transparent",color:tab===key?"#fff":C.muted,fontFamily:"inherit",fontSize:13,fontWeight:700}}>{label}</button>;

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Inter','Segoe UI',sans-serif",color:C.text}}>
      <div style={{background:C.navy,padding:"16px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div><div style={{fontSize:12,letterSpacing:3,color:"#93c5fd",fontWeight:600}}>PUMA MANAGER PANEL · 2026</div><div style={{fontSize:24,fontWeight:900,color:"#fff"}}>Puma Performance Dashboard</div></div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{display:"flex",gap:4,background:"#1e40af",borderRadius:10,padding:4}}>{TAB("overview","📊 Overview")}{TAB("team-month","📅 Team Month")}{TAB("team-chart","▲ Team Charts")}{TAB("targets","🎯 Targets")}{TAB("members","👥 Members")}{TAB("settings","⚙ Settings")}</div>
          <button onClick={exportCSV} disabled={members.length===0} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #34d399",background:members.length>0?"#065f46":"transparent",color:members.length>0?"#6ee7b7":"#94a3b8",cursor:members.length>0?"pointer":"not-allowed",fontFamily:"inherit",fontSize:12,fontWeight:700,whiteSpace:"nowrap"}}>⬇ Export CSV</button>
          <button onClick={onLogout} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #3b5bdb",background:"transparent",color:"#93c5fd",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700}}>← Logout</button>
        </div>
      </div>

      {tab==="overview"&&(()=>{
        // Compute per-member totals
        const memberStats=members.map((member,mi)=>{
          const kpi=member.kpi||defaultKPI();
          const data=allData[member.id]||{monthly:initMonthlyActuals(),daily:initDailyActuals()};
          const derived=deriveMonthly(data.monthly,data.daily,kpi);
          const totalKpiRev=kpi.reduce((s,k)=>s+(k.revenue||0),0);
          const totalKpiProfit=kpi.reduce((s,k)=>s+(k.profit||0),0);
          const totalRev=derived.reduce((s,d)=>s+(d.rev??0),0);
          const totalProfit=derived.reduce((s,d)=>s+(d.prof??0),0);
          const color=MEMBER_COLORS[mi%MEMBER_COLORS.length];
          return {member,kpi,derived,totalKpiRev,totalKpiProfit,totalRev,totalProfit,color};
        });
        const sumRev=memberStats.reduce((s,m)=>s+m.totalRev,0);
        const sumProfit=memberStats.reduce((s,m)=>s+m.totalProfit,0);

        const chartData=MONTHS_SHORT.map((_,i)=>{
          const row={name:MONTHS_SHORT[i]};
          memberStats.forEach(({member,derived})=>{
            row[member.name]=derived[i][ovMetric==="revenue"?"rev":"prof"]??0;
          });
          return row;
        });

        return (
          <div style={{padding:"24px 28px 40px",display:"flex",flexDirection:"column",gap:20}}>
            {members.length===0
              ?<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:40,textAlign:"center",color:C.muted}}>No members yet. Go to Members tab to add.</div>
              :(
                <>
                  {/* Team summary KPI cards */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
                    {[
                      {label:"TEAM YTD REVENUE",val:fmtBig(teamTotalRev),sub:`Target ${fmtBig(teamTotalKpiRev)}`,p:teamFilledCount>0?pct(teamTotalRev,teamTotalKpiRev):null,color:C.rev},
                      {label:"TEAM YTD PROFIT",val:fmtBig(teamTotalProfit),sub:`Target ${fmtBig(teamTotalKpiProfit)}`,p:teamFilledCount>0?pct(teamTotalProfit,teamTotalKpiProfit):null,color:C.profit},
                      {label:"TEAM YTD COST",val:fmtBig(teamTotalCost),sub:"Sum of all member costs",p:null,color:C.cost},
                      {label:"MEMBERS ACTIVE",val:`${members.length}`,sub:"on team",p:null,color:"#7c3aed"},
                    ].map(card=>{const st=statusOf(card.p);return(
                      <div key={card.label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 20px"}}>
                        <div style={{fontSize:11,letterSpacing:2,color:C.muted,marginBottom:6,fontWeight:600}}>{card.label}</div>
                        <div style={{fontSize:20,fontWeight:800,color:card.color||C.text,marginBottom:2}}>{card.val}</div>
                        <div style={{fontSize:12,color:C.muted,marginBottom:card.p!==null?8:0}}>{card.sub}</div>
                        {card.p!==null&&(<><ProgressBar p={card.p}/><div style={{display:"flex",justifyContent:"space-between",marginTop:6}}><span style={{fontSize:12,fontWeight:700,color:st.color}}>{card.p}% of KPI</span><Badge p={card.p}/></div></>)}
                      </div>
                    );})}
                  </div>

                  {/* Member cards with contribution */}
                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    {memberStats.map(({member,totalKpiRev,totalKpiProfit,totalRev,totalProfit,color})=>{
                      const revPct=pct(totalRev>0?totalRev:null,totalKpiRev);
                      const profitPct=pct(totalProfit!==0?totalProfit:null,totalKpiProfit);
                      const revShare=sumRev>0?((totalRev/sumRev)*100).toFixed(1):0;
                      const profitShare=sumProfit>0?((totalProfit/sumProfit)*100).toFixed(1):0;
                      return (
                        <div key={member.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"18px 24px"}}>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:14}}>
                            <div style={{display:"flex",alignItems:"center",gap:12}}>
                              <div style={{width:38,height:38,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:15}}>{member.name.charAt(0).toUpperCase()}</div>
                              <div>
                                <div style={{fontSize:16,fontWeight:800}}>{member.name}</div>
                                <div style={{fontSize:12,color:C.muted}}>KPI: {fmtBig(totalKpiRev)} rev · {fmtBig(totalKpiProfit)} profit</div>
                              </div>
                            </div>
                            <div style={{display:"flex",gap:8,alignItems:"center"}}>
                              <Badge p={revPct}/>
                              <button onClick={()=>onViewMember(member)} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${color}44`,background:color+"11",color,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700}}>View →</button>
                            </div>
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:14,alignItems:"end"}}>
                            <div>
                              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,marginBottom:4,fontWeight:600}}><span>REVENUE vs KPI</span><span style={{color:statusOf(revPct).color,fontWeight:700}}>{revPct!==null?`${revPct}%`:"—"}</span></div>
                              <ProgressBar p={revPct}/>
                              <div style={{fontSize:12,fontWeight:700,marginTop:4,color:C.rev}}>{fmtBig(totalRev)} <span style={{color:C.muted,fontWeight:400}}>/ {fmtBig(totalKpiRev)}</span></div>
                            </div>
                            <div>
                              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,marginBottom:4,fontWeight:600}}><span>PROFIT vs KPI</span><span style={{color:statusOf(profitPct).color,fontWeight:700}}>{profitPct!==null?`${profitPct}%`:"—"}</span></div>
                              <ProgressBar p={profitPct}/>
                              <div style={{fontSize:12,fontWeight:700,marginTop:4,color:C.profit}}>{fmtBig(totalProfit)} <span style={{color:C.muted,fontWeight:400}}>/ {fmtBig(totalKpiProfit)}</span></div>
                            </div>
                            <div>
                              <div style={{fontSize:11,color:C.muted,marginBottom:4,fontWeight:600}}>REVENUE CONTRIBUTION</div>
                              <div style={{height:6,background:C.light,borderRadius:6,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:`${revShare}%`,background:color,borderRadius:6,transition:"width .6s"}}/></div>
                              <div style={{fontSize:12,fontWeight:800,color}}>{revShare}% <span style={{color:C.muted,fontWeight:400,fontSize:11}}>of team</span></div>
                            </div>
                            <div>
                              <div style={{fontSize:11,color:C.muted,marginBottom:4,fontWeight:600}}>PROFIT CONTRIBUTION</div>
                              <div style={{height:6,background:C.light,borderRadius:6,overflow:"hidden",marginBottom:4}}><div style={{height:"100%",width:`${Math.max(0,parseFloat(profitShare))}%`,background:color,borderRadius:6,transition:"width .6s"}}/></div>
                              <div style={{fontSize:12,fontWeight:800,color}}>{profitShare}% <span style={{color:C.muted,fontWeight:400,fontSize:11}}>of team</span></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Full year monthly table */}
                  <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
                    <div style={{padding:"16px 24px",borderBottom:`1px solid ${C.border}`,background:"#f8fafc",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontSize:14,fontWeight:800}}>Team Monthly Summary — All Year</div>
                      <div style={{fontSize:12,color:C.muted}}>{members.length} members aggregated</div>
                    </div>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                        <thead><tr style={{background:C.light}}>{["MONTH","KPI REV","KPI PROFIT","ACTUAL COST","ACTUAL REV","REV %","ACTUAL PROFIT","PROFIT %","ROI","STATUS"].map(h=><th key={h} style={{padding:"9px 14px",textAlign:"left",fontSize:10,letterSpacing:1,color:C.muted,fontWeight:700,borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
                        <tbody>
                          {MONTHS.map((mo,i)=>{
                            const d=teamDerived[i];const rp=pct(d.rev,d.kpiRev);const pp=pct(d.prof,d.kpiProfit);const rs=statusOf(rp);const hasData=d.hasData;
                            return(
                              <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"#fff":"#f8fafc",cursor:"pointer"}} onClick={()=>{setTeamActiveMonth(i);setTab("team-month");}} onMouseEnter={e=>e.currentTarget.style.background="#eff6ff"} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":"#f8fafc"}>
                                <td style={{padding:"11px 14px",fontWeight:700,color:C.navyDark}}>{mo.slice(0,3)}</td>
                                <td style={{padding:"11px 14px",color:C.muted}}>{fmtBig(d.kpiRev)}</td>
                                <td style={{padding:"11px 14px",color:C.muted}}>{fmtBig(d.kpiProfit)}</td>
                                <td style={{padding:"11px 14px",color:hasData?C.cost:"#cbd5e1",fontWeight:hasData?600:400}}>{fmtBig(d.cost)}</td>
                                <td style={{padding:"11px 14px",color:hasData?C.rev:"#cbd5e1",fontWeight:hasData?600:400}}>{fmtBig(d.rev)}</td>
                                <td style={{padding:"11px 14px"}}>{rp!==null?<div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:50,height:5,background:C.light,borderRadius:5,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(rp,100)}%`,background:rs.color,borderRadius:5}}/></div><span style={{color:rs.color,fontWeight:700}}>{rp}%</span></div>:<span style={{color:"#cbd5e1"}}>—</span>}</td>
                                <td style={{padding:"11px 14px",color:hasData?C.profit:"#cbd5e1",fontWeight:hasData?600:400}}>{fmtBig(d.prof)}</td>
                                <td style={{padding:"11px 14px"}}>{pp!==null?<span style={{color:statusOf(pp).color,fontWeight:700}}>{pp}%</span>:<span style={{color:"#cbd5e1"}}>—</span>}</td>
                                <td style={{padding:"11px 14px",color:d.roi!==null?"#059669":"#cbd5e1"}}>{d.roi!==null?`${d.roi.toFixed(1)}%`:"—"}</td>
                                <td style={{padding:"11px 14px"}}><span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:hasData?rs.bg:C.light,color:hasData?rs.color:C.muted}}>{hasData?rs.label:"PENDING"}</span></td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot><tr style={{background:"#e0f2fe",borderTop:`2px solid #bae6fd`}}>
                          <td style={{padding:"12px 14px",fontWeight:900,color:"#0369a1",fontSize:12}}>TEAM TOTAL</td>
                          <td style={{padding:"12px 14px",color:C.muted,fontWeight:700}}>{fmtBig(teamTotalKpiRev)}</td>
                          <td style={{padding:"12px 14px",color:C.muted,fontWeight:700}}>{fmtBig(teamTotalKpiProfit)}</td>
                          <td style={{padding:"12px 14px",color:C.cost,fontWeight:700}}>{fmtBig(teamTotalCost)}</td>
                          <td style={{padding:"12px 14px",color:C.rev,fontWeight:700}}>{fmtBig(teamTotalRev)}</td>
                          <td style={{padding:"12px 14px"}}>{teamFilledCount>0&&<span style={{color:statusOf(pct(teamTotalRev,teamTotalKpiRev)).color,fontWeight:900}}>{pct(teamTotalRev,teamTotalKpiRev)}%</span>}</td>
                          <td style={{padding:"12px 14px",color:C.profit,fontWeight:700}}>{fmtBig(teamTotalProfit)}</td>
                          <td colSpan={3}/>
                        </tr></tfoot>
                      </table>
                    </div>
                    <div style={{padding:"8px 24px 16px",fontSize:12,color:C.muted}}>Click any row to open that month's detail</div>
                  </div>

                  {/* Chart section */}
                  <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"24px 20px"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:20}}>
                      <div style={{fontSize:12,letterSpacing:2,color:C.muted,fontWeight:700}}>MEMBER {ovMetric.toUpperCase()} · MONTHLY COMPARISON</div>
                      <div style={{display:"flex",gap:8}}>
                        <div style={{display:"flex",gap:3,background:C.light,borderRadius:8,padding:3}}>
                          {[["revenue","Revenue"],["profit","Profit"]].map(([k,l])=>(
                            <button key={k} onClick={()=>setOvMetric(k)} style={{padding:"5px 12px",borderRadius:6,background:ovMetric===k?"#fff":"transparent",color:ovMetric===k?(k==="revenue"?C.rev:C.profit):C.muted,border:ovMetric===k?`1px solid ${C.border}`:"1px solid transparent",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700}}>{l}</button>
                          ))}
                        </div>
                        <div style={{display:"flex",gap:3,background:C.light,borderRadius:8,padding:3}}>
                          {[["column","⬜ Column"],["bar","▭ Bar"]].map(([k,l])=>(
                            <button key={k} onClick={()=>setOvChartType(k)} style={{padding:"5px 12px",borderRadius:6,background:ovChartType===k?"#fff":"transparent",color:ovChartType===k?C.navyDark:C.muted,border:ovChartType===k?`1px solid ${C.border}`:"1px solid transparent",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700}}>{l}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {ovChartType==="column"&&(
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData} margin={{top:8,right:20,left:10,bottom:8}} barGap={2}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false}/>
                          <XAxis dataKey="name" tick={{fontSize:12,fill:C.muted,fontFamily:"inherit"}} axisLine={false} tickLine={false}/>
                          <YAxis tickFormatter={fmtShort} tick={{fontSize:11,fill:C.muted,fontFamily:"inherit"}} axisLine={false} tickLine={false} width={60}/>
                          <Tooltip content={<CustomTooltip/>}/><Legend wrapperStyle={{fontSize:13,fontFamily:"inherit"}}/>
                          {memberStats.map(({member,color})=><Bar key={member.id} dataKey={member.name} fill={color} radius={[4,4,0,0]}/>)}
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                    {ovChartType==="bar"&&(
                      <ResponsiveContainer width="100%" height={Math.max(260,members.length*60)}>
                        <BarChart layout="vertical" data={memberStats.map(({member,totalRev,totalProfit})=>({name:member.name,value:ovMetric==="revenue"?totalRev:totalProfit}))} margin={{top:8,right:60,left:10,bottom:8}}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false}/>
                          <XAxis type="number" tickFormatter={fmtShort} tick={{fontSize:11,fill:C.muted,fontFamily:"inherit"}} axisLine={false} tickLine={false}/>
                          <YAxis type="category" dataKey="name" tick={{fontSize:13,fill:C.text,fontFamily:"inherit",fontWeight:600}} axisLine={false} tickLine={false} width={120}/>
                          <Tooltip content={<CustomTooltip/>}/>
                          <Bar dataKey="value" name={ovMetric==="revenue"?"Revenue":"Profit"} radius={[0,6,6,0]}>
                            {memberStats.map(({color},i)=><Cell key={i} fill={color}/>)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </>
              )
            }
          </div>
        );
      })()}
      {tab==="team-month"&&(
        <div style={{padding:"24px 28px 40px",display:"flex",flexDirection:"column",gap:20}}>
          {members.length===0
            ?<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:40,textAlign:"center",color:C.muted}}>No members yet.</div>
            :(
              <>
                {/* Summary KPI strip */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
                  {(()=>{
                    const currentMonth=new Date().getMonth();
                    const filledSlice=teamDerived.slice(0,currentMonth+1).filter(d=>d.hasData);
                    const roiVals=filledSlice.map(d=>d.roi).filter(r=>r!==null);
                    const avgRoi=roiVals.length>0?(roiVals.reduce((s,r)=>s+r,0)/roiVals.length):null;
                    return [
                      {label:"TEAM YTD REVENUE",val:fmtBig(teamTotalRev),sub:`Target ${fmtBig(teamTotalKpiRev)}`,p:teamFilledCount>0?pct(teamTotalRev,teamTotalKpiRev):null,color:C.rev},
                      {label:"TEAM YTD PROFIT",val:fmtBig(teamTotalProfit),sub:`Target ${fmtBig(teamTotalKpiProfit)}`,p:teamFilledCount>0?pct(teamTotalProfit,teamTotalKpiProfit):null,color:C.profit},
                      {label:"AVG TEAM ROI",val:avgRoi!==null?`${avgRoi.toFixed(2)}%`:"—",sub:`Across ${roiVals.length} filed months`,p:null,color:"#059669"},
                      {label:"MONTHS FILED",val:`${teamFilledCount} / 12`,sub:"months with team data",p:teamFilledCount>0?+((teamFilledCount/12)*100).toFixed(0):null},
                    ];
                  })().map(card=>{const st=statusOf(card.p);return(
                    <div key={card.label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 20px"}}>
                      <div style={{fontSize:11,letterSpacing:2,color:C.muted,marginBottom:6,fontWeight:600}}>{card.label}</div>
                      <div style={{fontSize:20,fontWeight:800,color:card.color||C.text,marginBottom:2}}>{card.val}</div>
                      <div style={{fontSize:12,color:C.muted,marginBottom:card.p!==null?8:0}}>{card.sub}</div>
                      {card.p!==null&&(<><ProgressBar p={card.p}/><div style={{display:"flex",justifyContent:"space-between",marginTop:6}}><span style={{fontSize:12,fontWeight:700,color:st.color}}>{card.p}% of KPI</span><Badge p={card.p}/></div></>)}
                    </div>
                  );})}
                </div>
                {/* Month picker */}
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {MONTHS.map((_,i)=>{const d2=teamDerived[i];const p2=pct(d2.rev,d2.kpiRev);const st=statusOf(p2);return(
                    <button key={i} onClick={()=>setTeamActiveMonth(i)} style={{padding:"6px 14px",borderRadius:8,fontFamily:"inherit",fontSize:13,fontWeight:teamActiveMonth===i?800:500,border:teamActiveMonth===i?`2px solid ${d2.hasData?st.color:C.navyDark}`:`1px solid ${C.border}`,background:teamActiveMonth===i?(d2.hasData?st.bg:"#eff6ff"):C.card,color:d2.hasData?st.color:(teamActiveMonth===i?C.navyDark:C.muted),cursor:"pointer",position:"relative"}}>
                      {MONTHS[i].slice(0,3).toUpperCase()}
                      {d2.hasData&&<span style={{position:"absolute",top:-4,right:-4,width:8,height:8,borderRadius:"50%",background:st.color,border:"2px solid #f8fafc"}}/>}
                    </button>
                  );})}
                </div>
                {/* Month detail */}
                {(()=>{
                  const tm=teamActiveMonth;const td=teamDerived[tm];const revP=pct(td.rev,td.kpiRev);const proP=pct(td.prof,td.kpiProfit);const revSt=statusOf(revP);
                  return (
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
                      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:24,display:"flex",flexDirection:"column",gap:16}}>
                        <div>
                          <div style={{fontSize:11,letterSpacing:4,color:C.muted,fontWeight:600}}>TEAM TOTALS FOR</div>
                          <div style={{fontSize:26,fontWeight:900,marginTop:2}}>{MONTHS[tm]}</div>
                          <div style={{fontSize:13,color:C.muted,marginTop:4}}>{members.length} members · aggregated</div>
                        </div>
                        <div style={{background:"#eff6ff",borderRadius:10,padding:"12px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                          <div><div style={{fontSize:10,letterSpacing:1,color:C.muted,marginBottom:2,fontWeight:600}}>KPI REVENUE</div><div style={{fontSize:14,fontWeight:800,color:C.rev}}>{fmtBig(td.kpiRev)}</div></div>
                          <div><div style={{fontSize:10,letterSpacing:1,color:C.muted,marginBottom:2,fontWeight:600}}>KPI PROFIT</div><div style={{fontSize:14,fontWeight:800,color:C.profit}}>{fmtBig(td.kpiProfit)}</div></div>
                        </div>
                        {[{label:"ACTUAL COST",val:td.cost,color:C.cost},{label:"ACTUAL REVENUE",val:td.rev,color:C.rev},{label:"ACTUAL PROFIT",val:td.prof,color:C.profit}].map(({label,val,color})=>(
                          <div key={label}>
                            <div style={{fontSize:11,letterSpacing:2,color,display:"block",marginBottom:6,fontWeight:700}}>{label}</div>
                            <div style={{padding:"10px 12px",borderRadius:8,background:val!==null?"#f8fafc":C.light,border:`1.5px solid ${val!==null?color+"44":C.border}`,fontSize:18,fontWeight:800,color:val!==null?color:"#cbd5e1"}}>{fmtBig(val)}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:14}}>
                        <ResultCard label="TEAM REVENUE" actual={td.rev} target={td.kpiRev} color={C.rev}/>
                        <ResultCard label="TEAM PROFIT" actual={td.prof} target={td.kpiProfit} color={C.profit}/>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}><div style={{fontSize:11,letterSpacing:2,color:C.muted,marginBottom:6,fontWeight:600}}>TEAM COST</div><div style={{fontSize:20,fontWeight:900,color:td.cost!==null?C.cost:"#cbd5e1"}}>{fmtBig(td.cost)}</div></div>
                          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}><div style={{fontSize:11,letterSpacing:2,color:C.muted,marginBottom:6,fontWeight:600}}>TEAM ROI</div><div style={{fontSize:20,fontWeight:900,color:td.roi!==null?"#059669":"#cbd5e1"}}>{td.roi!==null?`${td.roi.toFixed(2)}%`:"—"}</div></div>
                        </div>
                        <div style={{display:"flex",gap:8}}>
                          {[["← PREV",()=>setTeamActiveMonth(Math.max(0,tm-1)),tm===0],["NEXT →",()=>setTeamActiveMonth(Math.min(11,tm+1)),tm===11]].map(([label,fn,dis])=>(
                            <button key={label} onClick={fn} disabled={dis} style={{flex:1,padding:"10px 0",borderRadius:8,border:`1px solid ${dis?C.border:C.navyDark}`,background:dis?C.light:"#eff6ff",color:dis?"#cbd5e1":C.navyDark,cursor:dis?"not-allowed":"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700}}>{label}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {/* Per-member breakdown for selected month */}
                <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
                  <div style={{padding:"16px 24px",borderBottom:`1px solid ${C.border}`,background:"#f8fafc"}}>
                    <div style={{fontSize:14,fontWeight:800}}>Member Breakdown — {MONTHS[teamActiveMonth]}</div>
                  </div>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                      <thead><tr style={{background:C.light}}>{["MEMBER","KPI REV","KPI PROFIT","ACTUAL COST","ACTUAL REV","REV %","ACTUAL PROFIT","PROFIT %","ROI","STATUS"].map(h=><th key={h} style={{padding:"9px 14px",textAlign:"left",fontSize:10,letterSpacing:1,color:C.muted,fontWeight:700,borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
                      <tbody>
                        {members.map((mem,mi)=>{
                          const kpi=mem.kpi||defaultKPI();
                          const data=allData[mem.id]||{monthly:initMonthlyActuals(),daily:initDailyActuals()};
                          const derived=deriveMonthly(data.monthly,data.daily,kpi);
                          const d=derived[teamActiveMonth];const rp=pct(d.rev,kpi[teamActiveMonth].revenue);const pp=pct(d.prof,kpi[teamActiveMonth].profit);const rs=statusOf(rp);const hasData=d.rev!==null;
                          const color=MEMBER_COLORS[mi%MEMBER_COLORS.length];
                          return (
                            <tr key={mem.id} style={{borderBottom:`1px solid ${C.border}`,background:mi%2===0?"#fff":"#f8fafc"}}>
                              <td style={{padding:"9px 14px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:24,height:24,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:11}}>{mem.name.charAt(0).toUpperCase()}</div><span style={{fontWeight:700}}>{mem.name}</span></div></td>
                              <td style={{padding:"9px 14px",color:C.muted}}>{fmtBig(kpi[teamActiveMonth].revenue)}</td>
                              <td style={{padding:"9px 14px",color:C.muted}}>{fmtBig(kpi[teamActiveMonth].profit)}</td>
                              <td style={{padding:"9px 14px",color:hasData?C.cost:"#cbd5e1",fontWeight:hasData?600:400}}>{fmtBig(d.cost)}</td>
                              <td style={{padding:"9px 14px",color:hasData?C.rev:"#cbd5e1",fontWeight:hasData?600:400}}>{fmtBig(d.rev)}</td>
                              <td style={{padding:"9px 14px"}}>{rp!==null?<span style={{color:rs.color,fontWeight:700}}>{rp}%</span>:<span style={{color:"#cbd5e1"}}>—</span>}</td>
                              <td style={{padding:"9px 14px",color:hasData?C.profit:"#cbd5e1",fontWeight:hasData?600:400}}>{fmtBig(d.prof)}</td>
                              <td style={{padding:"9px 14px"}}>{pp!==null?<span style={{color:statusOf(pp).color,fontWeight:700}}>{pp}%</span>:<span style={{color:"#cbd5e1"}}>—</span>}</td>
                              <td style={{padding:"9px 14px",color:d.roi!==null?"#059669":"#cbd5e1"}}>{d.roi!==null?`${d.roi.toFixed(1)}%`:"—"}</td>
                              <td style={{padding:"9px 14px"}}><span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:12,background:hasData?rs.bg:C.light,color:hasData?rs.color:C.muted}}>{hasData?rs.label:"PENDING"}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{background:"#e0f2fe",borderTop:`2px solid #bae6fd`}}>
                          <td style={{padding:"9px 14px",fontWeight:900,color:"#0369a1",fontSize:11}}>TEAM TOTAL</td>
                          <td style={{padding:"9px 14px",color:C.muted,fontWeight:700}}>{fmtBig(teamDerived[teamActiveMonth].kpiRev)}</td>
                          <td style={{padding:"9px 14px",color:C.muted,fontWeight:700}}>{fmtBig(teamDerived[teamActiveMonth].kpiProfit)}</td>
                          <td style={{padding:"9px 14px",color:C.cost,fontWeight:700}}>{fmtBig(teamDerived[teamActiveMonth].cost)}</td>
                          <td style={{padding:"9px 14px",color:C.rev,fontWeight:700}}>{fmtBig(teamDerived[teamActiveMonth].rev)}</td>
                          <td style={{padding:"9px 14px"}}>{teamDerived[teamActiveMonth].rev!==null&&<span style={{color:statusOf(pct(teamDerived[teamActiveMonth].rev,teamDerived[teamActiveMonth].kpiRev)).color,fontWeight:900,fontSize:11}}>{pct(teamDerived[teamActiveMonth].rev,teamDerived[teamActiveMonth].kpiRev)}%</span>}</td>
                          <td style={{padding:"9px 14px",color:C.profit,fontWeight:700}}>{fmtBig(teamDerived[teamActiveMonth].prof)}</td>
                          <td colSpan={3}/>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </>
            )
          }
        </div>
      )}

      {/* ══ TEAM CHARTS TAB ══ */}
      {tab==="team-chart"&&(()=>{
        if(members.length===0) return <div style={{padding:"24px 28px"}}><div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:40,textAlign:"center",color:C.muted}}>No members yet.</div></div>;

        // Pre-compute member stats
        const memberStats=members.map((mem,mi)=>{
          const kpi=mem.kpi||defaultKPI();
          const data=allData[mem.id]||{monthly:initMonthlyActuals(),daily:initDailyActuals()};
          const derived=deriveMonthly(data.monthly,data.daily,kpi);
          const totalRev=derived.reduce((s,d)=>s+(d.rev??0),0);
          const totalProfit=derived.reduce((s,d)=>s+(d.prof??0),0);
          const totalCost=derived.reduce((s,d)=>s+(d.cost??0),0);
          const totalKpiRev=kpi.reduce((s,k)=>s+(k.revenue||0),0);
          const totalKpiProfit=kpi.reduce((s,k)=>s+(k.profit||0),0);
          const color=MEMBER_COLORS[mi%MEMBER_COLORS.length];
          return {mem,kpi,derived,totalRev,totalProfit,totalCost,totalKpiRev,totalKpiProfit,color};
        });

        // Chart 1: ROI trend per member across months (line chart)
        const roiTrendData=MONTHS_SHORT.map((_,i)=>{
          const row={name:MONTHS_SHORT[i]};
          memberStats.forEach(({mem,derived})=>{
            row[mem.name]=derived[i].roi!==null?+derived[i].roi.toFixed(1):null;
          });
          return row;
        });

        // Chart 2: Profit Margin % per member per month (profit/revenue*100)
        const marginData=MONTHS_SHORT.map((_,i)=>{
          const row={name:MONTHS_SHORT[i]};
          memberStats.forEach(({mem,derived})=>{
            const rev=derived[i].rev;const prof=derived[i].prof;
            row[mem.name]=(rev&&rev>0&&prof!==null)?+((prof/rev)*100).toFixed(1):null;
          });
          return row;
        });

        // Chart 3: KPI Attainment % per member (revenue attainment)
        const attainmentData=memberStats.map(({mem,derived,kpi,color})=>{
          const filledMonths=derived.filter(d=>d.rev!==null);
          const avgPct=filledMonths.length>0
            ?+(filledMonths.reduce((s,d,i)=>{
                const monthIdx=derived.indexOf(d);
                return s+(kpi[monthIdx].revenue>0?(d.rev/kpi[monthIdx].revenue)*100:0);
              },0)/filledMonths.length).toFixed(1)
            :0;
          const totalKpiRev=kpi.reduce((s,k)=>s+(k.revenue||0),0);
          const totalRev=derived.reduce((s,d)=>s+(d.rev??0),0);
          const ytdPct=totalKpiRev>0?+((totalRev/totalKpiRev)*100).toFixed(1):0;
          return {name:mem.name,color,"YTD Attainment":ytdPct,"Avg Monthly Attainment":avgPct};
        });

        // Chart 4: Cost Efficiency — cost as % of revenue per member per month (lower = more efficient)
        const costEffData=MONTHS_SHORT.map((_,i)=>{
          const row={name:MONTHS_SHORT[i]};
          memberStats.forEach(({mem,derived})=>{
            const rev=derived[i].rev;const cost=derived[i].cost;
            row[mem.name]=(rev&&rev>0&&cost!==null)?+((cost/rev)*100).toFixed(1):null;
          });
          return row;
        });

        const lineTooltip=({active,payload,label})=>{
          if(!active||!payload?.length)return null;
          return <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 16px",fontSize:13}}><div style={{fontWeight:700,marginBottom:8}}>{label}</div>{payload.filter(p=>p.value!==null).map(p=><div key={p.name} style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}><div style={{width:10,height:10,borderRadius:"50%",background:p.color}}/><span style={{color:C.muted}}>{p.name}:</span><span style={{fontWeight:700}}>{p.value}%</span></div>)}</div>;
        };

        return (
          <div style={{padding:"24px 28px 40px",display:"flex",flexDirection:"column",gap:24}}>

            {/* Chart 1: ROI Trend */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"24px 20px"}}>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:14,fontWeight:800}}>📈 ROI Trend — Month by Month</div>
                <div style={{fontSize:12,color:C.muted,marginTop:3}}>Return on investment per member over the year. Higher = more efficient spend.</div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={roiTrendData} margin={{top:8,right:20,left:10,bottom:8}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false}/>
                  <XAxis dataKey="name" tick={{fontSize:12,fill:C.muted,fontFamily:"inherit"}} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={v=>`${v}%`} tick={{fontSize:11,fill:C.muted,fontFamily:"inherit"}} axisLine={false} tickLine={false} width={50}/>
                  <Tooltip content={lineTooltip}/>
                  <Legend wrapperStyle={{fontSize:13,fontFamily:"inherit"}}/>
                  <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="4 4"/>
                  {memberStats.map(({mem,color})=>(
                    <Line key={mem.id} type="monotone" dataKey={mem.name} stroke={color} strokeWidth={2.5} dot={{r:4,fill:color}} activeDot={{r:6}} connectNulls={false}/>
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 2: Profit Margin % Trend */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"24px 20px"}}>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:14,fontWeight:800}}>💹 Profit Margin % — Monthly Trend</div>
                <div style={{fontSize:12,color:C.muted,marginTop:3}}>Profit as % of revenue each month. Tracks how much of revenue converts to profit.</div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={marginData} margin={{top:8,right:20,left:10,bottom:8}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false}/>
                  <XAxis dataKey="name" tick={{fontSize:12,fill:C.muted,fontFamily:"inherit"}} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={v=>`${v}%`} tick={{fontSize:11,fill:C.muted,fontFamily:"inherit"}} axisLine={false} tickLine={false} width={50}/>
                  <Tooltip content={lineTooltip}/>
                  <Legend wrapperStyle={{fontSize:13,fontFamily:"inherit"}}/>
                  <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="4 4"/>
                  {memberStats.map(({mem,color})=>(
                    <Line key={mem.id} type="monotone" dataKey={mem.name} stroke={color} strokeWidth={2.5} dot={{r:4,fill:color}} activeDot={{r:6}} connectNulls={false}/>
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 3: KPI Attainment */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"24px 20px"}}>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:14,fontWeight:800}}>🎯 KPI Attainment — YTD vs Monthly Avg</div>
                <div style={{fontSize:12,color:C.muted,marginTop:3}}>How close each member is to hitting their targets. 100% = exactly on KPI.</div>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(220,members.length*58)}>
                <BarChart layout="vertical" data={attainmentData} margin={{top:8,right:60,left:10,bottom:8}} barGap={4} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false}/>
                  <XAxis type="number" tickFormatter={v=>`${v}%`} tick={{fontSize:11,fill:C.muted,fontFamily:"inherit"}} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" tick={{fontSize:13,fill:C.text,fontFamily:"inherit",fontWeight:600}} axisLine={false} tickLine={false} width={120}/>
                  <Tooltip content={({active,payload,label})=>{
                    if(!active||!payload?.length)return null;
                    return <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 16px",fontSize:13}}><div style={{fontWeight:700,marginBottom:8}}>{label}</div>{payload.map(p=><div key={p.name} style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}><div style={{width:10,height:10,borderRadius:2,background:p.fill}}/><span style={{color:C.muted}}>{p.name}:</span><span style={{fontWeight:700,color:p.value>=100?"#16a34a":p.value>=80?"#d97706":"#dc2626"}}>{p.value}%</span></div>)}</div>;
                  }}/>
                  <Legend wrapperStyle={{fontSize:13,fontFamily:"inherit"}}/>
                  <ReferenceLine x={100} stroke="#16a34a" strokeDasharray="5 4" label={{value:"100%",position:"top",fontSize:11,fill:"#16a34a"}}/>
                  <Bar dataKey="YTD Attainment" fill={C.rev} radius={[0,5,5,0]}>
                    {attainmentData.map(({color},i)=><Cell key={i} fill={color}/>)}
                  </Bar>
                  <Bar dataKey="Avg Monthly Attainment" fill="#c7d2fe" radius={[0,5,5,0]}>
                    {attainmentData.map(({color},i)=><Cell key={i} fill={color+"88"}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 4: Cost Efficiency */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"24px 20px"}}>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:14,fontWeight:800}}>⚡ Cost Efficiency — Spend as % of Revenue</div>
                <div style={{fontSize:12,color:C.muted,marginTop:3}}>Cost divided by revenue each month. Lower % = more efficient. Above 100% means spending more than earning.</div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={costEffData} margin={{top:8,right:20,left:10,bottom:8}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false}/>
                  <XAxis dataKey="name" tick={{fontSize:12,fill:C.muted,fontFamily:"inherit"}} axisLine={false} tickLine={false}/>
                  <YAxis tickFormatter={v=>`${v}%`} tick={{fontSize:11,fill:C.muted,fontFamily:"inherit"}} axisLine={false} tickLine={false} width={55}/>
                  <Tooltip content={lineTooltip}/>
                  <Legend wrapperStyle={{fontSize:13,fontFamily:"inherit"}}/>
                  <ReferenceLine y={100} stroke="#dc2626" strokeDasharray="5 4" label={{value:"Break-even",position:"insideTopRight",fontSize:11,fill:"#dc2626"}}/>
                  {memberStats.map(({mem,color})=>(
                    <Line key={mem.id} type="monotone" dataKey={mem.name} stroke={color} strokeWidth={2.5} dot={{r:4,fill:color}} activeDot={{r:6}} connectNulls={false}/>
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

          </div>
        );
      })()}

      {tab==="targets"&&(
        <div style={{padding:"24px 28px",display:"flex",flexDirection:"column",gap:20}}>
          {members.length===0
            ?<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:40,textAlign:"center",color:C.muted}}>Add members first.</div>
            :members.map((member,mi)=>{
              const kpi=member.kpi||defaultKPI();const color=MEMBER_COLORS[mi%MEMBER_COLORS.length];const isOpen=editingMember===member.id;
              return (
                <div key={member.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
                  <div onClick={()=>setEditingMember(isOpen?null:member.id)} style={{padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",background:isOpen?"#eff6ff":"#fff"}}>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:14}}>{member.name.charAt(0).toUpperCase()}</div>
                      <span style={{fontSize:16,fontWeight:700}}>{member.name}</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <span style={{fontSize:12,color:C.muted}}>Annual: {fmtBig(kpi.reduce((s,k)=>s+(k.revenue||0),0))} rev</span>
                      <span style={{fontSize:18,color:isOpen?C.navyDark:C.muted}}>{isOpen?"▲":"▼"}</span>
                    </div>
                  </div>
                  {isOpen&&(
                    <div style={{padding:"0 24px 24px",overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                        <thead><tr style={{background:C.light}}>{["MONTH","KPI REVENUE ($)","KPI PROFIT ($)","ROI (%)"].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:11,letterSpacing:1,color:C.muted,fontWeight:700,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}</tr></thead>
                        <tbody>
                          {MONTHS.map((mo,i)=>{
                            const roi=kpi[i].revenue>0&&kpi[i].profit>0&&(kpi[i].revenue-kpi[i].profit)>0?((kpi[i].profit/(kpi[i].revenue-kpi[i].profit))*100).toFixed(2):null;
                            return(
                            <tr key={i} style={{borderBottom:`1px solid ${C.border}`}}>
                              <td style={{padding:"8px 12px",fontWeight:700,color:C.navyDark}}>{mo.slice(0,3)}</td>
                              <td style={{padding:"8px 12px"}}><input type="text" value={fmtInput(kpi[i].revenue)} onChange={e=>updateKPI(member.id,i,"revenue",e.target.value.replace(/,/g,""))} placeholder="0" style={{...inputSt(!!kpi[i].revenue),maxWidth:140,fontSize:13,padding:"6px 10px"}}/></td>
                              <td style={{padding:"8px 12px"}}><input type="text" value={fmtInput(kpi[i].profit)} onChange={e=>updateKPI(member.id,i,"profit",e.target.value.replace(/,/g,""))} placeholder="0" style={{...inputSt(!!kpi[i].profit),maxWidth:140,fontSize:13,padding:"6px 10px"}}/></td>
                              <td style={{padding:"8px 12px",fontWeight:700,color:roi!==null?"#059669":"#cbd5e1"}}>{roi!==null?`${roi}%`:"—"}</td>
                            </tr>
                          )})}
                        </tbody>
                        <tfoot><tr style={{background:"#eff6ff",borderTop:`2px solid #bae6fd`}}><td style={{padding:"10px 12px",fontWeight:900,color:C.navyDark}}>TOTAL</td><td style={{padding:"10px 12px",fontWeight:800,color:C.rev}}>{fmtBig(kpi.reduce((s,k)=>s+(k.revenue||0),0))}</td><td style={{padding:"10px 12px",fontWeight:800,color:C.profit}}>{fmtBig(kpi.reduce((s,k)=>s+(k.profit||0),0))}</td><td/></tr></tfoot>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          }
        </div>
      )}

      {tab==="members"&&(
        <div style={{padding:"24px 28px",display:"flex",flexDirection:"column",gap:20}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:24}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:16}}>Add New Team Member</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:12,alignItems:"end"}}>
              <div><label style={{fontSize:11,letterSpacing:2,color:C.muted,fontWeight:700,display:"block",marginBottom:6}}>FULL NAME</label><input type="text" value={newMemberName} onChange={e=>setNewMemberName(e.target.value)} placeholder="e.g. Nguyen Van A" style={inputSt(!!newMemberName)} onKeyDown={e=>e.key==="Enter"&&addMember()}/></div>
              <div><label style={{fontSize:11,letterSpacing:2,color:C.muted,fontWeight:700,display:"block",marginBottom:6}}>PIN (optional)</label><input type="text" value={newMemberPin} onChange={e=>setNewMemberPin(e.target.value)} placeholder="e.g. 1234" style={inputSt(!!newMemberPin)}/></div>
              <button onClick={addMember} disabled={!newMemberName.trim()} style={{padding:"10px 20px",borderRadius:8,border:"none",background:newMemberName.trim()?C.navyDark:C.light,color:newMemberName.trim()?"#fff":C.muted,cursor:newMemberName.trim()?"pointer":"not-allowed",fontFamily:"inherit",fontSize:14,fontWeight:700,whiteSpace:"nowrap"}}>+ Add</button>
            </div>
          </div>
          {members.length===0
            ?<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:40,textAlign:"center",color:C.muted}}>No team members yet.</div>
            :<div style={{display:"flex",flexDirection:"column",gap:10}}>
              {members.map((member,mi)=>(
                <div key={member.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:36,height:36,borderRadius:"50%",background:MEMBER_COLORS[mi%MEMBER_COLORS.length],display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:15}}>{member.name.charAt(0).toUpperCase()}</div>
                    <div><div style={{fontSize:15,fontWeight:700}}>{member.name}</div><div style={{fontSize:12,color:C.muted}}>PIN: {member.pin?"••••":"none"}</div></div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    <span style={{fontSize:11,fontWeight:800,padding:"3px 10px",borderRadius:20,background:member.role==="sublead"?"#ede9fe":C.light,color:member.role==="sublead"?"#7c3aed":C.muted}}>{member.role==="sublead"?"⭐ Sublead":"👤 Member"}</span>
                    <button onClick={()=>setMembers(prev=>prev.map(m=>m.id===member.id?{...m,role:m.role==="sublead"?"member":"sublead",subleadId:m.role==="sublead"?undefined:m.subleadId}:m))} style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.light,color:C.muted,cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700}}>{member.role==="sublead"?"→ Member":"→ Sublead"}</button>
                    {member.role!=="sublead"&&members.some(m=>m.role==="sublead")&&(
                      <select value={member.subleadId||""} onChange={e=>setMembers(prev=>prev.map(m=>m.id===member.id?{...m,subleadId:e.target.value||undefined}:m))} style={{padding:"5px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:C.card,fontFamily:"inherit",fontSize:11,color:C.text,cursor:"pointer"}}>
                        <option value="">No sublead</option>
                        {members.filter(m=>m.role==="sublead").map(sl=><option key={sl.id} value={sl.id}>{sl.name}</option>)}
                      </select>
                    )}
                    <button onClick={()=>onViewMember(member)} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${C.border}`,background:C.light,color:C.navyDark,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700}}>View Data</button>
                    <button onClick={()=>setMembers(prev=>prev.filter(m=>m.id!==member.id))} style={{padding:"6px 14px",borderRadius:8,border:"1px solid #fecaca",background:"#fff5f5",color:"#dc2626",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700}}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {tab==="settings"&&(
        <div style={{padding:"28px 28px 60px",maxWidth:480}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"28px 28px 24px"}}>
            <div style={{fontSize:20,fontWeight:900,marginBottom:4}}>🔐 Change Manager PIN</div>
            {isDefaultPin&&<div style={{fontSize:13,color:"#92400e",background:"#fef3c7",padding:"8px 12px",borderRadius:8,marginBottom:16,fontWeight:600}}>⚠️ Using default PIN (admin2026). Please change it.</div>}
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {[["CURRENT PIN",mgrOld,setMgrOld,"Enter current PIN"],["NEW PIN",mgrNew1,setMgrNew1,"At least 4 characters"],["CONFIRM PIN",mgrNew2,setMgrNew2,"Repeat new PIN"]].map(([label,val,set,ph])=>(
                <div key={label}><label style={{fontSize:11,letterSpacing:2,color:C.muted,fontWeight:700,display:"block",marginBottom:7}}>{label}</label><input type="password" value={val} onChange={e=>{set(e.target.value);setMgrMsg("");}} placeholder={ph} onKeyDown={e=>e.key==="Enter"&&handleMgrPin()} style={{...inputSt(!!val)}}/></div>
              ))}
              {mgrMsg&&<div style={{fontSize:13,fontWeight:600,color:mgrMsg.startsWith("✅")?"#15803d":"#dc2626",background:mgrMsg.startsWith("✅")?"#dcfce7":"#fee2e2",borderRadius:9,padding:"10px 14px"}}>{mgrMsg}</div>}
              <button onClick={handleMgrPin} style={{padding:"13px 0",borderRadius:10,border:"none",background:C.navyDark,color:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:15,fontWeight:800}}>Save New PIN</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MEMBER TRACKER
// ═══════════════════════════════════════════════════════════════════════════
function MemberTracker({member,memberData,setMemberData,onLogout,isManagerView,onUpdatePin,onUpdateKPI,onUpdateName}) {
  const kpi=member.kpi||defaultKPI();
  const [view,setView]=useState("month");
  const [activeMonth,setActiveMonth]=useState(new Date().getMonth());
  const [activeDay,setActiveDay]=useState(new Date().getDate());
  const [chartMetric,setChartMetric]=useState("revenue");
  const [chartType,setChartType]=useState("monthly");
  const [pinOld,setPinOld]=useState("");const[pinNew1,setPinNew1]=useState("");const[pinNew2,setPinNew2]=useState("");const[pinMsg,setPinMsg]=useState("");
  const [newName,setNewName]=useState("");const[nameMsg,setNameMsg]=useState("");
  const [savedAt,setSavedAt]=useState(null);
  const [saveTimer,setSaveTimer]=useState(null);
  const [localKpi,setLocalKpi]=useState(()=>member.kpi||defaultKPI());
  const [kpiSaved,setKpiSaved]=useState(false);
  const [monthSavedAt,setMonthSavedAt]=useState({});
  const [daySavedAt,setDaySavedAt]=useState({});

  // Keep localKpi in sync if member.kpi changes externally
  useEffect(()=>{setLocalKpi(member.kpi||defaultKPI());},[member.id]);

  const wrappedSetMemberData=(data)=>{
    setMemberData(data);
    setSavedAt(new Date());
    if(saveTimer)clearTimeout(saveTimer);
    const t=setTimeout(()=>setSavedAt(null),3000);
    setSaveTimer(t);
  };

  const handleChangePin=()=>{
    if(member.pin&&pinOld!==member.pin){setPinMsg("❌ Current PIN is incorrect.");return;}
    if(pinNew1.length<4){setPinMsg("❌ New PIN must be at least 4 characters.");return;}
    if(pinNew1!==pinNew2){setPinMsg("❌ New PINs don't match.");return;}
    onUpdatePin(member.id,pinNew1);setPinMsg("✅ PIN changed!");setPinOld("");setPinNew1("");setPinNew2("");
  };

  const monthly=memberData.monthly||initMonthlyActuals();
  const daily=memberData.daily||initDailyActuals();

  const setMonthField=(idx,field,val)=>{
    const next=[...monthly];next[idx]={...next[idx],[field]:val};wrappedSetMemberData({...memberData,monthly:next});
    setMonthSavedAt(prev=>({...prev,[idx]:new Date()}));
  };
  const setDailyChannel=(mi,dayIdx,channel,field,val)=>{
    const nextDaily=daily.map((month,i)=>{
      if(i!==mi)return month;
      return month.map((d,di)=>{
        if(di!==dayIdx)return d;
        const channels={...(d.channels||{})};
        channels[channel]={...(channels[channel]||{}),[field]:val};
        return{...d,channels};
      });
    });
    wrappedSetMemberData({...memberData,daily:nextDaily});
    setDaySavedAt(prev=>({...prev,[`${mi}-${dayIdx}`]:new Date()}));
  };

  const derived=useMemo(()=>deriveMonthly(monthly,daily,localKpi),[monthly,daily,localKpi]);

  const totalKpiRev=localKpi.reduce((s,k)=>s+(k.revenue||0),0);
  const totalKpiProfit=localKpi.reduce((s,k)=>s+(k.profit||0),0);
  const totalActualRev=derived.reduce((s,d)=>s+(d.rev??0),0);
  const totalActualProfit=derived.reduce((s,d)=>s+(d.prof??0),0);
  const totalActualCost=derived.reduce((s,d)=>s+(d.cost??0),0);
  const filledCount=derived.filter(d=>d.rev!==null).length;

  const m=activeMonth;
  const d=derived[m];
  const a=monthly[m]||{};
  const mk=localKpi[m];

  // Daily totals for active month
  const allDayTotals=useMemo(()=>Array.from({length:DAYS_IN_MONTH[m]},(_,i)=>{
    const dd=(daily[m]||[])[i]||{};
    let totalRev=0,totalCost=0;
    Object.values(dd.channels||{}).forEach(ch=>{totalRev+=parseFloat(ch.revenue)||0;totalCost+=parseFloat(ch.cost)||0;});
    const totalProfit=totalRev-totalCost;
    const roas=totalCost>0?(totalRev/totalCost*100).toFixed(0):null;
    const roi=(totalRev-totalProfit)>0?(totalProfit/(totalRev-totalProfit)*100).toFixed(2):null;
    return{totalRev,totalCost,totalProfit,roas,roi,hasData:totalRev>0||totalCost>0};
  }),[daily,m]);

  const cumRev=allDayTotals.reduce((s,d)=>s+d.totalRev,0);
  const cumCost=allDayTotals.reduce((s,d)=>s+d.totalCost,0);
  const cumProfit=cumRev-cumCost;
  const filledDays=allDayTotals.filter(d=>d.hasData).length;
  const remaining=DAYS_IN_MONTH[m]-filledDays;
  const dayAvgNeeded=remaining>0&&mk.revenue>cumRev?Math.round((mk.revenue-cumRev)/remaining):0;

  const currentDayChannels=((daily[m]||[])[activeDay-1]||{}).channels||{};

  const dailyChartData=useMemo(()=>allDayTotals.map((dt,i)=>({name:`D${i+1}`,Cost:dt.totalCost,Revenue:dt.totalRev,Profit:dt.totalProfit})),[allDayTotals]);

  const TAB=(key,label)=><button key={key} onClick={()=>setView(key)} style={{padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",background:view===key?C.navyDark:"transparent",color:view===key?"#fff":C.muted,fontFamily:"inherit",fontSize:13,fontWeight:700}}>{label}</button>;

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Inter','Segoe UI',sans-serif",color:C.text}}>
      {/* Header */}
      <div style={{background:C.navy,padding:"16px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:40,height:40,borderRadius:"50%",background:MEMBER_COLORS[0],display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:18}}>{member.name.charAt(0).toUpperCase()}</div>
          <div><div style={{fontSize:12,letterSpacing:3,color:"#93c5fd",fontWeight:600}}>{isManagerView?"MANAGER VIEW · ":""}PUMA PERFORMANCE TRACKER 2026</div><div style={{fontSize:24,fontWeight:900,color:"#fff"}}>{member.name}</div></div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{display:"flex",gap:4,background:"#1e40af",borderRadius:10,padding:4}}>
            {TAB("month","◉ MONTH")}{TAB("daily","◈ DAILY")}{TAB("overview","▦ OVERVIEW")}{TAB("chart","▲ CHARTS")}
            {TAB("targets","🎯 TARGETS")}
            {!isManagerView&&TAB("settings","⚙ SETTINGS")}
          </div>
          {savedAt&&<div style={{fontSize:12,fontWeight:700,color:"#6ee7b7",background:"#064e3b",borderRadius:8,padding:"5px 12px",display:"flex",alignItems:"center",gap:6,transition:"opacity .3s"}}>✓ Saved</div>}
          <button onClick={onLogout} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #3b5bdb",background:"transparent",color:"#93c5fd",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700}}>{isManagerView?"← Back":"← Logout"}</button>
        </div>
      </div>

      {/* Summary strip */}
      {view!=="targets"&&view!=="settings"&&(()=>{
        const currentMonth=new Date().getMonth();
        const filledDerived=derived.slice(0,currentMonth+1).filter(d=>d.rev!==null&&d.prof!==null);
        const roiValues=filledDerived.map(d=>d.roi).filter(r=>r!==null);
        const avgRoi=roiValues.length>0?(roiValues.reduce((s,r)=>s+r,0)/roiValues.length):null;
        const cards=[
          {label:"YTD REVENUE",val:fmtBig(totalActualRev),sub:`Target ${fmtBig(totalKpiRev)}`,p:filledCount>0?pct(totalActualRev,totalKpiRev):null,color:C.rev},
          {label:"YTD PROFIT",val:fmtBig(totalActualProfit),sub:`Target ${fmtBig(totalKpiProfit)}`,p:filledCount>0?pct(totalActualProfit,totalKpiProfit):null,color:C.profit},
          {label:"AVG ROI (YTD)",val:avgRoi!==null?`${avgRoi.toFixed(2)}%`:"—",sub:`Across ${roiValues.length} filed months`,p:null,color:"#059669"},
          {label:"MONTHS FILED",val:`${filledCount} / 12`,sub:"months with data",p:filledCount>0?+((filledCount/12)*100).toFixed(0):null},
        ];
        return (
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,padding:"20px 28px 0"}}>
            {cards.map(card=>{const st=statusOf(card.p);return(
              <div key={card.label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 20px"}}>
                <div style={{fontSize:11,letterSpacing:2,color:C.muted,marginBottom:6,fontWeight:600}}>{card.label}</div>
                <div style={{fontSize:20,fontWeight:800,color:card.color||C.text,marginBottom:2}}>{card.val}</div>
                <div style={{fontSize:12,color:C.muted,marginBottom:card.p!==null?8:0}}>{card.sub}</div>
                {card.p!==null&&(<><ProgressBar p={card.p}/><div style={{display:"flex",justifyContent:"space-between",marginTop:6}}><span style={{fontSize:12,fontWeight:700,color:st.color}}>{card.p}% of KPI</span><Badge p={card.p}/></div></>)}
              </div>
            );})}
          </div>
        );
      })()}

      {/* ── MONTH VIEW ── */}
      {view==="month"&&(
        <div style={{padding:"20px 28px 32px",display:"flex",flexDirection:"column",gap:18}}>
          {/* Month note */}
          <div style={{background:"#eff6ff",border:`1px solid #bfdbfe`,borderRadius:10,padding:"10px 16px",fontSize:13,color:"#1e40af",fontWeight:500}}>
            📌 Fill in monthly actuals directly here — <strong>or</strong> use the <strong>Daily</strong> tab to log by day and these totals will auto-calculate.
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {MONTHS.map((_,i)=>{const d2=derived[i];const p2=pct(d2.rev,localKpi[i].revenue);const st=statusOf(p2);return(
              <button key={i} onClick={()=>setActiveMonth(i)} style={{padding:"6px 14px",borderRadius:8,fontFamily:"inherit",fontSize:13,fontWeight:activeMonth===i?800:500,border:activeMonth===i?`2px solid ${d2.rev!==null?st.color:C.navyDark}`:`1px solid ${C.border}`,background:activeMonth===i?(d2.rev!==null?st.bg:"#eff6ff"):C.card,color:d2.rev!==null?st.color:(activeMonth===i?C.navyDark:C.muted),cursor:"pointer",position:"relative"}}>
                {MONTHS[i].slice(0,3).toUpperCase()}
                {d2.rev!==null&&<span style={{position:"absolute",top:-4,right:-4,width:8,height:8,borderRadius:"50%",background:st.color,border:"2px solid #f8fafc"}}/>}
              </button>
            );})}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:24,display:"flex",flexDirection:"column",gap:18}}>
              <div>
                <div style={{fontSize:11,letterSpacing:4,color:C.muted,fontWeight:600}}>MONTHLY ACTUALS FOR</div>
                <div style={{fontSize:26,fontWeight:900,marginTop:2}}>{MONTHS[m]}</div>
                {monthSavedAt[m]&&<div style={{fontSize:11,color:"#15803d",marginTop:4,fontWeight:600}}>✓ Last saved: {monthSavedAt[m].toLocaleString()}</div>}
              </div>
              {mk.revenue>0&&(
                <div style={{background:"#eff6ff",borderRadius:10,padding:"12px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div><div style={{fontSize:10,letterSpacing:1,color:C.muted,marginBottom:2,fontWeight:600}}>KPI REVENUE</div><div style={{fontSize:14,fontWeight:800,color:C.rev}}>{fmtBig(mk.revenue)}</div></div>
                  <div><div style={{fontSize:10,letterSpacing:1,color:C.muted,marginBottom:2,fontWeight:600}}>KPI PROFIT</div><div style={{fontSize:14,fontWeight:800,color:C.profit}}>{fmtBig(mk.profit)}</div></div>
                </div>
              )}
              {d.hasDailyData&&(
                <div style={{background:"#fef9c3",border:"1px solid #fde68a",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#92400e"}}>
                  ⚡ Daily data detected — totals below are auto-summed from daily entries. Clear daily data to enter monthly manually.
                </div>
              )}
              {[{field:"cost",label:"ACTUAL COST",ph:"e.g. 1800000",color:C.cost},{field:"revenue",label:"ACTUAL REVENUE",ph:"e.g. 2100000",color:C.rev},{field:"profit",label:"ACTUAL PROFIT",ph:"auto if blank",color:C.profit}].map(({field,label,ph,color})=>{
                const disabled=d.hasDailyData;
                const displayVal=disabled?(field==="revenue"?fmtBig(d.rev):field==="cost"?fmtBig(d.cost):fmtBig(d.prof)):"";
                return(
                  <div key={field}>
                    <label style={{fontSize:11,letterSpacing:2,color,display:"block",marginBottom:6,fontWeight:700}}>{label}</label>
                    {disabled
                      ?<div style={{padding:"10px 12px",borderRadius:8,background:"#fef9c3",border:"1px solid #fde68a",fontSize:15,fontWeight:700,color:color==="C.cost"?C.cost:color}}>{displayVal} <span style={{fontSize:11,color:"#92400e",fontWeight:500}}>(from daily)</span></div>
                      :<input type="text" value={a[field]||""} onChange={e=>setMonthField(m,field,e.target.value)} placeholder={field==="profit"?`auto: ${d.prof!==null?fmtBig(d.prof):"rev − cost"}`:ph} style={inputSt(!!(a[field]||""))}/>
                    }
                  </div>
                );
              })}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <ResultCard label="REVENUE" actual={d.rev} target={mk.revenue} color={C.rev}/>
              <ResultCard label="PROFIT" actual={d.prof} target={mk.profit} color={C.profit}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}><div style={{fontSize:11,letterSpacing:2,color:C.muted,marginBottom:6,fontWeight:600}}>COST</div><div style={{fontSize:20,fontWeight:900,color:d.cost!==null?C.cost:"#cbd5e1"}}>{fmtBig(d.cost)}</div></div>
                <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}><div style={{fontSize:11,letterSpacing:2,color:C.muted,marginBottom:6,fontWeight:600}}>ROI</div><div style={{fontSize:20,fontWeight:900,color:d.roi!==null?"#059669":"#cbd5e1"}}>{d.roi!==null?`${d.roi.toFixed(2)}%`:"—"}</div></div>
              </div>
              <div style={{display:"flex",gap:8}}>
                {[["← PREV",()=>setActiveMonth(Math.max(0,m-1)),m===0],["NEXT →",()=>setActiveMonth(Math.min(11,m+1)),m===11]].map(([label,fn,dis])=>(
                  <button key={label} onClick={fn} disabled={dis} style={{flex:1,padding:"10px 0",borderRadius:8,border:`1px solid ${dis?C.border:C.navyDark}`,background:dis?C.light:"#eff6ff",color:dis?"#cbd5e1":C.navyDark,cursor:dis?"not-allowed":"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700}}>{label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DAILY VIEW ── */}
      {view==="daily"&&(
        <div style={{padding:"20px 28px 40px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:"#eff6ff",border:`1px solid #bfdbfe`,borderRadius:10,padding:"10px 16px",fontSize:13,color:"#1e40af",fontWeight:500}}>
            📌 Daily entries auto-aggregate to Month, Overview, and Charts. No need to fill the monthly tab if using daily.
          </div>
          {/* Month selector */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {MONTHS.map((_,i)=>(
              <button key={i} onClick={()=>{setActiveMonth(i);setActiveDay(1);}} style={{padding:"6px 14px",borderRadius:8,fontFamily:"inherit",fontSize:13,fontWeight:activeMonth===i?800:500,border:activeMonth===i?"2px solid #1e40af":`1px solid ${C.border}`,background:activeMonth===i?"#eff6ff":C.card,color:activeMonth===i?C.navyDark:C.muted,cursor:"pointer"}}>
                {MONTHS[i].slice(0,3).toUpperCase()}
              </button>
            ))}
          </div>
          {/* KPI progress strip */}
          <div style={{background:"#eff6ff",border:`1px solid #bfdbfe`,borderRadius:12,padding:"10px 18px",display:"flex",gap:20,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{fontSize:13,fontWeight:800,color:C.navyDark}}>{MONTHS[m]} Progress</div>
            {[{label:"KPI REV",val:fmtBig(mk.revenue),color:C.rev},{label:"ACTUAL",val:fmtBig(cumRev),color:C.rev},{label:"KPI PROFIT",val:fmtBig(mk.profit),color:C.profit},{label:"ACTUAL PROFIT",val:fmtBig(cumProfit),color:cumProfit>=0?C.profit:"#dc2626"}].map(({label,val,color})=>(
              <div key={label}><div style={{fontSize:10,letterSpacing:1,color:C.muted,fontWeight:700,marginBottom:2}}>{label}</div><div style={{fontSize:14,fontWeight:800,color}}>{val}</div></div>
            ))}
            <div style={{marginLeft:"auto",fontSize:12,color:C.muted,fontWeight:600}}>{filledDays}/{DAYS_IN_MONTH[m]} days · {remaining>0&&dayAvgNeeded>0?`need ${fmtBig(dayAvgNeeded)}/day`:"✓ done"}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"180px 1fr",gap:14}}>
            {/* Day list */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
              <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,fontSize:11,letterSpacing:2,color:C.muted,fontWeight:700}}>{MONTHS[m].toUpperCase()} · DAYS</div>
              <div style={{maxHeight:540,overflowY:"auto"}}>
                {Array.from({length:DAYS_IN_MONTH[m]},(_,i)=>{const dt=allDayTotals[i];const day=i+1;return(
                  <div key={day} onClick={()=>setActiveDay(day)} style={{padding:"9px 14px",background:activeDay===day?"#eff6ff":"transparent",borderLeft:activeDay===day?"3px solid #1e40af":"3px solid transparent",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontWeight:activeDay===day?800:500,color:activeDay===day?C.navyDark:C.text,fontSize:14}}>Day {day}</span>
                    {dt.hasData&&<span style={{fontSize:10,color:C.profit,fontWeight:700}}>✓</span>}
                  </div>
                );})}
              </div>
            </div>
            {/* Day input */}
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"16px 20px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{fontSize:10,letterSpacing:3,color:C.muted,fontWeight:700}}>DAILY REPORT</div>
                    <div style={{fontSize:20,fontWeight:900}}>{MONTHS[m]} · Day {activeDay} &nbsp;<span style={{fontSize:13,color:C.muted,fontWeight:500}}>{String(activeDay).padStart(2,"0")}/{String(m+1).padStart(2,"0")}/2026</span></div>
                    {daySavedAt[`${m}-${activeDay-1}`]&&<div style={{fontSize:11,color:"#15803d",marginTop:3,fontWeight:600}}>✓ Last saved: {daySavedAt[`${m}-${activeDay-1}`].toLocaleString()}</div>}
                  </div>
                  <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                    {[{label:"COST",val:allDayTotals[activeDay-1]?.totalCost||0,color:C.cost},{label:"REVENUE",val:allDayTotals[activeDay-1]?.totalRev||0,color:C.rev},{label:"PROFIT",val:allDayTotals[activeDay-1]?.totalProfit||0,color:(allDayTotals[activeDay-1]?.totalProfit||0)>=0?C.profit:"#dc2626"}].map(({label,val,color})=>(
                      <div key={label}><div style={{fontSize:9,letterSpacing:1,color:C.muted,fontWeight:700,marginBottom:2}}>{label}</div><div style={{fontSize:15,fontWeight:900,color}}>{fmtBig(val)}</div></div>
                    ))}
                  </div>
                </div>
                {/* Channel table */}
                <div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead>
                      <tr style={{background:C.light}}>
                        {["CHANNEL","COST ($)","REVENUE ($)","ROAS","PROFIT","ROI"].map(h=>(
                          <th key={h} style={{padding:"8px 12px",textAlign:h==="CHANNEL"?"left":"right",fontSize:10,letterSpacing:2,color:C.muted,fontWeight:700,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {REPORT_CHANNELS.map((ch,ci)=>{
                        const chVals=currentDayChannels[ch]||{};
                        const chCost=parseFloat(chVals.cost)||0;
                        const chRev=parseFloat(chVals.revenue)||0;
                        const chProfit=chRev-chCost;
                        const chRoas=chCost>0?(chRev/chCost*100).toFixed(0):null;
                        const chRoi=(chRev-chProfit)>0?(chProfit/(chRev-chProfit)*100).toFixed(2):null;
                        return(
                          <tr key={ch} style={{borderBottom:`1px solid ${C.border}`,background:ci%2===0?"#fff":"#fafafa"}}>
                            <td style={{padding:"8px 12px"}}><span style={{fontSize:13,fontWeight:800,color:CHANNEL_COLORS[ch]||C.text}}>● {ch}</span></td>
                            <td style={{padding:"6px 10px",textAlign:"right"}}><input type="text" value={fmtInput(chVals.cost)} onChange={e=>setDailyChannel(m,activeDay-1,ch,"cost",e.target.value.replace(/,/g,""))} placeholder="0" style={{width:90,padding:"5px 8px",borderRadius:6,border:`1.5px solid ${chVals.cost?C.navyDark:C.border}`,background:C.light,fontFamily:"inherit",fontSize:13,color:C.cost,textAlign:"right",outline:"none"}}/></td>
                            <td style={{padding:"6px 10px",textAlign:"right"}}><input type="text" value={fmtInput(chVals.revenue)} onChange={e=>setDailyChannel(m,activeDay-1,ch,"revenue",e.target.value.replace(/,/g,""))} placeholder="0" style={{width:90,padding:"5px 8px",borderRadius:6,border:`1.5px solid ${chVals.revenue?C.navyDark:C.border}`,background:C.light,fontFamily:"inherit",fontSize:13,color:C.rev,textAlign:"right",outline:"none"}}/></td>
                            <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:"#059669"}}>{chRoas?`${chRoas}%`:"—"}</td>
                            <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:chProfit>=0?C.profit:"#dc2626"}}>{chCost>0||chRev>0?fmtBig(chProfit):"—"}</td>
                            <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:C.kpi}}>{chRoi?`${chRoi}%`:"—"}</td>
                          </tr>
                        );
                      })}
                      {/* Day total row */}
                      {allDayTotals[activeDay-1]?.hasData&&(
                        <tr style={{background:"#e0f2fe",borderTop:`2px solid #bae6fd`}}>
                          <td style={{padding:"8px 12px",fontWeight:900,color:"#0369a1",fontSize:12}}>TOTAL</td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontWeight:800,color:C.cost}}>{fmtBig(allDayTotals[activeDay-1].totalCost)}</td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontWeight:800,color:C.rev}}>{fmtBig(allDayTotals[activeDay-1].totalRev)}</td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontWeight:800,color:"#059669"}}>{allDayTotals[activeDay-1].roas?`${allDayTotals[activeDay-1].roas}%`:"—"}</td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontWeight:900,color:allDayTotals[activeDay-1].totalProfit>=0?C.profit:"#dc2626"}}>{fmtBig(allDayTotals[activeDay-1].totalProfit)}</td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontWeight:900,color:C.kpi}}>{allDayTotals[activeDay-1].roi?`${allDayTotals[activeDay-1].roi}%`:"—"}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div style={{display:"flex",gap:8,marginTop:14}}>
                  {[["← Prev",()=>setActiveDay(Math.max(1,activeDay-1)),activeDay===1],["Next →",()=>setActiveDay(Math.min(DAYS_IN_MONTH[m],activeDay+1)),activeDay===DAYS_IN_MONTH[m]]].map(([label,fn,dis])=>(
                    <button key={label} onClick={fn} disabled={dis} style={{flex:1,padding:"8px 0",borderRadius:8,border:`1px solid ${dis?C.border:C.navyDark}`,background:dis?C.light:"#eff6ff",color:dis?"#cbd5e1":C.navyDark,cursor:dis?"not-allowed":"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700}}>{label}</button>
                  ))}
                </div>
              </div>
              {/* Month all-days summary */}
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
                <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.border}`,fontSize:11,letterSpacing:2,color:C.muted,fontWeight:700}}>{MONTHS[m].toUpperCase()} — ALL DAYS SUMMARY</div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead><tr style={{background:C.light}}>{["DAY","DATE","COST","REVENUE","ROAS","PROFIT","ROI"].map(h=><th key={h} style={{padding:"7px 12px",textAlign:h==="DAY"||h==="DATE"?"left":"right",fontSize:10,letterSpacing:2,color:C.muted,fontWeight:700,borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
                    <tbody>
                      {allDayTotals.map((dt,i)=>{
                        if(!dt.hasData)return null;
                        const day=i+1;
                        return(
                          <tr key={day} onClick={()=>setActiveDay(day)} style={{background:activeDay===day?"#eff6ff":"transparent",borderBottom:`1px solid ${C.border}`,cursor:"pointer"}}>
                            <td style={{padding:"7px 12px",fontWeight:700,color:C.navyDark}}>{day}</td>
                            <td style={{padding:"7px 12px",color:C.muted,fontSize:11}}>{`${String(day).padStart(2,"0")}/${String(m+1).padStart(2,"0")}/2026`}</td>
                            <td style={{padding:"7px 12px",textAlign:"right",color:C.cost,fontWeight:600}}>{fmtBig(dt.totalCost)}</td>
                            <td style={{padding:"7px 12px",textAlign:"right",color:C.rev,fontWeight:600}}>{fmtBig(dt.totalRev)}</td>
                            <td style={{padding:"7px 12px",textAlign:"right",color:"#059669",fontWeight:700}}>{dt.roas?`${dt.roas}%`:"—"}</td>
                            <td style={{padding:"7px 12px",textAlign:"right",fontWeight:700,color:dt.totalProfit>=0?C.profit:"#dc2626"}}>{fmtBig(dt.totalProfit)}</td>
                            <td style={{padding:"7px 12px",textAlign:"right",fontWeight:700,color:C.kpi}}>{dt.roi?`${dt.roi}%`:"—"}</td>
                          </tr>
                        );
                      })}
                      <tr style={{background:"#e0f2fe",borderTop:`2px solid #bae6fd`}}>
                        <td colSpan={2} style={{padding:"9px 12px",fontWeight:900,color:"#0369a1",fontSize:12}}>MONTH TOTAL</td>
                        <td style={{padding:"9px 12px",textAlign:"right",color:C.cost,fontWeight:800}}>{fmtBig(cumCost)}</td>
                        <td style={{padding:"9px 12px",textAlign:"right",color:C.rev,fontWeight:800}}>{fmtBig(cumRev)}</td>
                        <td style={{padding:"9px 12px",textAlign:"right",color:"#059669",fontWeight:800}}>{cumCost>0?`${(cumRev/cumCost*100).toFixed(0)}%`:"—"}</td>
                        <td style={{padding:"9px 12px",textAlign:"right",fontWeight:900,color:cumProfit>=0?C.profit:"#dc2626"}}>{fmtBig(cumProfit)}</td>
                        <td style={{padding:"9px 12px",textAlign:"right",fontWeight:900,color:C.kpi}}>{(cumRev-cumProfit)>0?`${(cumProfit/(cumRev-cumProfit)*100).toFixed(2)}%`:"—"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── OVERVIEW ── */}
      {view==="overview"&&(
        <div style={{padding:"20px 28px 32px",overflowX:"auto"}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:C.light}}>{["MONTH","KPI REV","ACT COST","ACT REV","REV %","KPI PROFIT","ACT PROFIT","PROFIT %","ROI","SOURCE","STATUS"].map(h=><th key={h} style={{padding:"12px 14px",textAlign:"left",fontSize:11,letterSpacing:2,color:C.muted,fontWeight:700,borderBottom:`2px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
              <tbody>
                {MONTHS.map((mo,i)=>{
                  const d2=derived[i];const rp=pct(d2.rev,localKpi[i].revenue);const pp=pct(d2.prof,localKpi[i].profit);const rs=statusOf(rp);const hasData=d2.rev!==null;
                  return(
                    <tr key={i} onClick={()=>{setActiveMonth(i);setView("month");}} style={{background:i%2===0?"#fff":"#f8fafc",cursor:"pointer",borderBottom:`1px solid ${C.border}`}} onMouseEnter={e=>e.currentTarget.style.background="#eff6ff"} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":"#f8fafc"}>
                      <td style={{padding:"11px 14px",fontWeight:700,color:C.navyDark}}>{mo.slice(0,3)}</td>
                      <td style={{padding:"11px 14px",color:C.muted}}>{fmtBig(localKpi[i].revenue)}</td>
                      <td style={{padding:"11px 14px",color:hasData?C.cost:"#cbd5e1",fontWeight:hasData?600:400}}>{fmtBig(d2.cost)}</td>
                      <td style={{padding:"11px 14px",color:hasData?C.rev:"#cbd5e1",fontWeight:hasData?600:400}}>{fmtBig(d2.rev)}</td>
                      <td style={{padding:"11px 14px"}}>{rp!==null?<div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:50,height:5,background:C.light,borderRadius:5,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(rp,100)}%`,background:rs.color,borderRadius:5}}/></div><span style={{color:rs.color,fontWeight:700}}>{rp}%</span></div>:<span style={{color:"#cbd5e1"}}>—</span>}</td>
                      <td style={{padding:"11px 14px",color:C.muted}}>{fmtBig(localKpi[i].profit)}</td>
                      <td style={{padding:"11px 14px",color:hasData?C.profit:"#cbd5e1",fontWeight:hasData?600:400}}>{fmtBig(d2.prof)}</td>
                      <td style={{padding:"11px 14px"}}>{pp!==null?<span style={{color:statusOf(pp).color,fontWeight:700}}>{pp}%</span>:<span style={{color:"#cbd5e1"}}>—</span>}</td>
                      <td style={{padding:"11px 14px",color:d2.roi!==null?"#059669":"#cbd5e1"}}>{d2.roi!==null?`${d2.roi.toFixed(1)}%`:"—"}</td>
                      <td style={{padding:"11px 14px"}}>{hasData?<span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:12,background:d2.hasDailyData?"#fef9c3":"#eff6ff",color:d2.hasDailyData?"#92400e":"#1e40af"}}>{d2.hasDailyData?"📅 Daily":"📋 Monthly"}</span>:<span style={{color:"#cbd5e1",fontSize:11}}>—</span>}</td>
                      <td style={{padding:"11px 14px"}}><span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:hasData?rs.bg:C.light,color:hasData?rs.color:C.muted}}>{hasData?rs.label:"PENDING"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot><tr style={{background:"#e0f2fe",borderTop:`2px solid #bae6fd`}}>
                <td style={{padding:"12px 14px",fontWeight:900,color:"#0369a1",fontSize:12}}>TOTAL</td>
                <td style={{padding:"12px 14px",color:C.muted,fontWeight:700}}>{fmtBig(totalKpiRev)}</td>
                <td style={{padding:"12px 14px",color:C.cost,fontWeight:700}}>{fmtBig(totalActualCost)}</td>
                <td style={{padding:"12px 14px",color:C.rev,fontWeight:700}}>{fmtBig(totalActualRev)}</td>
                <td style={{padding:"12px 14px"}}>{filledCount>0&&<span style={{color:statusOf(pct(totalActualRev,totalKpiRev)).color,fontWeight:900}}>{pct(totalActualRev,totalKpiRev)}%</span>}</td>
                <td style={{padding:"12px 14px",color:C.muted,fontWeight:700}}>{fmtBig(totalKpiProfit)}</td>
                <td style={{padding:"12px 14px",color:C.profit,fontWeight:700}}>{fmtBig(totalActualProfit)}</td>
                <td colSpan={4}/>
              </tr></tfoot>
            </table>
          </div>
          <div style={{marginTop:8,fontSize:12,color:C.muted}}>Click any row to edit that month</div>
        </div>
      )}

      {/* ── CHARTS ── */}
      {view==="chart"&&(
        <div style={{padding:"20px 28px 32px",display:"flex",flexDirection:"column",gap:20}}>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{display:"flex",gap:4,background:C.light,borderRadius:8,padding:4}}>
              {[["monthly","12-Month"],["daily","Daily"]].map(([t,label])=>(
                <button key={t} onClick={()=>setChartType(t)} style={{padding:"6px 14px",borderRadius:6,background:chartType===t?"#fff":"transparent",color:chartType===t?C.navyDark:C.muted,border:chartType===t?`1px solid ${C.border}`:"1px solid transparent",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700}}>{label}</button>
              ))}
            </div>
            {chartType==="monthly"&&(
              <div style={{display:"flex",gap:4,background:C.light,borderRadius:8,padding:4}}>
                {[["revenue","Revenue",C.rev],["cost","Cost",C.cost],["profit","Profit",C.profit]].map(([k,label,color])=>(
                  <button key={k} onClick={()=>setChartMetric(k)} style={{padding:"6px 14px",borderRadius:6,background:chartMetric===k?"#fff":"transparent",color:chartMetric===k?color:C.muted,border:chartMetric===k?`1px solid ${color}44`:"1px solid transparent",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700}}>{label}</button>
                ))}
              </div>
            )}
            {chartType==="daily"&&(
              <div style={{display:"flex",gap:4,background:C.light,borderRadius:8,padding:4,flexWrap:"wrap"}}>
                {MONTHS.map((_,i)=>(
                  <button key={i} onClick={()=>setActiveMonth(i)} style={{padding:"5px 10px",borderRadius:6,background:activeMonth===i?"#fff":"transparent",color:activeMonth===i?C.navyDark:C.muted,border:activeMonth===i?`1px solid ${C.border}`:"1px solid transparent",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:700}}>{MONTHS_SHORT[i]}</button>
                ))}
              </div>
            )}
          </div>
          {chartType==="monthly"&&(
            <>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"24px 20px"}}>
                <div style={{fontSize:12,letterSpacing:2,color:C.muted,fontWeight:700,marginBottom:20}}>{chartMetric.toUpperCase()} — ACTUAL vs KPI</div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={MONTHS_SHORT.map((_,i)=>({name:MONTHS_SHORT[i],"KPI Target":localKpi[i][chartMetric==="profit"?"profit":"revenue"]??0,"Actual":derived[i][chartMetric==="revenue"?"rev":chartMetric==="cost"?"cost":"prof"]??0}))} margin={{top:8,right:20,left:10,bottom:8}} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false}/><XAxis dataKey="name" tick={{fontSize:13,fill:C.muted,fontFamily:"inherit"}} axisLine={false} tickLine={false}/><YAxis tickFormatter={fmtShort} tick={{fontSize:12,fill:C.muted,fontFamily:"inherit"}} axisLine={false} tickLine={false} width={65}/><Tooltip content={<CustomTooltip/>}/><Legend wrapperStyle={{fontSize:13,fontFamily:"inherit"}}/>
                    <Bar dataKey="KPI Target" fill="#c7d2fe" radius={[4,4,0,0]}/><Bar dataKey="Actual" fill={chartMetric==="revenue"?C.rev:chartMetric==="cost"?C.cost:C.profit} radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"24px 20px"}}>
                <div style={{fontSize:12,letterSpacing:2,color:C.muted,fontWeight:700,marginBottom:20}}>REVENUE · COST · PROFIT — ALL MONTHS</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={MONTHS_SHORT.map((_,i)=>({name:MONTHS_SHORT[i],Revenue:derived[i].rev??0,Cost:derived[i].cost??0,Profit:derived[i].prof??0}))} margin={{top:8,right:20,left:10,bottom:8}} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false}/><XAxis dataKey="name" tick={{fontSize:13,fill:C.muted,fontFamily:"inherit"}} axisLine={false} tickLine={false}/><YAxis tickFormatter={fmtShort} tick={{fontSize:12,fill:C.muted,fontFamily:"inherit"}} axisLine={false} tickLine={false} width={65}/><Tooltip content={<CustomTooltip/>}/><Legend wrapperStyle={{fontSize:13,fontFamily:"inherit"}}/>
                    <Bar dataKey="Revenue" fill={C.rev} radius={[3,3,0,0]}/><Bar dataKey="Cost" fill={C.cost} radius={[3,3,0,0]}/><Bar dataKey="Profit" fill={C.profit} radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
          {chartType==="daily"&&(
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"24px 20px"}}>
              <div style={{fontSize:12,letterSpacing:2,color:C.muted,fontWeight:700,marginBottom:20}}>DAILY BREAKDOWN — {MONTHS[m].toUpperCase()}</div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyChartData} margin={{top:8,right:20,left:10,bottom:8}} barGap={2} barSize={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false}/><XAxis dataKey="name" tick={{fontSize:10,fill:C.muted,fontFamily:"inherit"}} axisLine={false} tickLine={false} interval={2}/><YAxis tickFormatter={fmtShort} tick={{fontSize:12,fill:C.muted,fontFamily:"inherit"}} axisLine={false} tickLine={false} width={65}/><Tooltip content={<CustomTooltip/>}/><Legend wrapperStyle={{fontSize:13,fontFamily:"inherit"}}/>
                  <Bar dataKey="Cost" fill={C.cost} radius={[3,3,0,0]}/><Bar dataKey="Revenue" fill={C.rev} radius={[3,3,0,0]}/><Bar dataKey="Profit" fill={C.profit} radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── MY TARGETS ── */}
      {view==="targets"&&(
        <div style={{padding:"24px 28px 60px",maxWidth:700}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden"}}>
            <div style={{padding:"20px 28px",borderBottom:`1px solid ${C.border}`,background:"#eff6ff"}}>
              <div style={{fontSize:20,fontWeight:900,color:C.navyDark,marginBottom:4}}>🎯 {isManagerView?"KPI Targets":"Set My Monthly KPI Targets"}</div>
              <div style={{fontSize:13,color:C.muted}}>{isManagerView?`Viewing ${member.name}'s KPI targets. Edit from the Manager Targets panel.`:"Set your own revenue and profit targets for each month. Manager can also override these from the manager panel."}</div>
            </div>
            <div style={{padding:"20px 28px"}}>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead>
                    <tr style={{background:C.light}}>
                      {["MONTH","KPI REVENUE ($)","KPI PROFIT ($)","ROI (%)","CURRENT STATUS"].map(h=>(
                        <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,letterSpacing:1,color:C.muted,fontWeight:700,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MONTHS.map((mo,i)=>{
                      const revPct=pct(derived[i].rev,localKpi[i].revenue);const st=statusOf(revPct);
                      const roi=localKpi[i].revenue>0&&localKpi[i].profit!=null&&(localKpi[i].revenue-localKpi[i].profit)>0?((localKpi[i].profit/(localKpi[i].revenue-localKpi[i].profit))*100).toFixed(2):null;
                      return(
                        <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"#fff":"#f8fafc"}}>
                          <td style={{padding:"9px 14px",fontWeight:700,color:C.navyDark,minWidth:60}}>{mo.slice(0,3)}</td>
                          <td style={{padding:"9px 14px"}}>
                            {isManagerView
                              ?<div style={{padding:"7px 10px",borderRadius:8,background:C.light,fontSize:13,fontWeight:700,color:C.rev}}>{fmtInput(localKpi[i].revenue)||"—"}</div>
                              :<input type="text" value={fmtInput(localKpi[i].revenue)} onChange={e=>{const next=[...localKpi];next[i]={...next[i],revenue:parseFloat(e.target.value.replace(/,/g,""))||0};setLocalKpi(next);setKpiSaved(false);}} placeholder="0" style={{...inputSt(!!(localKpi[i].revenue)),maxWidth:160,fontSize:13,padding:"7px 10px"}}/>}
                          </td>
                          <td style={{padding:"9px 14px"}}>
                            {isManagerView
                              ?<div style={{padding:"7px 10px",borderRadius:8,background:C.light,fontSize:13,fontWeight:700,color:C.profit}}>{fmtInput(localKpi[i].profit)||"—"}</div>
                              :<input type="text" value={fmtInput(localKpi[i].profit)} onChange={e=>{const next=[...localKpi];next[i]={...next[i],profit:parseFloat(e.target.value.replace(/,/g,""))||0};setLocalKpi(next);setKpiSaved(false);}} placeholder="0" style={{...inputSt(!!(localKpi[i].profit)),maxWidth:160,fontSize:13,padding:"7px 10px"}}/>}
                          </td>
                          <td style={{padding:"9px 14px",fontWeight:700,color:roi!==null?"#059669":"#cbd5e1",fontSize:13}}>{roi!==null?`${roi}%`:"—"}</td>
                          <td style={{padding:"9px 14px"}}>
                            {revPct!==null
                              ?<div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:60,height:5,background:C.light,borderRadius:5,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(revPct,100)}%`,background:st.color,borderRadius:5}}/></div><span style={{fontSize:12,fontWeight:700,color:st.color}}>{revPct}%</span></div>
                              :<span style={{fontSize:12,color:"#cbd5e1"}}>No data yet</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{background:"#eff6ff",borderTop:`2px solid #bae6fd`}}>
                      <td style={{padding:"10px 14px",fontWeight:900,color:C.navyDark}}>ANNUAL TOTAL</td>
                      <td style={{padding:"10px 14px",fontWeight:800,color:C.rev}}>{fmtBig(localKpi.reduce((s,k)=>s+(k.revenue||0),0))}</td>
                      <td style={{padding:"10px 14px",fontWeight:800,color:C.profit}}>{fmtBig(localKpi.reduce((s,k)=>s+(k.profit||0),0))}</td>
                      <td/><td/>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {!isManagerView&&(
                <div style={{marginTop:20,display:"flex",alignItems:"center",gap:14}}>
                  <button onClick={()=>{if(onUpdateKPI)onUpdateKPI(member.id,localKpi);setKpiSaved(true);setTimeout(()=>setKpiSaved(false),3000);}} style={{padding:"12px 28px",borderRadius:10,border:"none",background:C.navyDark,color:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:15,fontWeight:800}}>💾 Save My Targets</button>
                  {kpiSaved&&<div style={{fontSize:13,fontWeight:700,color:"#15803d",background:"#dcfce7",borderRadius:8,padding:"8px 16px"}}>✅ Targets saved! Sublead &amp; Manager can now see them.</div>}
                </div>
              )}
              {!isManagerView&&(
                <div style={{marginTop:14,fontSize:12,color:C.muted,background:"#f8fafc",borderRadius:8,padding:"10px 14px",border:`1px solid ${C.border}`}}>
                  💡 <strong>How it works:</strong> Your targets are saved instantly and shared with your Sublead and Manager. They can also adjust targets from their panels.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SETTINGS ── */}
      {view==="settings"&&!isManagerView&&(
        <div style={{padding:"28px 28px 60px",maxWidth:520}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden"}}>
            {/* Header */}
            <div style={{padding:"22px 28px",borderBottom:`1px solid ${C.border}`,background:"#f8fafc"}}>
              <div style={{fontSize:20,fontWeight:900}}>⚙️ Account Information</div>
              <div style={{fontSize:13,color:C.muted,marginTop:4}}>Update your name and PIN in one place.</div>
            </div>
            <div style={{padding:"28px",display:"flex",flexDirection:"column",gap:24}}>
              {/* Name section */}
              <div>
                <div style={{fontSize:12,letterSpacing:2,color:C.navyDark,fontWeight:800,marginBottom:14,display:"flex",alignItems:"center",gap:6}}>✏️ CHANGE NAME</div>
                <div style={{fontSize:12,color:C.muted,marginBottom:12}}>Current name: <strong style={{color:C.text}}>{member.name}</strong></div>
                <label style={{fontSize:11,letterSpacing:2,color:C.muted,fontWeight:700,display:"block",marginBottom:7}}>NEW NAME</label>
                <input type="text" value={newName} onChange={e=>{setNewName(e.target.value);setNameMsg("");}} placeholder="Enter new name" style={inputSt(!!newName)} onKeyDown={e=>e.key==="Enter"&&(()=>{if(!newName.trim()){setNameMsg("❌ Name cannot be empty.");return;}if(onUpdateName)onUpdateName(member.id,newName.trim());setNameMsg("✅ Name updated!");setNewName("");})()}/>
                {nameMsg&&<div style={{fontSize:13,fontWeight:600,color:nameMsg.startsWith("✅")?"#15803d":"#dc2626",background:nameMsg.startsWith("✅")?"#dcfce7":"#fee2e2",borderRadius:9,padding:"10px 14px",marginTop:10}}>{nameMsg}</div>}
              </div>

              <div style={{height:1,background:C.border}}/>

              {/* PIN section */}
              <div>
                <div style={{fontSize:12,letterSpacing:2,color:C.navyDark,fontWeight:800,marginBottom:14,display:"flex",alignItems:"center",gap:6}}>🔐 CHANGE PIN</div>
                <div style={{fontSize:12,color:C.muted,marginBottom:12}}>{member.pin?"Update your login PIN.":"No PIN set yet — set one to secure your account."}</div>
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {member.pin&&<div><label style={{fontSize:11,letterSpacing:2,color:C.muted,fontWeight:700,display:"block",marginBottom:7}}>CURRENT PIN</label><input type="password" value={pinOld} onChange={e=>{setPinOld(e.target.value);setPinMsg("");}} placeholder="Enter your current PIN" style={inputSt(!!pinOld)}/></div>}
                  {[["NEW PIN",pinNew1,setPinNew1,"At least 4 characters"],["CONFIRM PIN",pinNew2,setPinNew2,"Repeat new PIN"]].map(([label,val,set,ph])=>(
                    <div key={label}><label style={{fontSize:11,letterSpacing:2,color:C.muted,fontWeight:700,display:"block",marginBottom:7}}>{label}</label><input type="password" value={val} onChange={e=>{set(e.target.value);setPinMsg("");}} placeholder={ph} onKeyDown={e=>e.key==="Enter"&&handleChangePin()} style={inputSt(!!val)}/></div>
                  ))}
                  {pinMsg&&<div style={{fontSize:13,fontWeight:600,color:pinMsg.startsWith("✅")?"#15803d":"#dc2626",background:pinMsg.startsWith("✅")?"#dcfce7":"#fee2e2",borderRadius:9,padding:"10px 14px"}}>{pinMsg}</div>}
                </div>
              </div>

              <div style={{height:1,background:C.border}}/>

              {/* Save buttons */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <button onClick={()=>{if(!newName.trim()){setNameMsg("❌ Name cannot be empty.");return;}if(onUpdateName)onUpdateName(member.id,newName.trim());setNameMsg("✅ Name updated!");setNewName("");}} style={{padding:"13px 0",borderRadius:10,border:`2px solid ${C.navyDark}`,background:"#fff",color:C.navyDark,cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:800}}>✏️ Save Name</button>
                <button onClick={handleChangePin} style={{padding:"13px 0",borderRadius:10,border:"none",background:C.navyDark,color:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:800}}>🔐 Save PIN</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ROOT APP
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [screen,setScreen]=useState("loading");
  const [members,setMembersState]=useState([]);
  const [allData,setAllData]=useState({});
  const [currentUser,setCurrentUser]=useState(null);
  const [viewingMember,setViewingMember]=useState(null);
  const [viewReturnScreen,setViewReturnScreen]=useState("manager");

  useEffect(()=>{
    (async()=>{
      try{const r=await window.storage.get("kpi_members",true);if(r?.value)setMembersState(JSON.parse(r.value));}catch{}
      try{const r=await window.storage.get("kpi_alldata",true);if(r?.value)setAllData(JSON.parse(r.value));}catch{}
      setScreen("login");
    })();
  },[]);

  const setMembers=useCallback((updater)=>{
    setMembersState(prev=>{
      const next=typeof updater==="function"?updater(prev):updater;
      window.storage.set("kpi_members",JSON.stringify(next),true).catch(()=>{});
      return next;
    });
  },[]);

  const setMemberData=useCallback((memberId,data)=>{
    setAllData(prev=>{
      const next={...prev,[memberId]:data};
      window.storage.set("kpi_alldata",JSON.stringify(next),true).catch(()=>{});
      return next;
    });
  },[]);

  const updateMemberPin=useCallback((memberId,newPin)=>{
    setMembers(prev=>prev.map(m=>m.id===memberId?{...m,pin:newPin}:m));
  },[]);

  const updateMemberKPI=useCallback((memberId,kpi)=>{
    setMembers(prev=>prev.map(m=>m.id===memberId?{...m,kpi}:m));
  },[]);

  const updateMemberName=useCallback((memberId,name)=>{
    setMembers(prev=>prev.map(m=>m.id===memberId?{...m,name}:m));
  },[]);

  if(screen==="loading"){
    return(
      <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter','Segoe UI',sans-serif"}}>
        <div style={{textAlign:"center",color:"#fff"}}><div style={{fontSize:28,fontWeight:900,marginBottom:12}}>Puma Performance Tracker</div><div style={{fontSize:14,color:"#93c5fd"}}>Loading…</div></div>
      </div>
    );
  }

  if(screen==="member"&&currentUser){
    const memberData=allData[currentUser.id]||{monthly:initMonthlyActuals(),daily:initDailyActuals()};
    return <MemberTracker member={members.find(m=>m.id===currentUser.id)||currentUser} memberData={memberData} setMemberData={data=>setMemberData(currentUser.id,data)} onLogout={()=>{setCurrentUser(null);setScreen("login");}} isManagerView={false} onUpdatePin={updateMemberPin} onUpdateKPI={updateMemberKPI} onUpdateName={updateMemberName}/>;
  }

  if(screen==="manager-view-member"&&viewingMember){
    const memberData=allData[viewingMember.id]||{monthly:initMonthlyActuals(),daily:initDailyActuals()};
    return <MemberTracker member={viewingMember} memberData={memberData} setMemberData={data=>setMemberData(viewingMember.id,data)} onLogout={()=>{setViewingMember(null);setScreen(viewReturnScreen);}} isManagerView={true} onUpdatePin={updateMemberPin} onUpdateKPI={updateMemberKPI} onUpdateName={updateMemberName}/>;
  }

  if(screen==="sublead"&&currentUser){
    return <SubleadPanel currentUser={members.find(m=>m.id===currentUser.id)||currentUser} members={members} allData={allData} onLogout={()=>{setCurrentUser(null);setScreen("login");}} onViewMember={mem=>{setViewingMember(mem);setViewReturnScreen("sublead");setScreen("manager-view-member");}} onUpdatePin={updateMemberPin} onUpdateKPI={updateMemberKPI} onUpdateName={updateMemberName}/>;
  }

  if(screen==="manager"){
    return <ManagerPanel members={members} setMembers={setMembers} allData={allData} onLogout={()=>setScreen("login")} onViewMember={member=>{setViewingMember(member);setViewReturnScreen("manager");setScreen("manager-view-member");}}/>;
  }

  return <LoginScreen members={members} onLogin={member=>{setCurrentUser(member);setScreen(member.role==="sublead"?"sublead":"member");}} onManagerLogin={()=>setScreen("manager")}/>;
}
