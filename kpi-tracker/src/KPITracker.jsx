import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// ─── PRODUCT TRACKER CONSTANTS ────────────────────────────────────────────────
const AD_NETWORKS = ["IAP","AdMob","FAN","IR","Unity","Applovin","Pangle","Vungle","Mintegral","Yandex"];
const NET_COLORS = { IAP:"#6366f1",AdMob:"#f59e0b",FAN:"#06b6d4",IR:"#8b5cf6",Unity:"#10b981",Applovin:"#ef4444",Pangle:"#3b82f6",Vungle:"#ec4899",Mintegral:"#14b8a6",Yandex:"#f97316" };
const CSV_COLUMNS = {
  date:["date","ngày","day"], product:["product","sản phẩm","app","game","name","product name"],
  costAds:["cost ads","costads","chi phí ads","cost_ads"],
  costTracking:["cost tracking","costtracking","cost_tracking"],
  costTotal:["cost total","costtotal","cost_total","total cost"],
  revenue:["revenue","doanh thu","rev"], profit:["profit","lợi nhuận"],
  roi:["roi"], iap:["iap"], adMob:["admob","ad mob"], fan:["fan"],
  ir:["ir"], unity:["unity"], applovin:["applovin"], pangle:["pangle"],
  vungle:["vungle"], mintegral:["mintegral"], yandex:["yandex"],
};

// ─── PRODUCT HELPERS ──────────────────────────────────────────────────────────
const np = (v) => parseFloat(v) || 0;
const fmtMoney = (v) => {
  if (v === null || v === undefined) return "—";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v/1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `$${(v/1_000).toFixed(1)}K`;
  return `$${Number(v.toFixed(2)).toLocaleString()}`;
};
const fmtShortP = (v) => { if (!v&&v!==0) return "$0"; const a=Math.abs(v); if(a>=1_000_000) return `$${(v/1_000_000).toFixed(1)}M`; if(a>=1_000) return `$${(v/1_000).toFixed(0)}K`; return `$${v}`; };
const fmtPct  = (v) => v===null||v===undefined ? "—" : `${parseFloat(v).toFixed(2)}%`;
const fmtNum  = (v) => v===null||v===undefined ? "—" : Number(v).toLocaleString();
const aggRows = (rows) => rows.reduce((acc,r) => ({
  costAds:acc.costAds+r.costAds, costTracking:acc.costTracking+r.costTracking,
  costTotal:acc.costTotal+r.costTotal, revenue:acc.revenue+r.revenue, profit:acc.profit+r.profit,
  networks:Object.fromEntries(AD_NETWORKS.map(net=>[net,(acc.networks[net]||0)+(r.networks[net]||0)])),
}),{costAds:0,costTracking:0,costTotal:0,revenue:0,profit:0,networks:Object.fromEntries(AD_NETWORKS.map(n=>[n,0]))});

function parseCSVProduct(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const rawHeaders = lines[0].split(",").map(h=>h.replace(/"/g,"").trim().toLowerCase());
  const findCol = (keys) => { for(const k of keys){const i=rawHeaders.findIndex(h=>h.includes(k)); if(i!==-1)return i;} return -1; };
  const colMap = {}; for(const [f,keys] of Object.entries(CSV_COLUMNS)) colMap[f]=findCol(keys);
  const rows = [];
  for (let i=1;i<lines.length;i++) {
    const line = lines[i].trim(); if(!line) continue;
    const cells=[]; let cur="",inQ=false;
    for(const ch of line){if(ch==='"'){inQ=!inQ;}else if(ch===','&&!inQ){cells.push(cur.trim());cur="";}else cur+=ch;}
    cells.push(cur.trim());
    const get=(f)=>{const idx=colMap[f];return idx!==-1?(cells[idx]||"").replace(/"/g,"").trim():"";};
    const dateRaw=get("date"),product=get("product");
    if(!dateRaw&&!product) continue;
    let dateKey=dateRaw;
    const dm=dateRaw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if(dm){const y=dm[3].length===2?"20"+dm[3]:dm[3];dateKey=`${y}-${dm[2].padStart(2,"0")}-${dm[1].padStart(2,"0")}`;}
    const roi=get("roi")||(np(get("revenue"))>0?((np(get("profit"))/np(get("revenue")))*100).toFixed(2):"0");
    rows.push({date:dateKey,product:product||"Unknown",costAds:np(get("costAds")),costTracking:np(get("costTracking")),costTotal:np(get("costTotal"))||np(get("costAds"))+np(get("costTracking")),revenue:np(get("revenue")),profit:np(get("profit")),roi:parseFloat(roi)||0,networks:{IAP:np(get("iap")),AdMob:np(get("adMob")),FAN:np(get("fan")),IR:np(get("ir")),Unity:np(get("unity")),Applovin:np(get("applovin")),Pangle:np(get("pangle")),Vungle:np(get("vungle")),Mintegral:np(get("mintegral")),Yandex:np(get("yandex"))}});
  }
  return rows;
}

// ─── PRODUCT ROW COMPONENT ────────────────────────────────────────────────────
function ProductRow({ row, isOdd }) {
  const [expanded, setExpanded] = useState(false);
  const totalNet = AD_NETWORKS.reduce((s,net)=>s+(row.networks[net]||0),0);
  return (
    <>
      <tr onClick={()=>setExpanded(!expanded)} style={{background:isOdd?"#f8fafc":"#fff",cursor:"pointer",borderBottom:`1px solid ${C.border}`}}
        onMouseEnter={e=>e.currentTarget.style.background="#eff6ff"}
        onMouseLeave={e=>e.currentTarget.style.background=isOdd?"#f8fafc":"#fff"}>
        <td style={{padding:"9px 12px",paddingLeft:28,fontSize:13,color:C.navyDark,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={row.product}>
          <span style={{marginRight:6,color:C.muted,fontSize:11}}>{expanded?"▼":"▶"}</span>{row.product}
        </td>
        <td style={{padding:"9px 12px",fontSize:13,color:C.cost,textAlign:"right"}}>{fmtMoney(row.costAds)}</td>
        <td style={{padding:"9px 12px",fontSize:13,color:C.muted,textAlign:"right"}}>{fmtMoney(row.costTracking)}</td>
        <td style={{padding:"9px 12px",fontSize:13,fontWeight:700,color:C.cost,textAlign:"right"}}>{fmtMoney(row.costTotal)}</td>
        <td style={{padding:"9px 12px",fontSize:13,color:C.rev,fontWeight:600,textAlign:"right"}}>{fmtMoney(row.revenue)}</td>
        <td style={{padding:"9px 12px",fontSize:13,fontWeight:700,color:row.profit<0?"#dc2626":C.profit,textAlign:"right"}}>{fmtMoney(row.profit)}</td>
        <td style={{padding:"9px 12px",fontSize:13,fontWeight:700,color:row.roi<0?"#dc2626":C.kpi,textAlign:"right"}}>{fmtPct(row.roi)}</td>
        <td style={{padding:"9px 12px",fontSize:13,textAlign:"right",color:C.text}}>{fmtNum(totalNet)}</td>
      </tr>
      {expanded&&(
        <tr style={{background:"#f0f7ff",borderBottom:`1px solid ${C.border}`}}>
          <td colSpan={8} style={{padding:"12px 28px 16px"}}>
            <div style={{fontSize:10,letterSpacing:2,color:C.muted,fontWeight:700,marginBottom:10}}>AD NETWORK BREAKDOWN</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {AD_NETWORKS.map(net=>{const val=row.networks[net]||0;if(!val)return null;return(
                <div key={net} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 14px",minWidth:90}}>
                  <div style={{fontSize:10,letterSpacing:1,color:NET_COLORS[net],fontWeight:700,marginBottom:3}}>{net}</div>
                  <div style={{fontSize:14,fontWeight:800,color:C.text}}>{fmtNum(val)}</div>
                </div>
              );})}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── DATE GROUP COMPONENT ─────────────────────────────────────────────────────
function DateGroup({ dateKey, rows, defaultExpanded }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const agg = useMemo(()=>aggRows(rows),[rows]);
  const roi = agg.revenue>0?(agg.profit/agg.revenue)*100:0;
  const totalNet = AD_NETWORKS.reduce((s,net)=>s+(agg.networks[net]||0),0);
  const d = new Date(dateKey+"T00:00:00");
  const dateLabel = isNaN(d)?dateKey:d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
  return (
    <div style={{marginBottom:10}}>
      <div onClick={()=>setExpanded(!expanded)} style={{background:"#1e3a8a",borderRadius:expanded?"8px 8px 0 0":8,padding:"11px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,minWidth:160}}>
          <span style={{fontSize:13,color:"#93c5fd"}}>{expanded?"▼":"▶"}</span>
          <span style={{fontSize:14,fontWeight:900,color:"#fff"}}>{dateLabel}</span>
          <span style={{fontSize:10,background:"#1e40af",color:"#93c5fd",borderRadius:20,padding:"2px 8px",fontWeight:700}}>{rows.length} products</span>
        </div>
        <div style={{display:"flex",gap:20,flex:1,flexWrap:"wrap"}}>
          {[{label:"COST",val:fmtMoney(agg.costTotal),color:"#fbbf24"},{label:"REVENUE",val:fmtMoney(agg.revenue),color:"#60a5fa"},{label:"PROFIT",val:fmtMoney(agg.profit),color:agg.profit<0?"#f87171":"#34d399"},{label:"ROI",val:fmtPct(roi),color:roi<0?"#f87171":"#a78bfa"},{label:"INSTALLS",val:fmtNum(totalNet),color:"#94a3b8"}].map(({label,val,color})=>(
            <div key={label}><div style={{fontSize:9,letterSpacing:2,color:"#64748b",marginBottom:2}}>{label}</div><div style={{fontSize:13,fontWeight:800,color}}>{val}</div></div>
          ))}
        </div>
      </div>
      {expanded&&(
        <div style={{border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 8px 8px",overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{background:"#f1f5f9"}}>
              {["PRODUCT","COST ADS","COST TRACKING","COST TOTAL","REVENUE","PROFIT","ROI","INSTALLS"].map(h=>(
                <th key={h} style={{padding:"8px 12px",textAlign:h==="PRODUCT"?"left":"right",fontSize:10,letterSpacing:2,color:C.muted,fontWeight:700,borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{rows.map((r,i)=><ProductRow key={i} row={r} isOdd={i%2===1}/>)}</tbody>
            <tfoot><tr style={{background:"#e0f2fe",borderTop:`2px solid #bae6fd`}}>
              <td style={{padding:"9px 12px",fontWeight:900,color:"#0369a1",fontSize:12}}>TOTAL ({rows.length})</td>
              <td style={{padding:"9px 12px",textAlign:"right",color:C.cost,fontWeight:700}}>{fmtMoney(agg.costAds)}</td>
              <td style={{padding:"9px 12px",textAlign:"right",color:C.muted,fontWeight:700}}>{fmtMoney(agg.costTracking)}</td>
              <td style={{padding:"9px 12px",textAlign:"right",color:C.cost,fontWeight:800}}>{fmtMoney(agg.costTotal)}</td>
              <td style={{padding:"9px 12px",textAlign:"right",color:C.rev,fontWeight:800}}>{fmtMoney(agg.revenue)}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontWeight:900,color:agg.profit<0?"#dc2626":C.profit}}>{fmtMoney(agg.profit)}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontWeight:900,color:roi<0?"#dc2626":C.kpi}}>{fmtPct(roi)}</td>
              <td style={{padding:"9px 12px",textAlign:"right",fontWeight:700}}>{fmtNum(totalNet)}</td>
            </tr></tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── MONTH GROUP COMPONENT ────────────────────────────────────────────────────
function ProductMonthGroup({ monthKey, dateGroups, kpiTarget }) {
  const [expanded, setExpanded] = useState(true);
  const allRows = useMemo(()=>Object.values(dateGroups).flat(),[dateGroups]);
  const agg = useMemo(()=>aggRows(allRows),[allRows]);
  const roi = agg.revenue>0?(agg.profit/agg.revenue)*100:0;
  const revPct = kpiTarget?.revenue>0?+(agg.revenue/kpiTarget.revenue*100).toFixed(1):null;
  const revSt = statusOf(revPct);
  const [year,mon] = monthKey.split("-");
  const monthLabel = `${MONTHS_SHORT[parseInt(mon)-1]} ${year}`;
  return (
    <div style={{marginBottom:20}}>
      <div onClick={()=>setExpanded(!expanded)} style={{background:"linear-gradient(90deg,#0f172a,#1e3a8a)",borderRadius:expanded?"14px 14px 0 0":14,padding:"15px 20px",cursor:"pointer",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:16,color:"#93c5fd"}}>{expanded?"▼":"▶"}</span>
          <span style={{fontSize:18,fontWeight:900,color:"#fff"}}>{monthLabel}</span>
          <span style={{fontSize:10,background:"#1e40af",color:"#93c5fd",borderRadius:20,padding:"2px 9px",fontWeight:700}}>{Object.keys(dateGroups).length} days · {allRows.length} rows</span>
        </div>
        <div style={{display:"flex",gap:24,flex:1,flexWrap:"wrap",alignItems:"center"}}>
          {[{label:"COST",val:fmtMoney(agg.costTotal),color:"#fbbf24"},{label:"REVENUE",val:fmtMoney(agg.revenue),color:"#60a5fa"},{label:"PROFIT",val:fmtMoney(agg.profit),color:agg.profit<0?"#f87171":"#34d399"},{label:"ROI",val:fmtPct(roi),color:roi<0?"#f87171":"#a78bfa"}].map(({label,val,color})=>(
            <div key={label}><div style={{fontSize:9,letterSpacing:2,color:"#475569",marginBottom:2}}>{label}</div><div style={{fontSize:14,fontWeight:900,color}}>{val}</div></div>
          ))}
          {kpiTarget&&(
            <div style={{marginLeft:"auto",display:"flex",gap:14,alignItems:"center"}}>
              <div><div style={{fontSize:9,letterSpacing:2,color:"#475569",marginBottom:2}}>KPI REV</div><div style={{fontSize:12,fontWeight:700,color:"#94a3b8"}}>{fmtMoney(kpiTarget.revenue)}</div></div>
              <div>
                <div style={{fontSize:9,letterSpacing:2,color:"#475569",marginBottom:4}}>PROGRESS</div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:80,height:6,background:"#1e40af",borderRadius:6,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(revPct||0,100)}%`,background:revSt.color,borderRadius:6}}/></div>
                  <span style={{fontSize:12,fontWeight:800,color:revSt.color}}>{revPct!==null?`${revPct}%`:"—"}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {expanded&&(
        <div style={{border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 14px 14px",padding:14,background:"#f8fafc"}}>
          {Object.entries(dateGroups).sort(([a],[b])=>a.localeCompare(b)).map(([dk,rows],i)=>(
            <DateGroup key={dk} dateKey={dk} rows={rows} defaultExpanded={i===0}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PRODUCT TAB COMPONENT ────────────────────────────────────────────────────
function ProductTab({ memberId, memberKpi }) {
  const [imports, setImports]       = useState([]);
  const [lastImport, setLastImport] = useState(null);
  const [importing, setImporting]   = useState(false);
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterProduct, setFilterProduct] = useState("");
  const [subView, setSubView]       = useState("data"); // data | charts | summary
  const [chartMetric, setChartMetric] = useState("revenue");
  const fileRef = useRef();

  const storageKey = `prod_${memberId}`;

  useEffect(()=>{
    (async()=>{
      try{ const r=await window.storage.get(storageKey,false); if(r?.value)setImports(JSON.parse(r.value)); }catch{}
    })();
  },[memberId]);

  const save=(rows)=>window.storage.set(storageKey,JSON.stringify(rows),false).catch(()=>{});

  const handleFile=(e)=>{
    const file=e.target.files[0]; if(!file)return;
    setImporting(true);
    const reader=new FileReader();
    reader.onload=(ev)=>{
      const rows=parseCSVProduct(ev.target.result);
      if(rows.length===0){alert("No valid rows found. Check CSV format.");setImporting(false);return;}
      const newKeys=new Set(rows.map(r=>`${r.date}||${r.product}`));
      const merged=[...imports.filter(r=>!newKeys.has(`${r.date}||${r.product}`)),...rows];
      setImports(merged); save(merged);
      setLastImport({count:rows.length,dates:[...new Set(rows.map(r=>r.date))].sort(),file:file.name});
      setImporting(false);
    };
    reader.readAsText(file);
    e.target.value="";
  };

  const handleDrop=(e)=>{e.preventDefault();const f=e.dataTransfer.files[0];if(!f)return;const fe={target:{files:[f],value:""}};handleFile(fe);};
  const clearAll=()=>{if(!confirm("Clear all product data for this member?"))return;setImports([]);save([]);setLastImport(null);};

  const grouped = useMemo(()=>{
    let rows=imports;
    if(filterProduct) rows=rows.filter(r=>r.product.toLowerCase().includes(filterProduct.toLowerCase()));
    const byMonth={};
    rows.forEach(r=>{const mk=r.date?.slice(0,7)||"unknown";if(!byMonth[mk])byMonth[mk]={};if(!byMonth[mk][r.date])byMonth[mk][r.date]=[];byMonth[mk][r.date].push(r);});
    return byMonth;
  },[imports,filterProduct]);

  const allMonths=Object.keys(grouped).sort().reverse();
  const filteredMonths=filterMonth==="all"?allMonths:allMonths.filter(m=>m===filterMonth);

  const totals=useMemo(()=>aggRows(imports),[imports]);
  const totalRoi=totals.revenue>0?(totals.profit/totals.revenue)*100:0;

  const chartData=useMemo(()=>{
    const byKey={};
    imports.forEach(r=>{const k=r.date?.slice(0,7)||"?";if(!byKey[k])byKey[k]={name:k,revenue:0,costTotal:0,profit:0};byKey[k].revenue+=r.revenue;byKey[k].costTotal+=r.costTotal;byKey[k].profit+=r.profit;});
    return Object.values(byKey).sort((a,b)=>a.name.localeCompare(b.name));
  },[imports]);

  const topProducts=useMemo(()=>{
    const byProd={};
    imports.forEach(r=>{if(!byProd[r.product])byProd[r.product]={name:r.product,revenue:0,costTotal:0,profit:0};byProd[r.product].revenue+=r.revenue;byProd[r.product].costTotal+=r.costTotal;byProd[r.product].profit+=r.profit;});
    return Object.values(byProd).sort((a,b)=>b.revenue-a.revenue).slice(0,15);
  },[imports]);

  const SVTAB=(key,label)=>(
    <button key={key} onClick={()=>setSubView(key)} style={{padding:"7px 14px",borderRadius:7,border:"none",cursor:"pointer",background:subView===key?C.navyDark:"transparent",color:subView===key?"#fff":C.muted,fontFamily:"inherit",fontSize:13,fontWeight:700}}>{label}</button>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Sub-nav + import */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",gap:3,background:C.light,borderRadius:9,padding:3}}>
          {SVTAB("data","📋 Data")}
          {SVTAB("charts","▲ Charts")}
          {SVTAB("summary","📊 Summary")}
        </div>
        <div style={{display:"flex",gap:8,flex:1,flexWrap:"wrap",alignItems:"center"}}>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{display:"none"}}/>
          <button onClick={()=>fileRef.current?.click()} disabled={importing} style={{padding:"9px 20px",borderRadius:9,border:"none",background:importing?C.light:C.navyDark,color:importing?C.muted:"#fff",cursor:importing?"not-allowed":"pointer",fontFamily:"inherit",fontSize:13,fontWeight:800,whiteSpace:"nowrap"}}>
            {importing?"⏳ Importing…":"⬆ Import CSV"}
          </button>
          {lastImport&&<span style={{fontSize:12,color:C.profit}}>✅ {lastImport.count} rows · {lastImport.dates.length} dates · {lastImport.file}</span>}
          {imports.length>0&&<button onClick={clearAll} style={{padding:"7px 12px",borderRadius:8,border:"1px solid #fecaca",background:"#fff5f5",color:"#dc2626",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700,marginLeft:"auto"}}>🗑 Clear</button>}
        </div>
      </div>

      {/* Drop zone hint */}
      <div onDragOver={e=>e.preventDefault()} onDrop={handleDrop}
        style={{background:C.card,border:`2px dashed ${C.border}`,borderRadius:12,padding:"12px 18px",fontSize:12,color:C.muted,textAlign:"center",cursor:"pointer"}}
        onClick={()=>fileRef.current?.click()}
        onMouseEnter={e=>e.currentTarget.style.border="2px dashed #93c5fd"}
        onMouseLeave={e=>e.currentTarget.style.border=`2px dashed ${C.border}`}
      >
        {imports.length===0?"📂 Drop CSV here or click — columns: Date, Product, Cost Ads, Cost Tracking, Revenue, Profit, IAP, AdMob, FAN, IR, Unity, Applovin, Pangle, Vungle, Mintegral, Yandex":`${imports.length} rows · ${[...new Set(imports.map(r=>r.date))].length} days imported — drop new CSV to merge`}
      </div>

      {/* Summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10}}>
        {[
          {label:"TOTAL COST",   val:fmtMoney(totals.costTotal),  color:C.cost},
          {label:"TOTAL REVENUE",val:fmtMoney(totals.revenue),    color:C.rev},
          {label:"TOTAL PROFIT", val:fmtMoney(totals.profit),     color:totals.profit<0?"#dc2626":C.profit},
          {label:"OVERALL ROI",  val:fmtPct(totalRoi),            color:totalRoi<0?"#dc2626":C.kpi},
          {label:"PRODUCTS",     val:[...new Set(imports.map(r=>r.product))].length, color:C.navyDark},
          {label:"DAYS",         val:[...new Set(imports.map(r=>r.date))].length,    color:C.muted},
        ].map(card=>(
          <div key={card.label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 16px",boxShadow:"0 1px 3px #0001"}}>
            <div style={{fontSize:10,letterSpacing:2,color:C.muted,marginBottom:4,fontWeight:600}}>{card.label}</div>
            <div style={{fontSize:17,fontWeight:900,color:card.color}}>{card.val}</div>
          </div>
        ))}
      </div>

      {/* DATA */}
      {subView==="data"&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
            <select value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} style={{padding:"7px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.card,fontFamily:"inherit",fontSize:13,color:C.text}}>
              <option value="all">All months</option>
              {allMonths.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
            <input type="text" value={filterProduct} onChange={e=>setFilterProduct(e.target.value)} placeholder="🔍 Filter product…" style={{padding:"7px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.card,fontFamily:"inherit",fontSize:13,color:C.text,minWidth:200}}/>
            {(filterMonth!=="all"||filterProduct)&&<button onClick={()=>{setFilterMonth("all");setFilterProduct("");}} style={{padding:"7px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.card,color:C.muted,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:700}}>✕ Clear</button>}
          </div>
          {imports.length===0?(
            <div style={{background:C.card,border:`2px dashed ${C.border}`,borderRadius:14,padding:48,textAlign:"center"}}>
              <div style={{fontSize:36,marginBottom:12}}>📂</div>
              <div style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:6}}>No data yet</div>
              <div style={{fontSize:13,color:C.muted}}>Import a CSV above to get started.</div>
            </div>
          ):filteredMonths.length===0?(
            <div style={{padding:32,textAlign:"center",color:C.muted}}>No data matches your filters.</div>
          ):(
            filteredMonths.map(mk=>{
              const mon=parseInt(mk.split("-")[1])-1;
              return <ProductMonthGroup key={mk} monthKey={mk} dateGroups={grouped[mk]} kpiTarget={memberKpi?.[mon]}/>;
            })
          )}
        </div>
      )}

      {/* CHARTS */}
      {subView==="charts"&&(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{display:"flex",gap:4,background:C.light,borderRadius:8,padding:3,width:"fit-content"}}>
            {[["revenue","Revenue",C.rev],["costTotal","Cost",C.cost],["profit","Profit",C.profit]].map(([k,label,color])=>(
              <button key={k} onClick={()=>setChartMetric(k)} style={{padding:"6px 14px",borderRadius:6,background:chartMetric===k?"#fff":"transparent",color:chartMetric===k?color:C.muted,border:chartMetric===k?`1px solid ${color}44`:"1px solid transparent",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:700,boxShadow:chartMetric===k?"0 1px 3px #0001":"none"}}>{label}</button>
            ))}
          </div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 16px",boxShadow:"0 2px 8px #0001"}}>
            <div style={{fontSize:11,letterSpacing:2,color:C.muted,fontWeight:700,marginBottom:16}}>MONTHLY TREND</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{top:8,right:16,left:8,bottom:8}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false}/>
                <XAxis dataKey="name" tick={{fontSize:12,fill:C.muted,fontFamily:"inherit"}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={fmtShortP} tick={{fontSize:11,fill:C.muted,fontFamily:"inherit"}} axisLine={false} tickLine={false} width={65}/>
                <Tooltip content={({active,payload,label})=>active&&payload?.length?(<div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",fontSize:13}}><div style={{fontWeight:700,marginBottom:6}}>{label}</div>{payload.map(p=>(<div key={p.name} style={{display:"flex",gap:8,marginBottom:3}}><div style={{width:10,height:10,borderRadius:3,background:p.fill,marginTop:2}}/><span style={{color:C.muted}}>{p.name}:</span><span style={{fontWeight:700}}>{fmtShortP(p.value)}</span></div>))}</div>):null}/>
                <Bar dataKey={chartMetric} fill={chartMetric==="revenue"?C.rev:chartMetric==="costTotal"?C.cost:C.profit} radius={[5,5,0,0]} name={chartMetric==="costTotal"?"Cost":chartMetric.charAt(0).toUpperCase()+chartMetric.slice(1)}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 16px",boxShadow:"0 2px 8px #0001"}}>
            <div style={{fontSize:11,letterSpacing:2,color:C.muted,fontWeight:700,marginBottom:16}}>REVENUE · COST · PROFIT ALL MONTHS</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{top:8,right:16,left:8,bottom:8}} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false}/>
                <XAxis dataKey="name" tick={{fontSize:12,fill:C.muted,fontFamily:"inherit"}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={fmtShortP} tick={{fontSize:11,fill:C.muted,fontFamily:"inherit"}} axisLine={false} tickLine={false} width={65}/>
                <Tooltip content={({active,payload,label})=>active&&payload?.length?(<div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",fontSize:13}}><div style={{fontWeight:700,marginBottom:6}}>{label}</div>{payload.map(p=>(<div key={p.name} style={{display:"flex",gap:8,marginBottom:3}}><div style={{width:10,height:10,borderRadius:3,background:p.fill,marginTop:2}}/><span style={{color:C.muted}}>{p.name}:</span><span style={{fontWeight:700}}>{fmtShortP(p.value)}</span></div>))}</div>):null}/>
                <Legend wrapperStyle={{fontSize:13,fontFamily:"inherit"}}/>
                <Bar dataKey="revenue"   fill={C.rev}    radius={[4,4,0,0]} name="Revenue"/>
                <Bar dataKey="costTotal" fill={C.cost}   radius={[4,4,0,0]} name="Cost"/>
                <Bar dataKey="profit"    fill={C.profit} radius={[4,4,0,0]} name="Profit"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"20px 16px",boxShadow:"0 2px 8px #0001"}}>
            <div style={{fontSize:11,letterSpacing:2,color:C.muted,fontWeight:700,marginBottom:16}}>TOP 15 PRODUCTS BY REVENUE</div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={topProducts} layout="vertical" margin={{top:8,right:16,left:8,bottom:8}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false}/>
                <XAxis type="number" tickFormatter={fmtShortP} tick={{fontSize:11,fill:C.muted,fontFamily:"inherit"}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" width={170} tick={{fontSize:10,fill:C.muted,fontFamily:"inherit"}} axisLine={false} tickLine={false}/>
                <Tooltip content={({active,payload,label})=>active&&payload?.length?(<div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",fontSize:13}}><div style={{fontWeight:700,marginBottom:6,maxWidth:200,wordBreak:"break-word"}}>{label}</div>{payload.map(p=>(<div key={p.name} style={{display:"flex",gap:8,marginBottom:3}}><div style={{width:10,height:10,borderRadius:3,background:p.fill,marginTop:2}}/><span style={{color:C.muted}}>{p.name}:</span><span style={{fontWeight:700}}>{fmtShortP(p.value)}</span></div>))}</div>):null}/>
                <Legend wrapperStyle={{fontSize:13,fontFamily:"inherit"}}/>
                <Bar dataKey="revenue"   fill={C.rev}    name="Revenue" radius={[0,4,4,0]}/>
                <Bar dataKey="costTotal" fill={C.cost}   name="Cost"    radius={[0,4,4,0]}/>
                <Bar dataKey="profit"    fill={C.profit} name="Profit"  radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* SUMMARY TABLE */}
      {subView==="summary"&&(
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden",boxShadow:"0 2px 8px #0001"}}>
          <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,fontSize:12,letterSpacing:2,color:C.muted,fontWeight:700}}>ALL PRODUCTS — ALL TIME</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:C.light}}>
                {["#","PRODUCT","COST","REVENUE","PROFIT","ROI","TOP NETWORK"].map(h=>(
                  <th key={h} style={{padding:"10px 14px",textAlign:h==="#"||h==="PRODUCT"?"left":"right",fontSize:10,letterSpacing:2,color:C.muted,fontWeight:700,borderBottom:`2px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {topProducts.map((p,i)=>{
                  const roi=p.revenue>0?(p.profit/p.revenue*100).toFixed(1):0;
                  const nets=imports.filter(r=>r.product===p.name).reduce((acc,r)=>{AD_NETWORKS.forEach(net=>acc[net]=(acc[net]||0)+(r.networks[net]||0));return acc;},{});
                  const topNet=AD_NETWORKS.reduce((best,net)=>(nets[net]||0)>(nets[best]||0)?net:best,AD_NETWORKS[0]);
                  return(
                    <tr key={p.name} style={{background:i%2===0?"#fff":"#f8fafc",borderBottom:`1px solid ${C.border}`}}>
                      <td style={{padding:"10px 14px",color:C.muted,fontWeight:700}}>{i+1}</td>
                      <td style={{padding:"10px 14px",fontWeight:600,color:C.navyDark,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={p.name}>{p.name}</td>
                      <td style={{padding:"10px 14px",textAlign:"right",color:C.cost,fontWeight:600}}>{fmtMoney(p.costTotal)}</td>
                      <td style={{padding:"10px 14px",textAlign:"right",color:C.rev,fontWeight:600}}>{fmtMoney(p.revenue)}</td>
                      <td style={{padding:"10px 14px",textAlign:"right",fontWeight:700,color:p.profit<0?"#dc2626":C.profit}}>{fmtMoney(p.profit)}</td>
                      <td style={{padding:"10px 14px",textAlign:"right",fontWeight:700,color:roi<0?"#dc2626":C.kpi}}>{fmtPct(roi)}</td>
                      <td style={{padding:"10px 14px",textAlign:"right"}}><span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:6,background:NET_COLORS[topNet]+"20",color:NET_COLORS[topNet]}}>{topNet}: {fmtNum(nets[topNet]||0)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MANAGER_PIN = "admin2026";
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS_IN_MONTH = [31,28,31,30,31,30,31,31,30,31,30,31];
const ROI_KPI = 10;

// ─── COLORS ───────────────────────────────────────────────────────────────────
const C = {
  rev: "#2563eb", cost: "#f97316", profit: "#16a34a", kpi: "#9333ea",
  bg: "#f8fafc", card: "#ffffff", border: "#e2e8f0",
  text: "#1e293b", muted: "#64748b", light: "#f1f5f9",
  navy: "#1e3a8a", navyDark: "#1e40af",
};

const MEMBER_COLORS = ["#2563eb","#9333ea","#db2777","#d97706","#059669","#0891b2","#7c3aed","#dc2626"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const parseMoney = (s) => {
  const c = String(s ?? "").replace(/[$,\s]/g, "");
  return c === "" ? null : isNaN(parseFloat(c)) ? null : parseFloat(c);
};
const fmtBig = (v) => {
  if (v === null || v === undefined) return "—";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v/1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `$${(v/1_000).toFixed(1)}K`;
  return `$${Number(v).toLocaleString()}`;
};
const fmtShort = (v) => {
  if (!v) return "$0";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v/1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `$${(v/1_000).toFixed(0)}K`;
  return `$${v}`;
};
const pct = (actual, target) =>
  target > 0 && actual !== null ? +((actual / target) * 100).toFixed(1) : null;
const statusOf = (p) => {
  if (p === null)  return { color: "#94a3b8", bg: "#f1f5f9", label: "PENDING" };
  if (p >= 100)    return { color: "#16a34a", bg: "#dcfce7", label: "ON TRACK" };
  if (p >= 80)     return { color: "#d97706", bg: "#fef3c7", label: "NEAR" };
  return               { color: "#dc2626", bg: "#fee2e2", label: "BEHIND" };
};
const initMonthlyActuals = () => Array(12).fill(null).map(() => ({ revenue: "", cost: "", profit: "" }));
const initDailyActuals = () => Array(12).fill(null).map((_,i) => Array(DAYS_IN_MONTH[i]).fill(null).map(() => ({ cost: "", revenue: "" })));
const defaultKPI = () => Array(12).fill(null).map((_,i) => ({ revenue: 0, profit: 0 }));

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
const Badge = ({ p }) => {
  const st = statusOf(p);
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>;
};

const ProgressBar = ({ p, color, height = 6 }) => {
  const st = statusOf(p);
  return (
    <div style={{ height, background: C.light, borderRadius: height, overflow: "hidden" }}>
      <div style={{ height: "100%", width: p !== null ? `${Math.min(p,100)}%` : "0%", background: p !== null ? st.color : C.light, borderRadius: height, transition: "width .7s" }} />
    </div>
  );
};

const ResultCard = ({ label, actual, target, color }) => {
  const p = pct(actual, target);
  const st = statusOf(p);
  return (
    <div style={{ background: C.card, border: `1.5px solid ${actual !== null ? color+"44" : C.border}`, borderRadius: 12, padding: 18, flex: 1, boxShadow: actual !== null ? `0 2px 10px ${color}12` : "none" }}>
      <div style={{ fontSize: 12, letterSpacing: 2, color: C.muted, marginBottom: 6, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: actual !== null ? C.text : "#cbd5e1" }}>{fmtBig(actual)}</div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>KPI: {fmtBig(target)}</div>
      <ProgressBar p={p} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 900, color: p !== null ? st.color : "#cbd5e1" }}>{p !== null ? `${p}%` : "—"}</span>
        {p !== null && <Badge p={p} />}
      </div>
    </div>
  );
};

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

// ─── INPUT STYLE ──────────────────────────────────────────────────────────────
const inputSt = (filled) => ({
  width: "100%", boxSizing: "border-box",
  background: filled ? "#eff6ff" : "#f8fafc",
  border: `1.5px solid ${filled ? "#93c5fd" : C.border}`,
  borderRadius: 8, color: C.text,
  fontFamily: "'DM Mono','Courier New',monospace",
  fontSize: 15, padding: "10px 12px", outline: "none",
});

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
function LoginScreen({ members, onLogin, onManagerLogin }) {
  const [selected, setSelected] = useState("");
  const [pin, setPin] = useState("");
  const [mgrPin, setMgrPin] = useState("");
  const [tab, setTab] = useState("member"); // member | manager
  const [error, setError] = useState("");

  const handleMemberLogin = () => {
    if (!selected) { setError("Please select your name."); return; }
    const member = members.find(m => m.id === selected);
    if (!member) return;
    if (member.pin && pin !== member.pin) { setError("Incorrect PIN."); return; }
    setError("");
    onLogin(member);
  };

  const handleManagerLogin = () => {
    if (mgrPin === MANAGER_PIN) { setError(""); onManagerLogin(); }
    else setError("Incorrect manager PIN.");
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #1d4ed8 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono','Courier New',monospace", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: "#93c5fd", marginBottom: 8 }}>KPI PHẢI ĐẠT 2026</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: "#fff", letterSpacing: -1 }}>Performance Tracker</div>
          <div style={{ fontSize: 14, color: "#93c5fd", marginTop: 6 }}>Team Edition</div>
        </div>

        {/* Card */}
        <div style={{ background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 20px 60px #0003" }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, marginBottom: 28, background: C.light, borderRadius: 10, padding: 4 }}>
            {[["member","👤 Team Member"],["manager","🔑 Manager"]].map(([t,l]) => (
              <button key={t} onClick={() => { setTab(t); setError(""); }} style={{
                flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
                background: tab === t ? "#fff" : "transparent",
                color: tab === t ? C.navyDark : C.muted,
                fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                boxShadow: tab === t ? "0 1px 4px #0001" : "none",
              }}>{l}</button>
            ))}
          </div>

          {tab === "member" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, letterSpacing: 2, color: C.muted, fontWeight: 700, display: "block", marginBottom: 8 }}>SELECT YOUR NAME</label>
                <select value={selected} onChange={e => { setSelected(e.target.value); setPin(""); setError(""); }} style={{ ...inputSt(!!selected), cursor: "pointer" }}>
                  <option value="">— Choose name —</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              {selected && members.find(m => m.id === selected)?.pin && (
                <div>
                  <label style={{ fontSize: 12, letterSpacing: 2, color: C.muted, fontWeight: 700, display: "block", marginBottom: 8 }}>PIN</label>
                  <input type="password" value={pin} onChange={e => { setPin(e.target.value); setError(""); }} placeholder="Enter your PIN" style={inputSt(!!pin)} onKeyDown={e => e.key === "Enter" && handleMemberLogin()} />
                </div>
              )}
              {error && <div style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>{error}</div>}
              <button onClick={handleMemberLogin} disabled={!selected} style={{
                padding: "13px 0", borderRadius: 10, border: "none",
                background: selected ? C.navyDark : C.light,
                color: selected ? "#fff" : C.muted,
                cursor: selected ? "pointer" : "not-allowed",
                fontFamily: "inherit", fontSize: 15, fontWeight: 800, marginTop: 4,
              }}>Enter My Dashboard →</button>
            </div>
          )}

          {tab === "manager" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, letterSpacing: 2, color: C.muted, fontWeight: 700, display: "block", marginBottom: 8 }}>MANAGER PIN</label>
                <input type="password" value={mgrPin} onChange={e => { setMgrPin(e.target.value); setError(""); }} placeholder="Enter manager PIN" style={inputSt(!!mgrPin)} onKeyDown={e => e.key === "Enter" && handleManagerLogin()} />
              </div>
              {error && <div style={{ fontSize: 13, color: "#dc2626", fontWeight: 600 }}>{error}</div>}
              <div style={{ fontSize: 12, color: C.muted, background: C.light, borderRadius: 8, padding: "8px 12px" }}>
                Default PIN: <strong style={{ color: C.navyDark }}>admin2026</strong> — change after first login
              </div>
              <button onClick={handleManagerLogin} style={{
                padding: "13px 0", borderRadius: 10, border: "none",
                background: C.navyDark, color: "#fff",
                cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 800,
              }}>Enter Manager Panel →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MANAGER PANEL
// ═══════════════════════════════════════════════════════════════════════════════
function ManagerPanel({ members, setMembers, allData, onLogout, onViewMember }) {
  const [tab, setTab] = useState("overview"); // overview | targets | members
  const [editingMember, setEditingMember] = useState(null);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPin, setNewMemberPin]   = useState("");

  const exportCSV = () => {
    const rows = [];
    // Header
    rows.push(["Member","Month","KPI Revenue","KPI Profit","Actual Cost","Actual Revenue","Actual Profit","Rev %","Profit %","ROI %","Status"]);

    members.forEach(member => {
      const kpi  = member.kpi || defaultKPI();
      const data = allData[member.id] || { monthly: initMonthlyActuals(), daily: initDailyActuals() };

      MONTHS.forEach((mo, i) => {
        const a        = data.monthly[i] || {};
        const dailyArr = data.daily?.[i] || [];
        const hasDailyRev  = dailyArr.some(d => parseMoney(d.revenue) !== null);
        const hasDailyCost = dailyArr.some(d => parseMoney(d.cost)    !== null);
        let rev  = hasDailyRev  ? dailyArr.reduce((s,d)=>s+(parseMoney(d.revenue)??0),0) : parseMoney(a.revenue);
        let cost = hasDailyCost ? dailyArr.reduce((s,d)=>s+(parseMoney(d.cost)??0),0)    : parseMoney(a.cost);
        let prof = parseMoney(a.profit);
        if (prof === null && rev !== null && cost !== null) prof = rev - cost;
        const roi    = rev && rev > 0 && prof !== null ? ((prof/rev)*100).toFixed(2) : "";
        const revPct = kpi[i].revenue > 0 && rev !== null ? ((rev/kpi[i].revenue)*100).toFixed(1) : "";
        const proPct = kpi[i].profit  > 0 && prof !== null ? ((prof/kpi[i].profit)*100).toFixed(1) : "";
        const status = revPct === "" ? "PENDING" : parseFloat(revPct) >= 100 ? "ON TRACK" : parseFloat(revPct) >= 80 ? "NEAR" : "BEHIND";

        rows.push([
          member.name, mo,
          kpi[i].revenue || 0, kpi[i].profit || 0,
          cost ?? "", rev ?? "", prof ?? "",
          revPct, proPct, roi, status
        ]);
      });
    });

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `KPI_Team_Export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const addMember = () => {
    if (!newMemberName.trim()) return;
    const id = newMemberName.trim().toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();
    setMembers(prev => [...prev, { id, name: newMemberName.trim(), pin: newMemberPin.trim() || "", kpi: defaultKPI() }]);
    setNewMemberName(""); setNewMemberPin("");
  };

  const removeMember = (id) => setMembers(prev => prev.filter(m => m.id !== id));

  const updateKPI = (memberId, monthIdx, field, val) => {
    setMembers(prev => prev.map(m => {
      if (m.id !== memberId) return m;
      const kpi = [...(m.kpi || defaultKPI())];
      kpi[monthIdx] = { ...kpi[monthIdx], [field]: parseFloat(val) || 0 };
      return { ...m, kpi };
    }));
  };

  const TAB = (key, label) => (
    <button key={key} onClick={() => setTab(key)} style={{
      padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
      background: tab === key ? C.navyDark : "transparent",
      color: tab === key ? "#fff" : C.muted,
      fontFamily: "inherit", fontSize: 13, fontWeight: 700,
    }}>{label}</button>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Mono','Courier New',monospace", color: C.text }}>
      {/* Header */}
      <div style={{ background: C.navy, padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 4, color: "#93c5fd" }}>MANAGER PANEL · 2026</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>Team KPI Dashboard</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4, background: "#1e40af", borderRadius: 10, padding: 4 }}>
            {TAB("overview","📊 Overview")}
            {TAB("targets","🎯 Set Targets")}
            {TAB("members","👥 Members")}
          </div>
          <button onClick={exportCSV} disabled={members.length === 0} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #34d399", background: members.length > 0 ? "#065f46" : "transparent", color: members.length > 0 ? "#6ee7b7" : "#94a3b8", cursor: members.length > 0 ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>⬇ Export CSV</button>
          <button onClick={onLogout} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #3b5bdb", background: "transparent", color: "#93c5fd", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>← Logout</button>
        </div>
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 13, letterSpacing: 2, color: C.muted, fontWeight: 700 }}>ALL MEMBERS · YTD PERFORMANCE</div>

          {members.length === 0 ? (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 40, textAlign: "center", color: C.muted }}>
              No members yet. Go to <strong>Members</strong> tab to add team members.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {members.map((member, mi) => {
                const data = allData[member.id] || { monthly: initMonthlyActuals(), daily: initDailyActuals() };
                const kpi  = member.kpi || defaultKPI();
                const totalKpiRev    = kpi.reduce((s,k) => s + (k.revenue||0), 0);
                const totalKpiProfit = kpi.reduce((s,k) => s + (k.profit||0), 0);

                // Derive actuals
                let totalRev = 0, totalProfit = 0;
                for (let i = 0; i < 12; i++) {
                  const a = data.monthly[i] || {};
                  const dailyArr = data.daily?.[i] || [];
                  const hasDailyRev  = dailyArr.some(d => parseMoney(d.revenue) !== null);
                  const hasDailyCost = dailyArr.some(d => parseMoney(d.cost) !== null);
                  let rev  = hasDailyRev  ? dailyArr.reduce((s,d) => s+(parseMoney(d.revenue)??0),0) : parseMoney(a.revenue);
                  let cost = hasDailyCost ? dailyArr.reduce((s,d) => s+(parseMoney(d.cost)??0),0)    : parseMoney(a.cost);
                  let prof = parseMoney(a.profit);
                  if (prof === null && rev !== null && cost !== null) prof = rev - cost;
                  totalRev    += rev    ?? 0;
                  totalProfit += prof   ?? 0;
                }

                const revPct    = pct(totalRev > 0 ? totalRev : null, totalKpiRev);
                const profitPct = pct(totalProfit !== 0 ? totalProfit : null, totalKpiProfit);
                const revSt     = statusOf(revPct);
                const color     = MEMBER_COLORS[mi % MEMBER_COLORS.length];

                return (
                  <div key={member.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 24px", boxShadow: "0 1px 4px #0001" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 16 }}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 17, fontWeight: 800, color: C.text }}>{member.name}</div>
                          <div style={{ fontSize: 12, color: C.muted }}>KPI Target: {fmtBig(totalKpiRev)} rev · {fmtBig(totalKpiProfit)} profit</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Badge p={revPct} />
                        <button onClick={() => onViewMember(member)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${color}44`, background: color+"11", color, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>View →</button>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 4 }}>
                          <span>REVENUE</span>
                          <span style={{ fontWeight: 700, color: revSt.color }}>{revPct !== null ? `${revPct}%` : "—"}</span>
                        </div>
                        <ProgressBar p={revPct} />
                        <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginTop: 4 }}>{fmtBig(totalRev)} <span style={{ color: C.muted, fontWeight: 400 }}>/ {fmtBig(totalKpiRev)}</span></div>
                      </div>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 4 }}>
                          <span>PROFIT</span>
                          <span style={{ fontWeight: 700, color: statusOf(profitPct).color }}>{profitPct !== null ? `${profitPct}%` : "—"}</span>
                        </div>
                        <ProgressBar p={profitPct} />
                        <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginTop: 4 }}>{fmtBig(totalProfit)} <span style={{ color: C.muted, fontWeight: 400 }}>/ {fmtBig(totalKpiProfit)}</span></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Team bar chart */}
          {members.length > 0 && (() => {
            const chartData = MONTHS_SHORT.map((mo, i) => {
              const row = { name: mo };
              members.forEach(member => {
                const data = allData[member.id] || { monthly: initMonthlyActuals() };
                const a = data.monthly[i] || {};
                row[member.name] = parseMoney(a.revenue) ?? 0;
              });
              return row;
            });
            return (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 20px", boxShadow: "0 1px 4px #0001" }}>
                <div style={{ fontSize: 12, letterSpacing: 2, color: C.muted, fontWeight: 700, marginBottom: 20 }}>TEAM REVENUE · MONTHLY COMPARISON</div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 8, right: 20, left: 10, bottom: 8 }} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: C.muted, fontFamily: "inherit" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: C.muted, fontFamily: "inherit" }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 13, fontFamily: "inherit" }} />
                    {members.map((m, mi) => (
                      <Bar key={m.id} dataKey={m.name} fill={MEMBER_COLORS[mi % MEMBER_COLORS.length]} radius={[4,4,0,0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── SET TARGETS ── */}
      {tab === "targets" && (
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
          {members.length === 0 ? (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 40, textAlign: "center", color: C.muted }}>Add members first in the Members tab.</div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: C.muted }}>Set monthly Revenue & Profit KPI targets for each team member.</div>
              {members.map((member, mi) => {
                const kpi   = member.kpi || defaultKPI();
                const color = MEMBER_COLORS[mi % MEMBER_COLORS.length];
                const isOpen = editingMember === member.id;
                return (
                  <div key={member.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px #0001" }}>
                    <div onClick={() => setEditingMember(isOpen ? null : member.id)} style={{ padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: isOpen ? "#eff6ff" : "#fff" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 14 }}>{member.name.charAt(0).toUpperCase()}</div>
                        <span style={{ fontSize: 16, fontWeight: 700 }}>{member.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 12, color: C.muted }}>Annual: {fmtBig(kpi.reduce((s,k) => s+(k.revenue||0),0))} rev</span>
                        <span style={{ fontSize: 18, color: isOpen ? C.navyDark : C.muted }}>{isOpen ? "▲" : "▼"}</span>
                      </div>
                    </div>
                    {isOpen && (
                      <div style={{ padding: "0 24px 24px", overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                          <thead>
                            <tr style={{ background: C.light }}>
                              {["MONTH","KPI REVENUE ($)","KPI PROFIT ($)","ROI %"].map(h => (
                                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, letterSpacing: 1, color: C.muted, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {MONTHS.map((mo, i) => {
                              const roi = kpi[i].revenue > 0 ? ((kpi[i].profit / kpi[i].revenue) * 100).toFixed(1) : "—";
                              return (
                                <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                                  <td style={{ padding: "8px 12px", fontWeight: 700, color: C.navyDark }}>{mo.slice(0,3)}</td>
                                  <td style={{ padding: "8px 12px" }}>
                                    <input type="number" value={kpi[i].revenue || ""} onChange={e => updateKPI(member.id, i, "revenue", e.target.value)} placeholder="0" style={{ ...inputSt(!!kpi[i].revenue), maxWidth: 140, fontSize: 13, padding: "6px 10px" }} />
                                  </td>
                                  <td style={{ padding: "8px 12px" }}>
                                    <input type="number" value={kpi[i].profit || ""} onChange={e => updateKPI(member.id, i, "profit", e.target.value)} placeholder="0" style={{ ...inputSt(!!kpi[i].profit), maxWidth: 140, fontSize: 13, padding: "6px 10px" }} />
                                  </td>
                                  <td style={{ padding: "8px 12px", color: C.muted, fontWeight: 600 }}>{roi}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr style={{ background: "#eff6ff", borderTop: `2px solid #bae6fd` }}>
                              <td style={{ padding: "10px 12px", fontWeight: 900, color: C.navyDark }}>TOTAL</td>
                              <td style={{ padding: "10px 12px", fontWeight: 800, color: C.rev }}>{fmtBig(kpi.reduce((s,k)=>s+(k.revenue||0),0))}</td>
                              <td style={{ padding: "10px 12px", fontWeight: 800, color: C.profit }}>{fmtBig(kpi.reduce((s,k)=>s+(k.profit||0),0))}</td>
                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ── MEMBERS ── */}
      {tab === "members" && (
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Add member */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, boxShadow: "0 1px 4px #0001" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Add New Team Member</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
              <div>
                <label style={{ fontSize: 11, letterSpacing: 2, color: C.muted, fontWeight: 700, display: "block", marginBottom: 6 }}>FULL NAME</label>
                <input type="text" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} placeholder="e.g. Nguyen Van A" style={inputSt(!!newMemberName)} onKeyDown={e => e.key === "Enter" && addMember()} />
              </div>
              <div>
                <label style={{ fontSize: 11, letterSpacing: 2, color: C.muted, fontWeight: 700, display: "block", marginBottom: 6 }}>PIN (optional)</label>
                <input type="text" value={newMemberPin} onChange={e => setNewMemberPin(e.target.value)} placeholder="e.g. 1234" style={inputSt(!!newMemberPin)} />
              </div>
              <button onClick={addMember} disabled={!newMemberName.trim()} style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: newMemberName.trim() ? C.navyDark : C.light, color: newMemberName.trim() ? "#fff" : C.muted, cursor: newMemberName.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>+ Add</button>
            </div>
          </div>

          {/* Member list */}
          {members.length === 0 ? (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 40, textAlign: "center", color: C.muted, fontSize: 15 }}>No team members yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {members.map((member, mi) => (
                <div key={member.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 3px #0001" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: MEMBER_COLORS[mi % MEMBER_COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 15 }}>{member.name.charAt(0).toUpperCase()}</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{member.name}</div>
                      <div style={{ fontSize: 12, color: C.muted }}>PIN: {member.pin ? "••••" : "none"}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => onViewMember(member)} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.light, color: C.navyDark, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>View Data</button>
                    <button onClick={() => removeMember(member.id)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #fecaca", background: "#fff5f5", color: "#dc2626", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEMBER TRACKER
// ═══════════════════════════════════════════════════════════════════════════════
function MemberTracker({ member, memberData, setMemberData, onLogout, isManagerView }) {
  const kpi = member.kpi || defaultKPI();
  const [view, setView]               = useState("month");
  const [activeMonth, setActiveMonth] = useState(0);
  const [activeDay, setActiveDay]     = useState(1);
  const [chartMetric, setChartMetric] = useState("revenue");
  const [chartType, setChartType]     = useState("monthly");

  const monthly = memberData.monthly || initMonthlyActuals();
  const daily   = memberData.daily   || initDailyActuals();

  const setField = (idx, field, val) => {
    const next = [...monthly];
    next[idx] = { ...next[idx], [field]: val };
    setMemberData({ ...memberData, monthly: next });
  };

  const setDailyField = (mi, day, field, val) => {
    const nextDaily = daily.map((month, i) => {
      if (i !== mi) return month;
      return month.map((d, di) => di === day - 1 ? { ...d, [field]: val } : d);
    });
    setMemberData({ ...memberData, daily: nextDaily });
  };

  const derived = useMemo(() => kpi.map((k, i) => {
    const a = monthly[i] || {};
    const dailyArr = daily[i] || [];
    const hasDailyRev  = dailyArr.some(d => parseMoney(d.revenue) !== null);
    const hasDailyCost = dailyArr.some(d => parseMoney(d.cost) !== null);
    let rev  = hasDailyRev  ? dailyArr.reduce((s,d) => s+(parseMoney(d.revenue)??0),0) : parseMoney(a.revenue);
    let cost = hasDailyCost ? dailyArr.reduce((s,d) => s+(parseMoney(d.cost)??0),0)    : parseMoney(a.cost);
    let prof = parseMoney(a.profit);
    if (prof === null && rev !== null && cost !== null) prof = rev - cost;
    const roi = rev && rev > 0 && prof !== null ? (prof/rev)*100 : null;
    return { rev, cost, prof, roi, hasDailyRev, hasDailyCost };
  }), [monthly, daily, kpi]);

  const totalKpiRev    = kpi.reduce((s,k) => s+(k.revenue||0),0);
  const totalKpiProfit = kpi.reduce((s,k) => s+(k.profit||0),0);
  const totalActualRev    = derived.reduce((s,d) => s+(d.rev??0),0);
  const totalActualProfit = derived.reduce((s,d) => s+(d.prof??0),0);
  const totalActualCost   = derived.reduce((s,d) => s+(d.cost??0),0);
  const filledCount       = derived.filter(d => d.rev !== null).length;

  const m   = activeMonth;
  const d   = derived[m];
  const a   = monthly[m] || {};
  const mk  = kpi[m];

  const dailyChartData = useMemo(() => (daily[m]||[]).map((day, i) => ({
    name: `D${i+1}`,
    Cost: parseMoney(day.cost) ?? 0,
    Revenue: parseMoney(day.revenue) ?? 0,
    Profit: (parseMoney(day.revenue)??0) - (parseMoney(day.cost)??0),
  })), [daily, m]);

  const TAB = (key, label) => (
    <button key={key} onClick={() => setView(key)} style={{
      padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
      background: view === key ? C.navyDark : "transparent",
      color: view === key ? "#fff" : C.muted,
      fontFamily: "inherit", fontSize: 13, fontWeight: 700,
    }}>{label}</button>
  );

  const memberColor = MEMBER_COLORS[0];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Mono','Courier New',monospace", color: C.text }}>
      {/* Header */}
      <div style={{ background: C.navy, padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: memberColor, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 18 }}>{member.name.charAt(0).toUpperCase()}</div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 4, color: "#93c5fd" }}>{isManagerView ? "MANAGER VIEW · " : ""}KPI PHẢI ĐẠT 2026</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{member.name}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 4, background: "#1e40af", borderRadius: 10, padding: 4 }}>
            {TAB("month","◉ MONTH")}
            {TAB("daily","◈ DAILY")}
            {TAB("overview","▦ OVERVIEW")}
            {TAB("chart","▲ CHARTS")}
            {TAB("products","📦 PRODUCTS")}
          </div>
          <button onClick={onLogout} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #3b5bdb", background: "transparent", color: "#93c5fd", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700 }}>
            {isManagerView ? "← Back" : "← Logout"}
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ padding: "20px 28px 0", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14 }}>
        {[
          { label: "YTD REVENUE",  val: fmtBig(totalActualRev),    sub: `Target ${fmtBig(totalKpiRev)}`,    p: filledCount>0?pct(totalActualRev,totalKpiRev):null,       color: C.rev },
          { label: "YTD PROFIT",   val: fmtBig(totalActualProfit), sub: `Target ${fmtBig(totalKpiProfit)}`,  p: filledCount>0?pct(totalActualProfit,totalKpiProfit):null, color: C.profit },
          { label: "YTD COST",     val: fmtBig(totalActualCost),   sub: "Total actual spend",               p: null },
          { label: "MONTHS FILED", val: `${filledCount} / 12`,     sub: "months with data",                 p: filledCount>0?+((filledCount/12)*100).toFixed(0):null },
        ].map(card => {
          const st = statusOf(card.p);
          return (
            <div key={card.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", boxShadow: "0 1px 3px #0001" }}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: C.muted, marginBottom: 6, fontWeight: 600 }}>{card.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: card.color || C.text, marginBottom: 2 }}>{card.val}</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: card.p !== null ? 8 : 0 }}>{card.sub}</div>
              {card.p !== null && (
                <>
                  <ProgressBar p={card.p} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: st.color }}>{card.p}% of KPI</span>
                    <Badge p={card.p} />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* ── MONTH VIEW ── */}
      {view === "month" && (
        <div style={{ padding: "20px 28px 32px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {MONTHS.map((mo, i) => {
              const d2 = derived[i];
              const p2 = pct(d2.rev, kpi[i].revenue);
              const st = statusOf(p2);
              return (
                <button key={i} onClick={() => setActiveMonth(i)} style={{
                  padding: "6px 14px", borderRadius: 8, fontFamily: "inherit", fontSize: 13,
                  fontWeight: activeMonth===i ? 800 : 500,
                  border: activeMonth===i ? `2px solid ${d2.rev!==null ? st.color : C.navyDark}` : `1px solid ${C.border}`,
                  background: activeMonth===i ? (d2.rev!==null ? st.bg : "#eff6ff") : C.card,
                  color: d2.rev!==null ? st.color : (activeMonth===i ? C.navyDark : C.muted),
                  cursor: "pointer", position: "relative",
                }}>
                  {mo.slice(0,3).toUpperCase()}
                  {d2.rev !== null && <span style={{ position: "absolute", top: -4, right: -4, width: 8, height: 8, borderRadius: "50%", background: st.color, border: "2px solid #f8fafc" }} />}
                </button>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {/* Input */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, boxShadow: "0 2px 8px #0001", display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: 4, color: C.muted, fontWeight: 600 }}>MONTHLY ACTUALS FOR</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: C.text, marginTop: 2 }}>{MONTHS[m]}</div>
                <div style={{ fontSize: 13, color: C.muted }}>Month {m+1} of 12</div>
              </div>
              <div style={{ background: "#eff6ff", borderRadius: 10, padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[
                  { label: "KPI REVENUE", val: fmtBig(mk.revenue), color: C.rev },
                  { label: "KPI PROFIT",  val: fmtBig(mk.profit),  color: C.profit },
                  { label: "KPI ROI",     val: mk.revenue > 0 ? `${((mk.profit/mk.revenue)*100).toFixed(1)}%` : "—", color: C.kpi },
                ].map(({ label, val, color }) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, letterSpacing: 1, color: C.muted, marginBottom: 2, fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color }}>{val}</div>
                  </div>
                ))}
              </div>
              {(d.hasDailyRev || d.hasDailyCost) && (
                <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#92400e" }}>
                  ⚡ Daily entries detected — totals auto-summed from daily data.
                </div>
              )}
              {[
                { field: "cost",    label: "ACTUAL COST",    ph: "e.g. 1800000",    hint: "Total operating cost", color: C.cost },
                { field: "revenue", label: "ACTUAL REVENUE", ph: "e.g. 2100000",    hint: "Total sales revenue",  color: C.rev },
                { field: "profit",  label: "ACTUAL PROFIT",  ph: "auto-calculated", hint: "Leave blank → Revenue − Cost", color: C.profit },
              ].map(({ field, label, ph, hint, color }) => {
                const disabled = field !== "profit" && (field === "revenue" ? d.hasDailyRev : d.hasDailyCost);
                return (
                  <div key={field}>
                    <label style={{ fontSize: 11, letterSpacing: 2, color, display: "block", marginBottom: 6, fontWeight: 700 }}>{label}</label>
                    <input type="text" value={a[field]||""} onChange={e => setField(m, field, e.target.value)} placeholder={ph} disabled={disabled}
                      style={{ ...inputSt(!!(a[field]||"")), opacity: disabled ? 0.5 : 1 }}
                      onFocus={e => { e.target.style.border = `1.5px solid ${color}`; e.target.style.background = "#f0f9ff"; }}
                      onBlur={e  => { e.target.style.border = (a[field]||"") ? "1.5px solid #93c5fd" : `1.5px solid ${C.border}`; e.target.style.background = (a[field]||"") ? "#eff6ff" : "#f8fafc"; }}
                    />
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{hint}</div>
                  </div>
                );
              })}
            </div>

            {/* Results */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <ResultCard label="REVENUE" actual={d.rev}  target={mk.revenue} color={C.rev} />
              <ResultCard label="PROFIT"  actual={d.prof} target={mk.profit}  color={C.profit} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, boxShadow: "0 1px 3px #0001" }}>
                  <div style={{ fontSize: 11, letterSpacing: 2, color: C.muted, marginBottom: 6, fontWeight: 600 }}>COST</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: d.cost !== null ? C.cost : "#cbd5e1" }}>{fmtBig(d.cost)}</div>
                  {d.rev !== null && d.cost !== null && <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{((d.cost/d.rev)*100).toFixed(1)}% of revenue</div>}
                </div>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, boxShadow: "0 1px 3px #0001" }}>
                  <div style={{ fontSize: 11, letterSpacing: 2, color: C.muted, marginBottom: 6, fontWeight: 600 }}>ROI</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: d.roi !== null ? statusOf(pct(d.roi, mk.revenue > 0 ? (mk.profit/mk.revenue)*100 : ROI_KPI)).color : "#cbd5e1" }}>
                    {d.roi !== null ? `${d.roi.toFixed(2)}%` : "—"}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted }}>KPI: {mk.revenue > 0 ? `${((mk.profit/mk.revenue)*100).toFixed(1)}%` : `${ROI_KPI}%`}</div>
                  {d.roi !== null && <div style={{ marginTop: 8 }}><ProgressBar p={pct(d.roi, mk.revenue > 0 ? (mk.profit/mk.revenue)*100 : ROI_KPI)} /></div>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[["← PREV", () => setActiveMonth(Math.max(0,m-1)), m===0], ["NEXT →", () => setActiveMonth(Math.min(11,m+1)), m===11]].map(([label, fn, dis]) => (
                  <button key={label} onClick={fn} disabled={dis} style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${dis ? C.border : C.navyDark}`, background: dis ? C.light : "#eff6ff", color: dis ? "#cbd5e1" : C.navyDark, cursor: dis ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>{label}</button>
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
            {MONTHS.map((mo, i) => {
              const filled = (daily[i]||[]).some(d2 => parseMoney(d2.revenue) !== null || parseMoney(d2.cost) !== null);
              return (
                <button key={i} onClick={() => { setActiveMonth(i); setActiveDay(1); }} style={{
                  padding: "6px 14px", borderRadius: 8, fontFamily: "inherit", fontSize: 13,
                  fontWeight: activeMonth===i ? 800 : 500,
                  border: activeMonth===i ? "2px solid #1e40af" : `1px solid ${C.border}`,
                  background: activeMonth===i ? "#eff6ff" : C.card,
                  color: activeMonth===i ? C.navyDark : C.muted,
                  cursor: "pointer", position: "relative",
                }}>
                  {mo.slice(0,3).toUpperCase()}
                  {filled && <span style={{ position: "absolute", top: -4, right: -4, width: 8, height: 8, borderRadius: "50%", background: C.cost, border: "2px solid #f8fafc" }} />}
                </button>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 18 }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px #0001" }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 12, letterSpacing: 2, color: C.muted, fontWeight: 700 }}>{MONTHS[m].toUpperCase()} · DAYS</div>
              <div style={{ maxHeight: 480, overflowY: "auto" }}>
                {Array.from({ length: DAYS_IN_MONTH[m] }, (_, i) => {
                  const day = i+1;
                  const dd = (daily[m]||[])[i] || {};
                  const filled = parseMoney(dd.revenue) !== null || parseMoney(dd.cost) !== null;
                  return (
                    <div key={day} onClick={() => setActiveDay(day)} style={{ padding: "10px 16px", background: activeDay===day ? "#eff6ff" : "transparent", borderLeft: activeDay===day ? "3px solid #1e40af" : "3px solid transparent", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: activeDay===day ? 800 : 500, color: activeDay===day ? C.navyDark : C.text, fontSize: 14 }}>Day {day}</span>
                      {filled && <span style={{ fontSize: 13, color: C.profit, fontWeight: 700 }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Day input */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, boxShadow: "0 2px 8px #0001" }}>
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 11, letterSpacing: 4, color: C.muted, fontWeight: 600 }}>DAILY ENTRY</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: C.text }}>{MONTHS[m]} — Day {activeDay}</div>
                  <div style={{ display: "flex", gap: 20, marginTop: 10, background: "#eff6ff", borderRadius: 8, padding: "10px 14px", flexWrap: "wrap" }}>
                    {[
                      { label: "MONTHLY KPI REV",    val: fmtBig(mk.revenue), color: C.rev },
                      { label: "MONTHLY KPI PROFIT", val: fmtBig(mk.profit),  color: C.profit },
                      { label: "DAILY AVG NEEDED",   val: fmtBig(Math.round(mk.revenue / DAYS_IN_MONTH[m])), color: C.muted },
                    ].map(({ label, val, color }) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, letterSpacing: 1, color: C.muted, fontWeight: 700, marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  {[
                    { field: "cost",    label: "DAILY COST",    color: C.cost },
                    { field: "revenue", label: "DAILY REVENUE", color: C.rev },
                  ].map(({ field, label, color }) => {
                    const val = ((daily[m]||[])[activeDay-1] || {})[field] || "";
                    return (
                      <div key={field}>
                        <label style={{ fontSize: 11, letterSpacing: 2, color, display: "block", marginBottom: 6, fontWeight: 700 }}>{label}</label>
                        <input type="text" value={val} onChange={e => setDailyField(m, activeDay, field, e.target.value)} placeholder="0" style={inputSt(!!val)}
                          onFocus={e => { e.target.style.border = `1.5px solid ${color}`; }}
                          onBlur={e  => { e.target.style.border = val ? "1.5px solid #93c5fd" : `1.5px solid ${C.border}`; }}
                        />
                      </div>
                    );
                  })}
                </div>
                {(() => {
                  const dd = (daily[m]||[])[activeDay-1] || {};
                  const rev = parseMoney(dd.revenue), cost = parseMoney(dd.cost);
                  const prof = rev !== null && cost !== null ? rev - cost : null;
                  return prof !== null ? (
                    <div style={{ marginTop: 14, background: prof >= 0 ? "#dcfce7" : "#fee2e2", borderRadius: 8, padding: "10px 14px" }}>
                      <span style={{ fontSize: 14, color: C.muted }}>Day profit: </span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: prof >= 0 ? C.profit : "#dc2626" }}>{fmtBig(prof)}</span>
                    </div>
                  ) : null;
                })()}
                <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                  {[["← PREV DAY", () => setActiveDay(Math.max(1,activeDay-1)), activeDay===1], ["NEXT DAY →", () => setActiveDay(Math.min(DAYS_IN_MONTH[m],activeDay+1)), activeDay===DAYS_IN_MONTH[m]]].map(([label, fn, dis]) => (
                    <button key={label} onClick={fn} disabled={dis} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${dis ? C.border : C.navyDark}`, background: dis ? C.light : "#eff6ff", color: dis ? "#cbd5e1" : C.navyDark, cursor: dis ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 }}>{label}</button>
                  ))}
                </div>
              </div>

              {/* Daily cumulative vs KPI */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, boxShadow: "0 2px 8px #0001" }}>
                <div style={{ fontSize: 12, letterSpacing: 2, color: C.muted, fontWeight: 700, marginBottom: 4 }}>{MONTHS[m].toUpperCase()} · CUMULATIVE vs KPI</div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
                  {(daily[m]||[]).filter(d2 => parseMoney(d2.revenue) !== null || parseMoney(d2.cost) !== null).length} of {DAYS_IN_MONTH[m]} days entered
                </div>
                {[
                  { label: "REVENUE", actual: d.rev,  target: mk.revenue, color: C.rev },
                  { label: "COST",    actual: d.cost, target: null,       color: C.cost },
                  { label: "PROFIT",  actual: d.prof, target: mk.profit,  color: C.profit },
                ].map(({ label, actual, target, color }) => {
                  const p2 = target ? pct(actual, target) : null;
                  const st = statusOf(p2);
                  const daysLeft = DAYS_IN_MONTH[m] - (daily[m]||[]).filter(d2 => parseMoney(d2.revenue) !== null || parseMoney(d2.cost) !== null).length;
                  const remaining = target && actual !== null ? target - actual : null;
                  const dailyNeeded = remaining !== null && daysLeft > 0 ? remaining / daysLeft : null;
                  return (
                    <div key={label} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                        <div>
                          <span style={{ fontSize: 12, letterSpacing: 2, color: C.muted, fontWeight: 700 }}>{label} </span>
                          <span style={{ fontSize: 17, fontWeight: 900, color: actual !== null ? color : "#cbd5e1" }}>{fmtBig(actual)}</span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          {target && <div style={{ fontSize: 12, color: C.muted }}>KPI: {fmtBig(target)}</div>}
                          {p2 !== null && <div style={{ fontSize: 14, fontWeight: 800, color: st.color }}>{p2}%</div>}
                        </div>
                      </div>
                      {target && <ProgressBar p={p2} height={7} />}
                      {dailyNeeded !== null && dailyNeeded > 0 && (
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                          Need <strong style={{ color }}>{fmtBig(dailyNeeded)}/day</strong> for {daysLeft} remaining days
                        </div>
                      )}
                      {p2 !== null && p2 >= 100 && <div style={{ fontSize: 12, color: C.profit, fontWeight: 700, marginTop: 4 }}>✓ KPI achieved this month!</div>}
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
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px #0001" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.light }}>
                  {["MONTH","KPI REV","ACT COST","ACT REV","REV %","KPI PROFIT","ACT PROFIT","PROFIT %","ROI","STATUS"].map(h => (
                    <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, letterSpacing: 2, color: C.muted, fontWeight: 700, borderBottom: `2px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MONTHS.map((mo, i) => {
                  const d2 = derived[i];
                  const rp = pct(d2.rev, kpi[i].revenue);
                  const pp = pct(d2.prof, kpi[i].profit);
                  const rs = statusOf(rp);
                  const hasData = d2.rev !== null;
                  return (
                    <tr key={i} onClick={() => { setActiveMonth(i); setView("month"); }}
                      style={{ background: i%2===0 ? "#fff" : "#f8fafc", cursor: "pointer", borderBottom: `1px solid ${C.border}` }}
                      onMouseEnter={e => e.currentTarget.style.background="#eff6ff"}
                      onMouseLeave={e => e.currentTarget.style.background=i%2===0?"#fff":"#f8fafc"}
                    >
                      <td style={{ padding: "11px 14px", fontWeight: 700, color: C.navyDark }}>{mo.slice(0,3)}</td>
                      <td style={{ padding: "11px 14px", color: C.muted }}>{fmtBig(kpi[i].revenue)}</td>
                      <td style={{ padding: "11px 14px", color: hasData ? C.cost : "#cbd5e1", fontWeight: hasData?600:400 }}>{fmtBig(d2.cost)}</td>
                      <td style={{ padding: "11px 14px", color: hasData ? C.rev  : "#cbd5e1", fontWeight: hasData?600:400 }}>{fmtBig(d2.rev)}</td>
                      <td style={{ padding: "11px 14px" }}>
                        {rp !== null ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 50, height: 5, background: C.light, borderRadius: 5, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${Math.min(rp,100)}%`, background: rs.color, borderRadius: 5 }} />
                            </div>
                            <span style={{ color: rs.color, fontWeight: 700 }}>{rp}%</span>
                          </div>
                        ) : <span style={{ color: "#cbd5e1" }}>—</span>}
                      </td>
                      <td style={{ padding: "11px 14px", color: C.muted }}>{fmtBig(kpi[i].profit)}</td>
                      <td style={{ padding: "11px 14px", color: hasData ? C.profit : "#cbd5e1", fontWeight: hasData?600:400 }}>{fmtBig(d2.prof)}</td>
                      <td style={{ padding: "11px 14px" }}>{pp !== null ? <span style={{ color: statusOf(pp).color, fontWeight: 700 }}>{pp}%</span> : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                      <td style={{ padding: "11px 14px", color: d2.roi !== null ? "#059669" : "#cbd5e1" }}>{d2.roi !== null ? `${d2.roi.toFixed(1)}%` : "—"}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: hasData?rs.bg:C.light, color: hasData?rs.color:C.muted }}>{hasData?rs.label:"PENDING"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "#e0f2fe", borderTop: `2px solid #bae6fd` }}>
                  <td style={{ padding: "12px 14px", fontWeight: 900, color: "#0369a1", fontSize: 12, letterSpacing: 1 }}>TOTAL</td>
                  <td style={{ padding: "12px 14px", color: C.muted, fontWeight: 700 }}>{fmtBig(totalKpiRev)}</td>
                  <td style={{ padding: "12px 14px", color: C.cost, fontWeight: 700 }}>{fmtBig(totalActualCost)}</td>
                  <td style={{ padding: "12px 14px", color: C.rev, fontWeight: 700 }}>{fmtBig(totalActualRev)}</td>
                  <td style={{ padding: "12px 14px" }}>{filledCount>0&&<span style={{ color: statusOf(pct(totalActualRev,totalKpiRev)).color, fontWeight: 900 }}>{pct(totalActualRev,totalKpiRev)}%</span>}</td>
                  <td style={{ padding: "12px 14px", color: C.muted, fontWeight: 700 }}>{fmtBig(totalKpiProfit)}</td>
                  <td style={{ padding: "12px 14px", color: C.profit, fontWeight: 700 }}>{fmtBig(totalActualProfit)}</td>
                  <td style={{ padding: "12px 14px" }}>{filledCount>0&&<span style={{ color: statusOf(pct(totalActualProfit,totalKpiProfit)).color, fontWeight: 900 }}>{pct(totalActualProfit,totalKpiProfit)}%</span>}</td>
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
              {[["monthly","12-Month"],["daily","Daily"]].map(([t,label]) => (
                <button key={t} onClick={() => setChartType(t)} style={{ padding: "6px 14px", borderRadius: 6, background: chartType===t?"#fff":"transparent", color: chartType===t?C.navyDark:C.muted, border: chartType===t?`1px solid ${C.border}`:"1px solid transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, boxShadow: chartType===t?"0 1px 3px #0001":"none" }}>{label}</button>
              ))}
            </div>
            {chartType === "monthly" && (
              <div style={{ display: "flex", gap: 4, background: C.light, borderRadius: 8, padding: 4 }}>
                {[["revenue","Revenue",C.rev],["cost","Cost",C.cost],["profit","Profit",C.profit]].map(([k,label,color]) => (
                  <button key={k} onClick={() => setChartMetric(k)} style={{ padding: "6px 14px", borderRadius: 6, background: chartMetric===k?"#fff":"transparent", color: chartMetric===k?color:C.muted, border: chartMetric===k?`1px solid ${color}44`:"1px solid transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, boxShadow: chartMetric===k?"0 1px 3px #0001":"none" }}>{label}</button>
                ))}
              </div>
            )}
            {chartType === "daily" && (
              <div style={{ display: "flex", gap: 4, background: C.light, borderRadius: 8, padding: 4 }}>
                {MONTHS.map((mo, i) => (
                  <button key={i} onClick={() => setActiveMonth(i)} style={{ padding: "5px 10px", borderRadius: 6, background: activeMonth===i?"#fff":"transparent", color: activeMonth===i?C.navyDark:C.muted, border: activeMonth===i?`1px solid ${C.border}`:"1px solid transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 700 }}>{mo.slice(0,3)}</button>
                ))}
              </div>
            )}
          </div>

          {chartType === "monthly" && (
            <>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 20px", boxShadow: "0 2px 8px #0001" }}>
                <div style={{ fontSize: 12, letterSpacing: 2, color: C.muted, fontWeight: 700, marginBottom: 20 }}>{chartMetric.toUpperCase()} — ACTUAL vs KPI TARGET</div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={MONTHS_SHORT.map((mo, i) => ({ name: mo, "KPI Target": kpi[i][chartMetric === "profit" ? "profit" : "revenue"] ?? 0, "Actual": derived[i][chartMetric==="revenue"?"rev":chartMetric==="cost"?"cost":"prof"] ?? 0 }))} margin={{ top: 8, right: 20, left: 10, bottom: 8 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 13, fill: C.muted, fontFamily: "inherit" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fontSize: 12, fill: C.muted, fontFamily: "inherit" }} axisLine={false} tickLine={false} width={65} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 13, fontFamily: "inherit" }} />
                    <Bar dataKey="KPI Target" fill="#c7d2fe" radius={[4,4,0,0]} />
                    <Bar dataKey="Actual" fill={chartMetric==="revenue"?C.rev:chartMetric==="cost"?C.cost:C.profit} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 20px", boxShadow: "0 2px 8px #0001" }}>
                <div style={{ fontSize: 12, letterSpacing: 2, color: C.muted, fontWeight: 700, marginBottom: 20 }}>REVENUE · COST · PROFIT — ALL MONTHS</div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={MONTHS_SHORT.map((_,i) => ({ name: MONTHS_SHORT[i], Revenue: derived[i].rev??0, Cost: derived[i].cost??0, Profit: derived[i].prof??0 }))} margin={{ top: 8, right: 20, left: 10, bottom: 8 }} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 13, fill: C.muted, fontFamily: "inherit" }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fontSize: 12, fill: C.muted, fontFamily: "inherit" }} axisLine={false} tickLine={false} width={65} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 13, fontFamily: "inherit" }} />
                    <Bar dataKey="Revenue" fill={C.rev}    radius={[3,3,0,0]} />
                    <Bar dataKey="Cost"    fill={C.cost}   radius={[3,3,0,0]} />
                    <Bar dataKey="Profit"  fill={C.profit} radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
          {chartType === "daily" && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 20px", boxShadow: "0 2px 8px #0001" }}>
              <div style={{ fontSize: 12, letterSpacing: 2, color: C.muted, fontWeight: 700, marginBottom: 20 }}>DAILY BREAKDOWN — {MONTHS[m].toUpperCase()}</div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyChartData} margin={{ top: 8, right: 20, left: 10, bottom: 8 }} barGap={2} barSize={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.muted, fontFamily: "inherit" }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 12, fill: C.muted, fontFamily: "inherit" }} axisLine={false} tickLine={false} width={65} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 13, fontFamily: "inherit" }} />
                  <Bar dataKey="Cost"    fill={C.cost}   radius={[3,3,0,0]} />
                  <Bar dataKey="Revenue" fill={C.rev}    radius={[3,3,0,0]} />
                  <Bar dataKey="Profit"  fill={C.profit} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
      {/* ── PRODUCTS TAB ── */}
      {view === "products" && (
        <div style={{ padding: "20px 28px 40px" }}>
          <ProductTab memberId={member.id} memberKpi={kpi} />
        </div>
      )}
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen]   = useState("loading"); // loading | login | member | manager
  const [members, setMembersState] = useState([]);
  const [allData, setAllData] = useState({});
  const [currentUser, setCurrentUser] = useState(null); // member object
  const [viewingMember, setViewingMember] = useState(null); // for manager view-member
  const [saving, setSaving]   = useState(false);

  // ── Load from storage on mount ──
  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get("kpi_members", true);
        if (result?.value) setMembersState(JSON.parse(result.value));
      } catch {}
      try {
        const result = await window.storage.get("kpi_alldata", true);
        if (result?.value) setAllData(JSON.parse(result.value));
      } catch {}
      setScreen("login");
    })();
  }, []);

  // ── Persist members to storage ──
  const setMembers = useCallback(async (updater) => {
    setMembersState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      window.storage.set("kpi_members", JSON.stringify(next), true).catch(() => {});
      return next;
    });
  }, []);

  // ── Persist a member's data ──
  const setMemberData = useCallback((memberId, data) => {
    setAllData(prev => {
      const next = { ...prev, [memberId]: data };
      window.storage.set("kpi_alldata", JSON.stringify(next), true).catch(() => {});
      return next;
    });
  }, []);

  if (screen === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#1e3a8a,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono','Courier New',monospace" }}>
        <div style={{ textAlign: "center", color: "#fff" }}>
          <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>Performance Tracker</div>
          <div style={{ fontSize: 14, color: "#93c5fd" }}>Loading…</div>
        </div>
      </div>
    );
  }

  if (screen === "member" && currentUser) {
    const memberData = allData[currentUser.id] || { monthly: initMonthlyActuals(), daily: initDailyActuals() };
    return (
      <MemberTracker
        member={currentUser}
        memberData={memberData}
        setMemberData={(data) => setMemberData(currentUser.id, data)}
        onLogout={() => { setCurrentUser(null); setScreen("login"); }}
        isManagerView={false}
      />
    );
  }

  if (screen === "manager-view-member" && viewingMember) {
    const memberData = allData[viewingMember.id] || { monthly: initMonthlyActuals(), daily: initDailyActuals() };
    return (
      <MemberTracker
        member={viewingMember}
        memberData={memberData}
        setMemberData={(data) => setMemberData(viewingMember.id, data)}
        onLogout={() => { setViewingMember(null); setScreen("manager"); }}
        isManagerView={true}
      />
    );
  }

  if (screen === "manager") {
    return (
      <ManagerPanel
        members={members}
        setMembers={setMembers}
        allData={allData}
        onLogout={() => setScreen("login")}
        onViewMember={(member) => { setViewingMember(member); setScreen("manager-view-member"); }}
      />
    );
  }

  return (
    <LoginScreen
      members={members}
      onLogin={(member) => { setCurrentUser(member); setScreen("member"); }}
      onManagerLogin={() => setScreen("manager")}
    />
  );
}
