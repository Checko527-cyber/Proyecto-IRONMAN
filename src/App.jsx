import { useEffect, useState, useCallback, Fragment } from "react";
import { supabase, configOk } from "./supabaseClient.js";
import { MAPA_URL } from "./config.js";
import * as XLSX from "xlsx";
import {
  LayoutDashboard, FileText, Handshake, Wallet, Target, ListChecks, ShieldCheck, CheckSquare,
  Map as MapIcon, Search, X, AlertTriangle, MapPin, ChevronRight, ChevronDown, Circle, Compass,
  TrendingUp, CheckCircle2, Flag, LogOut, Save, Lock, RotateCcw, Upload, Download,
  Package, Users, Truck, Calendar, Plus, Building2, BookOpen, HelpCircle
} from "lucide-react";

/* ================= CARGA MASIVA (definiciones) ================= */
const CARGA_DEFS = {
  procesos: { label:"Contratos", req:"id",
    cols:["id","tipo","convenio_id","inter","zona","loc","responsable_usuario","ini","fin","estado","valor","comp","ejec","costo_m2","prioridad"],
    ej:["CTO-2026-060","Contrato","","Parcheo/Bacheo","Norte","Suba","nelson.hernandez","2026-03-01","2026-10-30","En ejecución",600000000,0,0,95000,"Media"] },
  convenios: { label:"Convenios", req:"id",
    cols:["id","nombre","contraparte","fin","aporte_contra","aporte_umv","n_contratos","estado","director_usuario"],
    ej:["CV-SUBA","Convenio Suba","FDL Suba","2027-02-28",900000000,150000000,6,"En ejecución","rocio.botero"] },
  pendientes: { label:"Pendientes", req:"titulo",
    cols:["tipo","titulo","rad","responsable_usuario","limite","imp","gerencial"],
    ej:["Tarea","Consolidar informe mensual","—","sandra.rodriguez","2026-08-05","Alta","si"] },
  cumplimiento_personal: { label:"Apoyos/Residentes", req:"nombre",
    cols:["nombre","rol","frente","sigma","hv_segmentos","informe_diario","corte","obs"],
    ej:["Juan Pérez","apoyo","Suba","Sí","Parcial","Sí","2026-07-11",""] },
  inv_catalogo: { label:"Catálogo de materiales", req:"codigo",
    cols:["codigo","descripcion","categoria","unidad","stock_min"],
    ej:["MAT-005","Arena de río","Agregados","m3","50"] },
  asig_ue: { label:"Unidades Ejecutoras", req:"nombre",
    cols:["nombre","inspector","actividades","director_obra"],
    ej:["UEMRD-06","LEIDY ...","Fresado Estabilizado","WILSON RENE YEPES"] },
};

/* ================= MARCA ================= */
const C = { navy:"#12233F", bronze:"#B5843A", bronzeSoft:"#EBDBBE", paper:"#F4F6F9",
  ink:"#1B2A44", slate:"#5B6B85", line:"#DDE3EC", verde:"#2E8B57", amarillo:"#E5B93B",
  naranja:"#E08A2E", rojo:"#D2453B", negro:"#3A3A3A", morado:"#7C3AED" };
const impColor=(imp)=> imp==="Alta"?C.morado : imp==="Media"?C.naranja : imp==="Baja"?C.amarillo : C.slate;
const impBg=(imp)=> imp==="Alta"?"#F1EAFE" : imp==="Media"?"#FCEEDD" : imp==="Baja"?"#FBF3D6" : C.paper;
const F = { disp:"'Space Grotesk',system-ui,sans-serif", body:"'Inter',system-ui,sans-serif", mono:"'IBM Plex Mono',monospace" };
const SEM = { VERDE:C.verde, AMARILLO:C.amarillo, NARANJA:C.naranja, ROJO:C.rojo, NEGRO:C.negro };
const ACRO = "Alertas · Trazabilidad · Liquidaciones · Avance · Seguimiento";
const rolTxt = { super_admin:"Súper-administrador", admin_aprobador:"Administrador + Aprobador",
  admin:"Administrador", admin_con_aprobacion:"Administrador con aprobación",
  coordinador:"Coordinador", responsable:"Responsable" };

const cop = (n)=> "$ "+Math.round(Number(n)||0).toLocaleString("es-CO");
const num = (n)=> Math.round(Number(n)||0).toLocaleString("es-CO");
const dias = (f)=> f? Math.round((new Date(f)-new Date())/86400000) : null;
const sem = (f)=>{ const d=dias(f); if(d===null) return "VERDE"; return d<0?"NEGRO":d<15?"ROJO":d<30?"NARANJA":d<60?"AMARILLO":"VERDE"; };
const sevW = { NEGRO:5,ROJO:4,NARANJA:3,AMARILLO:2,VERDE:1 };
const scoreOf = (p)=> (p.prioridad==="Alta"?10:0)+sevW[sem(p.fin)]+(p.impacto||1);
const fecha = (t)=> t? new Date(t).toLocaleDateString("es-CO") : "";

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
*{box-sizing:border-box} body{margin:0;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
::selection{background:#B5843A33}
input:focus,select:focus,textarea:focus{outline:2px solid #B5843A66;outline-offset:1px}
button:focus-visible,.btn:focus-visible{outline:2px solid #B5843A;outline-offset:2px;border-radius:8px}
.btn{transition:filter .15s,background .15s,transform .12s,box-shadow .12s} .btn:hover{filter:brightness(1.03)} .btn:active{transform:scale(.98)}
.lift{transition:transform .14s,box-shadow .14s,border-color .14s} .lift:hover{transform:translateY(-2px);box-shadow:0 10px 26px -14px rgba(18,35,63,.35);border-color:#C9B48A}
.view-anim{animation:fadeup .28s ease}
@keyframes fadeup{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
table{font-variant-numeric:tabular-nums lining-nums}
tbody tr{transition:background .12s} tbody tr:hover{background:#F7F9FC}
thead th{letter-spacing:.4px}
.atlas-shell{display:flex;min-height:100vh}
.atlas-nav{width:236px;position:fixed;top:0;left:0;height:100vh;display:flex;flex-direction:column;z-index:20;background:#12233F;color:#fff}
.atlas-navlist{display:flex;flex-direction:column;padding:10px;gap:2px;overflow-y:auto}
.atlas-navitem{display:flex;align-items:center;gap:11px;padding:10px 12px;border:none;border-radius:0 8px 8px 0;font-family:'Inter';font-size:13.5px;cursor:pointer;text-align:left;background:transparent;transition:background .15s,color .15s}
.atlas-navitem:hover{background:rgba(255,255,255,.06)}
.atlas-main{margin-left:236px;flex:1;min-width:0}
@keyframes slidein{from{transform:translateX(30px);opacity:.4}to{transform:translateX(0);opacity:1}}
@media (max-width:860px){
 .atlas-shell{flex-direction:column}
 .atlas-nav{position:sticky;width:100%;height:auto}
 .atlas-navlist{flex-direction:row;overflow-x:auto;-webkit-overflow-scrolling:touch}
 .atlas-navitem{border-radius:8px;white-space:nowrap;flex-direction:column;gap:4px;font-size:10.5px;min-width:72px;text-align:center}
 .atlas-main{margin-left:0}
 .brandblock{display:none}
 .btn,button{min-height:40px}
 input,select,textarea{font-size:16px}
}
@media (prefers-reduced-motion: reduce){
 *,*::before,*::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important}
}
@media print{ .atlas-nav{display:none} .atlas-main{margin-left:0} }
::-webkit-scrollbar{height:8px;width:8px}::-webkit-scrollbar-thumb{background:#c7d0dd;border-radius:8px}::-webkit-scrollbar-thumb:hover{background:#a9b6c9}`;

/* ================= UI helpers ================= */
const Dot = ({s,size=10})=> <span style={{display:"inline-block",width:size,height:size,borderRadius:999,background:SEM[s]}}/>;
const Chip = ({children,bg,fg})=> <span style={{background:bg,color:fg,fontFamily:F.mono,fontSize:11,padding:"2px 8px",borderRadius:6,whiteSpace:"nowrap"}}>{children}</span>;
const Bar = ({pct,color})=> <div style={{height:7,background:"#EBEFF5",borderRadius:999,overflow:"hidden"}}><div style={{width:Math.min(100,pct)+"%",height:"100%",background:color,borderRadius:999}}/></div>;
const cardS = { background:"#fff",border:"1px solid "+C.line,borderRadius:14,padding:16,boxShadow:"0 1px 2px rgba(16,32,64,.04)" };
const CardTitle = ({children,style})=> <div style={{fontFamily:F.disp,fontWeight:600,fontSize:14,color:C.ink,...style}}>{children}</div>;
const pSub = { fontSize:12,color:C.slate,margin:"3px 0 6px" };
const th = { position:"sticky",top:0,background:"#F7F9FC",textAlign:"left",padding:"10px 12px",fontFamily:F.mono,fontSize:10.5,letterSpacing:.5,textTransform:"uppercase",color:C.slate,fontWeight:600 };
const td = { padding:"10px 12px",verticalAlign:"middle" };
const lab = { display:"block",fontSize:11,color:C.slate,fontFamily:F.mono,margin:"9px 0 3px" };
const inp = { width:"100%",boxSizing:"border-box",border:"1px solid "+C.line,borderRadius:9,padding:"9px 11px",fontFamily:F.body,fontSize:13.5,color:C.ink };
const ta  = { ...inp, resize:"vertical", minHeight:44 };
const Sel = ({v,set,opts})=><select value={v} onChange={e=>set(e.target.value)} style={{border:"1px solid "+C.line,borderRadius:8,padding:"7px 10px",fontSize:12.5,color:C.ink,background:"#fff",cursor:"pointer"}}>{opts.map(o=><option key={o}>{o}</option>)}</select>;

function SectionHead({eyebrow,title,note}){
  return <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16,flexWrap:"wrap",gap:8}}>
    <div><div style={{fontFamily:F.mono,fontSize:11,letterSpacing:2,textTransform:"uppercase",color:C.bronze}}>{eyebrow}</div>
    <h1 style={{fontFamily:F.disp,fontWeight:600,fontSize:24,color:C.ink,margin:"2px 0 0"}}>{title}</h1></div>
    {note && <span style={{fontFamily:F.mono,fontSize:11.5,color:C.slate}}>{note}</span>}</div>;
}
function Meridian({procs,onPick}){
  const pos=(d)=>{const c=Math.max(-15,Math.min(120,d));return ((c+15)/135)*100;};
  return <div style={{position:"relative",padding:"26px 4px 30px"}}>
    <div style={{position:"relative",height:8,borderRadius:999,overflow:"hidden",display:"flex"}}>
      {[["#3A3A3A",15],[C.rojo,15],[C.naranja,15],[C.amarillo,30],[C.verde,60]].map(([c,w],i)=>
        <div key={i} style={{background:c,width:(w/135*100)+"%",opacity:.85}}/>)}
    </div>
    {[["Vencido",0],["15d",15],["30d",30],["60d",60]].map(([l,d],i)=>
      <div key={i} style={{position:"absolute",top:34,left:pos(d)+"%",transform:"translateX(-50%)",fontFamily:F.mono,fontSize:10,color:C.slate}}>{l}</div>)}
    {procs.map((p)=>{const d=dias(p.fin);if(d===null)return null;const s=sem(p.fin);
      return <button key={p.id} onClick={()=>onPick(p)} title={p.id+" · "+d+"d"}
        style={{position:"absolute",top:6,left:pos(d)+"%",transform:"translateX(-50%)",width:15,height:15,borderRadius:999,background:SEM[s],border:"2px solid #fff",boxShadow:"0 1px 4px rgba(0,0,0,.25)",cursor:"pointer",padding:0}}/>;})}
  </div>;
}

/* ================= LOGIN ================= */
function Login(){
  const [usuario,setUsuario]=useState(""); const [pass,setPass]=useState("");
  const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);
  async function entrar(e){ e.preventDefault(); setErr(""); setBusy(true);
    try{
      const {data:correo,error:e1}=await supabase.rpc("correo_de_usuario",{p_usuario:usuario.trim()});
      if(e1||!correo){ setErr("Usuario no encontrado o inactivo."); setBusy(false); return; }
      const {error:e2}=await supabase.auth.signInWithPassword({email:correo,password:pass});
      if(e2) setErr("Contraseña incorrecta.");
    }catch{ setErr("No pudimos conectar. Revisa la configuración."); }
    setBusy(false);
  }
  return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:C.navy,fontFamily:F.body,padding:20}}>
    <div style={{width:"min(400px,100%)"}}>
      <div style={{textAlign:"center",marginBottom:22}}>
        <div style={{width:54,height:54,borderRadius:12,background:C.bronze,display:"grid",placeItems:"center",margin:"0 auto 12px"}}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/></svg></div>
        <div style={{fontFamily:F.disp,fontWeight:700,fontSize:30,color:"#fff",letterSpacing:1}}>ATLAS</div>
        <div style={{fontFamily:F.mono,fontSize:9,color:"#8FA1BE",letterSpacing:.5,marginTop:2}}>{ACRO}</div>
      </div>
      <form onSubmit={entrar} style={{background:"#fff",borderRadius:16,padding:24}}>
        <div style={{fontFamily:F.disp,fontWeight:600,fontSize:17,color:C.ink,marginBottom:6}}>Iniciar sesión</div>
        <label style={lab}>Usuario</label>
        <input value={usuario} onChange={e=>setUsuario(e.target.value)} type="text" required placeholder="sergio.rairan" autoCapitalize="none" autoCorrect="off" style={inp}/>
        <label style={lab}>Contraseña</label>
        <input value={pass} onChange={e=>setPass(e.target.value)} type="password" required style={inp}/>
        {err && <div style={{background:C.rojo+"18",color:C.rojo,fontSize:12.5,padding:"8px 10px",borderRadius:8,marginTop:10}}>{err}</div>}
        <button className="btn" disabled={busy} type="submit" style={{width:"100%",marginTop:16,background:C.navy,color:"#fff",border:"none",borderRadius:10,padding:12,fontFamily:F.body,fontWeight:600,fontSize:14,cursor:"pointer"}}>{busy?"Entrando…":"Entrar"}</button>
      </form>
      <div style={{textAlign:"center",fontFamily:F.mono,fontSize:10.5,color:"#8FA1BE",marginTop:14}}>Acceso solo para usuarios autorizados</div>
    </div></div>;
}

/* ================= PANEL ================= */
function Panel({procs,pends,aprob,invCat,invMov,cumplPers,bitacora,nombreDe,onPick,setView}){
  const [actRep,setActRep]=useState(false);
  const rojos=procs.filter(p=>["ROJO","NEGRO"].includes(sem(p.fin)));
  const liqVenc=procs.filter(p=>p.liq==="Vencida").length;
  const sorpresas=procs.filter(p=>p.sorpresa).length;
  const valor=procs.reduce((a,p)=>a+Number(p.valor||0),0);
  const ejec=procs.reduce((a,p)=>a+Number(p.ejec||0),0);
  const dist=["NEGRO","ROJO","NARANJA","AMARILLO","VERDE"].map(s=>({s,n:procs.filter(p=>sem(p.fin)===s).length}));
  const topPend=[...pends].filter(p=>p.estado!=="Terminado").sort((a,b)=>((a.imp==="Alta"?-1:1)-(b.imp==="Alta"?-1:1))||(new Date(a.limite)-new Date(b.limite))).slice(0,5);
  const pctSigma=procs.length?Math.round(procs.filter(p=>p.sigma==="Sí").length/procs.length*100):0;
  const existTot=(codigo)=>{let e=0;(invMov||[]).forEach(m=>{if(m.material_codigo!==codigo)return;if(m.destino_id)e+=Number(m.cantidad||0);if(m.origen_id)e-=Number(m.cantidad||0);});return e;};
  const stockBajo=(invCat||[]).filter(c=>Number(c.stock_min||0)>0 && existTot(c.codigo)<Number(c.stock_min)).length;
  const cpTot=(cumplPers||[]).length;
  const cpAlDia=cpTot?Math.round((cumplPers||[]).filter(d=>d.sigma==="Sí"&&d.hv_segmentos==="Sí"&&d.informe_diario==="Sí").length/cpTot*100):0;
  const kpis=[
    {l:"Procesos",v:procs.length,sub:"en la gerencia",ic:FileText,c:C.bronze,go:"contratos"},
    {l:"En rojo / vencidos",v:rojos.length,sub:"requieren acción",ic:AlertTriangle,c:C.rojo,go:"contratos"},
    {l:"Liquidaciones vencidas",v:liqVenc,sub:"riesgo heredado",ic:ShieldCheck,c:C.negro,go:"liquidaciones"},
    {l:"Cumplimiento SIGMA",v:pctSigma+"%",sub:"documental al día",ic:CheckSquare,c:C.navy,go:"aprobaciones"},
    {l:"Ejecución global",v:(valor?Math.round(ejec/valor*100):0)+"%",sub:cop(ejec),ic:TrendingUp,c:C.verde,go:"financiero"},
    {l:"Stock bajo",v:stockBajo,sub:"materiales bajo mínimo",ic:AlertTriangle,c:stockBajo>0?C.naranja:C.verde,go:"inventario"},
    {l:"Apoyos/residentes al día",v:cpAlDia+"%",sub:cpTot+" en control",ic:CheckSquare,c:C.bronze,go:"aprobaciones"},
  ];
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}>
      <SectionHead eyebrow="Panel gerencial" title="Estado de la gerencia" note="datos en vivo"/>
      <button className="btn" onClick={()=>setActRep(true)} style={{background:"#fff",border:"1px solid "+C.line,color:C.slate,borderRadius:9,padding:"8px 14px",fontSize:12.5,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:7}}><RotateCcw size={15}/> Reporte de actividad</button>
    </div>
    {actRep&&<div onClick={()=>setActRep(false)} style={{position:"fixed",inset:0,background:"rgba(12,26,49,.55)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,maxWidth:640,width:"100%",maxHeight:"80vh",overflow:"auto",padding:20,boxShadow:"0 24px 60px -20px rgba(0,0,0,.5)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontFamily:F.disp,fontWeight:700,fontSize:16,color:C.ink}}>Actividad del tablero</div>
          <button className="btn" aria-label="Cerrar" onClick={()=>setActRep(false)} style={{background:"none",border:"none",cursor:"pointer"}}><X size={18} color={C.slate}/></button>
        </div>
        <div style={{fontSize:11.5,color:C.slate,marginBottom:10}}>Últimos {Math.min((bitacora||[]).length,80)} movimientos registrados.</div>
        {(bitacora||[]).slice(0,80).map((b,i)=><div key={i} style={{borderTop:"1px solid "+C.line,padding:"8px 2px",display:"flex",gap:10}}>
          <div style={{fontFamily:F.mono,fontSize:10.5,color:C.slate,minWidth:96}}>{b.creado_en?new Date(b.creado_en).toLocaleString("es-CO"):""}</div>
          <div style={{flex:1,minWidth:0}}><span style={{fontSize:12.5,color:C.ink}}>{b.accion}</span> <span style={{fontSize:11.5,color:C.slate}}>{b.detalle}</span><div style={{fontFamily:F.mono,fontSize:10,color:C.slate}}>{nombreDe?nombreDe(b.actor):""}</div></div>
        </div>)}
        {(!bitacora||!bitacora.length)&&<div style={{fontSize:12.5,color:C.slate,padding:"10px 0"}}>Sin actividad registrada aún.</div>}
      </div>
    </div>}
    <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:4}}>
      {kpis.map((k,i)=><div key={i} onClick={()=>k.go&&setView(k.go)} className="btn lift" style={{...cardS,cursor:k.go?"pointer":"default",flex:"1 0 0",minWidth:138}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <span style={{color:C.slate,fontSize:12}}>{k.l}</span><k.ic size={18} color={k.c}/></div>
        <div style={{fontFamily:F.disp,fontSize:32,fontWeight:600,color:C.ink,marginTop:6}}>{k.v}</div>
        <div style={{fontFamily:F.mono,fontSize:11,color:C.slate}}>{k.sub}</div></div>)}
    </div>
    <div style={{...cardS,marginTop:14,borderLeft:"4px solid "+C.bronze,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
      <Flag size={22} color={C.bronze}/>
      <div style={{flex:1,minWidth:220}}>
        <div style={{fontFamily:F.disp,fontWeight:600,color:C.ink}}>{sorpresas} sorpresa{sorpresas!==1?"s":""} este corte</div>
        <div style={{fontSize:12.5,color:C.slate}}>Rojos que aparecieron sin pasar por amarillo/naranja. Si tiende a cero, el equipo reporta a tiempo y sin miedo.</div></div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:14,marginTop:14}}>
      <div style={cardS}>
        <CardTitle>Semáforo de procesos</CardTitle>
        <p style={pSub}>Contratos y convenios por cercanía a su vencimiento.</p>
        <div style={{marginTop:6}}>
          {dist.map(d=>{const tot=dist.reduce((a,x)=>a+x.n,0)||1; const p=Math.round(d.n/tot*100);
            return <div key={d.s} style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}>
              <div style={{display:"flex",alignItems:"center",gap:6,width:96}}><Dot s={d.s}/><span style={{fontSize:11.5,color:C.slate,textTransform:"capitalize"}}>{d.s.toLowerCase()}</span></div>
              <div style={{flex:1,height:16,background:"#EEF1F6",borderRadius:8,overflow:"hidden"}}><div style={{width:p+"%",height:"100%",background:SEM[d.s],borderRadius:8,transition:"width .4s"}}/></div>
              <span style={{fontFamily:F.mono,fontSize:13,fontWeight:700,color:C.ink,width:28,textAlign:"right"}}>{d.n}</span>
            </div>;})}
        </div>
      </div>
      <div style={cardS}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <CardTitle>Pendientes por importancia</CardTitle>
          <button onClick={()=>setView("pendientes")} style={{display:"inline-flex",alignItems:"center",gap:2,background:"none",border:"none",color:C.bronze,fontSize:12.5,cursor:"pointer"}}>Ver todos <ChevronRight size={14}/></button></div>
        {topPend.map(p=>{const d=dias(p.limite);return <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,padding:"8px 0",borderTop:"1px solid "+C.line}}>
          <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}><Circle size={9} fill={impColor(p.imp)} color={impColor(p.imp)}/>
            <span style={{fontSize:13,color:C.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.titulo}</span></div>
          <div style={{display:"flex",alignItems:"center",gap:8}}><Chip bg="#EEF1F6" fg={C.slate}>{p.tipo}</Chip><span style={{fontFamily:F.mono,fontSize:11,color:d<3?C.rojo:C.slate}}>{d}d</span></div></div>;})}
        {topPend.length===0 && <div style={{fontSize:12.5,color:C.slate,paddingTop:8}}>Sin pendientes abiertos.</div>}
      </div>
    </div>
    <div style={{marginTop:18}}><Alertas procs={procs} pends={pends} aprob={aprob} onPick={onPick}/></div>
  </div>;
}

/* ================= CONTRATOS (registro) ================= */
function Contratos({procs,onPick,nombreDe,isAdmin,isSuper,onCrear,onBorrar,profiles,convenios,onCarga,usuarioDe,toast}){
  const [q,setQ]=useState(""); const [zona,setZona]=useState("Todas"); const [est,setEst]=useState("Todos");
  const [nuevo,setNuevo]=useState(false); const [f,setF]=useState({tipo:"Contrato",estado:"En ejecución",zona:"Norte"});
  const S=(k)=>(e)=>setF({...f,[k]:e.target.value});
  const base=procs.filter(p=>p.tipo!=="Convenio" && !["En liquidación","Liquidado","Cierre expediente"].includes(p.estado) && p.liq!=="Liquidada");
  const rows=base.filter(p=>(zona==="Todas"||p.zona===zona)&&(est==="Todos"||p.estado===est)&&
    (q===""||((p.id||"")+(p.inter||"")+(p.loc||"")+(p.tipo||"")).toLowerCase().includes(q.toLowerCase()))).sort((a,b)=>scoreOf(b)-scoreOf(a));
  function crear(){
    if(!f.id){return;}
    onCrear("procesos",{id:f.id.trim(),tipo:f.tipo,convenio_id:f.convenio_id||null,inter:f.inter||"",zona:f.zona,
      loc:f.loc||"",responsable_id:f.responsable_id||null,ini:f.ini||null,fin:f.fin||null,estado:f.estado,
      valor:Number(f.valor)||0,aporte_umv:Number(f.valor)||0,comp:0,ejec:0,costo_m2:Number(f.costo_m2)||0,prioridad:"Media"});
    setNuevo(false); setF({tipo:"Contrato",estado:"En ejecución",zona:"Norte"});
  }
  return <div>
    <SectionHead eyebrow="Módulo 1" title="Contratos" note={rows.length+" de "+base.length}/>
    {isAdmin && <div style={{marginBottom:12}}>
      <button className="btn" onClick={()=>setNuevo(!nuevo)} style={{background:nuevo?"#EEF1F6":C.navy,color:nuevo?C.ink:"#fff",border:"none",borderRadius:9,padding:"9px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>{nuevo?"Cancelar":"+ Nuevo contrato"}</button>
      {nuevo && <div style={{...cardS,marginTop:10}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:10}}>
          <div><label style={lab}>N° contrato*</label><input value={f.id||""} onChange={S("id")} placeholder="CTO-2026-060" style={inp}/></div>
          <div><label style={lab}>Tipo</label><select value={f.tipo} onChange={S("tipo")} style={inp}>{["Contrato","Prestación de Servicios","Misionalidad"].map(o=><option key={o}>{o}</option>)}</select></div>
          <div><label style={lab}>Convenio (si aplica)</label><select value={f.convenio_id||""} onChange={S("convenio_id")} style={inp}><option value="">—</option>{convenios.map(c=><option key={c.id} value={c.id}>{c.id}</option>)}</select></div>
          <div><label style={lab}>Intervención</label><input value={f.inter||""} onChange={S("inter")} placeholder="Parcheo/Bacheo" style={inp}/></div>
          <div><label style={lab}>Zona</label><select value={f.zona} onChange={S("zona")} style={inp}>{["Norte","Oriente","Occidente","Sur","Convenios","Especiales","Transversal"].map(o=><option key={o}>{o}</option>)}</select></div>
          <div><label style={lab}>Localidad</label><input value={f.loc||""} onChange={S("loc")} style={inp}/></div>
          <div><label style={lab}>Responsable</label><select value={f.responsable_id||""} onChange={S("responsable_id")} style={inp}><option value="">—</option>{profiles.map(u=><option key={u.id} value={u.id}>{u.nombre||u.usuario}</option>)}</select></div>
          <div><label style={lab}>Inicio</label><input type="date" value={f.ini||""} onChange={S("ini")} style={inp}/></div>
          <div><label style={lab}>Terminación</label><input type="date" value={f.fin||""} onChange={S("fin")} style={inp}/></div>
          <div><label style={lab}>Estado</label><select value={f.estado} onChange={S("estado")} style={inp}>{EST_PROC.map(o=><option key={o}>{o}</option>)}</select></div>
          <div><label style={lab}>Valor</label><input type="number" value={f.valor||""} onChange={S("valor")} style={inp}/></div>
          <div><label style={lab}>Costo $/m²</label><input type="number" value={f.costo_m2||""} onChange={S("costo_m2")} style={inp}/></div>
        </div>
        <button className="btn" onClick={crear} style={{marginTop:12,background:C.verde,color:"#fff",border:"none",borderRadius:9,padding:"9px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Crear contrato</button>
      </div>}
    </div>}
    <div style={{...cardS,padding:12}}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,background:C.paper,border:"1px solid "+C.line,borderRadius:8,padding:"6px 10px",flex:1,minWidth:170}}>
          <Search size={15} color={C.slate}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar (nº, tipo, localidad, CPS…)" style={{border:"none",outline:"none",background:"transparent",fontSize:13,width:"100%",color:C.ink}}/></div>
        <Sel v={zona} set={setZona} opts={["Todas","Norte","Oriente","Occidente","Sur","Convenios","Especiales","Transversal"]}/>
        <Sel v={est} set={setEst} opts={["Todos","En ejecución","Suspendido","Terminado","Cierre expediente","Finalizado Cierre Contractual","En liquidación","Liquidado","Futuro"]}/></div>
    </div>
    <div style={{...cardS,padding:0,marginTop:12,overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:760}}>
        <thead><tr>{["","Proceso","Tipo","Intervención","Zona · Localidad","Responsable","Vence","Estado"].map((h,i)=><th key={i} style={th}>{h}</th>)}</tr></thead>
        <tbody>{rows.map(p=>{const ss=sem(p.fin),d=dias(p.fin);
          return <tr key={p.id} onClick={()=>onPick(p)} style={{cursor:"pointer",borderTop:"1px solid "+C.line}}
            onMouseEnter={e=>e.currentTarget.style.background="#F7F9FC"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <td style={{...td,width:26}}>{p.estado==="Futuro"?<Circle size={10} color={C.slate}/>:<Dot s={ss}/>}</td>
            <td style={td}><div style={{fontFamily:F.mono,fontSize:12.5,color:C.ink,fontWeight:600}}>{p.id}</div>
              {p.sorpresa&&<span style={{fontSize:10,color:C.bronze,fontFamily:F.mono}}>⚑ sorpresa</span>}
              {p.heredado&&<span style={{fontSize:10,color:C.slate,fontFamily:F.mono}}> heredado</span>}</td>
            <td style={{...td,fontSize:11.5,color:C.slate}}>{p.tipo}</td>
            <td style={{...td,fontSize:12.5,color:C.ink}}>{p.inter}</td>
            <td style={td}><div style={{fontSize:12.5,color:C.ink}}>{p.zona}</div><div style={{fontSize:11.5,color:C.slate}}>{p.loc}</div></td>
            <td style={{...td,fontSize:12.5,color:C.ink}}>{nombreDe(p.responsable_id)||"—"}</td>
            <td style={td}>{p.estado==="Futuro"?<Chip bg="#EEF1F6" fg={C.slate}>futuro</Chip>:(d===null?"—":<Chip bg={SEM[ss]+"22"} fg={SEM[ss]}>{d<0?"vencido":d+"d"}</Chip>)}</td>
            <td style={{...td,fontSize:11.5,color:C.slate}}>{p.estado}</td>
            <td style={{...td,width:24}}>{isSuper&&<span onClick={(e)=>{e.stopPropagation();if(confirm("¿Eliminar "+p.id+"?"))onBorrar("procesos",p.id);}} title="Eliminar" style={{cursor:"pointer"}}><X size={14} color={C.rojo}/></span>}</td></tr>;})}</tbody>
      </table>
    </div>
    {isAdmin&&<CargaBloque tipo="procesos" filas={base} onCarga={onCarga} usuarioDe={usuarioDe} toast={toast}/>}
    {(()=>{ const cierre=procs.filter(p=>p.estado==="Cierre expediente"); if(!cierre.length) return null;
      return <div style={{...cardS,marginTop:16,borderTop:"3px solid "+C.naranja}}>
        <CardTitle>CPS en cierre de expediente <span style={{color:C.slate,fontFamily:F.mono,fontSize:11}}>· alerta activa hasta "Finalizado Cierre Contractual"</span></CardTitle>
        <p style={pSub}>Estos CPS terminaron y están en cierre de expediente. Generan alerta y también aparecen en Liquidaciones. Cuando su cierre termine, cámbialos a "Finalizado Cierre Contractual".</p>
        <div style={{overflowX:"auto",marginTop:8}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:520}}>
          <thead><tr>{["Proceso","Interventoría/Objeto","Responsable","Fin"].map((h,i)=><th key={i} style={th}>{h}</th>)}</tr></thead>
          <tbody>{cierre.map(p=><tr key={p.id} style={{borderTop:"1px solid "+C.line}} onClick={()=>onPick(p)}>
            <td style={{...td,fontFamily:F.mono,fontSize:12,fontWeight:600,cursor:"pointer"}}>{p.id}</td>
            <td style={{...td,fontSize:12}}>{p.inter||p.loc||"—"}</td>
            <td style={{...td,fontSize:12,color:C.slate}}>{nombreDe(p.responsable_id)}</td>
            <td style={td}>{p.fin?<Chip bg={SEM[sem(p.fin)]+"22"} fg={SEM[sem(p.fin)]}>{fecha(p.fin)}</Chip>:"—"}</td>
          </tr>)}</tbody>
        </table></div>
      </div>;
    })()}
  </div>;
}

/* ================= CONVENIOS ================= */
function Convenios({procs,convenios,crp,contratosCtr,onPick,canEditFin,onCelda,onEstadoConv,isAdmin,isSuper,onCrear,onBorrar,profiles,nombreDe,onCarga,usuarioDe,toast}){
  const crpDeConv=(cid)=> (crp||[]).filter(x=>x.convenio_id===cid);
  const compromConv=(cid)=> crpDeConv(cid).reduce((a,x)=>a+Number(x.valor||0),0);
  const nomCtr=(id)=> (contratosCtr||[]).find(c=>c.id===id)?.nombre || "contrato "+id;
  const [open,setOpen]=useState(convenios[0]?.id||null);
  const [nuevo,setNuevo]=useState(false); const [f,setF]=useState({estado:"En ejecución"});
  const S=(k)=>(e)=>setF({...f,[k]:e.target.value});
  const COLS=[
    ["VALOR",(p)=>Number(p.valor||0),null,cop],
    ["COMPROMETIDO EN CRP",(p)=>Number(p.comp||0),"comp",cop],
    ["EJECUTADO",(p)=>Number(p.ejec||0),"ejec",cop],
    ["ADICIONES",(p)=>Number(p.adiciones||0),"adiciones",cop],
    ["DÉFICIT",(p)=>Number(p.deficit||0),"deficit",cop],
    ["M3 A EJECUTAR",(p)=>Number(p.m3_ejecutar||0),"m3_ejecutar",num],
    ["M2 A EJECUTAR (PARCHEO) - CC",(p)=>Number(p.m2_parcheo||0),"m2_parcheo",num],
  ];
  const RESUMEN=[
    ["DISPONIBLE SIN COMPROMETER",(p)=>Number(p.valor||0)-Number(p.comp||0),cop],
    ["COMPROMETIDO EN CRP",(p)=>Number(p.comp||0),cop],
    ["DISPONIBLE EN CRP (SIN EJECUTAR)",(p)=>Number(p.comp||0)-Number(p.ejec||0),cop],
    ["ADICIONES",(p)=>Number(p.adiciones||0),cop],
    ["DÉFICIT",(p)=>Number(p.deficit||0),cop],
    ["M3 A EJECUTAR",(p)=>Number(p.m3_ejecutar||0),num],
    ["M2 A EJECUTAR (PARCHEO) - CC",(p)=>Number(p.m2_parcheo||0),num],
  ];
  function crear(){
    if(!f.id||!f.nombre){return;}
    onCrear("convenios",{id:f.id.trim(),nombre:f.nombre,contraparte:f.contraparte||"",ini:f.ini||null,fin:f.fin||null,
      aporte_contra:Number(f.aporte_contra)||0,aporte_umv:Number(f.aporte_umv)||0,
      n_contratos:Number(f.n_contratos)||0,estado:f.estado,director_id:f.director_id||null});
    setNuevo(false); setF({estado:"En ejecución"});
  }
  const ESTADOS=["En ejecución","En liquidación","Suspendido","Terminado","Liquidado"];
  return <div>
    <SectionHead eyebrow="Módulo 2" title="Convenios" note={convenios.length+" convenios"}/>
    {isAdmin && <div style={{marginBottom:12}}>
      <button className="btn" onClick={()=>setNuevo(!nuevo)} style={{background:nuevo?"#EEF1F6":C.navy,color:nuevo?C.ink:"#fff",border:"none",borderRadius:9,padding:"9px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>{nuevo?"Cancelar":"+ Nuevo convenio"}</button>
      {nuevo && <div style={{...cardS,marginTop:10}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
          <div><label style={lab}>Id (ej. CV-SUBA)*</label><input value={f.id||""} onChange={S("id")} style={inp}/></div>
          <div><label style={lab}>Nombre*</label><input value={f.nombre||""} onChange={S("nombre")} style={inp}/></div>
          <div><label style={lab}>Contraparte</label><input value={f.contraparte||""} onChange={S("contraparte")} style={inp}/></div>
          <div><label style={lab}>Fecha de inicio</label><input type="date" value={f.ini||""} onChange={S("ini")} style={inp}/></div>
          <div><label style={lab}>Fecha de terminación</label><input type="date" value={f.fin||""} onChange={S("fin")} style={inp}/></div>
          <div><label style={lab}>Aporte contraparte</label><input type="number" value={f.aporte_contra||""} onChange={S("aporte_contra")} style={inp}/></div>
          <div><label style={lab}>Aporte UMV</label><input type="number" value={f.aporte_umv||""} onChange={S("aporte_umv")} style={inp}/></div>
          <div><label style={lab}>N° contratos</label><input type="number" value={f.n_contratos||""} onChange={S("n_contratos")} style={inp}/></div>
          <div><label style={lab}>Director</label><select value={f.director_id||""} onChange={S("director_id")} style={inp}><option value="">—</option>{profiles.map(u=><option key={u.id} value={u.id}>{u.nombre||u.usuario}</option>)}</select></div>
        </div>
        <button className="btn" onClick={crear} style={{marginTop:12,background:C.verde,color:"#fff",border:"none",borderRadius:9,padding:"9px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Crear convenio</button>
      </div>}
    </div>}
    {convenios.filter(c=>c.estado!=="En liquidación").map(cv=>{const hijos=procs.filter(p=>p.convenio_id===cv.id);const isOpen=open===cv.id;const ed=canEditFin(cv.id);
      return <div key={cv.id} style={{...cardS,padding:0,marginBottom:12,overflow:"hidden"}}>
        <button onClick={()=>setOpen(isOpen?null:cv.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"14px 16px",background:"#fff",border:"none",cursor:"pointer",textAlign:"left"}}>
          {isOpen?<ChevronDown size={16} color={C.slate}/>:<ChevronRight size={16} color={C.slate}/>}
          <div style={{flex:1}}><div style={{fontFamily:F.disp,fontWeight:600,color:C.ink,fontSize:15}}>{cv.nombre}{ed&&<span style={{color:C.bronze,fontSize:11,fontFamily:F.mono}}> ✎ editable</span>}</div>
            <div style={{fontFamily:F.mono,fontSize:11,color:C.slate}}>{cv.contraparte} · {hijos.length}/{cv.n_contratos} contratos · {cv.ini?("inicia "+fecha(cv.ini)+" · "):""}termina {fecha(cv.fin)} · director: {nombreDe(cv.director_id)||"sin asignar"}</div></div>
          {isAdmin&&<select value={cv.estado||"En ejecución"} onClick={e=>e.stopPropagation()} onChange={e=>{e.stopPropagation();onEstadoConv(cv.id,e.target.value);}} title="Cambiar estado del convenio" style={{border:"1px solid "+C.line,borderRadius:8,padding:"5px 8px",fontSize:11.5,color:cv.estado==="En liquidación"?C.naranja:C.ink,background:"#fff",cursor:"pointer",fontWeight:600}}>{ESTADOS.map(s=><option key={s} value={s}>{s}</option>)}</select>}
          {!isAdmin&&<Chip bg={C.paper} fg={cv.estado==="En liquidación"?C.naranja:C.slate}>{cv.estado}</Chip>}
          <div style={{textAlign:"right"}}><div style={{fontFamily:F.mono,fontSize:13,color:C.ink}}>{cop((cv.aporte_contra||0)+(cv.aporte_umv||0))}</div>
            <div style={{fontFamily:F.mono,fontSize:10.5,color:C.slate}}>contra {cop(cv.aporte_contra)} + UMV {cop(cv.aporte_umv)}</div>
            {(()=>{const comp=compromConv(cv.id);const disp=(cv.aporte_contra||0)+(cv.aporte_umv||0)-comp; return <div style={{fontFamily:F.mono,fontSize:10.5,color:disp<0?C.rojo:C.verde,marginTop:2}}>CRP: {cop(comp)} · disp: {cop(disp)}</div>;})()}</div>
          {isSuper&&<span onClick={(e)=>{e.stopPropagation();if(confirm("¿Eliminar el convenio "+cv.id+"?"))onBorrar("convenios",cv.id);}} title="Eliminar" style={{padding:6,cursor:"pointer"}}><X size={15} color={C.rojo}/></span>}
        </button>
        {isOpen&&(hijos.length? <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:980}}>
            <thead><tr>
              <th style={{...th,position:"static",minWidth:150}}>{cv.nombre.toUpperCase()}</th>
              {COLS.map(c=><th key={c[0]} style={{...th,position:"static",textAlign:"right"}}>{c[0]}</th>)}
            </tr></thead>
            <tbody>
              {hijos.map(p=><tr key={p.id} style={{borderTop:"1px solid "+C.line}}>
                <td style={td}><span onClick={()=>onPick(p)} style={{fontFamily:F.mono,fontSize:12,color:C.ink,fontWeight:600,cursor:"pointer",borderBottom:"1px dotted "+C.slate}} title="Abrir contrato">{p.id}</span></td>
                {COLS.map(c=><td key={c[0]} style={{...td,textAlign:"right"}}>
                  {c[2]&&ed
                    ? <FinCell value={p[c[2]]||0} editable={true} onSave={(v)=>onCelda(p.id,c[2],v)} fmt={c[3]}/>
                    : <span style={{fontFamily:F.mono,fontSize:11.5,color:c[2]?C.ink:C.slate}}>{c[3](c[1](p))}</span>}
                </td>)}
              </tr>)}
              {RESUMEN.map((r,i)=><tr key={"res-"+r[0]} style={{borderTop:i===0?"2px solid "+C.bronze:"1px solid "+C.line,background:"#FBF6EA"}}>
                <td colSpan={COLS.length} style={{...td,fontFamily:F.mono,fontSize:11.5,fontWeight:700,color:"#7a5a1e"}}>{r[0]}</td>
                <td style={{...td,textAlign:"right"}}><span style={{fontFamily:F.mono,fontSize:12,fontWeight:700,color:"#7a5a1e"}}>{r[2](hijos.reduce((a,p)=>a+r[1](p),0))}</span></td>
              </tr>)}
            </tbody>
          </table>
          <div style={{padding:"8px 16px",fontSize:11,color:C.slate}}>Contratos en filas: toca el número para abrirlo; celdas con línea punteada se editan con clic (director del convenio / coordinadora / admins). Las filas doradas de abajo son el resumen del convenio.</div>
        </div>
        : <div style={{fontSize:12.5,color:C.slate,padding:"9px 16px 14px"}}>Este convenio declara {cv.n_contratos} contratos; crea los contratos en la sección Contratos vinculándolos a {cv.id}.</div>)}
        {isOpen&&(()=>{const lista=crpDeConv(cv.id); const comp=compromConv(cv.id); const total=(cv.aporte_contra||0)+(cv.aporte_umv||0);
          return <div style={{borderTop:"2px solid "+C.bronzeSoft,padding:"12px 16px",background:"#FCFAF5"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <div style={{fontFamily:F.disp,fontWeight:600,fontSize:13,color:C.ink}}>CRP asociados a este convenio</div>
              <div style={{display:"flex",gap:14,fontFamily:F.mono,fontSize:11.5}}>
                <span style={{color:C.slate}}>Aporte total: <b style={{color:C.ink}}>{cop(total)}</b></span>
                <span style={{color:C.slate}}>Comprometido (CRP): <b style={{color:C.navy}}>{cop(comp)}</b></span>
                <span style={{color:C.slate}}>Disponible: <b style={{color:total-comp<0?C.rojo:C.verde}}>{cop(total-comp)}</b></span>
              </div>
            </div>
            {lista.length? <div style={{overflowX:"auto",marginTop:8}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:520}}>
              <thead><tr>{["Contrato","CRP","Rubro","Valor"].map((h,i)=><th key={i} style={{...th,position:"static",textAlign:i===3?"right":"left"}}>{h}</th>)}</tr></thead>
              <tbody>{lista.map(x=><tr key={x.id} style={{borderTop:"1px solid "+C.line}}>
                <td style={{...td,fontSize:11.5}}>{nomCtr(x.contrato_id)}</td>
                <td style={{...td,fontFamily:F.mono,fontSize:11}}>{x.crp||"—"}</td>
                <td style={{...td,fontSize:11.5}}>{x.rubro||"—"}</td>
                <td style={{...td,textAlign:"right",fontFamily:F.mono,fontSize:11.5}}>{cop(x.valor)}</td>
              </tr>)}</tbody>
            </table></div> : <div style={{fontSize:11.5,color:C.slate,marginTop:6}}>Sin CRP registrados para este convenio. Regístralos en Control CRP (marcando origen "Convenio" y este convenio) o en el contrato asociado.</div>}
          </div>;
        })()}
      </div>;})}
    {convenios.length===0&&<div style={cardS}><span style={{fontSize:13,color:C.slate}}>No hay convenios visibles para tu perfil.</span></div>}
    {isAdmin&&<CargaBloque tipo="convenios" filas={convenios} onCarga={onCarga} usuarioDe={usuarioDe} toast={toast}/>}
  </div>;
}

/* ================= FINANCIERO ================= */
function FinCell({value,editable,onSave,fmt}){
  const [ed,setEd]=useState(false); const [v,setV]=useState(value);
  useEffect(()=>setV(value),[value]);
  if(!editable) return <span style={{fontFamily:F.mono,fontSize:11.5,color:C.ink}}>{fmt(value)}</span>;
  return ed
    ? <input autoFocus type="number" value={v} onChange={e=>setV(e.target.value)}
        onBlur={()=>{setEd(false); if(Number(v)!==Number(value)) onSave(Number(v)||0);}}
        onKeyDown={e=>{if(e.key==="Enter") e.target.blur();}}
        style={{width:120,fontFamily:F.mono,fontSize:11.5,border:"1px solid "+C.bronze,borderRadius:6,padding:"2px 5px",textAlign:"right"}}/>
    : <span onClick={()=>setEd(true)} title="Clic para editar" style={{fontFamily:F.mono,fontSize:11.5,color:C.ink,cursor:"pointer",borderBottom:"1px dashed "+C.bronze}}>{fmt(value)}</span>;
}
function Financiero({finanzas,finDet,canEditFin,onSaveFin,onSaveFinDet}){
  const [sec,setSec]=useState("consolidado");
  const [modo,setModo]=useState("resumen");
  const puedeDet=canEditFin(null);
  const rows=finanzas.filter(f=>f.seccion===sec);
  const conv=rows.filter(f=>f.ambito==="convenio").sort((a,b)=>(a.etiqueta||"").localeCompare(b.etiqueta||""));
  const mis=rows.filter(f=>f.ambito==="misional");
  const cols = sec==="consolidado"
    ? [["proyectado","Proyectado"],["comprometido","Comprometido"],["ejecutado","Ejecutado"],["girado","Girado"],["adiciones","Adiciones"],["saldo","Saldo x ejec."],["umv","Aporte UMV"]]
    : [["proyectado","Disponible CRP"],["comprometido","Necesidad"],["adiciones","Adición proyect."],["umv","Aporte UMV"]];
  const sum=(list,k)=>list.reduce((a,f)=>a+Number(f[k]||0),0);
  const totConv=Object.fromEntries(cols.map(([k])=>[k,sum(conv,k)]));
  const totMis=Object.fromEntries(cols.map(([k])=>[k,sum(mis,k)]));
  const gran=Object.fromEntries(cols.map(([k])=>[k,totConv[k]+totMis[k]]));
  const pct=(f)=> f.proyectado? Math.round(f.ejecutado/f.proyectado*100):0;
  const Tabla=({titulo,lista,edResolver})=>(
    <div style={{...cardS,padding:0,overflowX:"auto",marginTop:14}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:720}}>
        <thead><tr>{[titulo,...cols.map(c=>c[1]),...(sec==="consolidado"?["% Ejec."]:[])].map((h,i)=><th key={i} style={{...th,textAlign:i===0?"left":"right"}}>{h}</th>)}</tr></thead>
        <tbody>
          {lista.map(f=>{const ed=edResolver(f);
            return <tr key={f.id} style={{borderTop:"1px solid "+C.line}}>
              <td style={{...td,fontSize:12.5,color:C.ink,fontWeight:600}}>{f.etiqueta}{ed&&<span style={{color:C.bronze,fontSize:10,fontFamily:F.mono}}> ✎</span>}</td>
              {cols.map(([k])=><td key={k} style={{...td,textAlign:"right"}}><FinCell value={f[k]} editable={ed} onSave={(v)=>onSaveFin(f,{[k]:v})} fmt={cop}/></td>)}
              {sec==="consolidado"&&<td style={{...td,textAlign:"right"}}><Chip bg={C.bronzeSoft} fg={C.bronze}>{pct(f)}%</Chip></td>}
            </tr>;})}
          {lista.length===0&&<tr><td colSpan={cols.length+2} style={{...td,color:C.slate,fontSize:12.5}}>Sin registros.</td></tr>}
        </tbody>
      </table>
    </div>
  );
  return <div>
    <SectionHead eyebrow="Módulo financiero" title="Ejecución financiera" note="consistente con la sección Convenios"/>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
      {[["consolidado","Consolidado (seguimiento)"],["proyeccion","Proyección (adiciones)"]].map(([s,l])=>
        <button key={s} onClick={()=>setSec(s)} className="btn" style={{background:sec===s?C.navy:"#fff",color:sec===s?"#fff":C.slate,border:"1px solid "+(sec===s?C.navy:C.line),borderRadius:9,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>{l}</button>)}
      <span style={{width:1,height:22,background:C.line,margin:"0 2px"}}/>
      {[["resumen","Resumen por convenio"],["detalle","Detalle por ítem × localidad"]].map(([m,l])=>
        <button key={m} onClick={()=>setModo(m)} className="btn" style={{background:modo===m?C.bronze:"#fff",color:modo===m?"#fff":C.slate,border:"1px solid "+(modo===m?C.bronze:C.line),borderRadius:9,padding:"8px 14px",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>{l}</button>)}
    </div>

    {modo==="detalle" && <FinDetalle finDet={finDet} sec={sec} puede={puedeDet} onSave={onSaveFinDet}/>}
    {modo==="resumen" && <div>
    <div style={{display:"flex",gap:12,overflowX:"auto",marginTop:14,paddingBottom:4}}>
      {cols.filter(([k])=>["proyectado","comprometido","ejecutado","girado"].includes(k)).map(([k,l])=>
        <div key={k} style={{...cardS,flex:"1 0 0",minWidth:140}}><div style={{fontSize:11,color:C.slate}}>{l}</div><div style={{fontFamily:F.mono,fontSize:15,color:C.ink,marginTop:3}}>{cop(gran[k])}</div></div>)}
      {sec==="consolidado"&&<div style={{...cardS,flex:"1 0 0",minWidth:150}}><div style={{fontSize:11,color:C.slate}}>% Ejecución global</div><div style={{fontFamily:F.disp,fontSize:24,fontWeight:600,color:C.verde,marginTop:2}}>{gran.proyectado?Math.round(gran.ejecutado/gran.proyectado*100):0}%</div><div style={{marginTop:5}}><Bar pct={gran.proyectado?Math.round(gran.ejecutado/gran.proyectado*100):0} color={C.verde}/></div></div>}
    </div>
    {Tabla({titulo:"Convenios",lista:conv,edResolver:(f)=>canEditFin(f.convenio_id)})}
    <div style={{...cardS,padding:"10px 16px",marginTop:8,background:"#F7F9FC",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
      <span style={{fontFamily:F.disp,fontWeight:700,color:C.navy,fontSize:13}}>Total convenios</span>
      <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>{cols.map(([k,l])=><span key={k} style={{fontFamily:F.mono,fontSize:11.5,color:C.ink}}>{l}: <b>{cop(totConv[k])}</b></span>)}</div>
    </div>

    {Tabla({titulo:"Misionalidad (recurso propio UMV)",lista:mis,edResolver:()=>canEditFin(null)})}

    <div style={{...cardS,marginTop:14,background:C.navy,color:"#fff"}}>
      <div style={{fontFamily:F.disp,fontWeight:700,fontSize:15,marginBottom:8}}>GRAN TOTAL · convenios + misional</div>
      <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>{cols.map(([k,l])=><div key={k}><div style={{fontSize:10,color:"#8FA1BE"}}>{l}</div><div style={{fontFamily:F.mono,fontSize:13}}>{cop(gran[k])}</div></div>)}</div>
    </div>
    <p style={{fontSize:11.5,color:C.slate,marginTop:10}}>Editan los directores de cada convenio (según su asignación) y la coordinadora de convenios (Rocío Botero). Las cifras deben coincidir con lo registrado en la sección Convenios — ahí se ve dónde debe actualizar cada encargado.</p>
    </div>}
  </div>;
}

/* ---- Financiero · detalle ítem de costo × localidad ---- */
function FinDetalle({finDet,sec,puede,onSave}){
  const rows=finDet.filter(f=>f.seccion===sec);
  const ordItem=(s)=>{const m=String(s).match(/^(\d+)/);return m?parseInt(m[1]):999;};
  const items=[...new Set(rows.map(r=>r.item))].sort((a,b)=>ordItem(a)-ordItem(b));
  const [item,setItem]=useState(items[0]||"");
  const itemAct=items.includes(item)?item:(items[0]||"");
  const locs=[...new Set(rows.map(r=>r.localidad))];
  const ordC=sec==="consolidado"?["PROYECTADO","COMPROMETIDO","EJECUTADO","GIRADO","ADICIONES","SALDO","UMV"]:["DISPONIBLE","NECESIDAD","ADICION","UMV"];
  const conceptos=ordC.filter(c=>rows.some(r=>r.concepto===c));
  const mapa={}; rows.forEach(r=>{ if(r.item===itemAct) mapa[r.localidad+"|"+r.concepto]=r; });
  const val=(loc,con)=> mapa[loc+"|"+con]?Number(mapa[loc+"|"+con].valor||0):0;
  const totC=(con)=> locs.reduce((a,l)=>a+val(l,con),0);
  return <div style={{marginTop:14}}>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,flexWrap:"wrap"}}>
      <span style={{fontSize:12.5,color:C.slate}}>Ítem de costo:</span>
      <select value={itemAct} onChange={e=>setItem(e.target.value)} style={{...inp,maxWidth:360}}>{items.map(i=><option key={i} value={i}>{i}</option>)}</select>
    </div>
    <div style={{...cardS,padding:0,overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:120+locs.length*110}}>
        <thead><tr><th style={{...th,minWidth:150}}>{sec==="consolidado"?"Concepto":"Proyección"}</th>{locs.map(l=><th key={l} style={{...th,textAlign:"right"}}>{l}</th>)}<th style={{...th,textAlign:"right",background:C.bronzeSoft,color:"#7a5a1e"}}>TOTAL</th></tr></thead>
        <tbody>{conceptos.map(con=><tr key={con} style={{borderTop:"1px solid "+C.line}}>
          <td style={{...td,fontFamily:F.mono,fontSize:11.5,fontWeight:600,color:C.ink}}>{con}</td>
          {locs.map(l=><td key={l} style={{...td,textAlign:"right"}}>
            {puede
              ? <FinCell value={val(l,con)} editable={true} onSave={(v)=>onSave({seccion:sec,item:itemAct,localidad:l,concepto:con},v)} fmt={cop}/>
              : <span style={{fontFamily:F.mono,fontSize:11.5,color:C.ink}}>{cop(val(l,con))}</span>}
          </td>)}
          <td style={{...td,textAlign:"right",background:"#FBF6EA"}}><span style={{fontFamily:F.mono,fontSize:11.5,fontWeight:700,color:"#7a5a1e"}}>{cop(totC(con))}</span></td>
        </tr>)}
        {conceptos.length===0&&<tr><td colSpan={locs.length+2} style={{...td,color:C.slate,fontSize:12.5}}>Sin datos para este ítem.</td></tr>}
        </tbody>
      </table>
    </div>
    <p style={{fontSize:11,color:C.slate,marginTop:8}}>Detalle tomado del informe de seguimiento de costos. {puede?"Toca una celda para actualizar el valor.":"Solo lectura."} Cambia de ítem con el selector.</p>
  </div>;
}

/* ================= METAS ================= */
function Metas({metasPdd,metasAct,canEditMetas,onSaveMeta,onSaveActividad,nombreDe}){
  const orden=["total","misional","convenio"];
  const T={total:"Misionales + Convenios",misional:"Misionales",convenio:"Convenios"};
  const [amb,setAmb]=useState("total");
  const [vista,setVista]=useState("resumen");
  const AMBAR="#F5A623", RED="#D2453B";
  const rows=metasPdd.filter(m=>m.ambito===amb).sort((a,b)=>(a.orden||0)-(b.orden||0));
  const totalM2=rows.reduce((a,m)=>a+Number(m.m2||0),0);
  const corte=rows[0]?.corte;
  const pctOf=(m)=> m.meta? Math.round(Number(m.ejecutado)/Number(m.meta)*100):0;
  const abrev={"Malla Vial Local e Intermedia":"MV Local","Malla Vial Arterial":"MV Arterial","Malla Vial Rural":"MV Rural","Puntos Bioingeniería":"Bioing.","Cicloinfraestructura":"Ciclo","Espacio Público":"E. Público"};
  const maxM2=Math.max(1,...rows.map(m=>Number(m.m2||0)));
  const idx=orden.indexOf(amb);
  const paso=(d)=>setAmb(orden[(idx+d+orden.length)%orden.length]);
  function reporte(){
    const pctA=(m,e)=> m?Math.round(Number(e)/Number(m)*100):0;
    const NAVY="#12233F";
    const portada=`<div class="page cover"><div class="cov-band"></div><div class="cov-body">
      <div class="cov-kicker">Unidad de Mantenimiento Vial</div>
      <h1>AVANCE EJECUCIÓN DE METAS</h1>
      <div class="cov-sub">Subdirección de Intervención de la Infraestructura — SII</div>
      <div class="cov-corte">Corte al ${corte?fecha(corte):"—"}</div>
      <div class="cov-foot">Gerencia de Infraestructura Urbana · 2026</div></div></div>`;
    const macro=metasPdd.filter(m=>m.ambito==="total").sort((a,b)=>(a.orden||0)-(b.orden||0));
    const cards=macro.map(m=>{const p=pctA(m.meta,m.ejecutado); const falt=Number(m.meta||0)-Number(m.ejecutado||0);
      return `<div class="mcard"><div class="mcard-t">${m.categoria}</div>
        <div class="mbar"><div class="mbar-f" style="width:${Math.min(100,p)}%"></div></div>
        <div class="mrow"><span>Meta</span><b>${num(m.meta)} ${m.unidad||""}</b></div>
        <div class="mrow"><span>Ejecutado</span><b>${num(m.ejecutado)}</b></div>
        <div class="mrow"><span>Faltante</span><b>${num(falt)}</b></div>
        <div class="mpct">${p}% <span>cumplimiento</span></div></div>`;}).join("");
    const totM2All=macro.reduce((s,m)=>s+Number(m.m2||0),0);
    const resumen=`<div class="page"><div><span class="band">RESUMEN EJECUCIÓN PDD 2024-2027</span><span class="yr">2026</span></div>
      <div class="mgrid">${cards||'<div class="empty">Sin metas cargadas.</div>'}</div>
      <div class="tot">Total acumulado PDD 2024–2027: ${num(totM2All)} M²</div>
      <div class="foot">Unidad de Mantenimiento Vial · Gerencia de Infraestructura Urbana</div></div>`;
    const tablaAct=(a)=>{
      const rs=metasAct.filter(x=>x.ambito===a).sort((x,y)=>(x.orden||0)-(y.orden||0));
      if(!rs.length) return null;
      let g=""; const tr=rs.map(x=>{const p=pctA(x.meta,x.ejecutado); const falt=Number(x.meta||0)-Number(x.ejecutado||0);
        const gg=x.grupo!==g?`<td class="g">${x.grupo}</td>`:`<td></td>`; g=x.grupo;
        return `<tr>${gg}<td>${x.actividad}</td><td class="r">${num(x.meta)}</td><td class="r">${num(x.ejecutado)}</td><td class="r"><b>${p}%</b></td><td class="r">${num(falt)}</td><td class="r">${num(x.m2)} M²</td></tr>`;}).join("");
      const tM=rs.reduce((s,x)=>s+Number(x.meta||0),0),tE=rs.reduce((s,x)=>s+Number(x.ejecutado||0),0),tot=rs.reduce((s,x)=>s+Number(x.m2||0),0);
      return {html:`<table><thead><tr><th></th><th style="text-align:left">Actividad</th><th>Meta</th><th>Ejecutado</th><th>%</th><th>Faltante</th><th>M²</th></tr></thead><tbody>${tr}
        <tr class="totr"><td></td><td><b>TOTAL</b></td><td class="r"><b>${num(tM)}</b></td><td class="r"><b>${num(tE)}</b></td><td class="r"><b>${tM?Math.round(tE/tM*100):0}%</b></td><td class="r"><b>${num(tM-tE)}</b></td><td class="r"><b>${num(tot)} M²</b></td></tr></tbody></table>`,tot};
    };
    let cuerpo=portada+resumen;
    [["total","AVANCE DE METAS · MISIONALES + CONVENIOS"],["misional","AVANCE DE METAS SIN CONVENIOS"],["convenio","AVANCE DE METAS CONVENIOS"]].forEach(([a,t])=>{
      const r=tablaAct(a); if(r) cuerpo+=`<div class="page"><div><span class="band">${t}</span><span class="yr">2026</span></div>
        <p class="sub">Radicado metas vigentes · Corte ${corte?fecha(corte):"—"}</p>${r.html}
        <div class="tot">Total: ${num(r.tot)} M²</div>
        <div class="foot">Unidad de Mantenimiento Vial · Gerencia de Infraestructura Urbana</div></div>`;
    });
    cuerpo+=`<div class="page gracias"><div>GRACIAS</div><div class="g-sub">Unidad de Mantenimiento Vial · GIU</div></div>`;
    const html=`<html><head><meta charset="utf-8"><title>ATLAS · Avance de metas · ${corte?fecha(corte):""}</title>
      <style>
      body{font-family:Arial;color:#1B2A44;margin:0}
      .page{padding:34px 40px;page-break-after:always;min-height:88vh;position:relative}
      .band{background:${AMBAR};color:#fff;padding:10px 18px;font-weight:bold;font-size:19px;display:inline-block}
      .yr{background:${RED};color:#fff;padding:10px 16px;font-weight:bold;font-size:19px;display:inline-block}
      .sub{color:#5B6B85;font-size:12px;margin:10px 0 4px}
      table{border-collapse:collapse;width:100%;margin-top:14px}
      th{background:${RED};color:#fff;padding:9px;font-size:12px}
      td{border-bottom:1px solid #ddd;padding:8px;font-size:12.5px}
      td.r{text-align:right} td.g{font-size:10px;color:#5B6B85;font-weight:bold;white-space:nowrap;background:#FBF3E2}
      tr.totr td{background:#FDF3E0;border-top:2px solid ${AMBAR}}
      .tot{background:${AMBAR};color:#fff;font-weight:bold;padding:12px 16px;margin-top:14px;text-align:right;font-size:16px}
      .foot{margin-top:26px;color:${RED};font-weight:bold;font-size:13px}
      .cover{background:${NAVY};color:#fff;min-height:92vh;display:flex;align-items:center}
      .cov-band{position:absolute;left:0;top:0;bottom:0;width:14px;background:${AMBAR}}
      .cov-body{padding-left:30px}
      .cov-kicker{color:${AMBAR};font-weight:bold;letter-spacing:1px;font-size:13px;text-transform:uppercase}
      .cover h1{font-size:44px;margin:14px 0 6px;line-height:1.05}
      .cov-sub{font-size:16px;color:#C9D4E6}
      .cov-corte{margin-top:18px;font-size:15px;background:${RED};display:inline-block;padding:8px 16px;font-weight:bold}
      .cov-foot{margin-top:28px;color:#8FA1BE;font-size:12px}
      .mgrid{display:flex;flex-wrap:wrap;gap:14px;margin-top:16px}
      .mcard{flex:1 1 240px;border:1px solid #E2E7EF;border-radius:12px;padding:14px}
      .mcard-t{font-weight:bold;font-size:14px;color:${NAVY}}
      .mbar{height:8px;background:#EEF1F6;border-radius:6px;margin:8px 0;overflow:hidden}
      .mbar-f{height:100%;background:${AMBAR}}
      .mrow{display:flex;justify-content:space-between;font-size:12px;color:#5B6B85;padding:2px 0}
      .mpct{margin-top:6px;font-size:24px;font-weight:bold;color:${NAVY}}.mpct span{font-size:11px;color:#5B6B85;font-weight:normal}
      .gracias{background:${NAVY};color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:92vh;font-size:52px;font-weight:bold;letter-spacing:2px}
      .gracias .g-sub{font-size:14px;color:#8FA1BE;font-weight:normal;letter-spacing:0;margin-top:10px}
      .empty{color:#5B6B85;padding:20px}
      @media print{.page{min-height:auto}}
      </style></head><body>${cuerpo}</body></html>`;
    const w=window.open("","_blank"); if(w){w.document.write(html); w.document.close(); w.focus(); w.print();}
  }
  async function descargarPptx(){
    const NAVY="12233F", AMBAR="F5A623", RED="D2453B", INK="1B2A44", SLATE="5B6B85";
    const pctA=(m,e)=> m?Math.round(Number(e)/Number(m)*100):0;
    let Pptx; try{ Pptx=(await import("pptxgenjs")).default; }catch(e){ alert("No se pudo cargar el generador de PPTX."); return; }
    const p=new Pptx(); p.defineLayout({name:"W",width:13.333,height:7.5}); p.layout="W";
    const cInfo=corte?fecha(corte):"—";
    // Portada
    let s=p.addSlide(); s.background={color:NAVY};
    s.addShape(p.ShapeType.rect,{x:0,y:0,w:0.22,h:7.5,fill:{color:AMBAR}});
    s.addText("UNIDAD DE MANTENIMIENTO VIAL",{x:0.7,y:1.9,w:11,h:0.4,fontSize:14,bold:true,color:AMBAR});
    s.addText("AVANCE EJECUCIÓN DE METAS",{x:0.7,y:2.4,w:12,h:1.1,fontSize:40,bold:true,color:"FFFFFF"});
    s.addText("Subdirección de Intervención de la Infraestructura — SII",{x:0.72,y:3.5,w:11,h:0.5,fontSize:17,color:"C9D4E6"});
    s.addText("Corte al "+cInfo,{x:0.72,y:4.15,w:5,h:0.5,fontSize:15,bold:true,color:"FFFFFF",fill:{color:RED},align:"center"});
    s.addText("Gerencia de Infraestructura Urbana · 2026",{x:0.72,y:6.6,w:11,h:0.4,fontSize:12,color:"8FA1BE"});
    // Banda helper
    const banda=(sl,txt)=>{ sl.addText(txt,{x:0.4,y:0.35,w:9,h:0.55,fontSize:17,bold:true,color:"FFFFFF",fill:{color:AMBAR},align:"center",valign:"middle"});
      sl.addText("2026",{x:11.3,y:0.35,w:1.6,h:0.55,fontSize:17,bold:true,color:"FFFFFF",fill:{color:RED},align:"center",valign:"middle"}); };
    const th={fill:{color:RED},color:"FFFFFF",bold:true,fontSize:11,align:"center",valign:"middle"};
    const td={fontSize:10.5,color:INK,valign:"middle",border:{type:"solid",pt:0.5,color:"DDDDDD"}};
    // Resumen PDD
    s=p.addSlide(); banda(s,"RESUMEN EJECUCIÓN PDD 2024-2027");
    const macro=metasPdd.filter(m=>m.ambito==="total").sort((a,b)=>(a.orden||0)-(b.orden||0));
    let rows=[[{text:"Categoría",options:{...th,align:"left"}},{text:"Meta",options:th},{text:"Ejecutado",options:th},{text:"Faltante",options:th},{text:"% Cumpl.",options:th}]];
    macro.forEach(m=>{const f=Number(m.meta||0)-Number(m.ejecutado||0);
      rows.push([{text:`${m.categoria} (${m.unidad||""})`,options:{...td,align:"left"}},{text:num(m.meta),options:{...td,align:"right"}},{text:num(m.ejecutado),options:{...td,align:"right"}},{text:num(f),options:{...td,align:"right"}},{text:pctA(m.meta,m.ejecutado)+"%",options:{...td,align:"right",bold:true}}]);});
    s.addTable(rows,{x:0.4,y:1.15,w:12.5,colW:[5.3,1.8,1.8,1.8,1.8]});
    const totM2=macro.reduce((a,m)=>a+Number(m.m2||0),0);
    s.addText("Total acumulado PDD 2024–2027: "+num(totM2)+" M²",{x:0.4,y:6.3,w:12.5,h:0.5,fontSize:14,bold:true,color:"FFFFFF",fill:{color:AMBAR},align:"right",valign:"middle"});
    // Tablas de actividades
    const tabla=(amb,titulo)=>{
      const rs=metasAct.filter(x=>x.ambito===amb).sort((a,b)=>(a.orden||0)-(b.orden||0)); if(!rs.length) return;
      const sl=p.addSlide(); banda(sl,titulo);
      sl.addText("Radicado metas vigentes · Corte "+cInfo,{x:0.4,y:0.95,w:11,h:0.3,fontSize:10,color:SLATE});
      let rw=[[{text:"Grupo",options:th},{text:"Actividad",options:{...th,align:"left"}},{text:"Meta",options:th},{text:"Ejecutado",options:th},{text:"%",options:th},{text:"Faltante",options:th},{text:"M²",options:th}]];
      let g="";
      rs.forEach(x=>{const f=Number(x.meta||0)-Number(x.ejecutado||0);
        rw.push([{text:x.grupo!==g?x.grupo:"",options:{...td,fontSize:8.5,bold:true,color:SLATE,fill:{color:"FBF3E2"}}},{text:x.actividad,options:{...td,align:"left"}},{text:num(x.meta),options:{...td,align:"right"}},{text:num(x.ejecutado),options:{...td,align:"right"}},{text:pctA(x.meta,x.ejecutado)+"%",options:{...td,align:"right",bold:true}},{text:num(f),options:{...td,align:"right"}},{text:num(x.m2)+" M²",options:{...td,align:"right"}}]); g=x.grupo;});
      const tM=rs.reduce((a,x)=>a+Number(x.meta||0),0),tE=rs.reduce((a,x)=>a+Number(x.ejecutado||0),0),tot=rs.reduce((a,x)=>a+Number(x.m2||0),0);
      rw.push([{text:"",options:td},{text:"TOTAL",options:{...td,bold:true,fill:{color:"FDF3E0"}}},{text:num(tM),options:{...td,align:"right",bold:true,fill:{color:"FDF3E0"}}},{text:num(tE),options:{...td,align:"right",bold:true,fill:{color:"FDF3E0"}}},{text:(tM?Math.round(tE/tM*100):0)+"%",options:{...td,align:"right",bold:true,fill:{color:"FDF3E0"}}},{text:num(tM-tE),options:{...td,align:"right",bold:true,fill:{color:"FDF3E0"}}},{text:num(tot)+" M²",options:{...td,align:"right",bold:true,fill:{color:"FDF3E0"}}}]);
      sl.addTable(rw,{x:0.35,y:1.35,w:12.6,colW:[1.9,3.5,1.3,1.5,1.0,1.4,2.0],fontSize:10});
    };
    tabla("total","AVANCE DE METAS · MISIONALES + CONVENIOS");
    tabla("misional","AVANCE DE METAS SIN CONVENIOS");
    tabla("convenio","AVANCE DE METAS CONVENIOS");
    // Gracias
    s=p.addSlide(); s.background={color:NAVY};
    s.addText("GRACIAS",{x:0,y:3,w:13.333,h:1.5,fontSize:54,bold:true,color:"FFFFFF",align:"center"});
    s.addText("Unidad de Mantenimiento Vial · GIU",{x:0,y:4.4,w:13.333,h:0.5,fontSize:14,color:"8FA1BE",align:"center"});
    await p.writeFile({fileName:"ATLAS_Avance_Metas_"+(corte||"").replace(/-/g,"")+".pptx"});
  }
  return <div>
    <SectionHead eyebrow="Módulo 4 · Presentación" title="Avance de metas — PDD 2024-2027" note={corte?("corte "+fecha(corte)):"corte —"}/>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:14}}>
      <button onClick={()=>paso(-1)} className="btn" title="Anterior" style={{background:"#fff",border:"1px solid "+C.line,borderRadius:9,padding:"8px 12px",fontSize:15,cursor:"pointer",color:C.slate}}>‹</button>
      {orden.map(k=><button key={k} onClick={()=>setAmb(k)} className="btn" style={{background:amb===k?C.navy:"#fff",color:amb===k?"#fff":C.slate,border:"1px solid "+(amb===k?C.navy:C.line),borderRadius:9,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>{T[k]}</button>)}
      <button onClick={()=>paso(1)} className="btn" title="Siguiente" style={{background:"#fff",border:"1px solid "+C.line,borderRadius:9,padding:"8px 12px",fontSize:15,cursor:"pointer",color:C.slate}}>›</button>
      <span style={{width:1,height:22,background:C.line,margin:"0 2px"}}/>
      {[["resumen","Resumen"],["actividades","Actividades"]].map(([k,l])=><button key={k} onClick={()=>setVista(k)} className="btn" style={{background:vista===k?C.bronze:"#fff",color:vista===k?"#fff":C.slate,border:"1px solid "+(vista===k?C.bronze:C.line),borderRadius:9,padding:"8px 14px",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>{l}</button>)}
      <button onClick={reporte} className="btn" style={{marginLeft:"auto",background:C.bronze,color:"#fff",border:"none",borderRadius:9,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><FileText size={15}/> Presentación semanal (PDF)</button>
      <button onClick={descargarPptx} className="btn" style={{background:C.navy,color:"#fff",border:"none",borderRadius:9,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><Download size={15}/> Descargar .pptx</button>
    </div>

    {/* RESUMEN DE CABECERA */}
    {(()=>{ const tM=rows.reduce((a,m)=>a+Number(m.meta||0),0), tE=rows.reduce((a,m)=>a+Number(m.ejecutado||0),0); const pg=tM?Math.round(tE/tM*100):0;
      return <div style={{display:"flex",gap:12,overflowX:"auto",margin:"12px 0",paddingBottom:4}}>
        <div style={{...cardS,flex:"1 0 0",minWidth:150}}><div style={{fontSize:11,color:C.slate}}>Avance global ({T[amb]})</div><div style={{fontFamily:F.disp,fontSize:24,fontWeight:600,color:pg>=80?C.verde:pg>=50?C.amarillo:C.naranja,marginTop:2}}>{pg}%</div><div style={{marginTop:5}}><Bar pct={pg} color={pg>=80?C.verde:pg>=50?C.amarillo:C.naranja}/></div></div>
        <div style={{...cardS,flex:"1 0 0",minWidth:130}}><div style={{fontSize:11,color:C.slate}}>Meta total</div><div style={{fontFamily:F.mono,fontSize:15,color:C.ink,marginTop:3}}>{num(tM)}</div></div>
        <div style={{...cardS,flex:"1 0 0",minWidth:130}}><div style={{fontSize:11,color:C.slate}}>Ejecutado</div><div style={{fontFamily:F.mono,fontSize:15,color:C.ink,marginTop:3}}>{num(tE)}</div></div>
        <div style={{...cardS,flex:"1 0 0",minWidth:130}}><div style={{fontSize:11,color:C.slate}}>Total M²</div><div style={{fontFamily:F.mono,fontSize:15,color:C.bronze,marginTop:3}}>{num(totalM2)}</div></div>
      </div>;
    })()}

    {/* LÁMINA */}
    {vista==="resumen"&&<div className="lift" style={{border:"1px solid "+C.line,borderRadius:16,overflow:"hidden",boxShadow:"0 10px 30px -18px rgba(18,35,63,.4)",background:"#fff"}}>
      <div style={{display:"flex",alignItems:"stretch"}}>
        <div style={{background:RED,color:"#fff",padding:"14px 20px",fontFamily:F.disp,fontWeight:700,fontSize:17,flex:1,display:"flex",alignItems:"center",letterSpacing:.3}}>AVANCE DE METAS · {T[amb].toUpperCase()}</div>
        <div style={{background:AMBAR,color:"#fff",padding:"14px 20px",fontFamily:F.disp,fontWeight:700,fontSize:17,display:"flex",alignItems:"center"}}>2026</div>
      </div>
      <div style={{padding:"6px 20px",fontSize:11.5,color:C.slate,fontFamily:F.mono,borderBottom:"1px solid "+C.line}}>Unidad de Mantenimiento Vial · corte {corte?fecha(corte):"—"}</div>

      {/* GRÁFICA COMPARATIVA DE M² */}
      <div style={{padding:"16px 20px 4px"}}>
        <div style={{fontSize:11,color:C.slate,fontFamily:F.mono,marginBottom:8}}>M² INTERVENIDOS POR CATEGORÍA</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:10,height:150}}>
          {rows.map(m=>{const h=Math.round(Number(m.m2||0)/maxM2*118);const pct=pctOf(m);
            return <div key={m.id} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",height:"100%"}}>
              <div style={{fontFamily:F.mono,fontSize:10,color:C.ink,marginBottom:3}}>{num(m.m2)}</div>
              <div title={m.categoria} style={{width:"78%",maxWidth:56,height:Math.max(h,3),background:"linear-gradient(180deg,"+(pct>=100?C.verde:C.bronze)+","+(pct>=100?"#256b45":"#8a6326")+")",borderRadius:"6px 6px 0 0",transition:"height .3s"}}/>
              <div style={{fontSize:9.5,color:C.slate,marginTop:5,textAlign:"center",lineHeight:1.1}}>{abrev[m.categoria]||m.categoria}</div>
            </div>;})}
        </div>
      </div>

      {/* TARJETAS EDITABLES POR CATEGORÍA */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:12,padding:"14px 20px"}}>
        {rows.map(m=>{const pct=pctOf(m);
          return <div key={m.id} style={{border:"1px solid "+C.line,borderRadius:12,padding:14,background:C.paper}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
              <div style={{maxWidth:180}}><div style={{fontFamily:F.disp,fontWeight:600,color:C.ink,fontSize:13.5}}>{m.categoria}</div>
                <div style={{fontFamily:F.mono,fontSize:10.5,color:C.slate}}>{m.unidad}</div></div>
              <div style={{fontFamily:F.disp,fontSize:24,fontWeight:700,color:pct>=100?C.verde:RED}}>{pct}%</div></div>
            <div style={{margin:"10px 0 6px"}}><Bar pct={pct} color={pct>=100?C.verde:C.bronze}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:8}}>
              {[["Meta",m.meta,"meta"],["Ejec.",m.ejecutado,"ejecutado"],["M²",m.m2,"m2"]].map(([l,v,k])=>
                <div key={k} style={{background:"#fff",borderRadius:8,padding:"6px 8px",border:"1px solid "+C.line}}>
                  <div style={{fontSize:9.5,color:C.slate,fontFamily:F.mono}}>{l}</div>
                  {canEditMetas
                    ? <FinCell value={v} editable={true} onSave={(nv)=>onSaveMeta(m,{[k]:nv})} fmt={num}/>
                    : <span style={{fontFamily:F.mono,fontSize:12,color:C.ink}}>{num(v)}</span>}
                </div>)}
            </div>
          </div>;})}
      </div>

      {/* TOTAL */}
      <div style={{background:AMBAR,color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,padding:"14px 20px"}}>
        <span style={{fontFamily:F.disp,fontWeight:700,fontSize:15}}>Total {T[amb]} · 2026</span>
        <span style={{fontFamily:F.mono,fontSize:18,fontWeight:700}}>{num(totalM2)} M²</span>
      </div>
    </div>}

    {vista==="actividades"&&(()=>{
      const act=metasAct.filter(a=>a.ambito===amb).sort((a,b)=>(a.orden||0)-(b.orden||0));
      if(!act.length) return <div style={cardS}><span style={{fontSize:13,color:C.slate}}>No hay desglose de actividades para “{T[amb]}”. Disponible para Misionales+Convenios y Misionales (Malla Vial Local e Intermedia).</span></div>;
      const grupos=[...new Set(act.map(a=>a.grupo))];
      const tMeta=act.reduce((s,a)=>s+Number(a.meta||0),0), tEje=act.reduce((s,a)=>s+Number(a.ejecutado||0),0), tM2=act.reduce((s,a)=>s+Number(a.m2||0),0);
      const pA=(a)=>a.meta?Math.round(Number(a.ejecutado)/Number(a.meta)*100):0;
      return <div className="lift" style={{border:"1px solid "+C.line,borderRadius:16,overflow:"hidden",boxShadow:"0 10px 30px -18px rgba(18,35,63,.4)",background:"#fff"}}>
        <div style={{display:"flex"}}>
          <div style={{background:AMBAR,color:"#fff",padding:"14px 20px",fontFamily:F.disp,fontWeight:700,fontSize:15.5,flex:1}}>Avance actividades · Malla Vial Local e Intermedia · {T[amb]}</div>
          <div style={{background:RED,color:"#fff",padding:"14px 20px",fontFamily:F.disp,fontWeight:700,fontSize:15.5}}>2026</div>
        </div>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}>
          <thead><tr>{["Grupo","Actividad","Meta","Ejecutado","% Avance","M²"].map((h,i)=><th key={i} style={{...th,textAlign:i>=2&&i<5?"right":"left"}}>{h}</th>)}</tr></thead>
          <tbody>{grupos.map(g=>{const filas=act.filter(a=>a.grupo===g);
            return filas.map((a,gi)=><tr key={a.id} style={{borderTop:"1px solid "+C.line}}>
              <td style={{...td,fontSize:10.5,fontFamily:F.mono,color:C.slate,fontWeight:600}}>{gi===0?g:""}</td>
              <td style={{...td,fontSize:12.5,color:C.ink}}>{a.actividad}</td>
              <td style={{...td,textAlign:"right"}}>{canEditMetas?<FinCell value={a.meta} editable={true} onSave={(v)=>onSaveActividad(a,{meta:v})} fmt={num}/>:<span style={{fontFamily:F.mono,fontSize:12}}>{num(a.meta)}</span>}</td>
              <td style={{...td,textAlign:"right"}}>{canEditMetas?<FinCell value={a.ejecutado} editable={true} onSave={(v)=>onSaveActividad(a,{ejecutado:v})} fmt={num}/>:<span style={{fontFamily:F.mono,fontSize:12}}>{num(a.ejecutado)}</span>}</td>
              <td style={{...td,textAlign:"right"}}><div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}><div style={{width:54}}><Bar pct={pA(a)} color={pA(a)>=100?C.verde:C.bronze}/></div><span style={{fontFamily:F.mono,fontSize:11.5,color:pA(a)>=100?C.verde:C.ink,minWidth:32,textAlign:"right"}}>{pA(a)}%</span></div></td>
              <td style={{...td,textAlign:"right"}}>{canEditMetas?<FinCell value={a.m2} editable={true} onSave={(v)=>onSaveActividad(a,{m2:v})} fmt={num}/>:<span style={{fontFamily:F.mono,fontSize:12}}>{num(a.m2)} M²</span>}</td>
            </tr>);})}
            <tr style={{borderTop:"2px solid "+C.bronze,background:"#FBF6EA"}}>
              <td style={{...td}}></td><td style={{...td,fontWeight:700,color:"#7a5a1e"}}>TOTAL</td>
              <td style={{...td,textAlign:"right",fontFamily:F.mono,fontWeight:700,color:"#7a5a1e"}}>{num(tMeta)}</td>
              <td style={{...td,textAlign:"right",fontFamily:F.mono,fontWeight:700,color:"#7a5a1e"}}>{num(tEje)}</td>
              <td style={{...td,textAlign:"right",fontFamily:F.mono,fontWeight:700,color:"#7a5a1e"}}>{tMeta?Math.round(tEje/tMeta*100):0}%</td>
              <td style={{...td,textAlign:"right",fontFamily:F.mono,fontWeight:700,color:"#7a5a1e"}}>{num(tM2)} M²</td>
            </tr>
          </tbody>
        </table></div>
      </div>;
    })()}
    <p style={{fontSize:11.5,color:C.slate,marginTop:10}}>{canEditMetas
      ? "Cada lámina es editable: toca una cifra (Meta / Ejecutado / M²) para actualizarla y la gráfica se recalcula al instante. Usa ‹ › para pasar entre láminas y Reporte para generar la presentación imprimible."
      : "Presentación en solo lectura. La actualizan los administradores aprobadores; usa ‹ › para pasar entre láminas y Reporte para imprimir."}</p>
  </div>;
}

/* ================= MAPA ================= */
function Mapa(){
  return <div>
    <SectionHead eyebrow="Territorio" title="Mapa / Visor ArcGIS" note={MAPA_URL?"conectado":"pendiente de enlace"}/>
    {MAPA_URL ? (
      <div style={{...cardS,padding:6}}>
        <iframe title="ArcGIS" src={MAPA_URL} style={{width:"100%",height:"72vh",border:"none",borderRadius:10}} allowFullScreen/>
      </div>
    ) : (
      <div style={{...cardS,textAlign:"center",padding:40}}>
        <MapIcon size={40} color={C.bronze} style={{margin:"0 auto"}}/>
        <div style={{fontFamily:F.disp,fontWeight:600,color:C.ink,marginTop:12}}>Aún no hay un mapa conectado</div>
        <div style={{fontSize:13,color:C.slate,marginTop:6,maxWidth:460,margin:"6px auto 0"}}>Cuando tengas el enlace del visor ArcGIS, pégalo en <code>src/config.js</code> en la línea <b>MAPA_URL</b> y el mapa aparecerá aquí, integrado al tablero.</div>
      </div>
    )}
  </div>;
}

/* ================= DETALLE + EDICIÓN ================= */
function CRPForm({contratoId,onAdd}){
  const [f,setF]=useState({}); const S=(k)=>(e)=>setF({...f,[k]:e.target.value});
  return <div style={{...cardS,marginTop:10,background:C.paper}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8}}>
      <div><label style={lab}>CDP</label><input value={f.cdp||""} onChange={S("cdp")} style={inp}/></div>
      <div><label style={lab}>CRP</label><input value={f.crp||""} onChange={S("crp")} style={inp}/></div>
      <div><label style={lab}>Rubro</label><input value={f.rubro||""} onChange={S("rubro")} style={inp}/></div>
      <div><label style={lab}>Valor</label><input type="number" value={f.valor||""} onChange={S("valor")} style={inp}/></div>
    </div>
    <button className="btn" onClick={()=>{if(!f.crp&&!f.cdp){return;}onAdd({contrato_id:contratoId,cdp:f.cdp||"",crp:f.crp||"",rubro:f.rubro||"",valor:Number(f.valor)||0,obs:f.obs||""});setF({});}} style={{marginTop:10,background:C.verde,color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>+ Agregar CRP</button>
  </div>;
}
function Detail({p,onClose,perms,profiles,onSave,crp,onCrearCRP,onBorrarCRP,toast}){
  const [estado,setEstado]=useState(p.estado||"");
  const [prioridad,setPrioridad]=useState(p.prioridad||"Media");
  const [bloqueo,setBloqueo]=useState(p.bloqueo||"");
  const [ayuda,setAyuda]=useState(p.ayuda||"");
  const [resp,setResp]=useState(p.responsable_id||"");
  const [busy,setBusy]=useState(false);
  const editable = perms.canEdit(p);
  const puedeAsignar = perms.isAdminFull;
  const s=sem(p.fin),d=dias(p.fin);
  const porEjec=(p.comp||0)-(p.ejec||0), porComp=(p.valor||0)-(p.comp||0), m2=p.costo_m2?porComp/p.costo_m2:0;
  const fin=[["Valor total",cop(p.valor)],["Aporte contraparte",cop(p.aporte_contra)],["Aporte UMV",cop(p.aporte_umv)],
    ["Comprometido",cop(p.comp)],["Ejecutado",cop(p.ejec)],["Por ejecutar",cop(porEjec)],
    ["Por comprometer",cop(porComp)],["Costo $/m²",cop(p.costo_m2)],["Saldo x comprometer",num(m2)+" m²"]];
  async function guardar(){
    setBusy(true);
    const patch={};
    if(estado!==p.estado) patch.estado=estado;
    if(prioridad!==p.prioridad) patch.prioridad=prioridad;
    if(bloqueo!==(p.bloqueo||"")) patch.bloqueo=bloqueo;
    if(ayuda!==(p.ayuda||"")) patch.ayuda=ayuda;
    const patchAsg = (puedeAsignar && resp!==(p.responsable_id||"")) ? {responsable_id: resp||null} : {};
    if(Object.keys(patch).length===0 && Object.keys(patchAsg).length===0){ toast("No hay cambios"); setBusy(false); return; }
    await onSave(p,patch,patchAsg,editable);
    setBusy(false); onClose();
  }
  const dis = editable===false;
  return <div style={{position:"fixed",inset:0,background:"rgba(12,26,49,.55)",display:"flex",justifyContent:"flex-end",zIndex:50,backdropFilter:"blur(2px)"}} onClick={onClose}>
    <div style={{width:"min(560px,100%)",background:"#fff",height:"100%",overflowY:"auto",animation:"slidein .25s ease"}} onClick={e=>e.stopPropagation()}>
      <div style={{background:C.navy,color:"#fff",padding:"18px 22px",position:"sticky",top:0,zIndex:2}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div><div style={{display:"flex",alignItems:"center",gap:8}}><Dot s={s} size={12}/><span style={{fontFamily:F.mono,fontSize:15,fontWeight:600}}>{p.id}</span></div>
            <div style={{fontSize:13,color:"#B9C6DC",marginTop:4,maxWidth:440}}>{p.inter} · {p.tipo}</div></div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.12)",border:"none",borderRadius:8,padding:6,cursor:"pointer"}}><X size={18} color="#fff"/></button></div>
        <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
          <Chip bg="rgba(255,255,255,.14)" fg="#fff"><MapPin size={10} style={{verticalAlign:-1}}/> {p.zona} · {p.loc}</Chip>
          {d!==null&&p.estado!=="Futuro"&&<Chip bg="rgba(255,255,255,.14)" fg="#fff">{d<0?"vencido":d+" días"}</Chip>}</div>
      </div>
      <div style={{padding:22}}>
        {editable==="approval" && <div style={{background:C.bronzeSoft,color:"#7a5a1e",fontSize:12.5,padding:"9px 12px",borderRadius:10,marginBottom:14,display:"flex",gap:8,alignItems:"center"}}><Lock size={15}/> Tus cambios se envían a aprobación antes de aplicarse.</div>}
        {dis && <div style={{background:"#EEF1F6",color:C.slate,fontSize:12.5,padding:"9px 12px",borderRadius:10,marginBottom:14,display:"flex",gap:8,alignItems:"center"}}><Lock size={15}/> Solo lectura: este proceso no está a tu cargo.</div>}

        {["ROJO","NEGRO","NARANJA"].includes(s) && p.estado!=="Futuro" && <>
          <CardTitle style={{color:SEM[s]}}>Semáforo en {s.toLowerCase()} — ¿qué lo tiene trabado?</CardTitle>
          <label style={lab}>Bloqueo</label>
          <textarea disabled={dis} value={bloqueo} onChange={e=>setBloqueo(e.target.value)} style={{...ta,opacity:dis?.6:1}}/>
          <label style={lab}>Qué ayuda necesita</label>
          <textarea disabled={dis} value={ayuda} onChange={e=>setAyuda(e.target.value)} style={{...ta,opacity:dis?.6:1}}/>
        </>}

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:8}}>
          <div><label style={lab}>Estado</label>
            <select disabled={dis} value={estado} onChange={e=>setEstado(e.target.value)} style={{...inp,opacity:dis?.6:1}}>
              {EST_PROC.map(o=><option key={o}>{o}</option>)}</select></div>
          <div><label style={lab}>Prioridad</label>
            <select disabled={dis} value={prioridad} onChange={e=>setPrioridad(e.target.value)} style={{...inp,opacity:dis?.6:1}}>
              {["Alta","Media","Baja"].map(o=><option key={o}>{o}</option>)}</select></div>
        </div>

        <label style={lab}>Responsable</label>
        <select disabled={!puedeAsignar} value={resp} onChange={e=>setResp(e.target.value)} style={{...inp,opacity:puedeAsignar?1:.6}}>
          <option value="">— sin asignar —</option>
          {profiles.map(u=><option key={u.id} value={u.id}>{u.nombre||u.usuario} ({rolTxt[u.rol]})</option>)}</select>
        {!puedeAsignar && <div style={{fontSize:11,color:C.slate,marginTop:3}}>Solo un administrador puede reasignar.</div>}

        {!dis && <button className="btn" disabled={busy} onClick={guardar} style={{marginTop:18,width:"100%",background:C.navy,color:"#fff",border:"none",borderRadius:10,padding:12,fontWeight:600,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <Save size={16}/> {busy?"Guardando…":(editable==="approval"?"Enviar a aprobación":"Guardar cambios")}</button>}

        <CardTitle style={{marginTop:22}}>Financiero</CardTitle>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:1,background:C.line,border:"1px solid "+C.line,borderRadius:10,overflow:"hidden",marginTop:8}}>
          {fin.map(([l,v],i)=><div key={i} style={{background:"#fff",padding:"10px 12px"}}><div style={{fontSize:11,color:C.slate}}>{l}</div><div style={{fontFamily:F.mono,fontSize:13,color:C.ink,marginTop:2}}>{v}</div></div>)}</div>

        <CardTitle style={{marginTop:22}}>CDP / CRP del contrato</CardTitle>
        <p style={{fontSize:11.5,color:C.slate,margin:"2px 0 8px"}}>Un contrato puede tener varios CRP por rubro. Registra cada uno para controlar el desembolso frente al valor del contrato.</p>
        {(()=>{ const mios=(crp||[]).filter(x=>x.contrato_id===p.id); const sum=mios.reduce((a,x)=>a+Number(x.valor||0),0); const dif=(p.valor||0)-sum;
          return <div>
            <div style={{...cardS,padding:0,overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:420}}>
                <thead><tr>{["CDP","CRP","Rubro","Valor",""].map((h,i)=><th key={i} style={{...th,textAlign:i===3?"right":"left"}}>{h}</th>)}</tr></thead>
                <tbody>{mios.map(x=><tr key={x.id} style={{borderTop:"1px solid "+C.line}}>
                  <td style={{...td,fontFamily:F.mono,fontSize:11.5}}>{x.cdp||"—"}</td>
                  <td style={{...td,fontFamily:F.mono,fontSize:11.5}}>{x.crp||"—"}</td>
                  <td style={{...td,fontSize:12}}>{x.rubro||"—"}</td>
                  <td style={{...td,textAlign:"right",fontFamily:F.mono,fontSize:12}}>{cop(x.valor)}</td>
                  <td style={td}>{puedeAsignar&&<span onClick={()=>{if(confirm("¿Eliminar este CRP?"))onBorrarCRP(x.id);}} style={{cursor:"pointer"}} title="Eliminar"><X size={13} color={C.rojo}/></span>}</td>
                </tr>)}
                {mios.length===0&&<tr><td colSpan={5} style={{...td,color:C.slate,fontSize:12}}>Sin CRP registrados.</td></tr>}</tbody>
              </table>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginTop:8,padding:"0 2px"}}>
              <span style={{color:C.slate}}>Suma CRP: <b style={{fontFamily:F.mono,color:C.ink}}>{cop(sum)}</b></span>
              <span style={{color:dif<0?C.rojo:C.slate}}>Vs. valor: <b style={{fontFamily:F.mono,color:dif<0?C.rojo:C.verde}}>{cop(dif)}</b> {dif<0?"(excede)":"disponible"}</span>
            </div>
            {puedeAsignar&&<CRPForm contratoId={p.id} onAdd={onCrearCRP}/>}
          </div>;
        })()}
      </div>
    </div>
  </div>;
}

/* ================= PENDIENTES (con cierre documentado) ================= */
function Pendientes({pends,perms,uid,onCompletar,onReabrir,onEditar,toast,profiles,onCrear,onBorrar,onCarga,usuarioDe}){
  const [edit,setEdit]=useState(null);
  const [cid,setCid]=useState(null); const [texto,setTexto]=useState("");
  const [nuevo,setNuevo]=useState(false); const [f,setF]=useState({tipo:"Tarea",imp:"Media"});
  const S=(k)=>(e)=>setF({...f,[k]:e.target.value});
  const rank=p=>(p.imp==="Alta"?0:100)+new Date(p.limite).getTime()/1e11;
  const activos=pends.filter(p=>p.estado!=="Terminado").sort((a,b)=>rank(a)-rank(b));
  const hechos=pends.filter(p=>p.estado==="Terminado").sort((a,b)=>new Date(b.completado_en||0)-new Date(a.completado_en||0));
  const ic={ORFEO:FileText,Tarea:ListChecks,"Respuesta PQRS":FileText,Pedido:Wallet};
  async function confirmar(p){ if(!texto.trim()){toast("Escribe cómo se atendió");return;} await onCompletar(p,texto.trim()); setCid(null); setTexto(""); }
  function crear(){
    if(!f.titulo){toast("Falta el título");return;}
    const u=profiles.find(x=>x.id===f.responsable_id);
    onCrear("pendientes",{tipo:f.tipo,titulo:f.titulo,rad:f.rad||"—",responsable_id:f.responsable_id||null,
      resp_nombre:u?(u.nombre||u.usuario):"—",limite:f.limite||null,estado:"Pendiente",
      imp:f.imp,gerencial:f.gerencial==="si",creado_por:uid});
    setNuevo(false); setF({tipo:"Tarea",imp:"Media"});
  }
  return <div>
    <SectionHead eyebrow="Módulos 2 y 3" title="Pendientes de gestión" note={activos.length+" abiertos · "+hechos.length+" atendidos"}/>
    <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:10,fontSize:11.5,color:C.slate}}>
      <span style={{display:"inline-flex",alignItems:"center",gap:5}}><Circle size={9} fill={C.morado} color={C.morado}/> Alta</span>
      <span style={{display:"inline-flex",alignItems:"center",gap:5}}><Circle size={9} fill={C.naranja} color={C.naranja}/> Media</span>
      <span style={{display:"inline-flex",alignItems:"center",gap:5}}><Circle size={9} fill={C.amarillo} color={C.amarillo}/> Baja</span>
    </div>
    {perms.isAdminFull && <div style={{marginBottom:12}}>
      <button className="btn" onClick={()=>setNuevo(!nuevo)} style={{background:nuevo?"#EEF1F6":C.navy,color:nuevo?C.ink:"#fff",border:"none",borderRadius:9,padding:"9px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>{nuevo?"Cancelar":"+ Nuevo pendiente"}</button>
      {nuevo && <div style={{...cardS,marginTop:10}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
          <div><label style={lab}>Tipo</label><select value={f.tipo} onChange={S("tipo")} style={inp}>{["Tarea","ORFEO","Respuesta PQRS","Pedido"].map(o=><option key={o}>{o}</option>)}</select></div>
          <div style={{gridColumn:"span 2"}}><label style={lab}>Título*</label><input value={f.titulo||""} onChange={S("titulo")} style={inp}/></div>
          <div><label style={lab}>Radicado</label><input value={f.rad||""} onChange={S("rad")} style={inp}/></div>
          <div><label style={lab}>Responsable</label><select value={f.responsable_id||""} onChange={S("responsable_id")} style={inp}><option value="">—</option>{profiles.map(u=><option key={u.id} value={u.id}>{u.nombre||u.usuario}</option>)}</select></div>
          <div><label style={lab}>Fecha límite</label><input type="date" value={f.limite||""} onChange={S("limite")} style={inp}/></div>
          <div><label style={lab}>Importancia</label><select value={f.imp} onChange={S("imp")} style={inp}>{["Alta","Media","Baja"].map(o=><option key={o}>{o}</option>)}</select></div>
          <div><label style={lab}>¿Gerencial?</label><select value={f.gerencial||"no"} onChange={S("gerencial")} style={inp}><option value="no">No</option><option value="si">Sí</option></select></div>
        </div>
        <button className="btn" onClick={crear} style={{marginTop:12,background:C.verde,color:"#fff",border:"none",borderRadius:9,padding:"9px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Crear pendiente</button>
      </div>}
    </div>}
    <div style={cardS}>
      <CardTitle style={{marginBottom:4}}>Abiertos</CardTitle>
      {activos.map(p=>{const d=dias(p.limite),Icn=ic[p.tipo]||ListChecks;const can=perms.canEditPend(p);
        return <div key={p.id} style={{borderTop:"1px solid "+C.line,padding:"11px 4px"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button disabled={!can} onClick={()=>{setCid(cid===p.id?null:p.id);setTexto("");}} title="Marcar atendido" style={{background:"none",border:"none",cursor:can?"pointer":"not-allowed",padding:0}}>
              <Circle size={20} fill={impColor(p.imp)} color={impColor(p.imp)}/></button>
            <Icn size={16} color={C.slate}/>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,color:C.ink}}>{p.titulo}</div>
              <div style={{fontFamily:F.mono,fontSize:11,color:C.slate}}>{p.tipo} · {p.resp_nombre||"—"} · rad {p.rad}</div></div>
            <Chip bg={impBg(p.imp)} fg={impColor(p.imp)}>{p.imp||"Media"}</Chip>
            {p.gerencial&&<Chip bg={C.bronzeSoft} fg={C.bronze}>gerencial</Chip>}
            <span style={{fontFamily:F.mono,fontSize:11.5,color:d<3?C.rojo:C.slate}}>{d}d</span>
            {perms.canEditOwn(p)&&<span onClick={()=>setEdit(edit===p.id?null:p.id)} title="Editar (solo tú, que lo creaste)" style={{cursor:"pointer",padding:2}}>✎</span>}
            {perms.isAdminFull&&<span onClick={()=>{if(confirm("¿Eliminar este pendiente?"))onBorrar("pendientes",p.id);}} title="Eliminar" style={{cursor:"pointer",padding:2}}><X size={14} color={C.rojo}/></span>}</div>
          {edit===p.id && <div style={{marginTop:10,marginLeft:32,background:"#FBF7EE",border:"1px solid "+C.bronzeSoft,borderRadius:10,padding:12}}>
            <div style={{fontSize:11.5,color:C.bronze,fontWeight:600,marginBottom:8}}>Editar pendiente (solo tú puedes, por ser quien lo creó)</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
              <div style={{gridColumn:"span 2"}}><label style={{...lab,marginTop:0}}>Título</label><input defaultValue={p.titulo||""} onBlur={e=>{if(e.target.value!==(p.titulo||""))onEditar(p.id,"titulo",e.target.value);}} style={inp}/></div>
              <div><label style={{...lab,marginTop:0}}>Prioridad</label><select value={p.imp||"Media"} onChange={e=>onEditar(p.id,"imp",e.target.value)} style={inp}>{["Alta","Media","Baja"].map(o=><option key={o}>{o}</option>)}</select></div>
              <div><label style={{...lab,marginTop:0}}>Límite</label><input type="date" defaultValue={p.limite||""} onBlur={e=>{if(e.target.value!==(p.limite||""))onEditar(p.id,"limite",e.target.value||null);}} style={inp}/></div>
              <div><label style={{...lab,marginTop:0}}>Responsable</label><select value={p.responsable_id||""} onChange={e=>{const u=profiles.find(x=>x.id===e.target.value);onEditar(p.id,"responsable_id",e.target.value||null);onEditar(p.id,"resp_nombre",u?(u.nombre||u.usuario):"—");}} style={inp}><option value="">—</option>{profiles.map(u=><option key={u.id} value={u.id}>{u.nombre||u.usuario}</option>)}</select></div>
              <div><label style={{...lab,marginTop:0}}>Radicado</label><input defaultValue={p.rad||""} onBlur={e=>{if(e.target.value!==(p.rad||""))onEditar(p.id,"rad",e.target.value||"—");}} style={inp}/></div>
            </div>
            <button className="btn" onClick={()=>setEdit(null)} style={{marginTop:10,background:C.navy,color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>Listo</button>
          </div>}
          {cid===p.id && <div style={{marginTop:10,marginLeft:32,background:C.paper,borderRadius:10,padding:12}}>
            <label style={{...lab,marginTop:0}}>¿Cómo se atendió?</label>
            <textarea value={texto} onChange={e=>setTexto(e.target.value)} style={ta} placeholder="Describe la respuesta o gestión realizada…"/>
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <button className="btn" onClick={()=>confirmar(p)} style={{background:C.verde,color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontSize:13,cursor:"pointer"}}>Marcar atendido</button>
              <button onClick={()=>{setCid(null);setTexto("");}} style={{background:"#EEF1F6",color:C.ink,border:"none",borderRadius:8,padding:"8px 14px",fontSize:13,cursor:"pointer"}}>Cancelar</button></div>
          </div>}
        </div>;})}
      {activos.length===0 && <div style={{fontSize:12.5,color:C.slate,padding:"8px 4px"}}>No hay pendientes abiertos.</div>}
    </div>

    <div style={{...cardS,marginTop:14}}>
      <CardTitle style={{marginBottom:4}}>Atendidos <span style={{color:C.slate,fontFamily:F.mono,fontSize:11}}>· quedan registrados</span></CardTitle>
      {hechos.map(p=><div key={p.id} style={{borderTop:"1px solid "+C.line,padding:"11px 4px",display:"flex",gap:12,alignItems:"flex-start"}}>
        <CheckCircle2 size={18} color={C.verde} style={{marginTop:2,flexShrink:0}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13.5,color:C.ink}}>{p.titulo}</div>
          {p.respuesta_atencion && <div style={{fontSize:12.5,color:C.slate,marginTop:3}}><b style={{color:C.ink}}>Atención:</b> {p.respuesta_atencion}</div>}
          <div style={{fontFamily:F.mono,fontSize:10.5,color:C.slate,marginTop:3}}>ejecutó: {p.ejecutado_por||"—"} · {fecha(p.completado_en)}</div>
        </div>
        {perms.isAdminFull && <button className="btn" onClick={()=>onReabrir(p)} title="Reabrir" style={{background:"#EEF1F6",color:C.ink,border:"none",borderRadius:8,padding:"6px 10px",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}><RotateCcw size={13}/> Reabrir</button>}
      </div>)}
      {hechos.length===0 && <div style={{fontSize:12.5,color:C.slate,padding:"8px 4px"}}>Aún no hay pendientes atendidos.</div>}
    </div>
    {perms.isAdminFull&&<CargaBloque tipo="pendientes" filas={pends} onCarga={onCarga} usuarioDe={usuarioDe} toast={toast}/>}
  </div>;
}

/* ================= APROBACIONES ================= */
function Aprobaciones({items,onDecidir,nombreDe,procs,convenios,profiles,isAdmin,onCrear,onBorrar,uid,perms,onCampo,onCampoConv,onCampoPersonal,cumplPers,onCargaMasiva,usuarioDe,toast}){
  const [tab,setTab]=useState("solicitudes");
  const pend=items.filter(c=>c.estado==="pendiente");
  const hist=items.filter(c=>c.estado!=="pendiente").sort((a,b)=>new Date(b.decidido_en||0)-new Date(a.decidido_en||0));
  const [nuevo,setNuevo]=useState(false); const [f,setF]=useState({campo:"estado"});
  const S=(k)=>(e)=>setF({...f,[k]:e.target.value});
  const aprobadores=profiles.filter(u=>["super_admin","admin_aprobador"].includes(u.rol));
  function crear(){
    if(!f.proceso_id||!f.valor_nuevo){return;}
    onCrear("cambios_pendientes",{proceso_id:f.proceso_id,campo:f.campo,valor_nuevo:f.valor_nuevo,
      solicitado_por:uid,aprobador_id:f.aprobador_id||null,limite:f.limite||null,estado:"pendiente"});
    setNuevo(false); setF({campo:"estado"});
  }
  return <div>
    <SectionHead eyebrow="Maker-checker" title="Aprobaciones y cumplimiento" note={pend.length+" por revisar"}/>
    <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
      {[["solicitudes","Solicitudes de cambio"],["cumplimiento","Cumplimiento documental"],["personal","Apoyos y residentes"]].map(([k,l])=>
        <button key={k} onClick={()=>setTab(k)} className="btn" style={{background:tab===k?C.navy:"#fff",color:tab===k?"#fff":C.slate,border:"1px solid "+(tab===k?C.navy:C.line),borderRadius:9,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>{l}{k==="solicitudes"&&pend.length>0?" ("+pend.length+")":""}</button>)}
    </div>
    {tab==="cumplimiento"&&<Cumplimiento procs={procs} convenios={convenios} perms={perms} onCampo={onCampo} onCampoConv={onCampoConv}/>}
    {tab==="personal"&&<CumplimientoPersonal data={cumplPers} perms={perms} onCampo={onCampoPersonal} onCrear={onCrear} onBorrar={onBorrar} onCarga={onCargaMasiva} usuarioDe={usuarioDe} profiles={profiles} toast={toast}/>}
    {tab==="solicitudes"&&<div>
    <div style={{...cardS,marginBottom:12,borderLeft:"4px solid "+C.bronze,background:"#FBF6EA"}}>
      <div style={{fontSize:12.5,color:C.ink}}>Aquí llegan los cambios que el personal <b>con aprobación</b> (p. ej. Rocío, Christian) hace en Contratos o Convenios y que <b>no se aplican</b> hasta que un aprobador los acepta. Al <b>Aprobar</b>, el cambio se aplica de una vez en su sección y queda registrado con <b>tu nombre y la fecha</b> en el historial de abajo.</div>
    </div>
    {isAdmin && <div style={{marginBottom:12}}>
      <button className="btn" onClick={()=>setNuevo(!nuevo)} style={{background:nuevo?"#EEF1F6":C.navy,color:nuevo?C.ink:"#fff",border:"none",borderRadius:9,padding:"9px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>{nuevo?"Cancelar":"+ Nueva solicitud"}</button>
      {nuevo && <div style={{...cardS,marginTop:10}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10}}>
          <div><label style={lab}>Proceso*</label><select value={f.proceso_id||""} onChange={S("proceso_id")} style={inp}><option value="">—</option>{procs.map(p=><option key={p.id} value={p.id}>{p.id}</option>)}</select></div>
          <div><label style={lab}>Campo a cambiar</label><select value={f.campo} onChange={S("campo")} style={inp}>{["estado","prioridad","bloqueo","ayuda","comp","ejec","adiciones","deficit"].map(o=><option key={o}>{o}</option>)}</select></div>
          <div><label style={lab}>Valor nuevo*</label><input value={f.valor_nuevo||""} onChange={S("valor_nuevo")} style={inp}/></div>
          <div><label style={lab}>Aprueba</label><select value={f.aprobador_id||""} onChange={S("aprobador_id")} style={inp}><option value="">—</option>{aprobadores.map(u=><option key={u.id} value={u.id}>{u.nombre||u.usuario}</option>)}</select></div>
          <div><label style={lab}>Fecha límite</label><input type="date" value={f.limite||""} onChange={S("limite")} style={inp}/></div>
        </div>
        <button className="btn" onClick={crear} style={{marginTop:12,background:C.verde,color:"#fff",border:"none",borderRadius:9,padding:"9px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Crear solicitud</button>
      </div>}
    </div>}
    <div style={cardS}>
      <CardTitle style={{marginBottom:4}}>Por revisar</CardTitle>
      {pend.length===0 && <div style={{fontSize:13,color:C.slate,padding:"8px 0"}}>No hay cambios esperando aprobación.</div>}
      {pend.map(c=>{const d=c.limite?dias(c.limite):null; const p=procs.find(x=>x.id===c.proceso_id);
        const actual=p?p[c.campo]:undefined; const seccion=(p&&p.convenio_id)?"Convenios":"Contratos";
        const campoTxt={estado:"Estado",prioridad:"Prioridad",bloqueo:"Bloqueo",ayuda:"Ayuda requerida",comp:"Comprometido en CRP",ejec:"Ejecutado",adiciones:"Adiciones",deficit:"Déficit"}[c.campo]||c.campo;
        return <div key={c.id} style={{padding:"14px 4px",borderTop:"1px solid "+C.line}}>
        <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div style={{minWidth:0,flex:1}}>
            <div style={{fontSize:13,color:C.ink}}><b>{nombreDe(c.solicitado_por)||"Alguien"}</b> solicita cambiar <b>{campoTxt}</b> en <Chip bg="#EEF1F6" fg={C.slate}>{seccion}</Chip> · <span style={{fontFamily:F.mono}}>{c.proceso_id}</span>{p?<span style={{color:C.slate}}> ({p.inter||p.loc||""})</span>:<span style={{color:C.rojo}}> (proceso no visible)</span>}</div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8,flexWrap:"wrap"}}>
              <div style={{background:"#F7F9FC",border:"1px solid "+C.line,borderRadius:8,padding:"5px 10px"}}>
                <div style={{fontSize:9.5,color:C.slate,fontFamily:F.mono}}>VALOR ACTUAL</div>
                <div style={{fontFamily:F.mono,fontSize:12.5,color:C.slate}}>{actual===undefined||actual===null||actual===""?"—":String(actual)}</div></div>
              <ChevronRight size={16} color={C.bronze}/>
              <div style={{background:C.bronzeSoft,borderRadius:8,padding:"5px 10px"}}>
                <div style={{fontSize:9.5,color:"#7a5a1e",fontFamily:F.mono}}>VALOR PROPUESTO</div>
                <div style={{fontFamily:F.mono,fontSize:12.5,color:"#7a5a1e",fontWeight:600}}>{String(c.valor_nuevo)}</div></div>
            </div>
            <div style={{fontFamily:F.mono,fontSize:10.5,color:C.slate,marginTop:8}}>solicitado {fecha(c.creado_en)}{c.aprobador_id?" · debe aprobar: "+nombreDe(c.aprobador_id):""}{d!==null?" · "+(d<0?"vencido":"vence en "+d+"d"):""}</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"stretch",minWidth:140}}>
            <button className="btn" onClick={()=>onDecidir(c,true)} style={{background:C.verde,color:"#fff",border:"none",borderRadius:8,padding:"9px 12px",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>Aprobar y aplicar</button>
            <button className="btn" onClick={()=>onDecidir(c,false)} style={{background:"#EEF1F6",color:C.ink,border:"none",borderRadius:8,padding:"9px 12px",fontSize:12.5,cursor:"pointer"}}>Rechazar</button>
            <div style={{fontSize:10,color:C.slate,textAlign:"center",fontFamily:F.mono}}>quedará a tu nombre</div></div>
        </div></div>;})}
    </div>
    <div style={{...cardS,marginTop:14}}>
      <CardTitle style={{marginBottom:4}}>Historial <span style={{color:C.slate,fontFamily:F.mono,fontSize:11}}>· quién decidió y cuándo</span></CardTitle>
      {hist.map(c=><div key={c.id} style={{padding:"10px 4px",borderTop:"1px solid "+C.line,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div><span style={{fontFamily:F.mono,fontSize:12,color:C.ink,fontWeight:600}}>{c.proceso_id}</span>
          <span style={{fontSize:12,color:C.slate}}> · {c.campo} → “{c.valor_nuevo}”</span>
          <div style={{fontFamily:F.mono,fontSize:10.5,color:C.slate,marginTop:2}}>solicitó: {nombreDe(c.solicitado_por)||"—"} · decidió: <b style={{color:C.ink}}>{nombreDe(c.decidido_por)||"—"}</b> · {fecha(c.decidido_en)}</div></div>
        <Chip bg={c.estado==="aprobado"?"#E7F3EC":C.rojo+"18"} fg={c.estado==="aprobado"?C.verde:C.rojo}>{c.estado}</Chip>
      </div>)}
      {hist.length===0 && <div style={{fontSize:12.5,color:C.slate,padding:"8px 0"}}>Aún no hay decisiones registradas.</div>}
    </div>
    </div>}
  </div>;
}

/* ================= ROLES ================= */
const MODULOS_LISTA=[["pendientes","Pendientes"],["aprobaciones","Aprobaciones"],["asignaciones","Asignaciones"],["metas","Metas"],["financiero","Financiero"],["crp","Control CRP"],["contratos","Contratos"],["convenios","Convenios"],["liquidaciones","Liquidaciones"],["inventario","Inventario"],["mapa","Mapa"]];
const LOCALIDADES={ "usaquen":"01","chapinero":"02","santa fe":"03","san cristobal":"04","usme":"05","tunjuelito":"06","bosa":"07","kennedy":"08","fontibon":"09","engativa":"10","suba":"11","barrios unidos":"12","teusaquillo":"13","los martires":"14","antonio narino":"15","puente aranda":"16","la candelaria":"17","rafael uribe uribe":"18","ciudad bolivar":"19","sumapaz":"20" };
function locNum(nombre){ if(!nombre) return nombre;
  const limpio=String(nombre).replace(/\(.*?\)/g,"").trim();
  const key=limpio.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const nn=LOCALIDADES[key];
  return nn? limpio+" ("+nn+")" : nombre;
}
const EST_PROC=["En ejecución","Suspendido","Terminado","Cierre expediente","Finalizado Cierre Contractual","En liquidación","Liquidado","Futuro"];

/* ================= CONTROL CRP POR CONTRATO ================= */
function ControlCRP({contratos,crp,convenios,perms,uid,onCampo,onCrearCRP,onBorrarCRP,toast}){
  const ed=perms.isAdminFull || perms.finCoord;
  const [modo,setModo]=useState("consolidado");
  const [open,setOpen]=useState(null);
  const num0=(v)=>Number(v||0);
  const saldo=(c)=> num0(c.proyectado_inicial)+num0(c.adiciones)-num0(c.ejecutado);
  const crpDe=(cid)=> crp.filter(x=>x.contrato_id===cid);
  const sumCrp=(cid)=> crpDe(cid).reduce((a,x)=>a+num0(x.valor),0);
  const [cf,setCf]=useState({}); const CF=(k)=>(e)=>setCf({...cf,[k]:e.target.value});
  const Celda=({c,campo})=> <FinCell value={c[campo]||0} editable={ed} onSave={(v)=>onCampo(c.id,campo,v)} fmt={cop}/>;
  const totCons=(campo)=>contratos.reduce((a,c)=>a+num0(c[campo]),0);

  return <div>
    <SectionHead eyebrow="Presupuesto" title="Control CRP por contrato" note={contratos.length+" contratos · rubros de misionalidad y convenios"}/>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
      {[["consolidado","Consolidado"],["proyeccion","Proyección (saldos por comprometer)"]].map(([k,l])=>
        <button key={k} onClick={()=>setModo(k)} className="btn" style={{background:modo===k?C.navy:"#fff",color:modo===k?"#fff":C.slate,border:"1px solid "+(modo===k?C.navy:C.line),borderRadius:9,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>{l}</button>)}
    </div>
    <p style={{fontSize:12,color:C.slate,marginBottom:10}}>Cada contrato cubre rubros bajo uno o varios CRP, de <b>misionalidad</b> y/o <b>convenios</b>. Abre un contrato para registrar sus CRP; la suma de CRP se compara con lo comprometido.</p>

    {modo==="consolidado"&&<div style={{...cardS,padding:0,overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:1050}}>
        <thead><tr>{["Contrato","Proyectado inicial","Comprometido (CRP)","Ejecutado (obra)","Girado","Adiciones","Prórroga (m)","Saldo por ejecutar","CRP"].map((h,i)=><th key={i} style={{...th,textAlign:i?"right":"left"}}>{h}</th>)}</tr></thead>
        <tbody>{contratos.map(c=>{const nCrp=crpDe(c.id).length; return <tr key={c.id} style={{borderTop:"1px solid "+C.line}}>
          <td style={{...td,fontSize:12.5,color:C.ink,fontWeight:600}}>{c.nombre}{c.es_asfaltico&&<span style={{fontSize:9,color:C.bronze,fontFamily:F.mono}}> · especial</span>}</td>
          <td style={{...td,textAlign:"right"}}><Celda c={c} campo="proyectado_inicial"/></td>
          <td style={{...td,textAlign:"right"}}><Celda c={c} campo="comprometido"/><div style={{fontSize:9,color:sumCrp(c.id)>num0(c.comprometido)?C.rojo:C.slate,fontFamily:F.mono}}>CRP: {cop(sumCrp(c.id))}</div></td>
          <td style={{...td,textAlign:"right"}}><Celda c={c} campo="ejecutado"/></td>
          <td style={{...td,textAlign:"right"}}><Celda c={c} campo="girado"/></td>
          <td style={{...td,textAlign:"right"}}><Celda c={c} campo="adiciones"/></td>
          <td style={{...td,textAlign:"right"}}><FinCell value={c.prorroga_meses||0} editable={ed} onSave={(v)=>onCampo(c.id,"prorroga_meses",v)} fmt={(x)=>num(x)}/></td>
          <td style={{...td,textAlign:"right",fontFamily:F.mono,fontWeight:700,color:saldo(c)<0?C.rojo:C.ink}}>{cop(saldo(c))}</td>
          <td style={{...td,textAlign:"center"}}><button onClick={()=>setOpen(open===c.id?null:c.id)} className="btn" style={{border:"1px solid "+C.line,background:open===c.id?C.navy:"#fff",color:open===c.id?"#fff":C.navy,borderRadius:7,padding:"4px 9px",fontSize:11,cursor:"pointer"}}>{nCrp} CRP</button></td>
        </tr>;})}
        <tr style={{borderTop:"2px solid "+C.bronze,background:"#FDF3E0"}}>
          <td style={{...td,fontWeight:700}}>TOTAL</td>
          <td style={{...td,textAlign:"right",fontFamily:F.mono,fontWeight:700}}>{cop(totCons("proyectado_inicial"))}</td>
          <td style={{...td,textAlign:"right",fontFamily:F.mono,fontWeight:700}}>{cop(totCons("comprometido"))}</td>
          <td style={{...td,textAlign:"right",fontFamily:F.mono,fontWeight:700}}>{cop(totCons("ejecutado"))}</td>
          <td style={{...td,textAlign:"right",fontFamily:F.mono,fontWeight:700}}>{cop(totCons("girado"))}</td>
          <td style={{...td,textAlign:"right",fontFamily:F.mono,fontWeight:700}}>{cop(totCons("adiciones"))}</td>
          <td style={td}></td>
          <td style={{...td,textAlign:"right",fontFamily:F.mono,fontWeight:700}}>{cop(contratos.reduce((a,c)=>a+saldo(c),0))}</td>
          <td style={td}></td>
        </tr></tbody>
      </table>
    </div>}

    {modo==="proyeccion"&&<div style={{...cardS,padding:0,overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}>
        <thead><tr>{["Contrato","Disponible CRP (por ejecutar)","Necesidad","Adición"].map((h,i)=><th key={i} style={{...th,textAlign:i?"right":"left"}}>{h}</th>)}</tr></thead>
        <tbody>{contratos.map(c=><Fragment key={c.id}>
          <tr style={{borderTop:"1px solid "+C.line}}>
            <td style={{...td,fontSize:12.5,color:C.ink,fontWeight:600}}>{c.nombre}{c.es_asfaltico&&<button onClick={()=>setOpen(open==="asf"+c.id?null:"asf"+c.id)} className="btn" style={{marginLeft:8,border:"1px solid "+C.bronze,background:"#fff",color:C.bronze,borderRadius:6,padding:"2px 7px",fontSize:10,cursor:"pointer"}}>detalle asfálticos</button>}</td>
            <td style={{...td,textAlign:"right"}}><Celda c={c} campo="disponible_crp"/></td>
            <td style={{...td,textAlign:"right"}}><Celda c={c} campo="necesidad"/></td>
            <td style={{...td,textAlign:"right"}}><Celda c={c} campo="adicion_proy"/></td>
          </tr>
          {c.es_asfaltico&&open==="asf"+c.id&&<tr><td colSpan={4} style={{padding:12,background:"#FBF7EE"}}>
            <div style={{fontSize:12,fontWeight:700,color:C.bronze,marginBottom:8}}>Productos asfálticos · detalle especial</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:10}}>
              {[["disp_crp_asfalto","Disponible CRP Asfalto",cop],["disp_crp_emulsion","Disponible CRP Emulsión",cop],["nec_mezcla_m3","Necesidad Mezcla Asfáltica (m³)",num],["nec_asfalto_sellos_kg","Necesidad Asfalto sellos de fisuras (KG)",num],["nec_emulsion_impr_m3","Necesidad Emulsión imprimación (m³)",num],["fresado_estab_m3","Fresado estabilizado (m³)",num],["adicion_proy","Adición",cop],["total_adicion","Total adición",cop]].map(([k,l,fmt])=>
                <div key={k} style={{...cardS,padding:10}}><div style={{fontSize:10.5,color:C.slate}}>{l}</div><div style={{marginTop:3}}><FinCell value={c[k]||0} editable={ed} onSave={(v)=>onCampo(c.id,k,v)} fmt={fmt}/></div></div>)}
            </div>
          </td></tr>}
        </Fragment>)}</tbody>
      </table>
    </div>}

    {open&&typeof open==="number"&&(()=>{const c=contratos.find(x=>x.id===open); if(!c) return null; const lista=crpDe(c.id);
      return <div style={{...cardS,marginTop:14,borderTop:"3px solid "+C.navy}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><CardTitle>CRP de: {c.nombre}</CardTitle><span onClick={()=>setOpen(null)} style={{cursor:"pointer",color:C.slate}}><X size={16}/></span></div>
        <p style={pSub}>Suma de CRP registrados: <b>{cop(sumCrp(c.id))}</b> · Comprometido del contrato: {cop(c.comprometido)}{sumCrp(c.id)>num0(c.comprometido)&&<span style={{color:C.rojo}}> · la suma de CRP supera lo comprometido</span>}</p>
        <div style={{overflowX:"auto",marginTop:6}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:560}}>
          <thead><tr>{["CRP","Origen","Convenio","Rubro","Valor",""].map((h,i)=><th key={i} style={th}>{h}</th>)}</tr></thead>
          <tbody>{lista.map(x=><tr key={x.id} style={{borderTop:"1px solid "+C.line}}>
            <td style={{...td,fontFamily:F.mono,fontSize:12}}>{x.crp||"—"}</td>
            <td style={td}><Chip bg={x.origen==="Convenio"?"#EAF0FB":"#EAF4EE"} fg={x.origen==="Convenio"?C.navy:C.verde}>{x.origen||"Misionalidad"}</Chip></td>
            <td style={{...td,fontSize:11.5,color:C.slate}}>{x.origen==="Convenio"?(convenios.find(cv=>cv.id===x.convenio_id)?.nombre||x.convenio_id||"—"):"—"}</td>
            <td style={{...td,fontSize:12}}>{x.rubro||"—"}</td>
            <td style={{...td,textAlign:"right",fontFamily:F.mono}}>{cop(x.valor)}</td>
            <td style={td}>{ed&&<span onClick={()=>{if(confirm("¿Eliminar este CRP?"))onBorrarCRP(x.id);}} style={{cursor:"pointer"}}><X size={13} color={C.rojo}/></span>}</td>
          </tr>)}
          {!lista.length&&<tr><td colSpan={6} style={{...td,color:C.slate,fontSize:12.5}}>Sin CRP registrados en este contrato.</td></tr>}</tbody>
        </table></div>
        {ed&&<div style={{marginTop:12,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,alignItems:"end"}}>
          <div><label style={lab}>N° CRP</label><input value={cf.crp||""} onChange={CF("crp")} style={inp}/></div>
          <div><label style={lab}>Origen</label><select value={cf.origen||"Misionalidad"} onChange={CF("origen")} style={inp}><option>Misionalidad</option><option>Convenio</option></select></div>
          <div><label style={lab}>Convenio</label><select value={cf.convenio_id||""} onChange={CF("convenio_id")} style={inp} disabled={cf.origen!=="Convenio"}><option value="">—</option>{convenios.map(cv=><option key={cv.id} value={cv.id}>{cv.nombre}</option>)}</select></div>
          <div><label style={lab}>Rubro</label><input value={cf.rubro||""} onChange={CF("rubro")} style={inp}/></div>
          <div><label style={lab}>Valor</label><input type="number" value={cf.valor||""} onChange={CF("valor")} style={inp}/></div>
          <button className="btn" onClick={()=>{ if(!cf.crp&&!cf.valor){toast("Ingresa al menos CRP y valor");return;} onCrearCRP({contrato_id:c.id,crp:cf.crp||"",origen:cf.origen||"Misionalidad",convenio_id:cf.origen==="Convenio"?(cf.convenio_id||null):null,rubro:cf.rubro||"",valor:Number(cf.valor)||0}); setCf({}); }} style={{background:C.verde,color:"#fff",border:"none",borderRadius:9,padding:"9px 14px",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>+ Agregar CRP</button>
        </div>}
      </div>;
    })()}
  </div>;
}

/* ================= GUÍA ================= */
function Guia({rol}){
  const GUIA=[

    {ic:LayoutDashboard,t:"Panel gerencial",d:"Es tu tablero de inicio. Muestra los indicadores clave en una fila (procesos, en rojo, liquidaciones vencidas, SIGMA, ejecución, stock bajo, apoyos al día), las alertas por vencimiento (60/30/15 días) y un botón de Reporte de actividad con la bitácora del sistema. Toca cualquier indicador para ir a la sección relacionada."},
    {ic:ListChecks,t:"Pendientes",d:"Tareas y compromisos de la gerencia. Cada pendiente tiene una prioridad con color: morado = Alta, naranja = Media, amarillo = Baja. Se marcan como atendidos describiendo cómo se gestionaron; los atendidos quedan registrados para trazabilidad. Los administradores pueden crear, cargar por Excel y eliminar."},
    {ic:CheckSquare,t:"Aprobaciones",d:"Tres pestañas: (1) Solicitudes de cambio que requieren visto bueno; (2) Cumplimiento documental de contratos y convenios, con observaciones; en Convenios se llevan los informes mensuales y semanales (Total/Entregados/Aprobados) y el cumplimiento se calcula como aprobados sobre el total; (3) Apoyos y residentes, con su avance de SIGMA, hojas de vida de segmentos e informe diario."},
    {ic:Handshake,t:"Asignaciones",d:"Tres pestañas: Vehículos por semana (semanario por día, de domingo a sábado, con placa, conductor, celular, programa, tipología y a quién se asigna; se sube el Excel semanal), Programación semanal (se sube el Excel del formato y queda consolidada por semana) y Unidades Ejecutoras (UE, inspector a cargo, actividades y director de obra). La administra la encargada de asignaciones o un administrador."},
    {ic:Target,t:"Metas",d:"Avance de metas del PDD 2024-2027, con láminas gráficas por ámbito y vista de actividades. El botón Presentación semanal (PDF) genera el reporte con el formato de la UMV, y Descargar .pptx entrega la presentación editable en PowerPoint con los datos actuales. Edita las cifras y la fecha de corte para actualizar la presentación cada semana."},
    {ic:Wallet,t:"Financiero",d:"Ejecución financiera de convenios y misionalidad. Pestañas Consolidado y Proyección, cada una con Resumen por convenio y Detalle por ítem de costo por localidad. Al abrir verás una franja con los totales y el porcentaje de ejecución global. Editan los directores de cada convenio y la coordinadora de convenios."},
    {ic:FileText,t:"Contratos",d:"Contratos de la gerencia (CPS y otros). Cada uno tiene su detalle con CDP/CRP múltiples, estado, fechas y responsable. Los estados incluyen En ejecución, Suspendido, Terminado, Cierre expediente (genera alerta hasta Finalizado Cierre Contractual), En liquidación y Liquidado. Al pasar a liquidación desaparecen de aquí y viven en Liquidaciones."},
    {ic:Handshake,t:"Convenios",d:"Convenios interadministrativos. Muestran contraparte, aportes, fechas, director y estado. Al pasar a En liquidación desaparecen de esta sección y aparecen en Liquidaciones. La nomenclatura es numero-año (por ejemplo 123-2026)."},
    {ic:ShieldCheck,t:"Liquidaciones",d:"Contratos y convenios en liquidación, editables con las mismas alertas, responsables de liquidación, saldo por liberar y hallazgos. Cuando el estado deja de ser No iniciada se bloquea el volver a ejecución. Al marcar Liquidada se pide el detalle y el link del SECOP, y pasa a la seccion Contratos Liquidados GIU para trazabilidad."},
    {ic:Package,t:"Inventario",d:"Control de insumos: existencias calculadas a partir de entradas, salidas y traslados; catálogo de materiales con stock mínimo y alertas de stock bajo; frentes y ubicaciones. Los administradores cargan movimientos y catálogo por Excel."},
    {ic:MapIcon,t:"Mapa",d:"Visor geográfico de intervenciones (se integrará el visor ArcGIS de la entidad cuando esté disponible el enlace)."},
    {ic:Users,t:"Roles",d:"Solo para súper-administrador y aprobadores. En una sola tabla ves y cambias el rol del sistema (permisos) y el rol funcional (cargo real) de cada persona. Además: encargada de asignaciones, director de cada convenio, encender o apagar módulos para presentaciones y descargar un respaldo del tablero en JSON."},
  ];
  return <div>
    <SectionHead eyebrow="Ayuda" title="Guía de uso de ATLAS" note="qué hace cada módulo"/>
    <div style={{...cardS,marginBottom:14,background:C.paper}}>
      <p style={{fontSize:13.5,color:C.ink,lineHeight:1.6,margin:0}}><b>ATLAS</b> es el tablero de gestión de la Gerencia de Infraestructura Urbana. Reúne alertas, trazabilidad, liquidaciones, avance y seguimiento en un solo lugar. Ingresas con tu <b>usuario</b> (no el correo) y tu contraseña; en el primer ingreso conviene cambiarla desde tu perfil. Lo que ves depende de tu rol: algunas secciones son solo para administradores. Los datos se guardan en tiempo real y se comparten con toda la gerencia.</p>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
      {GUIA.map((g,i)=>{const Ic=g.ic;return <div key={i} style={{...cardS}}>
        <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:6}}>
          <div style={{width:32,height:32,borderRadius:9,background:C.navy,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic size={17} color="#fff"/></div>
          <div style={{fontFamily:F.disp,fontWeight:700,fontSize:15,color:C.ink}}>{g.t}</div>
        </div>
        <p style={{fontSize:12.5,color:C.slate,lineHeight:1.6,margin:0}}>{g.d}</p>
      </div>;})}
    </div>
    <div style={{...cardS,marginTop:14,borderTop:"3px solid "+C.bronze}}>
      <CardTitle>Consejos rápidos</CardTitle>
      <ul style={{margin:"8px 0 0",paddingLeft:18,fontSize:12.5,color:C.slate,lineHeight:1.7}}>
        <li>Los colores de vencimiento van de verde (holgado) a rojo o negro (vencido). Atiende primero lo rojo.</li>
        <li>Casi todas las tablas tienen carga por Excel: descarga la plantilla, llénala y súbela.</li>
        <li>Si algo no te aparece, probablemente tu rol no tiene acceso a esa sección; consúltalo con el administrador.</li>
        <li>Ante cualquier duda o error, avisa al administrador del sistema para que lo revise.</li>
      </ul>
    </div>
  </div>;
}

function RolesView({profiles,convenios,isSuper,onCambiarRol,onAsignarDirector,onActivar,onRolFuncional,onCoordAsig,modulos,onToggleModulo,onExportTablero}){
  const g={};profiles.forEach(u=>{(g[u.rol]=g[u.rol]||[]).push(u);});
  const order=["super_admin","admin_aprobador","admin","admin_con_aprobacion","coordinador","responsable"];
  const roles=["super_admin","admin_aprobador","admin","admin_con_aprobacion","coordinador","responsable"];
  const rolesFunc=["","Administrador","Administrador_Aprobador","Administrativo","Apoyo Calidad y Gestión","Apoyo Obra","Apoyo PMT","Apoyo Señalización","Auxiliar Administrativo","Auxiliar Archivo","Coordinador","Director CicloInfraestructura","Director Convenio","Director Espacio Publico","Director Parcheo-Bacheo","Director Zona 1 - Norte","Director Zona 2 - Oriente","Director Zona 3 - Occidente","Director Zona 4 - Sur","Lider PMT","Líder Señalización","Residente","Seguimiento Contratos","Seguimiento Convenios","Supra_Admin"];
  return <div>
    <SectionHead eyebrow="Módulo 5" title="Roles y asignaciones" note={profiles.length+" personas"}/>

    {isSuper && <div style={{...cardS,marginBottom:14}}>
      <CardTitle>Personas · rol del sistema y rol funcional</CardTitle>
      <p style={pSub}>Todo en un solo lugar: el <b>rol del sistema</b> define permisos; el <b>rol funcional</b> es el cargo real (Apoyo obra, Residente…). Cambia cualquiera de los dos y aplica de inmediato.</p>
      <div style={{overflowX:"auto",marginTop:8}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}>
          <thead><tr>{["Persona","Estado","Rol del sistema","Rol funcional"].map((h,i)=><th key={i} style={th}>{h}</th>)}</tr></thead>
          <tbody>{[...profiles].sort((a,b)=>(a.nombre||a.usuario).localeCompare(b.nombre||b.usuario)).map(u=>
            <tr key={u.id} style={{borderTop:"1px solid "+C.line}}>
              <td style={td}><div style={{fontSize:13,color:u.activo===false?C.slate:C.ink,textDecoration:u.activo===false?"line-through":"none"}}>{u.nombre||u.usuario}</div><div style={{fontFamily:F.mono,fontSize:10.5,color:C.slate}}>@{u.usuario}</div></td>
              <td style={td}><button onClick={()=>onActivar(u.id,!(u.activo!==false))} className="btn" style={{border:"1px solid "+C.line,background:u.activo===false?"#EEF1F6":"#E7F3EC",color:u.activo===false?C.slate:C.verde,borderRadius:8,padding:"4px 9px",fontSize:10.5,cursor:"pointer",fontFamily:F.mono}}>{u.activo===false?"inactivo":"activo"}</button></td>
              <td style={td}><select value={u.rol} onChange={e=>onCambiarRol(u.id,e.target.value)} style={{border:"1px solid "+C.line,borderRadius:8,padding:"5px 8px",fontSize:12,color:C.ink,background:"#fff",cursor:"pointer"}}>{roles.map(r=><option key={r} value={r}>{rolTxt[r]}</option>)}</select></td>
              <td style={td}><select value={u.rol_funcional||""} onChange={e=>onRolFuncional(u.id,e.target.value)} style={{border:"1px solid "+C.line,borderRadius:8,padding:"5px 8px",fontSize:12,color:C.ink,background:"#fff",cursor:"pointer",minWidth:140}}>{rolesFunc.map(r=><option key={r} value={r}>{r||"— sin rol —"}</option>)}</select></td>
            </tr>)}</tbody>
        </table>
      </div>
    </div>}

    {isSuper && <div style={{...cardS,marginBottom:14}}>
      <CardTitle>Encargada de asignaciones</CardTitle>
      <p style={pSub}>Quien administra las Unidades Ejecutoras y el semanario de vehículos (ej. Karen Ruiz). Puede activarse a varias personas.</p>
      <div style={{maxHeight:220,overflowY:"auto",marginTop:6}}>
        {[...profiles].sort((a,b)=>(a.nombre||a.usuario).localeCompare(b.nombre||b.usuario)).map(u=>
          <div key={u.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:"6px 0",borderTop:"1px solid "+C.line}}>
            <span style={{fontSize:13,color:C.ink}}>{u.nombre||u.usuario} <span style={{color:C.slate,fontFamily:F.mono,fontSize:10.5}}>@{u.usuario}</span></span>
            <button onClick={()=>onCoordAsig(u.id,!u.coord_asignaciones)} className="btn" style={{border:"1px solid "+C.line,background:u.coord_asignaciones?"#E7F3EC":"#EEF1F6",color:u.coord_asignaciones?C.verde:C.slate,borderRadius:8,padding:"5px 12px",fontSize:11.5,cursor:"pointer",fontWeight:600}}>{u.coord_asignaciones?"encargada ✓":"activar"}</button>
          </div>)}
      </div>
    </div>}

    {isSuper && <div style={{...cardS,marginBottom:14}}>
      <CardTitle>Director de cada convenio</CardTitle>
      <p style={pSub}>El director asignado puede editar las cifras financieras de su convenio. Una persona puede dirigir varios.</p>
      {convenios.map(cv=>
        <div key={cv.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:"7px 0",borderTop:"1px solid "+C.line}}>
          <span style={{fontSize:13,color:C.ink}}>{cv.nombre}</span>
          <select value={cv.director_id||""} onChange={e=>onAsignarDirector(cv.id,e.target.value)} style={{border:"1px solid "+C.line,borderRadius:8,padding:"5px 8px",fontSize:12,color:C.ink,background:"#fff",cursor:"pointer",maxWidth:200}}>
            <option value="">— sin director —</option>
            {profiles.map(u=><option key={u.id} value={u.id}>{u.nombre||u.usuario}</option>)}</select>
        </div>)}
      {convenios.length===0&&<div style={{fontSize:12.5,color:C.slate}}>No hay convenios.</div>}
    </div>}

    {order.filter(r=>g[r]).map(r=><div key={r} style={{...cardS,marginBottom:12}}>
      <CardTitle style={{color:C.bronze}}>{rolTxt[r]} <span style={{color:C.slate,fontFamily:F.mono,fontSize:11}}>· {g[r].length}</span></CardTitle>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
        {g[r].map(u=><span key={u.id} style={{fontSize:12.5,color:C.ink,background:C.paper,border:"1px solid "+C.line,borderRadius:8,padding:"5px 10px"}}>{u.nombre||u.usuario} <span style={{color:C.slate,fontFamily:F.mono,fontSize:10.5}}>@{u.usuario}</span></span>)}</div>
    </div>)}

    {isSuper && <div style={{...cardS,marginTop:14,borderTop:"3px solid "+C.bronze}}>
      <CardTitle>Módulos visibles (presentaciones)</CardTitle>
      <p style={pSub}>Enciende o apaga secciones del menú para todos los usuarios. Útil para mostrar solo lo afinado. Panel y Roles siempre quedan visibles para ti.</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
        {MODULOS_LISTA.map(([id,l])=>{const vis=modulos.find(m=>m.modulo===id)?.visible!==false;
          return <button key={id} onClick={()=>onToggleModulo(id,!vis)} className="btn" style={{border:"1px solid "+(vis?C.verde:C.line),background:vis?"#E7F3EC":"#F1F3F7",color:vis?C.verde:C.slate,borderRadius:9,padding:"7px 12px",fontSize:12.5,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>{vis?"● ":"○ "}{l}</button>;})}
      </div>
      <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid "+C.line}}>
        <CardTitle>Respaldo del tablero</CardTitle>
        <p style={pSub}>Descarga una copia de todos los datos en un archivo (JSON) para respaldo o para trabajar ejemplos.</p>
        <button className="btn" onClick={onExportTablero} style={{marginTop:6,background:C.navy,color:"#fff",border:"none",borderRadius:9,padding:"9px 16px",fontSize:13,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:8}}><Download size={15}/> Descargar tablero (JSON)</button>
      </div>
    </div>}
  </div>;
}

/* ================= ALERTAS ================= */
function Alertas({procs,pends,aprob,onPick}){
  const items=[];
  procs.forEach(p=>{ if(p.fin){const d=dias(p.fin); if(d<=60) items.push({k:"Contrato",txt:(p.inter||p.loc||p.id)+" · "+p.id,d,sev:sem(p.fin),obj:p});} });
  procs.forEach(p=>{ if(p.liq==="Vencida") items.push({k:"Liquidación vencida",txt:p.id+" · liberar "+cop(p.liberar||0),d:dias(p.fin),sev:"NEGRO",obj:p}); });
  aprob.filter(a=>a.estado==="pendiente"&&a.limite).forEach(a=>{ const d=dias(a.limite); items.push({k:"Aprobación",txt:a.proceso_id+" · "+a.campo,d,sev:sem(a.limite)}); });
  items.sort((a,b)=>(sevW[b.sev]-sevW[a.sev])||(a.d-b.d));
  const venc=items.filter(i=>i.d<0).length, r15=items.filter(i=>i.d>=0&&i.d<15).length, r30=items.filter(i=>i.d>=15&&i.d<30).length;
  const kpis=[["Vencidos",venc,C.negro],["≤ 15 días",r15,C.rojo],["15–30 días",r30,C.naranja],["Total en alerta",items.length,C.bronze]];
  return <div>
    <SectionHead eyebrow="Centro de alertas" title="Qué exige atención" note="60 · 30 · 15 días"/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
      {kpis.map((k,i)=><div key={i} style={cardS}><div style={{fontSize:12,color:C.slate}}>{k[0]}</div><div style={{fontFamily:F.disp,fontSize:30,fontWeight:600,color:k[2],marginTop:4}}>{k[1]}</div></div>)}
    </div>
    <div style={{...cardS,marginTop:14,padding:0,overflow:"hidden"}}>
      {items.length===0&&<div style={{padding:16,fontSize:13,color:C.slate}}>Nada urgente por ahora. 👌</div>}
      {items.slice(0,50).map((it,i)=><div key={i} onClick={()=>it.obj&&onPick(it.obj)} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",borderTop:i?"1px solid "+C.line:"none",cursor:it.obj?"pointer":"default",background:it.d<0?"#FBEDEC":"#fff"}}>
        <Dot s={it.sev}/>
        <Chip bg="#EEF1F6" fg={C.slate}>{it.k}</Chip>
        <span style={{flex:1,minWidth:0,fontSize:13,color:C.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{it.txt}</span>
        <span style={{fontFamily:F.mono,fontSize:11.5,fontWeight:600,color:SEM[it.sev]}}>{it.d<0?"vencido "+Math.abs(it.d)+"d":it.d+"d"}</span>
      </div>)}
      {items.length>50&&<div style={{padding:"8px 16px",fontSize:11,color:C.slate}}>… y {items.length-50} más.</div>}
    </div>
    <p style={{fontSize:11.5,color:C.slate,marginTop:10}}>Toca un contrato o liquidación para abrirlo. Las filas rojizas ya están vencidas.</p>
  </div>;
}

/* ================= CUMPLIMIENTO APOYOS Y RESIDENTES ================= */
function CumplimientoPersonal({data,perms,onCampo,onCrear,onBorrar,onCarga,usuarioDe,profiles,toast}){
  const ed=perms.isAdminFull;
  const opt=["Sí","Parcial","No","N/A"];
  const col=(v)=> v==="Sí"?C.verde:v==="Parcial"?C.amarillo:v==="No"?C.rojo:C.slate;
  const [nuevo,setNuevo]=useState(false); const [f,setF]=useState({rol:"apoyo"});
  const S=(k)=>(e)=>setF({...f,[k]:e.target.value});
  const reqs=[["sigma","SIGMA"],["hv_segmentos","HV de segmentos"],["informe_diario","Informe diario"]];
  const campos={sigma:["sigma_total","sigma_gest"],hv_segmentos:["hv_total","hv_gest"],informe_diario:["inf_total","inf_gest"]};
  const sumT=(k)=>data.reduce((a,d)=>a+Number(d[campos[k][0]]||0),0);
  const sumG=(k)=>data.reduce((a,d)=>a+Number(d[campos[k][1]]||0),0);
  const estado=(g,t)=>{ if(!t) return {txt:"—",c:C.slate,p:0}; const p=Math.round(g/t*100); return p>95?{txt:"Sí",c:C.verde,p}:p>=75?{txt:"Parcial",c:C.amarillo,p}:{txt:"No",c:C.rojo,p}; };
  const tot=data.length||1;
  const pct=(k)=>{const t=sumT(k);return t?Math.round(sumG(k)/t*100):0;};
  const CasoCel=({d,campo})=>{const [tk,gk]=campos[campo]; const t=Number(d[tk]||0),g=Number(d[gk]||0),pend=Math.max(0,t-g); const st=estado(g,t);
    return ed
      ? <div style={{display:"flex",alignItems:"center",gap:4}} title={pend+" pendientes por gestionar"}>
          <input type="number" defaultValue={g} onBlur={e=>{if(String(e.target.value)!==String(g))onCampo(d.id,gk,Number(e.target.value)||0);}} style={{width:38,border:"1px solid "+C.line,borderRadius:6,padding:"3px",fontSize:11,textAlign:"center"}} title="Gestionados"/>
          <span style={{color:C.slate}}>/</span>
          <input type="number" defaultValue={t} onBlur={e=>{if(String(e.target.value)!==String(t))onCampo(d.id,tk,Number(e.target.value)||0);}} style={{width:38,border:"1px solid "+C.line,borderRadius:6,padding:"3px",fontSize:11,textAlign:"center"}} title="Total"/>
          <Chip bg={st.c+"22"} fg={st.c}>{st.txt} {st.p}%</Chip></div>
      : <div style={{display:"flex",alignItems:"center",gap:5}} title={pend+" pendientes"}><span style={{fontFamily:F.mono,fontSize:11}}>{g}/{t}</span><Chip bg={st.c+"22"} fg={st.c}>{st.txt} {st.p}%</Chip></div>;
  };
  // Importar del personal con rol funcional Apoyo obra / Residente / 1
  const candidatos=(profiles||[]).filter(p=>["1","apoyo obra","residente"].includes(String(p.rol_funcional||"").toLowerCase()));
  const yaCargados=new Set(data.map(d=>String(d.nombre||"").trim().toLowerCase()));
  const porImportar=candidatos.filter(p=>!yaCargados.has(String(p.nombre||p.usuario||"").trim().toLowerCase()));
  function importar(){
    if(!porImportar.length){toast("No hay personal nuevo con rol funcional Apoyo obra / Residente / 1");return;}
    const filas=porImportar.map(p=>({nombre:p.nombre||p.usuario,rol:String(p.rol_funcional||"").toLowerCase()==="residente"?"residente":"apoyo",frente:"",sigma:"No",hv_segmentos:"No",informe_diario:"No",corte:null,obs:""}));
    onCarga("cumplimiento_personal",filas);
  }
  const rolesOK=["1","apoyo obra","residente"];
  const perfilDe=(nm)=> (profiles||[]).find(p=>String(p.nombre||p.usuario||"").trim().toLowerCase()===String(nm||"").trim().toLowerCase());
  const yaNoAplican=data.filter(d=>{const p=perfilDe(d.nombre); return p && !rolesOK.includes(String(p.rol_funcional||"").toLowerCase());});
  function depurar(){
    if(!yaNoAplican.length){toast("Todos los registrados siguen siendo apoyo o residente");return;}
    if(!confirm("Quitar de Apoyos y residentes a "+yaNoAplican.length+" persona(s) cuyo rol funcional ya no es Apoyo obra/Residente. ¿Continuar?"))return;
    yaNoAplican.forEach(d=>onBorrar("cumplimiento_personal",d.id));
  }
  const Cel=({d,campo})=> ed
    ? <select value={d[campo]||"No"} onChange={e=>onCampo(d.id,campo,e.target.value)} style={{border:"1px solid "+C.line,borderRadius:8,padding:"4px 7px",fontSize:12,background:"#fff",color:col(d[campo]),fontWeight:600,cursor:"pointer"}}>{opt.map(o=><option key={o}>{o}</option>)}</select>
    : <Chip bg={col(d[campo])+"22"} fg={col(d[campo])}>{d[campo]||"No"}</Chip>;
  function crear(){ if(!f.nombre){toast("Falta el nombre");return;}
    onCrear("cumplimiento_personal",{nombre:f.nombre,rol:f.rol||"apoyo",frente:f.frente||"",sigma:f.sigma||"No",hv_segmentos:f.hv_segmentos||"No",informe_diario:f.informe_diario||"No",corte:f.corte||null,obs:f.obs||""});
    setNuevo(false); setF({rol:"apoyo"});
  }
  return <div>
    <div style={{...cardS,marginBottom:12,borderLeft:"4px solid "+C.bronze,background:"#FBF6EA"}}>
      <div style={{fontSize:12.5,color:C.ink}}>Control del cumplimiento documental de <b>apoyos y residentes</b>: SIGMA, Hojas de Vida de segmentos e Informe de actividades diarias. Lo administra el equipo de Sandra Rodríguez; puedes cargar en masa desde la plantilla al final.</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:12}}>
      {reqs.map(([k,l])=><div key={k} style={cardS}><div style={{fontSize:12,color:C.slate}}>{l} al día</div><div style={{fontFamily:F.disp,fontSize:26,fontWeight:600,color:C.bronze,marginTop:4}}>{pct(k)}%</div><div style={{marginTop:6}}><Bar pct={pct(k)} color={C.bronze}/></div></div>)}
    </div>
    {ed&&<div style={{marginBottom:12,display:"flex",gap:8,flexWrap:"wrap"}}>
      <button className="btn" onClick={()=>setNuevo(!nuevo)} style={{background:nuevo?"#EEF1F6":C.navy,color:nuevo?C.ink:"#fff",border:"none",borderRadius:9,padding:"9px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>{nuevo?"Cancelar":"+ Agregar persona"}</button>
      <button className="btn" onClick={importar} title="Trae de Roles al personal con rol funcional Apoyo obra, Residente o 1" style={{background:C.bronze,color:"#fff",border:"none",borderRadius:9,padding:"9px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Cargar desde personal ({porImportar.length})</button>
      {yaNoAplican.length>0&&<button className="btn" onClick={depurar} title="Quita a quienes ya no tienen rol funcional Apoyo obra/Residente" style={{background:"#fff",color:C.rojo,border:"1px solid "+C.rojo,borderRadius:9,padding:"9px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Depurar ({yaNoAplican.length})</button>}
      {nuevo&&<div style={{...cardS,marginTop:10}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
          <div style={{gridColumn:"span 2"}}><label style={lab}>Nombre*</label><input value={f.nombre||""} onChange={S("nombre")} style={inp}/></div>
          <div><label style={lab}>Rol</label><select value={f.rol} onChange={S("rol")} style={inp}><option value="apoyo">Apoyo</option><option value="residente">Residente</option></select></div>
          <div><label style={lab}>Frente</label><input value={f.frente||""} onChange={S("frente")} style={inp}/></div>
          <div><label style={lab}>Corte</label><input type="date" value={f.corte||""} onChange={S("corte")} style={inp}/></div>
          {reqs.map(([k,l])=><div key={k}><label style={lab}>{l}</label><select value={f[k]||"No"} onChange={S(k)} style={inp}>{opt.map(o=><option key={o}>{o}</option>)}</select></div>)}
        </div>
        <button className="btn" onClick={crear} style={{marginTop:12,background:C.verde,color:"#fff",border:"none",borderRadius:9,padding:"9px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Guardar</button>
      </div>}
    </div>}
    <div style={{...cardS,padding:0,overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:680}}>
        <thead><tr>{["Persona","Rol","Frente","SIGMA (gest/total)","HV segmentos (gest/total)","Informe diario (gest/total)","Corte",""].map((h,i)=><th key={i} style={th}>{h}</th>)}</tr></thead>
        <tbody>{data.map(d=><tr key={d.id} style={{borderTop:"1px solid "+C.line}}>
          <td style={{...td,fontSize:12.5,color:C.ink}}>{d.nombre}</td>
          <td style={td}><Chip bg="#EEF1F6" fg={C.slate}>{d.rol}</Chip></td>
          <td style={{...td,fontSize:12,color:C.slate}}>{d.frente||"—"}</td>
          <td style={td}><CasoCel d={d} campo="sigma"/></td>
          <td style={td}><CasoCel d={d} campo="hv_segmentos"/></td>
          <td style={td}><CasoCel d={d} campo="informe_diario"/></td>
          <td style={{...td,fontFamily:F.mono,fontSize:11,color:C.slate}}>{d.corte?fecha(d.corte):"—"}</td>
          <td style={td}>{ed&&<span onClick={()=>{if(confirm("¿Eliminar a "+d.nombre+"?"))onBorrar("cumplimiento_personal",d.id);}} style={{cursor:"pointer"}}><X size={14} color={C.rojo}/></span>}</td>
        </tr>)}
        {data.length===0&&<tr><td colSpan={8} style={{...td,color:C.slate,fontSize:13}}>Sin registros. Agrega personas o carga la plantilla abajo.</td></tr>}</tbody>
      </table>
    </div>
    {ed&&<CargaBloque tipo="cumplimiento_personal" filas={data} onCarga={onCarga} usuarioDe={usuarioDe} toast={toast}/>}
  </div>;
}

/* ================= CUMPLIMIENTO DOCUMENTAL ================= */
function Cumplimiento({procs,convenios,perms,onCampo,onCampoConv}){
  const ed=perms.isAdminFull;
  const [vista,setVista]=useState("contratos");
  const opt=["Sí","Parcial","No","N/A"];
  const col=(v)=> v==="Sí"?C.verde:v==="Parcial"?C.amarillo:v==="No"?C.rojo:C.slate;
  const tot=procs.length||1;
  const pctS=Math.round(procs.filter(p=>p.sigma==="Sí").length/tot*100);
  const pctSc=Math.round(procs.filter(p=>p.secop==="Sí").length/tot*100);
  const Cel=({p,campo})=> ed
    ? <select value={p[campo]||"No"} onChange={e=>onCampo(p.id,campo,e.target.value)} style={{border:"1px solid "+C.line,borderRadius:8,padding:"5px 8px",fontSize:12,background:"#fff",color:col(p[campo]),fontWeight:600,cursor:"pointer"}}>{opt.map(o=><option key={o}>{o}</option>)}</select>
    : <Chip bg={col(p[campo])+"22"} fg={col(p[campo])}>{p[campo]||"No"}</Chip>;
  const ObsCell=({row,tabla})=> ed
    ? <input defaultValue={row.obs_cumpl||""} onBlur={e=>{if(e.target.value!==(row.obs_cumpl||"")){tabla==="convenios"?onCampoConv(row.id,"obs_cumpl",e.target.value):onCampo(row.id,"obs_cumpl",e.target.value);}}} placeholder="detallar problema o solicitud…" style={{width:"100%",minWidth:160,border:"1px solid "+C.line,borderRadius:8,padding:"6px 8px",fontSize:12}}/>
    : <span style={{fontSize:12,color:C.slate}}>{row.obs_cumpl||"—"}</span>;
  return <div>
    <SectionHead eyebrow="Etapa 2" title="Cumplimiento documental" note="SIGMA · SECOP · observaciones"/>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
      <div style={cardS}><div style={{fontSize:12,color:C.slate}}>Con SIGMA al día</div><div style={{fontFamily:F.disp,fontSize:30,fontWeight:600,color:C.bronze,marginTop:4}}>{pctS}%</div><div style={{marginTop:6}}><Bar pct={pctS} color={C.bronze}/></div></div>
      <div style={cardS}><div style={{fontSize:12,color:C.slate}}>Publicado en SECOP</div><div style={{fontFamily:F.disp,fontSize:30,fontWeight:600,color:C.navy,marginTop:4}}>{pctSc}%</div><div style={{marginTop:6}}><Bar pct={pctSc} color={C.navy}/></div></div>
    </div>
    <div style={{...cardS,marginTop:14,borderLeft:"4px solid "+C.bronze}}>
      <div style={{fontSize:12.5,color:C.slate}}>Estado del cargue documental por proceso, tomado de las secciones Contratos y Convenios. Usa <b>Observaciones</b> para detallar el problema o la solicitud de aprobación. Los rojos frenan pagos y liquidaciones.</div>
    </div>
    <div style={{display:"flex",gap:8,marginTop:14,marginBottom:2,flexWrap:"wrap"}}>
      {[["contratos","Contratos"],["convenios","Convenios"]].map(([k,l])=>
        <button key={k} onClick={()=>setVista(k)} className="btn" style={{background:vista===k?C.navy:"#fff",color:vista===k?"#fff":C.slate,border:"1px solid "+(vista===k?C.navy:C.line),borderRadius:9,padding:"7px 14px",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>{l}</button>)}
    </div>
    {vista==="contratos"&&<div style={{...cardS,padding:0,marginTop:10,overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:760}}>
        <thead><tr>{["Proceso","Convenio","Etapa","SIGMA","SECOP","Observaciones"].map((h,i)=><th key={i} style={th}>{h}</th>)}</tr></thead>
        <tbody>{procs.map(p=><tr key={p.id} style={{borderTop:"1px solid "+C.line}}>
          <td style={{...td,fontFamily:F.mono,fontSize:12.5,color:C.ink,fontWeight:600}}>{p.id}</td>
          <td style={{...td,fontSize:12,color:C.slate}}>{p.convenio_id||"—"}</td>
          <td style={{...td,fontSize:12,color:C.slate}}>{p.estado}</td>
          <td style={td}><Cel p={p} campo="sigma"/></td>
          <td style={td}><Cel p={p} campo="secop"/></td>
          <td style={td}><ObsCell row={p} tabla="procesos"/></td>
        </tr>)}
        {procs.length===0&&<tr><td colSpan={6} style={{...td,color:C.slate,fontSize:13}}>Sin procesos visibles.</td></tr>}</tbody>
      </table>
    </div>}
    {vista==="convenios"&&<div style={{...cardS,padding:0,marginTop:10,overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:920}}>
        <thead><tr>{["Convenio","Estado","Inf. mensuales (T/E/A)","Inf. semanales (T/E/A)","Cumplimiento","Observaciones"].map((h,i)=><th key={i} style={th}>{h}</th>)}</tr></thead>
        <tbody>{(convenios||[]).map(cv=>{
          const T=(Number(cv.inf_mens_total)||0)+(Number(cv.inf_sem_total)||0);
          const A=(Number(cv.inf_mens_aprob)||0)+(Number(cv.inf_sem_aprob)||0);
          const pc=T?Math.round(A/T*100):0;
          const N=(campo)=> ed
            ? <input type="number" defaultValue={cv[campo]||0} onBlur={e=>{if(String(e.target.value)!==String(cv[campo]||0))onCampoConv(cv.id,campo,Number(e.target.value)||0);}} style={{width:44,border:"1px solid "+C.line,borderRadius:6,padding:"3px 4px",fontSize:11,textAlign:"center"}}/>
            : <span style={{fontFamily:F.mono,fontSize:11}}>{cv[campo]||0}</span>;
          return <tr key={cv.id} style={{borderTop:"1px solid "+C.line}}>
            <td style={{...td}}><div style={{fontSize:12.5,color:C.ink,fontWeight:600}}>{cv.nombre}</div><div style={{fontFamily:F.mono,fontSize:10.5,color:C.slate}}>{cv.id}</div></td>
            <td style={td}><Chip bg={C.paper} fg={cv.estado==="En liquidación"?C.naranja:C.slate}>{cv.estado}</Chip></td>
            <td style={td}><div style={{display:"flex",gap:3,alignItems:"center"}}>{N("inf_mens_total")}<span style={{color:C.slate}}>/</span>{N("inf_mens_entreg")}<span style={{color:C.slate}}>/</span>{N("inf_mens_aprob")}</div></td>
            <td style={td}><div style={{display:"flex",gap:3,alignItems:"center"}}>{N("inf_sem_total")}<span style={{color:C.slate}}>/</span>{N("inf_sem_entreg")}<span style={{color:C.slate}}>/</span>{N("inf_sem_aprob")}</div></td>
            <td style={td}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:50}}><Bar pct={pc} color={pc>=80?C.verde:pc>=50?C.amarillo:C.rojo}/></div><span style={{fontFamily:F.mono,fontSize:12,fontWeight:700,color:pc>=80?C.verde:C.ink}}>{pc}%</span></div><div style={{fontSize:9.5,color:C.slate,fontFamily:F.mono}}>{A}/{T} aprob.</div></td>
            <td style={td}><ObsCell row={cv} tabla="convenios"/></td>
          </tr>;})}
          {(convenios||[]).length===0&&<tr><td colSpan={6} style={{...td,color:C.slate,fontSize:13}}>Sin convenios visibles.</td></tr>}</tbody>
      </table>
      <div style={{fontSize:11,color:C.slate,padding:"8px 12px"}}>T = total · E = entregados · A = aprobados. El cumplimiento del convenio = informes aprobados / total de informes.</div>
    </div>}
  </div>;
}

/* ================= LIQUIDACIONES ================= */
function Liquidaciones({procs,convenios,manuales,profiles,perms,uid,onCampo,onCampoConv,onCampoManual,onCrearManual,onBorrarManual,onEstadoConv,nombreDe,toast}){
  const rowsC=procs.filter(p=>["En liquidación","Liquidado","Cierre expediente"].includes(p.estado)||["En trámite","Vencida","Liquidada"].includes(p.liq))
    .map(p=>({...p,_tabla:"procesos",_nombre:p.id,_conv:p.convenio_id||"—"}));
  const rowsV=(convenios||[]).filter(c=>c.estado==="En liquidación")
    .map(c=>({...c,_tabla:"convenios",_nombre:c.nombre,_conv:c.id,heredado:false}));
  const rowsM=(manuales||[]).map(m=>({...m,_tabla:"liq_manual",_nombre:m.nombre,_conv:m.objeto||"manual",_manual:true}));
  const rowsAll=[...rowsC,...rowsV,...rowsM].sort((a,b)=>(a.liq==="Vencida"?-1:0)-(b.liq==="Vencida"?-1:0)||new Date(a.fin||0)-new Date(b.fin||0));
  const rows=rowsAll.filter(r=>r.liq!=="Liquidada");
  const liquidados=rowsAll.filter(r=>r.liq==="Liquidada");
  const ed=perms.isAdminFull;
  const edFila=(p)=> ed || p.liq_resp1===uid || p.liq_resp2===uid;
  const [mf,setMf]=useState({}); const MF=(k)=>(e)=>setMf({...mf,[k]:e.target.value});
  const setCampo=(row,campo,v)=> row._tabla==="convenios" ? onCampoConv(row.id,campo,v) : row._tabla==="liq_manual" ? onCampoManual(row.id,campo,v) : onCampo(row.id,campo,v);
  function onLiqChange(row,val){
    if(val==="Liquidada"){
      const det=prompt("Detalle de liquidación (obligatorio):",row.liq_detalle||"");
      if(det===null||!det.trim()){ return; }
      const sec=prompt("Link SECOP de la liquidación:",row.liq_secop||"")||"";
      setCampo(row,"liq_detalle",det.trim()); setCampo(row,"liq_secop",sec.trim());
    }
    setCampo(row,"liq",val);
  }
  const convLiq=(convenios||[]).filter(c=>c.estado==="En liquidación");
  const enLiq=rows.filter(p=>p.estado==="En liquidación").length;
  const venc=rows.filter(p=>p.liq==="Vencida").length;
  const heredados=rows.filter(p=>p.heredado).length;
  const porLiberar=rows.reduce((a,p)=>a+Number(p.liberar||0),0);
  const kpis=[["En liquidación",enLiq,C.naranja],["Liquidación vencida",venc,C.rojo],["Heredados (línea base)",heredados,C.negro],["Saldo por liberar",cop(porLiberar),C.verde]];
  const liqOpts=["No iniciada","En trámite","Vencida","Liquidada","No aplica"];
  return <div>
    <SectionHead eyebrow="Etapa 4" title="Liquidaciones" note={rows.length+" procesos"}/>
    {ed&&<div style={{...cardS,marginBottom:12,display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
      <div><label style={lab}>Liquidación manual (sin contrato) — Nombre*</label><input value={mf.nombre||""} onChange={MF("nombre")} placeholder="Ej. Convenio 123-2024" style={{...inp,minWidth:200}}/></div>
      <div><label style={lab}>Objeto</label><input value={mf.objeto||""} onChange={MF("objeto")} style={{...inp,minWidth:160}}/></div>
      <div><label style={lab}>Fecha fin</label><input type="date" value={mf.fin||""} onChange={MF("fin")} style={inp}/></div>
      <button className="btn" onClick={()=>{ if(!mf.nombre){toast("Falta el nombre");return;} onCrearManual({nombre:mf.nombre,objeto:mf.objeto||"",fin:mf.fin||null,liq:"No iniciada"}); setMf({}); }} style={{background:C.verde,color:"#fff",border:"none",borderRadius:9,padding:"9px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>+ Agregar liquidación</button>
    </div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
      {kpis.map((k,i)=><div key={i} style={cardS}><div style={{fontSize:12,color:C.slate}}>{k[0]}</div><div style={{fontFamily:F.disp,fontSize:26,fontWeight:600,color:k[2],marginTop:4}}>{k[1]}</div></div>)}
    </div>
    <div style={{...cardS,marginTop:14,borderLeft:"4px solid "+C.negro}}>
      <div style={{fontSize:12.5,color:C.slate}}>Los procesos <b>heredados</b> conservan su línea base (foto de lo recibido). Vigila las <b style={{color:C.rojo}}>liquidaciones vencidas</b>: son riesgo directo de la gerencia. Edita el estado, el saldo por liberar y los hallazgos.</div>
    </div>
    {convLiq.length>0&&<div style={{...cardS,marginTop:14}}>
      <CardTitle style={{marginBottom:6}}>Convenios en liquidación</CardTitle>
      {convLiq.map(cv=><div key={cv.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:"8px 0",borderTop:"1px solid "+C.line,flexWrap:"wrap"}}>
        <div><span style={{fontSize:13,color:C.ink,fontWeight:600}}>{cv.nombre}</span> <span style={{fontFamily:F.mono,fontSize:10.5,color:C.slate}}>{cv.id} · termina {fecha(cv.fin)}</span></div>
        {perms.isAdminFull&&<button className="btn" onClick={()=>onEstadoConv(cv.id,"En ejecución")} style={{background:C.verde,color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:600,cursor:"pointer"}}>Volver a En ejecución</button>}
      </div>)}
    </div>}
    <div style={{...cardS,padding:0,marginTop:14,overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:820}}>
        <thead><tr>{["Proceso","Convenio","Fin","Responsables liq.","Estado liq.","Saldo por liberar","Hallazgos",""].map((h,i)=><th key={i} style={{...th,textAlign:i>=5&&i<7?"right":"left"}}>{h}</th>)}</tr></thead>
        <tbody>{rows.map(p=>{const d=dias(p.fin); const ef=edFila(p);
          return <tr key={p._tabla+"-"+p.id} style={{borderTop:"1px solid "+C.line}}>
            <td style={td}><span style={{fontFamily:F.mono,fontSize:12.5,color:C.ink,fontWeight:600}}>{p._nombre}</span>{p._tabla==="convenios"&&<div style={{fontSize:10,color:C.bronze,fontFamily:F.mono}}>convenio</div>}{p._manual&&<div style={{fontSize:10,color:C.navy,fontFamily:F.mono}}>manual</div>}{p.heredado&&<div style={{fontSize:10,color:C.negro,fontFamily:F.mono}}>heredado</div>}</td>
            <td style={{...td,fontSize:12,color:C.slate}}>{p._conv}</td>
            <td style={td}>{p.fin?<Chip bg={SEM[sem(p.fin)]+"22"} fg={SEM[sem(p.fin)]}>{d<0?"vencido":d+"d"}</Chip>:"—"}</td>
            <td style={td}>{ed
              ? <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {["liq_resp1","liq_resp2"].map(k=><select key={k} value={p[k]||""} onChange={e=>setCampo(p,k,e.target.value)} style={{border:"1px solid "+C.line,borderRadius:7,padding:"3px 6px",fontSize:11,background:"#fff",color:C.ink,cursor:"pointer",maxWidth:150}}><option value="">— {k==="liq_resp1"?"resp. 1":"resp. 2"} —</option>{profiles.map(u=><option key={u.id} value={u.id}>{u.nombre||u.usuario}</option>)}</select>)}
                </div>
              : <div style={{fontSize:11,color:C.slate}}>{[p.liq_resp1,p.liq_resp2].filter(Boolean).map(id=>nombreDe(id)).join(", ")||"—"}</div>}</td>
            <td style={td}><select disabled={!ef} value={p.liq||"No iniciada"} onChange={e=>onLiqChange(p,e.target.value)} style={{border:"1px solid "+C.line,borderRadius:8,padding:"5px 8px",fontSize:12,background:"#fff",color:p.liq==="Vencida"?C.rojo:C.ink,cursor:ef?"pointer":"default",opacity:ef?1:.7}}>{liqOpts.map(o=><option key={o}>{o}</option>)}</select></td>
            <td style={{...td,textAlign:"right"}}><FinCell value={p.liberar||0} editable={ef} onSave={(v)=>setCampo(p,"liberar",v)} fmt={cop}/></td>
            <td style={td}>{ef?<input defaultValue={p.hall||""} onBlur={e=>{if(e.target.value!==(p.hall||""))setCampo(p,"hall",e.target.value);}} placeholder="—" style={{width:"100%",border:"1px solid "+C.line,borderRadius:8,padding:"6px 8px",fontSize:12}}/>:<span style={{fontSize:12,color:C.slate}}>{p.hall||"—"}</span>}</td>
            <td style={td}>{p._tabla==="convenios"&&ed&&(!p.liq||p.liq==="No iniciada")&&<button className="btn" onClick={()=>onEstadoConv(p.id,"En ejecución")} title="Volver a ejecución" style={{background:C.verde,color:"#fff",border:"none",borderRadius:7,padding:"4px 8px",fontSize:10.5,fontWeight:600,cursor:"pointer"}}>▲ ejecución</button>}{p._manual&&ed&&<span onClick={()=>{if(confirm("¿Eliminar esta liquidación manual?"))onBorrarManual(p.id);}} title="Eliminar (manual)" style={{cursor:"pointer"}}><X size={14} color={C.rojo}/></span>}{p.hall&&p.hall!=="No"&&p._tabla!=="convenios"&&!p._manual&&<Chip bg={C.rojo+"18"} fg={C.rojo}>hallazgo</Chip>}</td>
          </tr>;})}
          {rows.length===0&&<tr><td colSpan={8} style={{...td,color:C.slate,fontSize:13}}>No hay procesos ni convenios en liquidación visibles.</td></tr>}
        </tbody>
      </table>
    </div>

    {liquidados.length>0&&<div style={{...cardS,marginTop:18,borderTop:"3px solid "+C.negro}}>
      <CardTitle>Contratos Liquidados GIU <span style={{color:C.slate,fontFamily:F.mono,fontSize:11}}>· trazabilidad</span></CardTitle>
      <p style={pSub}>Contratos y convenios con liquidación terminada. Ya no aparecen en sus secciones; quedan aquí para consulta.</p>
      <div style={{overflowX:"auto",marginTop:8}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}>
          <thead><tr>{["Proceso","Tipo","Fin","Detalle de liquidación","SECOP"].map((h,i)=><th key={i} style={th}>{h}</th>)}</tr></thead>
          <tbody>{liquidados.map(p=><tr key={p._tabla+"-"+p.id} style={{borderTop:"1px solid "+C.line}}>
            <td style={{...td,fontFamily:F.mono,fontSize:12,fontWeight:600}}>{p._nombre}</td>
            <td style={td}><Chip bg={C.paper} fg={C.slate}>{p._tabla==="convenios"?"convenio":"contrato"}</Chip></td>
            <td style={{...td,fontFamily:F.mono,fontSize:11,color:C.slate}}>{p.fin?fecha(p.fin):"—"}</td>
            <td style={{...td,fontSize:12,color:C.ink}}>{p.liq_detalle||"—"}</td>
            <td style={td}>{p.liq_secop?<a href={p.liq_secop} target="_blank" rel="noreferrer" style={{color:C.navy,fontSize:11.5,textDecoration:"underline"}}>ver SECOP</a>:<span style={{fontSize:11.5,color:C.slate}}>—</span>}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>}
  </div>;
}

/* ================= ACTIVIDAD (bitácora) ================= */
function Actividad({bitacora,nombreDe}){
  return <div>
    <SectionHead eyebrow="Auditoría" title="Actividad reciente" note={bitacora.length+" registros"}/>
    <div style={cardS}>
      {bitacora.length===0&&<div style={{fontSize:13,color:C.slate}}>Aún no hay actividad registrada (o tu perfil no tiene acceso a la bitácora).</div>}
      {bitacora.map(b=><div key={b.id} style={{display:"flex",justifyContent:"space-between",gap:10,padding:"9px 0",borderTop:"1px solid "+C.line}}>
        <div style={{minWidth:0}}><span style={{fontSize:13,color:C.ink}}><b>{nombreDe(b.actor)||"—"}</b> {b.accion}</span>{b.detalle&&<span style={{fontSize:12.5,color:C.slate}}> · {b.detalle}</span>}</div>
        <span style={{fontFamily:F.mono,fontSize:10.5,color:C.slate,whiteSpace:"nowrap"}}>{fecha(b.creado_en)}</span>
      </div>)}
    </div>
  </div>;
}

/* ================= CARGAS (masivo) ================= */
function valorExport(tipo,col,row,usuarioDe){
  if(col==="responsable_usuario") return usuarioDe(row.responsable_id)||"";
  if(col==="director_usuario") return usuarioDe(row.director_id)||"";
  if(col==="gerencial") return row.gerencial?"si":"no";
  const v=row[col]; return v===null||v===undefined?"":v;
}
function CargaBloque({tipo,filas,onCarga,usuarioDe,toast}){
  const def=CARGA_DEFS[tipo];
  const [prev,setPrev]=useState(null); const [abierto,setAbierto]=useState(false);
  function exportar(rows,nombre){
    const ws=XLSX.utils.aoa_to_sheet([def.cols,...rows]);
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Plantilla");
    XLSX.writeFile(wb,nombre);
  }
  function descargarActuales(){
    const rows=(filas||[]).map(r=>def.cols.map(c=>valorExport(tipo,c,r,usuarioDe)));
    exportar(rows.length?rows:[def.ej],`ATLAS_${def.label}_actuales.xlsx`);
  }
  function descargarPlantilla(){ exportar([def.ej],`ATLAS_${def.label}_plantilla_vacia.xlsx`); }
  function onFile(e){
    const file=e.target.files&&e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=(ev)=>{ try{
      const wb=XLSX.read(ev.target.result,{type:"binary"});
      const nm=wb.SheetNames.find(n=>/plantilla/i.test(n))||wb.SheetNames[0];
      const fl=XLSX.utils.sheet_to_json(wb.Sheets[nm],{defval:""}).filter(r=>String(r[def.req]||"").trim()!=="");
      setPrev(fl); if(!fl.length) toast("No hallé filas con "+def.req+". Usa la plantilla descargada aquí.");
    }catch(err){ toast("No pude leer el archivo"); setPrev(null); } };
    reader.readAsBinaryString(file); e.target.value="";
  }
  async function confirmar(){ if(!prev||!prev.length) return; await onCarga(tipo,prev); setPrev(null); }
  return <div style={{...cardS,marginTop:16,borderTop:"3px solid "+C.bronze}}>
    <button onClick={()=>setAbierto(!abierto)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,background:"none",border:"none",cursor:"pointer",textAlign:"left",padding:0}}>
      {abierto?<ChevronDown size={18} color={C.bronze}/>:<ChevronRight size={18} color={C.bronze}/>}
      <div style={{flex:1}}><div style={{fontFamily:F.disp,fontWeight:600,fontSize:15,color:C.ink}}>Carga y descarga masiva de {def.label.toLowerCase()}</div>
        <div style={{fontSize:12,color:C.slate}}>Descarga los registros actuales o una plantilla vacía, edítala en Excel y súbela.</div></div>
    </button>
    {abierto&&<div style={{marginTop:14}}>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <button onClick={descargarActuales} className="btn" style={{display:"inline-flex",alignItems:"center",gap:8,background:C.navy,color:"#fff",border:"none",borderRadius:9,padding:"9px 15px",fontSize:12.5,fontWeight:600,cursor:"pointer"}}><Download size={15}/> Descargar registros actuales ({(filas||[]).length})</button>
        <button onClick={descargarPlantilla} className="btn" style={{display:"inline-flex",alignItems:"center",gap:8,background:"#fff",color:C.bronze,border:"1px solid "+C.bronze,borderRadius:9,padding:"9px 15px",fontSize:12.5,fontWeight:600,cursor:"pointer"}}><Download size={15}/> Plantilla vacía</button>
        <label className="btn" style={{display:"inline-flex",alignItems:"center",gap:8,background:C.bronze,color:"#fff",borderRadius:9,padding:"9px 15px",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>
          <Upload size={15}/> Subir archivo lleno
          <input type="file" accept=".xlsx,.xls" onChange={onFile} style={{display:"none"}}/></label>
      </div>
      <div style={{fontFamily:F.mono,fontSize:10.5,color:C.slate,marginTop:8}}>Columnas: {def.cols.join(" · ")}</div>
      <div style={{fontSize:11.5,color:C.slate,marginTop:4}}>Al subir: si un id ya existe se actualiza (no se duplica). {tipo!=="convenios"?"En responsable_usuario escribe el usuario de la persona.":"En director_usuario escribe el usuario del director."}</div>
      {prev&&prev.length>0&&<div style={{marginTop:12}}>
        <div style={{fontSize:13,color:C.ink,marginBottom:6}}>Se cargarán <b>{prev.length}</b> filas. Vista previa:</div>
        <div style={{overflowX:"auto",border:"1px solid "+C.line,borderRadius:10}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:480}}>
            <thead><tr>{def.cols.slice(0,6).map(c=><th key={c} style={{...th,position:"static"}}>{c}</th>)}</tr></thead>
            <tbody>{prev.slice(0,5).map((r,i)=><tr key={i} style={{borderTop:"1px solid "+C.line}}>{def.cols.slice(0,6).map(c=><td key={c} style={{...td,fontSize:12}}>{String(r[c]??"")}</td>)}</tr>)}</tbody>
          </table></div>
        <button onClick={confirmar} className="btn" style={{marginTop:10,display:"inline-flex",alignItems:"center",gap:8,background:C.verde,color:"#fff",border:"none",borderRadius:9,padding:"9px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}><Save size={15}/> Confirmar carga de {prev.length}</button>
      </div>}
    </div>}
  </div>;
}

/* ================= ASIGNACIONES (UE + vehículos + programación) ================= */
function isoDia(d){ return new Date(d).toISOString().slice(0,10); }
function domingoDe(d){ const x=new Date(d); x.setDate(x.getDate()-x.getDay()); x.setHours(0,0,0,0); return x; }
const DIAS=[["a_dom","Dom"],["a_lun","Lun"],["a_mar","Mar"],["a_mie","Mié"],["a_jue","Jue"],["a_vie","Vie"],["a_sab","Sáb"]];
function Asignaciones({ue,veh,prog,profiles,puede,puedeProg,uid,onCrear,onBorrar,onCampo,onCarga,onSubirProg,onSubirVeh,usuarioDe,toast}){
  const pProg = puedeProg!==undefined?puedeProg:puede;
  const [tab,setTab]=useState("vehiculos");
  const nom=(id)=> profiles.find(u=>u.id===id)?.nombre || profiles.find(u=>u.id===id)?.usuario || "";
  const directores=profiles.filter(p=>/director/i.test(p.rol_funcional||""));
  const nombresGIU=profiles.map(p=>p.nombre||p.usuario);
  const matchNombre=(nm)=> !nm || nombresGIU.includes(nm);
  const selRojo=(nm)=> matchNombre(nm) ? {} : {border:"2px solid "+C.rojo, background:"#FDECEA"};
  const [semana,setSemana]=useState(isoDia(domingoDe(new Date())));
  const paso=(n)=>{const d=new Date(semana+"T00:00:00");d.setDate(d.getDate()+n*7);setSemana(isoDia(domingoDe(d)));};
  const finSem=(()=>{const d=new Date(semana+"T00:00:00");d.setDate(d.getDate()+6);return isoDia(d);})();

  // ---------- VEHÍCULOS (cuadrícula) ----------
  const dela=veh.filter(v=>isoDia(v.semana)===semana).sort((a,b)=>String(a.placa).localeCompare(String(b.placa)));
  const [vf,setVf]=useState({}); const VF=(k)=>(e)=>setVf({...vf,[k]:e.target.value});
  function addVeh(){ if(!vf.placa){toast("Falta la placa");return;} onCrear("asig_vehiculos",{semana,placa:String(vf.placa).toUpperCase(),tipo:vf.tipo||"",creado_por:uid}); setVf({}); }
  function copiarSemAnterior(){
    const prev=isoDia((()=>{const d=new Date(semana+"T00:00:00");d.setDate(d.getDate()-7);return domingoDe(d);})());
    const src=veh.filter(v=>isoDia(v.semana)===prev);
    if(!src.length){toast("La semana anterior no tiene vehículos");return;}
    src.forEach(v=>onCrear("asig_vehiculos",{semana,placa:v.placa,tipo:v.tipo||"",creado_por:uid}));
    toast(src.length+" vehículos copiados");
  }

  // ---------- UE ----------
  const [uf,setUf]=useState({}); const UF=(k)=>(e)=>setUf({...uf,[k]:e.target.value});
  function addUE(){ if(!uf.nombre){toast("Falta el nombre de la UE");return;} onCrear("asig_ue",{nombre:uf.nombre,inspector:uf.inspector||"",actividades:uf.actividades||"",director_obra:uf.director_obra||""}); setUf({}); }

  // ---------- PROGRAMACIÓN ----------
  const [jornada,setJornada]=useState("Diurno");
  const [fLoc,setFLoc]=useState(""); const [fDir,setFDir]=useState("");
  const progAll=prog.filter(p=>isoDia(p.semana)===semana && (p.jornada||"Diurno")===jornada);
  const locsProg=[...new Set(progAll.map(p=>p.localidad).filter(Boolean))].sort();
  const dirsProg=[...new Set(progAll.map(p=>p.director).filter(Boolean))].sort();
  const progSem=progAll.filter(p=>(!fLoc||p.localidad===fLoc)&&(!fDir||p.director===fDir)).sort((a,b)=>(Number(a.item)||0)-(Number(b.item)||0));
  function subirProg(e){ const file=e.target.files&&e.target.files[0]; if(!file) return;
    const rd=new FileReader(); rd.onload=(ev)=>{ try{
      const wb=XLSX.read(ev.target.result,{type:"binary"}); const ws=wb.Sheets[wb.SheetNames[0]];
      const aoa=XLSX.utils.sheet_to_json(ws,{header:1,defval:""});
      onSubirProg(semana,aoa,jornada);
    }catch(err){ toast("No pude leer el archivo"); } };
    rd.readAsBinaryString(file); e.target.value="";
  }
  function subirVeh(e){ const file=e.target.files&&e.target.files[0]; if(!file) return;
    const rd=new FileReader(); rd.onload=(ev)=>{ try{
      const wb=XLSX.read(ev.target.result,{type:"binary",cellDates:true});
      const nm=wb.SheetNames.find(n=>/sii|diurno|vehic/i.test(n))||wb.SheetNames[0];
      const aoa=XLSX.utils.sheet_to_json(wb.Sheets[nm],{header:1,defval:""});
      onSubirVeh(semana,aoa);
    }catch(err){ toast("No pude leer el archivo"); } };
    rd.readAsBinaryString(file); e.target.value="";
  }

  const semBox=<div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:12}}>
    <button className="btn" aria-label="Semana anterior" onClick={()=>paso(-1)} style={{background:"#fff",border:"1px solid "+C.line,borderRadius:9,padding:"8px 12px",fontSize:15,cursor:"pointer",color:C.slate}}>‹</button>
    <div style={{display:"flex",alignItems:"center",gap:8,background:C.paper,border:"1px solid "+C.line,borderRadius:10,padding:"8px 14px"}}>
      <Calendar size={16} color={C.bronze}/><div><div style={{fontFamily:F.disp,fontWeight:600,fontSize:13.5,color:C.ink}}>Semana {fecha(semana)} → {fecha(finSem)}</div><div style={{fontSize:10.5,color:C.slate,fontFamily:F.mono}}>domingo a sábado</div></div>
    </div>
    <button className="btn" aria-label="Semana siguiente" onClick={()=>paso(1)} style={{background:"#fff",border:"1px solid "+C.line,borderRadius:9,padding:"8px 12px",fontSize:15,cursor:"pointer",color:C.slate}}>›</button>
    <input type="date" value={semana} onChange={e=>e.target.value&&setSemana(isoDia(domingoDe(new Date(e.target.value+"T00:00:00"))))} style={{...inp,maxWidth:150}}/>
  </div>;

  return <div>
    <SectionHead eyebrow="Coordinación" title="Asignaciones" note="vehículos · UE · programación"/>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
      {[["vehiculos","Vehículos por semana"],["prog","Programación semanal"],["ue","Unidades Ejecutoras"]].map(([k,l])=>
        <button key={k} onClick={()=>setTab(k)} className="btn" style={{background:tab===k?C.navy:"#fff",color:tab===k?"#fff":C.slate,border:"1px solid "+(tab===k?C.navy:C.line),borderRadius:9,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>{l}</button>)}
    </div>

    {tab==="vehiculos"&&<div>
      {semBox}
      {puede&&<div style={{...cardS,marginBottom:12,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <label className="btn" style={{display:"inline-flex",alignItems:"center",gap:8,background:C.bronze,color:"#fff",borderRadius:9,padding:"9px 15px",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>
          <Upload size={15}/> Subir vehículos (Excel semanal)
          <input type="file" accept=".xlsx,.xls" onChange={subirVeh} style={{display:"none"}}/></label>
        {dela.length>0&&<button className="btn" onClick={()=>{if(confirm("¿Borrar los vehículos de esta semana?"))dela.forEach(v=>onBorrar("asig_vehiculos",v.id));}} style={{background:"#fff",border:"1px solid "+C.line,color:C.slate,borderRadius:9,padding:"9px 14px",fontSize:12,cursor:"pointer"}}>Limpiar semana</button>}
        <span style={{fontSize:11.5,color:C.slate}}>{dela.length} vehículos · {dela.filter(v=>v.nombre).length} asignados</span>
      </div>}
      {DIAS.map(([k,l],di)=>{ const delDia=dela.filter(v=>{ if(v.fecha){ const wd=new Date(v.fecha+"T00:00:00").getDay(); return wd===di; } return false; });
        if(!delDia.length) return null;
        const fechaDia=(()=>{const d=new Date(semana+"T00:00:00");d.setDate(d.getDate()+di);return fecha(isoDia(d));})();
        return <div key={k} style={{marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:8,margin:"4px 0 6px"}}><div style={{background:C.navy,color:"#fff",borderRadius:8,padding:"4px 12px",fontFamily:F.disp,fontWeight:600,fontSize:13}}>{["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"][di]}</div><span style={{fontSize:11,color:C.slate,fontFamily:F.mono}}>{fechaDia} · {delDia.length}</span></div>
          <div style={{...cardS,padding:0,overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:760}}>
              <thead><tr>{["Vehículo / Placa","Tipología","Conductor","Celular","Programa","Zona","Asignado a (NOMBRE)",""].map((h,i)=><th key={i} style={th}>{h}</th>)}</tr></thead>
              <tbody>{delDia.map(v=><tr key={v.id} style={{borderTop:"1px solid "+C.line}}>
                <td style={{...td}}><div style={{fontFamily:F.mono,fontSize:13,fontWeight:700,color:C.ink}}>{v.placa||"—"}</div></td>
                <td style={{...td,fontSize:12,color:C.slate}}>{v.tipologia||"—"}</td>
                <td style={{...td,fontSize:12}}>{v.conductor||"—"}</td>
                <td style={{...td,fontFamily:F.mono,fontSize:11.5,color:C.slate}}>{v.celular||"—"}</td>
                <td style={{...td,fontSize:11.5}}>{v.programa||"—"}</td>
                <td style={{...td,fontSize:11.5,color:C.slate}}>{v.zona||"—"}</td>
                <td style={td}>{puede
                  ? <select value={v.nombre||""} onChange={e=>onCampo("asig_vehiculos",v.id,"nombre",e.target.value)} style={{width:"100%",minWidth:150,border:"1px solid "+C.line,borderRadius:8,padding:"6px 8px",fontSize:12,background:v.nombre?"#EAF4EE":"#fff",color:v.nombre?C.ink:C.slate,cursor:"pointer",...selRojo(v.nombre)}}><option value="">— asignar —</option>{v.nombre&&!nombresGIU.includes(v.nombre)&&<option value={v.nombre}>⚠ {v.nombre}</option>}{profiles.map(u=><option key={u.id} value={u.nombre||u.usuario}>{u.nombre||u.usuario}</option>)}</select>
                  : <span style={{fontSize:12,color:v.nombre?C.ink:C.slate}}>{v.nombre||"sin asignar"}</span>}</td>
                <td style={td}>{puede&&<span onClick={()=>{if(confirm("¿Quitar "+(v.placa||"vehículo")+"?"))onBorrar("asig_vehiculos",v.id);}} style={{cursor:"pointer"}} title="Eliminar"><X size={13} color={C.rojo}/></span>}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </div>;
      })}
      {dela.filter(v=>v.fecha).length===0&&<div style={{...cardS}}><span style={{fontSize:13,color:C.slate}}>Sin vehículos con fecha en esta semana. {puede?"Sube el Excel semanal con el botón de arriba (hoja con columnas FECHA, TIPOLOGIA, PLACA, CONDUCTOR, CELULAR, PROGRAMA, ZONA, NOMBRE).":"La encargada aún no ha cargado la distribución."}</span></div>}
      <p style={{fontSize:11.5,color:C.slate,marginTop:8}}>Semanario por día (domingo a sábado). Cada vehículo trae conductor, celular, placa, programa y tipología; la columna <b>Asignado a (NOMBRE)</b> es a quién se le entrega. Se actualiza subiendo el Excel de la semana.</p>
    </div>}
    {tab==="prog"&&<div>
      {semBox}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
        <div style={{display:"inline-flex",borderRadius:9,overflow:"hidden",border:"1px solid "+C.line}}>
          {["Diurno","Nocturno"].map(j=><button key={j} onClick={()=>setJornada(j)} className="btn" style={{background:jornada===j?(j==="Nocturno"?C.navy:C.bronze):"#fff",color:jornada===j?"#fff":C.slate,border:"none",padding:"8px 16px",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>{j==="Nocturno"?"🌙 ":"☀️ "}Frentes {j}</button>)}
        </div>
        <select value={fLoc} onChange={e=>setFLoc(e.target.value)} style={{...inp,maxWidth:170}}><option value="">Todas las localidades</option>{locsProg.map(l=><option key={l}>{l}</option>)}</select>
        <select value={fDir} onChange={e=>setFDir(e.target.value)} style={{...inp,maxWidth:190}}><option value="">Todos los directores</option>{dirsProg.map(d=><option key={d}>{d}</option>)}</select>
        {(fLoc||fDir)&&<button className="btn" onClick={()=>{setFLoc("");setFDir("");}} style={{background:"#fff",border:"1px solid "+C.line,color:C.slate,borderRadius:8,padding:"7px 12px",fontSize:12,cursor:"pointer"}}>Limpiar filtros</button>}
      </div>
      {pProg&&<div style={{...cardS,marginBottom:12,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <label className="btn" style={{display:"inline-flex",alignItems:"center",gap:8,background:C.bronze,color:"#fff",borderRadius:9,padding:"9px 15px",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>
          <Upload size={15}/> Subir/actualizar programación ({jornada})
          <input type="file" accept=".xlsx,.xls" onChange={subirProg} style={{display:"none"}}/></label>
        <span style={{fontSize:11.5,color:C.slate}}>{progAll.length} ítems ({jornada.toLowerCase()}) · al recargar se reemplazan, no se duplican</span>
      </div>}
      <div style={{...cardS,padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:1150}}>
          <thead><tr>{["#","Localidad","Barrio","Vía","Intervención","CIV-PK","UE / Inspector","Actividades","Residente","Director","% avance","Fecha fin"].map((h,i)=><th key={i} style={th}>{h}</th>)}</tr></thead>
          <tbody>{progSem.map(p=>{const av=Number(p.avance)||0; return <tr key={p.id} style={{borderTop:"1px solid "+C.line}}>
            <td style={{...td,fontFamily:F.mono,fontSize:11}}>{p.item}</td>
            <td style={{...td,fontSize:11.5,fontWeight:600}}>{p.localidad}</td><td style={{...td,fontSize:11.5}}>{p.barrio}</td>
            <td style={{...td,fontSize:11}}>{p.via} {p.desde&&<span style={{color:C.slate}}>({p.desde}→{p.hasta})</span>}</td>
            <td style={{...td,fontSize:11.5}}>{p.tipo}</td><td style={{...td,fontFamily:F.mono,fontSize:10.5}}>{p.civ_pk}</td>
            <td style={{...td,fontSize:11}}>{p.inspector}</td><td style={{...td,fontSize:11}}>{p.actividades}</td>
            <td style={{...td,fontSize:11}}>{p.residente}</td><td style={{...td,fontSize:11}}>{p.director}</td>
            <td style={td}>{pProg
              ? <div style={{display:"flex",alignItems:"center",gap:5}}><input type="number" min="0" max="100" defaultValue={av} onBlur={e=>{const v=Math.max(0,Math.min(100,Number(e.target.value)||0)); if(v!==av)onCampo("prog_semanal",p.id,"avance",v);}} style={{width:48,border:"1px solid "+C.line,borderRadius:6,padding:"3px",fontSize:11,textAlign:"center"}}/><div style={{width:40}}><Bar pct={av} color={av>=80?C.verde:av>=40?C.amarillo:C.naranja}/></div></div>
              : <div style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontFamily:F.mono,fontSize:11}}>{av}%</span><div style={{width:40}}><Bar pct={av} color={av>=80?C.verde:av>=40?C.amarillo:C.naranja}/></div></div>}</td>
            <td style={td}>{pProg
              ? <input type="date" defaultValue={p.fecha_fin||""} onBlur={e=>{if(e.target.value!==(p.fecha_fin||""))onCampo("prog_semanal",p.id,"fecha_fin",e.target.value||null);}} style={{border:"1px solid "+C.line,borderRadius:6,padding:"4px",fontSize:11}}/>
              : <span style={{fontFamily:F.mono,fontSize:11,color:C.slate}}>{p.fecha_fin?fecha(p.fecha_fin):"—"}</span>}</td>
          </tr>;})}
          {progSem.length===0&&<tr><td colSpan={12} style={{...td,color:C.slate,fontSize:13}}>Sin programación {jornada.toLowerCase()} para esta semana{(fLoc||fDir)?" con esos filtros":""}. {pProg?"Súbela con el botón de arriba (Excel).":"Aún no se ha cargado."}</td></tr>}</tbody>
        </table>
      </div>
      <p style={{fontSize:11.5,color:C.slate,marginTop:8}}>Programación separada por jornada (diurno/nocturno). Al volver a subir la misma semana y jornada, <b>se reemplaza</b> (no se duplica). Localidades numeradas automáticamente. Puedes filtrar por localidad y director.</p>
    </div>}

    {tab==="ue"&&<div>
      {puede&&<div style={{...cardS,marginBottom:12}}>
        <CardTitle style={{marginBottom:8}}>Agregar unidad ejecutora</CardTitle>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
          <div><label style={lab}>UE*</label><input value={uf.nombre||""} onChange={UF("nombre")} placeholder="UEMRD-06" style={inp}/></div>
          <div><label style={lab}>Inspector a cargo</label><input value={uf.inspector||""} onChange={UF("inspector")} placeholder="LEIDY ..." style={inp}/></div>
          <div><label style={lab}>Actividades</label><input value={uf.actividades||""} onChange={UF("actividades")} style={inp}/></div>
          <div><label style={lab}>Director de obra</label><select value={uf.director_obra||""} onChange={UF("director_obra")} style={inp}><option value="">—</option>{profiles.map(p=><option key={p.id} value={p.nombre||p.usuario}>{p.nombre||p.usuario}</option>)}</select></div>
        </div>
        <button className="btn" onClick={addUE} style={{marginTop:12,background:C.verde,color:"#fff",border:"none",borderRadius:9,padding:"9px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>+ Agregar UE</button>
      </div>}
      <div style={{...cardS,padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:680}}>
          <thead><tr>{["UE","Inspector a cargo","Actividades","Director de obra",""].map((h,i)=><th key={i} style={th}>{h}</th>)}</tr></thead>
          <tbody>{ue.map(u=><tr key={u.id} style={{borderTop:"1px solid "+C.line}}>
            <td style={td}>{puede
              ? <input defaultValue={u.nombre||""} onBlur={e=>{if(e.target.value!==(u.nombre||""))onCampo("asig_ue",u.id,"nombre",e.target.value);}} style={{width:"100%",minWidth:90,border:"1px solid "+C.line,borderRadius:8,padding:"6px 8px",fontSize:12.5,fontWeight:600,color:C.ink}}/>
              : <span style={{fontSize:12.5,color:C.ink,fontWeight:600}}>{u.nombre}</span>}</td>
            <td style={td}>{puede
              ? <input defaultValue={u.inspector||""} onBlur={e=>{if(e.target.value!==(u.inspector||""))onCampo("asig_ue",u.id,"inspector",e.target.value);}} placeholder="—" style={{width:"100%",minWidth:120,border:"1px solid "+C.line,borderRadius:8,padding:"6px 8px",fontSize:12}}/>
              : <span style={{fontSize:12,color:C.slate}}>{u.inspector||"—"}</span>}</td>
            <td style={{...td,fontSize:12,color:C.slate}}>{u.actividades||"—"}</td>
            <td style={td}>{puede
              ? <select value={u.director_obra||""} onChange={e=>onCampo("asig_ue",u.id,"director_obra",e.target.value)} style={{border:"1px solid "+C.line,borderRadius:8,padding:"5px 8px",fontSize:12,background:"#fff",color:C.ink,cursor:"pointer",maxWidth:200,...selRojo(u.director_obra)}}><option value="">—</option>{u.director_obra&&!nombresGIU.includes(u.director_obra)&&<option value={u.director_obra}>⚠ {u.director_obra}</option>}{profiles.map(p=><option key={p.id} value={p.nombre||p.usuario}>{p.nombre||p.usuario}</option>)}</select>
              : <span style={{fontSize:12,color:C.slate}}>{u.director_obra||"—"}</span>}</td>
            <td style={td}>{puede&&<span onClick={()=>{if(confirm("¿Eliminar la UE "+u.nombre+"?"))onBorrar("asig_ue",u.id);}} style={{cursor:"pointer"}} title="Eliminar"><X size={14} color={C.rojo}/></span>}</td>
          </tr>)}
          {ue.length===0&&<tr><td colSpan={5} style={{...td,color:C.slate,fontSize:13}}>Sin unidades ejecutoras registradas.</td></tr>}</tbody>
        </table>
      </div>
      {puede&&<CargaBloque tipo="asig_ue" filas={ue} onCarga={onCarga} usuarioDe={usuarioDe} toast={toast}/>}
    </div>}
  </div>;
}

/* ================= INVENTARIO (control de insumos) ================= */
function Inventario({cat,ubi,mov,profiles,perms,uid,onCrear,onBorrar,onCampoCat,onCarga,usuarioDe,nombreDe,toast}){
  const [tab,setTab]=useState("existencias");
  const admin=perms.isAdminFull || perms.edita_inv;
  const esDirector=/director/i.test(perms.rolFuncional||"");
  const nomUbi=(id)=> ubi.find(u=>u.id===id)?.nombre || "—";
  const notaDir = (!admin && esDirector) ? <div style={{...cardS,marginBottom:12,background:"#FBF7EE",border:"1px solid "+C.bronzeSoft}}><span style={{fontSize:12.5,color:C.bronze}}>Como director, puedes <b>consultar</b> el inventario. Para cambios de valores o asignaciones, solicítalos a los responsables de inventario (requieren su aprobación).</span></div> : null;
  const nomMat=(c)=> (cat.find(x=>x.codigo===c)?.descripcion)||c;
  // Existencias: entradas a destino menos salidas desde origen
  const [filtro,setFiltro]=useState("todas");
  const existencia=(codigo)=>{
    let ent=0,sal=0;
    mov.forEach(m=>{ if(m.material_codigo!==codigo) return;
      if(filtro==="todas"){ if(m.destino_id)ent+=Number(m.cantidad||0); if(m.origen_id)sal+=Number(m.cantidad||0); }
      else { const f=Number(filtro); if(m.destino_id===f)ent+=Number(m.cantidad||0); if(m.origen_id===f)sal+=Number(m.cantidad||0); }
    });
    return {ent,sal,ex:ent-sal};
  };
  const existenciaTotal=(codigo)=>{ let e=0; mov.forEach(m=>{ if(m.material_codigo!==codigo) return; if(m.destino_id)e+=Number(m.cantidad||0); if(m.origen_id)e-=Number(m.cantidad||0);}); return e; };
  // Formulario de movimiento
  const [mf,setMf]=useState({tipo:"entrada"}); const M=(k)=>(e)=>setMf({...mf,[k]:e.target.value});
  function registrar(){
    if(!mf.material_codigo||!mf.cantidad){toast("Elige material y cantidad");return;}
    if(mf.tipo==="entrada"&&!mf.destino_id){toast("Falta el frente de destino");return;}
    if(mf.tipo==="salida"&&!mf.origen_id){toast("Falta el frente de origen");return;}
    if(mf.tipo==="traslado"&&(!mf.origen_id||!mf.destino_id)){toast("Traslado requiere origen y destino");return;}
    onCrear("inv_movimientos",{material_codigo:mf.material_codigo,cantidad:Number(mf.cantidad)||0,tipo:mf.tipo,
      origen_id:mf.tipo==="entrada"?null:Number(mf.origen_id)||null,
      destino_id:mf.tipo==="salida"?null:Number(mf.destino_id)||null,
      director_id:mf.director_id||null, localidad:mf.localidad||"", frente_fecha:mf.frente_fecha||null,
      responsable_id:uid,creado_por:uid,obs:mf.obs||"",fecha:mf.fecha||new Date().toISOString().slice(0,10)});
    setMf({tipo:"entrada"});
  }
  // Formularios catálogo / ubicaciones
  const [cf,setCf]=useState({unidad:"UN"}); const CF=(k)=>(e)=>setCf({...cf,[k]:e.target.value});
  const [uf,setUf]=useState({}); const UF=(k)=>(e)=>setUf({...uf,[k]:e.target.value});
  const tabs=[["existencias","Existencias"],["planeacion","Planeación de pedidos"],["consumos","Consumos"],["movimientos","Movimientos"]];
  if(admin){ tabs.push(["catalogo","Catálogo"],["ubicaciones","Frentes"]); }
  // Consumos (salidas) por mes/director/localidad
  const mesDe=(f)=> f?String(f).slice(0,7):"—";
  const salidas=mov.filter(m=>m.origen_id&&!m.destino_id || m.tipo==="salida");
  const consumoPorMesDir={}, consumoPorMesLoc={};
  mov.filter(m=>m.tipo==="salida"||(m.origen_id&&!m.destino_id)).forEach(m=>{
    const mes=mesDe(m.fecha), q=Number(m.cantidad||0);
    const dir=nombreDe? (nombreDe(m.director_id)||"sin director"):"—"; const loc=m.localidad||"sin localidad";
    consumoPorMesDir[mes]=consumoPorMesDir[mes]||{}; consumoPorMesDir[mes][dir]=(consumoPorMesDir[mes][dir]||0)+q;
    consumoPorMesLoc[mes]=consumoPorMesLoc[mes]||{}; consumoPorMesLoc[mes][loc]=(consumoPorMesLoc[mes][loc]||0)+q;
  });
  const meses=[...new Set(mov.map(m=>mesDe(m.fecha)).filter(x=>x!=="—"))].sort().reverse();
  const tipoColor={entrada:C.verde,salida:C.rojo,traslado:C.naranja};
  return <div>
    <SectionHead eyebrow="Insumos" title="Inventario de materiales" note={cat.length+" materiales · "+ubi.length+" frentes"}/>
    {notaDir}
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
      {tabs.map(([k,l])=><button key={k} onClick={()=>setTab(k)} className="btn" style={{background:tab===k?C.navy:"#fff",color:tab===k?"#fff":C.slate,border:"1px solid "+(tab===k?C.navy:C.line),borderRadius:9,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>{l}</button>)}
    </div>

    {tab==="existencias"&&(()=>{
      const bajos=cat.filter(c=>{const t=existenciaTotal(c.codigo);return Number(c.stock_min||0)>0 && t<Number(c.stock_min);});
      return <div>
      {bajos.length>0&&<div style={{...cardS,marginBottom:12,borderLeft:"4px solid "+C.rojo,background:"#FCEBEA",display:"flex",alignItems:"center",gap:10}}>
        <AlertTriangle size={18} color={C.rojo}/><div style={{fontSize:12.5,color:C.ink}}><b>{bajos.length}</b> material(es) por debajo del stock mínimo: {bajos.map(b=>b.descripcion).slice(0,4).join(", ")}{bajos.length>4?"…":""}</div></div>}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
        <span style={{fontSize:12.5,color:C.slate}}>Ver existencias en:</span>
        <select value={filtro} onChange={e=>setFiltro(e.target.value)} aria-label="Filtrar por frente" style={{...inp,maxWidth:240}}>
          <option value="todas">Todos los frentes (total)</option>
          {ubi.map(u=><option key={u.id} value={u.id}>{u.nombre}{u.pk?" · PK "+u.pk:""}</option>)}
        </select>
      </div>
      <div style={{...cardS,padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
          <thead><tr>{["Material","Unidad","Entradas","Salidas","Existencia","Mínimo"].map((h,i)=><th key={i} style={{...th,textAlign:i>=2?"right":"left"}}>{h}</th>)}</tr></thead>
          <tbody>{cat.map(c=>{const {ent,sal,ex}=existencia(c.codigo); const tot=existenciaTotal(c.codigo); const bajo=Number(c.stock_min||0)>0&&tot<Number(c.stock_min);
            return <tr key={c.codigo} style={{borderTop:"1px solid "+C.line,background:bajo?"#FCEBEA":undefined}}>
              <td style={td}><div style={{fontSize:13,color:C.ink,display:"flex",alignItems:"center",gap:6}}>{bajo&&<Dot c={C.rojo}/>}{c.descripcion}</div><div style={{fontFamily:F.mono,fontSize:10.5,color:C.slate}}>{c.codigo} · {c.categoria||"—"}</div></td>
              <td style={{...td,fontSize:12,color:C.slate}}>{c.unidad}</td>
              <td style={{...td,textAlign:"right",fontFamily:F.mono,fontSize:12,color:C.verde}}>{num(ent)}</td>
              <td style={{...td,textAlign:"right",fontFamily:F.mono,fontSize:12,color:C.rojo}}>{num(sal)}</td>
              <td style={{...td,textAlign:"right"}}><span style={{fontFamily:F.mono,fontSize:13,fontWeight:700,color:ex<0||bajo?C.rojo:C.ink}}>{num(ex)}</span></td>
              <td style={{...td,textAlign:"right",fontFamily:F.mono,fontSize:11.5,color:C.slate}}>{Number(c.stock_min||0)>0?num(c.stock_min):"—"}</td>
            </tr>;})}
            {cat.length===0&&<tr><td colSpan={6} style={{...td,color:C.slate,fontSize:13}}>Sin materiales en catálogo. Un administrador puede agregarlos.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>;})()}


    {tab==="planeacion"&&<div>
      <div style={{...cardS,marginBottom:12,background:C.paper}}><span style={{fontSize:12.5,color:C.ink}}>Existencias a nivel <b>entidad</b> (todos los frentes juntos) frente al stock mínimo, para planear pedidos. Lo que esté por debajo del mínimo se resalta y sugiere cuánto pedir.</span></div>
      <div style={{...cardS,padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}>
          <thead><tr>{["Material","Unidad","Existencia (entidad)","Stock mínimo","Sugerido a pedir","Estado"].map((h,i)=><th key={i} style={{...th,textAlign:i>1?"right":"left"}}>{h}</th>)}</tr></thead>
          <tbody>{[...cat].sort((a,b)=>existenciaTotal(a.codigo)-Number(a.stock_min||0)-(existenciaTotal(b.codigo)-Number(b.stock_min||0))).map(c=>{const ex=existenciaTotal(c.codigo),min=Number(c.stock_min||0),bajo=ex<min,ped=bajo?Math.ceil(min-ex):0;
            return <tr key={c.codigo} style={{borderTop:"1px solid "+C.line,background:bajo?"#FBEDEC":"#fff"}}>
              <td style={{...td,fontSize:12.5,color:C.ink,fontWeight:600}}>{c.descripcion}</td>
              <td style={{...td,fontSize:11.5,color:C.slate}}>{c.unidad||"UN"}</td>
              <td style={{...td,textAlign:"right",fontFamily:F.mono,fontWeight:700,color:bajo?C.rojo:C.ink}}>{num(ex)}</td>
              <td style={{...td,textAlign:"right",fontFamily:F.mono}}>{num(min)}</td>
              <td style={{...td,textAlign:"right",fontFamily:F.mono,fontWeight:700,color:ped?C.naranja:C.slate}}>{ped?num(ped):"—"}</td>
              <td style={{...td,textAlign:"right"}}>{bajo?<Chip bg={C.rojo+"18"} fg={C.rojo}>pedir</Chip>:<Chip bg={C.verde+"18"} fg={C.verde}>ok</Chip>}</td>
            </tr>;})}
          {cat.length===0&&<tr><td colSpan={6} style={{...td,color:C.slate,fontSize:13}}>Sin materiales en el catálogo.</td></tr>}</tbody>
        </table>
      </div>
    </div>}

    {tab==="consumos"&&<div>
      <div style={{...cardS,marginBottom:12,background:C.paper}}><span style={{fontSize:12.5,color:C.ink}}>Consumos (salidas) por mes, discriminados por <b>director de obra</b> y por <b>localidad</b>. Registra el director y la localidad en cada salida para alimentar este control.</span></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:14}}>
        <div style={{...cardS,padding:0,overflowX:"auto"}}>
          <div style={{padding:"10px 14px",fontFamily:F.disp,fontWeight:600,color:C.ink,borderBottom:"1px solid "+C.line}}>Consumo por director</div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Mes","Director","Cantidad"].map((h,i)=><th key={i} style={{...th,textAlign:i===2?"right":"left"}}>{h}</th>)}</tr></thead>
            <tbody>{meses.flatMap(mes=>Object.entries(consumoPorMesDir[mes]||{}).map(([dir,q],j)=>
              <tr key={mes+dir} style={{borderTop:"1px solid "+C.line}}><td style={{...td,fontFamily:F.mono,fontSize:11}}>{j===0?mes:""}</td><td style={{...td,fontSize:12}}>{dir}</td><td style={{...td,textAlign:"right",fontFamily:F.mono,fontWeight:600}}>{num(q)}</td></tr>))}
            {!meses.length&&<tr><td colSpan={3} style={{...td,color:C.slate,fontSize:12.5}}>Sin salidas registradas.</td></tr>}</tbody>
          </table>
        </div>
        <div style={{...cardS,padding:0,overflowX:"auto"}}>
          <div style={{padding:"10px 14px",fontFamily:F.disp,fontWeight:600,color:C.ink,borderBottom:"1px solid "+C.line}}>Consumo por localidad</div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Mes","Localidad","Cantidad"].map((h,i)=><th key={i} style={{...th,textAlign:i===2?"right":"left"}}>{h}</th>)}</tr></thead>
            <tbody>{meses.flatMap(mes=>Object.entries(consumoPorMesLoc[mes]||{}).map(([loc,q],j)=>
              <tr key={mes+loc} style={{borderTop:"1px solid "+C.line}}><td style={{...td,fontFamily:F.mono,fontSize:11}}>{j===0?mes:""}</td><td style={{...td,fontSize:12}}>{loc}</td><td style={{...td,textAlign:"right",fontFamily:F.mono,fontWeight:600}}>{num(q)}</td></tr>))}
            {!meses.length&&<tr><td colSpan={3} style={{...td,color:C.slate,fontSize:12.5}}>Sin salidas registradas.</td></tr>}</tbody>
          </table>
        </div>
      </div>
    </div>}

    {tab==="movimientos"&&<div>
      <div style={{...cardS,marginBottom:14}}>
        <CardTitle style={{marginBottom:8}}>Registrar movimiento</CardTitle>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
          <div><label style={lab}>Tipo</label><select value={mf.tipo} onChange={M("tipo")} style={inp}>{["entrada","salida","traslado"].map(o=><option key={o} value={o}>{o[0].toUpperCase()+o.slice(1)}</option>)}</select></div>
          <div><label style={lab}>Material</label><select value={mf.material_codigo||""} onChange={M("material_codigo")} style={inp}><option value="">—</option>{cat.map(c=><option key={c.codigo} value={c.codigo}>{c.descripcion}</option>)}</select></div>
          <div><label style={lab}>Cantidad</label><input type="number" value={mf.cantidad||""} onChange={M("cantidad")} style={inp}/></div>
          {mf.tipo!=="entrada"&&<div><label style={lab}>Frente origen</label><select value={mf.origen_id||""} onChange={M("origen_id")} style={inp}><option value="">—</option>{ubi.map(u=><option key={u.id} value={u.id}>{u.nombre}</option>)}</select></div>}
          {mf.tipo!=="salida"&&<div><label style={lab}>Frente destino</label><select value={mf.destino_id||""} onChange={M("destino_id")} style={inp}><option value="">—</option>{ubi.map(u=><option key={u.id} value={u.id}>{u.nombre}</option>)}</select></div>}
          <div><label style={lab}>Fecha</label><input type="date" value={mf.fecha||new Date().toISOString().slice(0,10)} onChange={M("fecha")} style={inp}/></div>
          <div><label style={lab}>Director de obra</label><select value={mf.director_id||""} onChange={M("director_id")} style={inp}><option value="">—</option>{profiles.filter(p=>/director/i.test(p.rol_funcional||"")).map(p=><option key={p.id} value={p.id}>{p.nombre||p.usuario}</option>)}</select></div>
          <div><label style={lab}>Localidad</label><select value={mf.localidad||""} onChange={M("localidad")} style={inp}><option value="">—</option>{Object.entries(LOCALIDADES).map(([k,nn])=>{const nombre=k.replace(/\b\w/g,c=>c.toUpperCase())+" ("+nn+")";return <option key={nn} value={nombre}>{nombre}</option>;})}</select></div>
          <div style={{gridColumn:"1/-1"}}><label style={lab}>Observaciones</label><input value={mf.obs||""} onChange={M("obs")} style={inp}/></div>
        </div>
        <button className="btn" onClick={registrar} style={{marginTop:12,background:C.verde,color:"#fff",border:"none",borderRadius:9,padding:"9px 18px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Registrar movimiento</button>
      </div>
      <div style={{...cardS,padding:0,overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:640}}>
          <thead><tr>{["Fecha","Tipo","Material","Cant.","Origen → Destino","Responsable",""].map((h,i)=><th key={i} style={th}>{h}</th>)}</tr></thead>
          <tbody>{mov.slice(0,80).map(m=><tr key={m.id} style={{borderTop:"1px solid "+C.line}}>
            <td style={{...td,fontFamily:F.mono,fontSize:11,color:C.slate}}>{fecha(m.fecha)}</td>
            <td style={td}><Chip bg={tipoColor[m.tipo]+"18"} fg={tipoColor[m.tipo]}>{m.tipo}</Chip></td>
            <td style={{...td,fontSize:12.5,color:C.ink}}>{nomMat(m.material_codigo)}</td>
            <td style={{...td,fontFamily:F.mono,fontSize:12}}>{num(m.cantidad)}</td>
            <td style={{...td,fontSize:12,color:C.slate}}>{m.origen_id?nomUbi(m.origen_id):"—"} → {m.destino_id?nomUbi(m.destino_id):"—"}</td>
            <td style={{...td,fontSize:12,color:C.slate}}>{nombreDe(m.responsable_id)}</td>
            <td style={td}>{admin&&<span onClick={()=>{if(confirm("¿Eliminar este movimiento?"))onBorrar("inv_movimientos",m.id);}} style={{cursor:"pointer"}} title="Eliminar"><X size={14} color={C.rojo}/></span>}</td>
          </tr>)}
          {mov.length===0&&<tr><td colSpan={7} style={{...td,color:C.slate,fontSize:13}}>Aún no hay movimientos registrados.</td></tr>}</tbody>
        </table>
      </div>
    </div>}

    {tab==="catalogo"&&admin&&<div>
      <div style={{...cardS,marginBottom:14}}>
        <CardTitle style={{marginBottom:8}}>Agregar material</CardTitle>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
          <div><label style={lab}>Código*</label><input value={cf.codigo||""} onChange={CF("codigo")} placeholder="MAT-005" style={inp}/></div>
          <div style={{gridColumn:"span 2"}}><label style={lab}>Descripción*</label><input value={cf.descripcion||""} onChange={CF("descripcion")} style={inp}/></div>
          <div><label style={lab}>Categoría</label><input value={cf.categoria||""} onChange={CF("categoria")} style={inp}/></div>
          <div><label style={lab}>Unidad</label><input value={cf.unidad||""} onChange={CF("unidad")} style={inp}/></div>
          <div><label style={lab}>Stock mínimo</label><input type="number" value={cf.stock_min||""} onChange={CF("stock_min")} placeholder="0" style={inp}/></div>
        </div>
        <button className="btn" onClick={()=>{if(!cf.codigo||!cf.descripcion){toast("Falta código o descripción");return;}onCrear("inv_catalogo",{codigo:cf.codigo.trim(),descripcion:cf.descripcion,categoria:cf.categoria||"",unidad:cf.unidad||"UN",stock_min:Number(cf.stock_min)||0});setCf({unidad:"UN"});}} style={{marginTop:12,background:C.verde,color:"#fff",border:"none",borderRadius:9,padding:"9px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Agregar material</button>
      </div>
      <div style={{...cardS,padding:0,overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:520}}>
        <thead><tr>{["Código","Descripción","Categoría","Unidad","Stock mín.",""].map((h,i)=><th key={i} style={{...th,textAlign:i===4?"right":"left"}}>{h}</th>)}</tr></thead>
        <tbody>{cat.map(c=><tr key={c.codigo} style={{borderTop:"1px solid "+C.line}}>
          <td style={{...td,fontFamily:F.mono,fontSize:12}}>{c.codigo}</td><td style={{...td,fontSize:12.5}}>{c.descripcion}</td>
          <td style={{...td,fontSize:12,color:C.slate}}>{c.categoria||"—"}</td><td style={{...td,fontSize:12,color:C.slate}}>{c.unidad}</td>
          <td style={{...td,textAlign:"right"}}><FinCell value={c.stock_min||0} editable={true} onSave={(v)=>onCampoCat(c.codigo,v)} fmt={num}/></td>
          <td style={td}><span onClick={()=>{if(confirm("¿Eliminar "+c.codigo+"?"))onBorrar("inv_catalogo",c.codigo);}} style={{cursor:"pointer"}} title="Eliminar"><X size={14} color={C.rojo}/></span></td>
        </tr>)}</tbody></table></div>
      <CargaBloque tipo="inv_catalogo" filas={cat} onCarga={onCarga} usuarioDe={usuarioDe} toast={toast}/>
    </div>}

    {tab==="ubicaciones"&&admin&&<div>
      <div style={{...cardS,marginBottom:14}}>
        <CardTitle style={{marginBottom:8}}>Agregar frente</CardTitle>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
          <div style={{gridColumn:"span 2"}}><label style={lab}>Nombre del frente*</label><input value={uf.nombre||""} onChange={UF("nombre")} style={inp}/></div>
          <div><label style={lab}>PK</label><input value={uf.pk||""} onChange={UF("pk")} placeholder="PK 12+500" style={inp}/></div>
          <div><label style={lab}>Responsable</label><select value={uf.responsable_id||""} onChange={UF("responsable_id")} style={inp}><option value="">—</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.nombre||p.usuario}</option>)}</select></div>
        </div>
        <button className="btn" onClick={()=>{if(!uf.nombre){toast("Falta el nombre");return;}onCrear("inv_ubicaciones",{nombre:uf.nombre,pk:uf.pk||"",responsable_id:uf.responsable_id||null,activo:true});setUf({});}} style={{marginTop:12,background:C.verde,color:"#fff",border:"none",borderRadius:9,padding:"9px 16px",fontSize:13,fontWeight:600,cursor:"pointer"}}>Agregar frente</button>
      </div>
      <div style={{...cardS,padding:0,overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",minWidth:480}}>
        <thead><tr>{["Frente","PK","Responsable",""].map((h,i)=><th key={i} style={th}>{h}</th>)}</tr></thead>
        <tbody>{ubi.map(u=><tr key={u.id} style={{borderTop:"1px solid "+C.line}}>
          <td style={{...td,fontSize:12.5,color:C.ink}}>{u.nombre}</td><td style={{...td,fontFamily:F.mono,fontSize:12,color:C.slate}}>{u.pk||"—"}</td>
          <td style={{...td,fontSize:12,color:C.slate}}>{nombreDe(u.responsable_id)||"—"}</td>
          <td style={td}><span onClick={()=>{if(confirm("¿Eliminar el frente "+u.nombre+"?"))onBorrar("inv_ubicaciones",u.id);}} style={{cursor:"pointer"}}><X size={14} color={C.rojo}/></span></td>
        </tr>)}</tbody></table></div>
    </div>}
  </div>;
}

/* ================= APP ================= */
function CambiarPass({onClose,toast}){
  const [p1,setP1]=useState(""); const [p2,setP2]=useState(""); const [busy,setBusy]=useState(false);
  async function guardar(){
    if(p1.length<8){ toast("Mínimo 8 caracteres"); return; }
    if(p1!==p2){ toast("Las contraseñas no coinciden"); return; }
    setBusy(true);
    const {error}=await supabase.auth.updateUser({password:p1});
    setBusy(false);
    if(error) toast("No se pudo cambiar: "+(error.message||"")); else { toast("Contraseña actualizada"); onClose(); }
  }
  return <div style={{position:"fixed",inset:0,background:"rgba(12,26,49,.55)",display:"grid",placeItems:"center",zIndex:60,backdropFilter:"blur(2px)"}} onClick={onClose}>
    <div style={{width:"min(380px,92%)",background:"#fff",borderRadius:16,padding:22}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <div style={{fontFamily:F.disp,fontWeight:600,fontSize:17,color:C.ink}}>Cambiar contraseña</div>
        <button onClick={onClose} style={{background:"#EEF1F6",border:"none",borderRadius:8,padding:6,cursor:"pointer"}}><X size={16} color={C.slate}/></button></div>
      <p style={{fontSize:12.5,color:C.slate,marginTop:0}}>Reemplaza la contraseña temporal por una tuya.</p>
      <label style={lab}>Nueva contraseña</label>
      <input type="password" value={p1} onChange={e=>setP1(e.target.value)} style={inp}/>
      <label style={lab}>Repite la contraseña</label>
      <input type="password" value={p2} onChange={e=>setP2(e.target.value)} style={inp}/>
      <button className="btn" disabled={busy} onClick={guardar} style={{marginTop:16,width:"100%",background:C.navy,color:"#fff",border:"none",borderRadius:10,padding:12,fontWeight:600,fontSize:14,cursor:"pointer"}}>{busy?"Guardando…":"Guardar contraseña"}</button>
    </div>
  </div>;
}

export default function App(){
  const [session,setSession]=useState(null);
  const [profile,setProfile]=useState(null);
  const [cargando,setCargando]=useState(true);
  const [aviso,setAviso]=useState("");
  const [view,setView]=useState("panel");
  const [sel,setSel]=useState(null);
  const [toastMsg,setToastMsg]=useState("");
  const [procs,setProcs]=useState([]); const [convenios,setConvenios]=useState([]);
  const [metas,setMetas]=useState([]); const [pends,setPends]=useState([]);
  const [profiles,setProfiles]=useState([]); const [aprob,setAprob]=useState([]);
  const [finanzas,setFinanzas]=useState([]); const [metasPdd,setMetasPdd]=useState([]);
  const [pwOpen,setPwOpen]=useState(false); const [bitacora,setBitacora]=useState([]);
  const [invCat,setInvCat]=useState([]); const [invUbi,setInvUbi]=useState([]); const [invMov,setInvMov]=useState([]);
  const [metasAct,setMetasAct]=useState([]); const [finDet,setFinDet]=useState([]); const [cumplPers,setCumplPers]=useState([]); const [contratoCrp,setContratoCrp]=useState([]);
  const [asigUE,setAsigUE]=useState([]); const [asigVeh,setAsigVeh]=useState([]); const [progSem,setProgSem]=useState([]);
  const [modulos,setModulos]=useState([]);
  const [ctrContratos,setCtrContratos]=useState([]); const [ctrCrp,setCtrCrp]=useState([]);
  const [liqManual,setLiqManual]=useState([]);

  const toast=useCallback((m)=>{ setToastMsg(m); setTimeout(()=>setToastMsg(""),2600); },[]);

  const cargar=useCallback(async ()=>{
    const [pr,cv,mt,pe,pf,ap,fz,mp,bt,ic,iu,im,ma,fd,cp,cr,ue,vh,pg,mo,cc,cx,lm]=await Promise.all([
      supabase.from("procesos").select("*").order("fin",{ascending:true}),
      supabase.from("convenios").select("*"),
      supabase.from("metas").select("*"),
      supabase.from("pendientes").select("*"),
      supabase.from("profiles").select("id,usuario,nombre,rol,aprobado_por,coord_convenios,coord_asignaciones,coord_prog,edita_inv,rol_funcional,activo"),
      supabase.from("cambios_pendientes").select("*").order("creado_en",{ascending:false}),
      supabase.from("finanzas").select("*"),
      supabase.from("metas_pdd").select("*"),
      supabase.from("bitacora").select("*").order("creado_en",{ascending:false}).limit(80),
      supabase.from("inv_catalogo").select("*").order("codigo"),
      supabase.from("inv_ubicaciones").select("*").order("nombre"),
      supabase.from("inv_movimientos").select("*").order("creado_en",{ascending:false}).limit(500),
      supabase.from("metas_actividades").select("*").order("orden"),
      supabase.from("fin_detalle").select("*"),
      supabase.from("cumplimiento_personal").select("*").order("rol").order("nombre"),
      supabase.from("contrato_crp").select("*").order("creado_en"),
      supabase.from("asig_ue").select("*").order("nombre"),
      supabase.from("asig_vehiculos").select("*").order("placa"),
      supabase.from("prog_semanal").select("*").order("item"),
      supabase.from("app_modulos").select("*"),
      supabase.from("ctr_contratos").select("*").order("orden"),
      supabase.from("ctr_crp").select("*").order("creado_en"),
      supabase.from("liq_manual").select("*").order("creado_en"),
    ]);
    if(pr.data) setProcs(pr.data); if(cv.data) setConvenios(cv.data);
    if(mt.data) setMetas(mt.data); if(pe.data) setPends(pe.data);
    if(pf.data) setProfiles([...pf.data].sort((a,b)=>(a.nombre||a.usuario||"").localeCompare(b.nombre||b.usuario||"","es",{sensitivity:"base"}))); if(ap.data) setAprob(ap.data);
    if(fz.data) setFinanzas(fz.data);
    if(mp.data) setMetasPdd(mp.data);
    if(bt.data) setBitacora(bt.data);
    if(ic.data) setInvCat(ic.data); if(iu.data) setInvUbi(iu.data); if(im.data) setInvMov(im.data);
    if(ma.data) setMetasAct(ma.data);
    if(fd.data) setFinDet(fd.data);
    if(cp.data) setCumplPers(cp.data);
    if(cr.data) setContratoCrp(cr.data);
    if(ue.data) setAsigUE(ue.data); if(vh.data) setAsigVeh(vh.data); if(pg.data) setProgSem(pg.data);
    if(mo.data) setModulos(mo.data);
    if(cc.data) setCtrContratos(cc.data); if(cx.data) setCtrCrp(cx.data);
    if(lm.data) setLiqManual(lm.data);
  },[]);

  useEffect(()=>{ if(!configOk){setCargando(false);return;}
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setCargando(false);});
    const {data:sub}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    return ()=>sub.subscription.unsubscribe();
  },[]);

  useEffect(()=>{ if(!session){setProfile(null);return;}
    (async()=>{ const {data}=await supabase.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
      if(data && data.activo===false){ setAviso("Tu cuenta está desactivada. Contacta al gerente."); await supabase.auth.signOut(); return; }
      setProfile(data||{usuario:session.user.email,rol:"responsable"});
    })();
  },[session]);

  useEffect(()=>{ if(!profile) return; cargar();
    const ch=supabase.channel("atlas-vivo")
      .on("postgres_changes",{event:"*",schema:"public",table:"procesos"},cargar)
      .on("postgres_changes",{event:"*",schema:"public",table:"pendientes"},cargar)
      .on("postgres_changes",{event:"*",schema:"public",table:"cambios_pendientes"},cargar)
      .on("postgres_changes",{event:"*",schema:"public",table:"finanzas"},cargar)
      .on("postgres_changes",{event:"*",schema:"public",table:"metas_pdd"},cargar)
      .on("postgres_changes",{event:"*",schema:"public",table:"inv_catalogo"},cargar)
      .on("postgres_changes",{event:"*",schema:"public",table:"inv_ubicaciones"},cargar)
      .on("postgres_changes",{event:"*",schema:"public",table:"inv_movimientos"},cargar)
      .on("postgres_changes",{event:"*",schema:"public",table:"metas_actividades"},cargar)
      .on("postgres_changes",{event:"*",schema:"public",table:"fin_detalle"},cargar)
      .on("postgres_changes",{event:"*",schema:"public",table:"cumplimiento_personal"},cargar)
      .on("postgres_changes",{event:"*",schema:"public",table:"contrato_crp"},cargar)
      .on("postgres_changes",{event:"*",schema:"public",table:"asig_ue"},cargar)
      .on("postgres_changes",{event:"*",schema:"public",table:"asig_vehiculos"},cargar)
      .on("postgres_changes",{event:"*",schema:"public",table:"prog_semanal"},cargar)
      .on("postgres_changes",{event:"*",schema:"public",table:"app_modulos"},cargar)
      .on("postgres_changes",{event:"*",schema:"public",table:"ctr_contratos"},cargar)
      .on("postgres_changes",{event:"*",schema:"public",table:"ctr_crp"},cargar)
      .on("postgres_changes",{event:"*",schema:"public",table:"liq_manual"},cargar)
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  },[profile,cargar]);

  const rol=profile?.rol;
  const uid=session?.user?.id;
  const isAdminFull=["super_admin","admin","admin_aprobador"].includes(rol);
  const isAprobador=["super_admin","admin_aprobador"].includes(rol);
  const verFinanzas=["super_admin","admin","admin_aprobador","admin_con_aprobacion"].includes(rol);
  const canSeeAll=isAdminFull||rol==="admin_con_aprobacion";
  const perms={
    isAdminFull, isAprobador,
    canEdit:(p)=>{ if(isAdminFull) return true; if(rol==="admin_con_aprobacion") return "approval";
      if(["coordinador","responsable"].includes(rol) && p.responsable_id===uid) return true; return false; },
    canEditPend:(p)=> isAdminFull || p.responsable_id===uid,
    canEditOwn:(p)=> rol==="super_admin" || p.creado_por===uid,
    edita_inv: isAdminFull || !!profile?.edita_inv,
    rolFuncional: profile?.rol_funcional||"",
    finCoord: isAdminFull || !!profile?.coord_convenios,
  };
  const misProcs = canSeeAll ? procs : procs.filter(p=>p.responsable_id===uid);

  const modVisible=(id)=>{ if(id==="roles"||id==="panel") return true; const m=modulos.find(x=>x.modulo===id); return m?m.visible!==false:true; };
  const can={ panel:isAdminFull, contratos:true, convenios:true, financiero:verFinanzas,
    metas:true, inventario:true, liquidaciones:isAdminFull, mapa:true, pendientes:isAdminFull, aprobaciones:isAprobador, roles:isAprobador, asignaciones:true, guia:true, crp:verFinanzas };
  Object.keys(can).forEach(k=>{ if(rol!=="super_admin" || k!=="roles") can[k]=can[k] && modVisible(k); });
  const NAV=[
    {id:"panel",l:"Panel gerencial",ic:LayoutDashboard},
    {id:"pendientes",l:"Pendientes",ic:ListChecks},
    {id:"aprobaciones",l:"Aprobaciones",ic:CheckSquare},
    {id:"asignaciones",l:"Asignaciones",ic:Handshake},
    {id:"metas",l:"Metas",ic:Target},
    {id:"financiero",l:"Financiero",ic:Wallet},
    {id:"crp",l:"Control CRP",ic:Wallet},
    {id:"contratos",l:"Contratos",ic:FileText},
    {id:"convenios",l:"Convenios",ic:Handshake},
    {id:"liquidaciones",l:"Liquidaciones",ic:ShieldCheck},
    {id:"inventario",l:"Inventario",ic:Package},
    {id:"mapa",l:"Mapa",ic:MapIcon},
    {id:"roles",l:"Roles",ic:Users},
    {id:"guia",l:"Guía de uso",ic:BookOpen},
  ].filter(n=>can[n.id]);
  const activeView = can[view] ? view : (NAV[0]?.id||"contratos");

  async function onSaveProc(p,patch,patchAsg,mode){
    try{
      if(mode==="approval" && Object.keys(patch).length){
        for(const [campo,valor] of Object.entries(patch)){
          await supabase.from("cambios_pendientes").insert({proceso_id:p.id,campo,valor_nuevo:String(valor),solicitado_por:uid,aprobador_id:profile.aprobado_por||null});
        }
        await supabase.from("bitacora").insert({actor:uid,accion:"solicitó cambio",detalle:p.id});
        toast("Enviado a aprobación");
      } else {
        const full={...patch,...patchAsg};
        if(Object.keys(full).length){
          const {error}=await supabase.from("procesos").update({...full,actualizado_en:new Date().toISOString()}).eq("id",p.id);
          if(error){ toast("No tienes permiso para editar esto"); return; }
          await supabase.from("bitacora").insert({actor:uid,accion:"editó",detalle:p.id});
          toast("Guardado");
        }
      }
      cargar();
    }catch{ toast("Ocurrió un error al guardar"); }
  }
  async function onCompletar(p,respuesta){
    const {error}=await supabase.from("pendientes").update({estado:"Terminado",respuesta_atencion:respuesta,ejecutado_por:(profile.nombre||profile.usuario),completado_en:new Date().toISOString()}).eq("id",p.id);
    if(error) toast("No tienes permiso"); else { toast("Registrado como atendido"); cargar(); }
  }
  async function onReabrir(p){
    const {error}=await supabase.from("pendientes").update({estado:"Pendiente"}).eq("id",p.id);
    if(error) toast("No tienes permiso"); else { toast("Reabierto"); cargar(); }
  }
  async function onDecidir(c,ok){
    try{
      if(ok){ await supabase.from("procesos").update({[c.campo]:c.valor_nuevo,actualizado_en:new Date().toISOString()}).eq("id",c.proceso_id); }
      await supabase.from("cambios_pendientes").update({estado:ok?"aprobado":"rechazado",decidido_por:uid,decidido_en:new Date().toISOString()}).eq("id",c.id);
      await supabase.from("bitacora").insert({actor:uid,accion:ok?"aprobó cambio":"rechazó cambio",detalle:c.proceso_id});
      toast((ok?"Aprobado":"Rechazado")+" por "+(profile.nombre||profile.usuario)); cargar();
    }catch{ toast("No se pudo procesar"); }
  }
  async function onCrear(tabla,obj){
    const {error}=await supabase.from(tabla).insert(obj);
    if(error) toast("No se pudo crear: "+(error.message||"revisa los datos"));
    else { await supabase.from("bitacora").insert({actor:uid,accion:"creó registro en "+tabla,detalle:obj.id||obj.titulo||""}); toast("Creado"); cargar(); }
  }
  async function onBorrar(tabla,id){
    const {error}=await supabase.from(tabla).delete().eq("id",id);
    if(error) toast("No se pudo eliminar (puede tener registros asociados)");
    else { await supabase.from("bitacora").insert({actor:uid,accion:"eliminó registro de "+tabla,detalle:String(id)}); toast("Eliminado"); cargar(); }
  }
  const finCoord = !!profile?.coord_convenios;
  const canAsignar = isAdminFull || !!profile?.coord_asignaciones;
  const canProg = isAdminFull || !!profile?.coord_prog;
  const canInv = isAdminFull || !!profile?.edita_inv;
  async function onSubirProg(semana,rowsAoa,jornada){
    // rowsAoa = matriz (array de arrays); datos reales desde la fila 3 (índice 2)
    const body=rowsAoa.slice(2).filter(r=>r && (r[0]!==undefined && String(r[0]).trim()!==""));
    const S=(v)=> v===undefined||v===null?"":String(v).replace(/\n/g," ").trim();
    const objs=body.map(r=>({semana,jornada:jornada||"Diurno",item:S(r[0]),localidad:locNum(S(r[1])),barrio:S(r[2]),via:S(r[3]),desde:S(r[4]),hasta:S(r[5]),
      tipo:S(r[6]),civ_pk:S(r[7]),inspector:S(r[8]),actividades:S(r[9]),residente:S(r[10]),director:S(r[11]),
      avance:Number(String(r[12]||"").replace('%','').replace(',','.'))||0, fecha_fin: r[13]? new Date(r[13]).toString()!=="Invalid Date"? new Date(r[13]).toISOString().slice(0,10):null : null}))
      .filter(o=>o.item||o.localidad||o.inspector);
    if(!objs.length){ toast("No encontré filas de datos (revisa que uses la plantilla)"); return; }
    // Reemplazar SOLO lo de esta semana + jornada (evita duplicar al recargar)
    const existentes=(progSem||[]).filter(p=>isoDia(p.semana)===semana && (p.jornada||"Diurno")===(jornada||"Diurno"));
    if(existentes.length && !confirm("Ya hay "+existentes.length+" ítems en esta semana ("+(jornada||"Diurno")+"). Se reemplazarán por los "+objs.length+" del archivo. ¿Continuar?")) return;
    for(const e of existentes){ await supabase.from("prog_semanal").delete().eq("id",e.id); }
    const {error}=await supabase.from("prog_semanal").insert(objs);
    if(error) toast("No se pudo subir: "+(error.message||"")); else { toast(objs.length+" ítems cargados ("+(jornada||"Diurno")+")"); cargar(); }
  }
  const canEditFin=(convId)=> isAdminFull || finCoord || (convId && convenios.find(c=>c.id===convId)?.director_id===uid);
  async function onSaveFin(row,patch){
    const {error}=await supabase.from("finanzas").update({...patch,actualizado_por:uid,actualizado_en:new Date().toISOString()}).eq("id",row.id);
    if(error) toast("No tienes permiso para editar estas cifras"); else { toast("Cifras actualizadas"); cargar(); }
  }
  const canEditMetas=["super_admin","admin_aprobador"].includes(rol);
  async function onSaveMeta(row,patch){
    const {error}=await supabase.from("metas_pdd").update({...patch,actualizado_por:uid,actualizado_en:new Date().toISOString()}).eq("id",row.id);
    if(error) toast("No tienes permiso para editar metas"); else { toast("Meta actualizada"); cargar(); }
  }
  async function onSaveActividad(row,patch){
    const {error}=await supabase.from("metas_actividades").update({...patch,actualizado_por:uid,actualizado_en:new Date().toISOString()}).eq("id",row.id);
    if(error) toast("No tienes permiso para editar"); else { toast("Actividad actualizada"); cargar(); }
  }
  async function onSaveFinDet(k,valor){
    const {error}=await supabase.from("fin_detalle").upsert({...k,valor:Number(valor)||0,actualizado_por:uid,actualizado_en:new Date().toISOString()},{onConflict:"seccion,item,localidad,concepto"});
    if(error) toast("No se pudo guardar: "+(error.message||"")); else { toast("Valor actualizado"); cargar(); }
  }
  async function onCargaMasiva(tabla,filas){
    const byUser=Object.fromEntries(profiles.map(u=>[String(u.usuario||"").toLowerCase(),u]));
    const usr=(v)=>byUser[String(v||"").trim().toLowerCase()];
    let objs=[];
    if(tabla==="procesos"){
      objs=filas.filter(r=>String(r.id||"").trim()).map(r=>({id:String(r.id).trim(),tipo:r.tipo||"Contrato",convenio_id:String(r.convenio_id||"").trim()||null,
        inter:r.inter||"",zona:r.zona||"",loc:r.loc||"",coordinador:r.coordinador||"",responsable_id:(usr(r.responsable_usuario)||{}).id||null,
        ini:r.ini||null,fin:r.fin||null,estado:r.estado||"En ejecución",valor:Number(r.valor)||0,
        aporte_contra:Number(r.aporte_contra)||0,aporte_umv:Number(r.aporte_umv)||0,comp:Number(r.comp)||0,
        ejec:Number(r.ejec)||0,costo_m2:Number(r.costo_m2)||0,meta_id:r.meta_id||null,
        sigma:r.sigma||null,secop:r.secop||null,liq:r.liq||null,liberar:Number(r.liberar)||0,hall:r.hall||null,
        obs_cumpl:r.obs_cumpl||null,prioridad:r.prioridad||"Media"}));
    } else if(tabla==="convenios"){
      objs=filas.filter(r=>String(r.id||"").trim()).map(r=>({id:String(r.id).trim(),nombre:r.nombre||"",contraparte:r.contraparte||"",
        ini:r.ini||null,fin:r.fin||null,aporte_contra:Number(r.aporte_contra)||0,aporte_umv:Number(r.aporte_umv)||0,
        n_contratos:Number(r.n_contratos)||0,estado:r.estado||"En ejecución",director_id:(usr(r.director_usuario)||{}).id||null}));
    } else if(tabla==="pendientes"){
      objs=filas.filter(r=>String(r.titulo||"").trim()).map(r=>{const u=usr(r.responsable_usuario);
        return {tipo:r.tipo||"Tarea",titulo:r.titulo,rad:r.rad||"—",responsable_id:(u||{}).id||null,
        resp_nombre:u?(u.nombre||u.usuario):"—",limite:r.limite||null,estado:"Pendiente",imp:r.imp||"Media",
        gerencial:["si","sí","true","1"].includes(String(r.gerencial||"").toLowerCase())};});
    } else if(tabla==="cumplimiento_personal"){
      const existentes=new Set((cumplPers||[]).map(d=>String(d.nombre||"").trim().toLowerCase()));
      objs=filas.filter(r=>String(r.nombre||"").trim() && !existentes.has(String(r.nombre).trim().toLowerCase())).map(r=>({nombre:r.nombre,rol:(r.rol||"apoyo").toLowerCase(),frente:r.frente||"",
        sigma:r.sigma||"No",hv_segmentos:r.hv_segmentos||"No",informe_diario:r.informe_diario||"No",corte:r.corte||null,obs:r.obs||""}));
      if(!objs.length){ toast("Todas las personas del archivo ya estaban cargadas (no se duplican)"); return; }
    } else if(tabla==="inv_catalogo"){
      objs=filas.filter(r=>String(r.codigo||"").trim()).map(r=>({codigo:String(r.codigo).trim(),descripcion:r.descripcion||"",categoria:r.categoria||"",unidad:r.unidad||"UN",stock_min:Number(r.stock_min)||0}));
    } else if(tabla==="asig_ue"){
      const nuevas=filas.filter(r=>String(r.nombre||"").trim()).map(r=>({nombre:String(r.nombre).trim(),inspector:String(r.inspector||"").trim(),actividades:r.actividades||"",director_obra:r.director_obra||""}));
      if(!nuevas.length){ toast("El archivo no tiene UE válidas"); return; }
      const key=(o)=> (String(o.nombre||"").trim().toLowerCase()+"|"+String(o.inspector||"").trim().toLowerCase());
      const setNuevas=new Set(nuevas.map(key));
      const actuales=asigUE||[];
      const sobran=actuales.filter(u=>!setNuevas.has(key(u)));
      if(!confirm("Sincronizar Unidades Ejecutoras con el archivo:\n\n· Se actualizan/crean "+nuevas.length+" del archivo.\n· Se ELIMINARÁN "+sobran.length+" que no aparecen en el archivo.\n\n¿Continuar?")) return;
      const mapAct=Object.fromEntries(actuales.map(u=>[key(u),u]));
      for(const o of nuevas){
        const ex=mapAct[key(o)];
        if(ex){ await supabase.from("asig_ue").update({actividades:o.actividades,director_obra:o.director_obra}).eq("id",ex.id); }
        else { await supabase.from("asig_ue").insert(o); }
      }
      for(const s of sobran){ await supabase.from("asig_ue").delete().eq("id",s.id); }
      await supabase.from("bitacora").insert({actor:uid,accion:"sincronizar asig_ue",detalle:nuevas.length+" en archivo, "+sobran.length+" eliminadas"});
      toast("UE sincronizadas: "+nuevas.length+" vigentes, "+sobran.length+" eliminadas"); cargar(); return;
    }
    if(!objs.length){ toast("No hay filas válidas para cargar"); return; }
    const q = (tabla==="pendientes"||tabla==="cumplimiento_personal"||tabla==="asig_ue") ? supabase.from(tabla).insert(objs) : supabase.from(tabla).upsert(objs);
    const {error}=await q;
    if(error) toast("Error al cargar: "+(error.message||"revisa los datos"));
    else { await supabase.from("bitacora").insert({actor:uid,accion:"carga masiva "+tabla,detalle:objs.length+" filas"}); toast(objs.length+" filas cargadas"); cargar(); }
  }
  async function onAsignar(tabla,campo,id,valor){
    const {error}=await supabase.from(tabla).update({[campo]:(valor===""?null:valor)}).eq("id",id);
    if(error) toast("No se pudo guardar (revisa permisos)"); else { toast("Guardado"); cargar(); }
  }
  async function onCampoCat(codigo,valor){
    const {error}=await supabase.from("inv_catalogo").update({stock_min:Number(valor)||0}).eq("codigo",codigo);
    if(error) toast("No se pudo guardar (revisa permisos)"); else { toast("Guardado"); cargar(); }
  }
  async function onToggleModulo(id,vis){
    const {error}=await supabase.from("app_modulos").upsert({modulo:id,visible:vis},{onConflict:"modulo"});
    if(error) toast("No se pudo cambiar el módulo"); else { toast(vis?"Módulo visible":"Módulo oculto"); cargar(); }
  }
  async function onSubirVeh(semanaSel,aoa){
    const norm=s=>String(s||"").toLowerCase().replace(/[^a-z]/g,"");
    const S=v=> v===undefined||v===null?"":String(v).replace(/\n/g," ").trim();
    const hi=aoa.findIndex(r=>r&&r.some(c=>norm(c)==="fecha"));
    if(hi<0){ toast("No encontré los encabezados (FECHA, PLACA...)"); return; }
    const idx={}; aoa[hi].forEach((c,i)=>{const n=norm(c);
      ["fecha","tipologia","placa","conductor","celular","programa","zona","nombre"].forEach(f=>{ if(n===f) idx[f]=i; }); });
    const toISO=v=>{ if(v instanceof Date) return isoDia(v); if(!v) return null; const d=new Date(v); return isNaN(d)?null:isoDia(d); };
    const body=aoa.slice(hi+1).filter(r=>r&&(r[idx.placa]||r[idx.nombre]||r[idx.fecha]));
    const objs=body.map(r=>{ const f=toISO(r[idx.fecha]);
      return { semana: f? isoDia(domingoDe(new Date(f+"T00:00:00"))) : semanaSel, fecha:f,
        tipologia:S(r[idx.tipologia]), placa:S(r[idx.placa]).toUpperCase(), conductor:S(r[idx.conductor]),
        celular:S(r[idx.celular]), programa:S(r[idx.programa]), zona:S(r[idx.zona]), nombre:S(r[idx.nombre]), creado_por:uid };
    }).filter(o=>o.placa||o.nombre);
    if(!objs.length){ toast("No encontré filas de vehículos"); return; }
    const {error}=await supabase.from("asig_vehiculos").insert(objs);
    if(error) toast("No se pudo subir: "+(error.message||"")); else { toast(objs.length+" vehículos cargados"); cargar(); }
  }
  function onExportTablero(){
    const data={ exportado:new Date().toISOString(), version:"v0.27",
      profiles, convenios, procesos:procs, contrato_crp:contratoCrp, pendientes:pends, cambios_pendientes:aprob,
      finanzas, fin_detalle:finDet, metas_pdd:metasPdd, metas_actividades:metasAct, cumplimiento_personal:cumplPers,
      inv_catalogo:invCat, inv_ubicaciones:invUbi, inv_movimientos:invMov,
      asig_ue:asigUE, asig_vehiculos:asigVeh, prog_semanal:progSem, app_modulos:modulos };
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download="ATLAS_tablero_"+new Date().toISOString().slice(0,10)+".json"; a.click(); URL.revokeObjectURL(url);
    toast("Tablero exportado");
  }
  const nombreDe=(id)=> profiles.find(u=>u.id===id)?.nombre || profiles.find(u=>u.id===id)?.usuario || "";
  const usuarioDe=(id)=> profiles.find(u=>u.id===id)?.usuario || "";
  const aprobPend=aprob.filter(a=>a.estado==="pendiente");

  if(!configOk) return <><style>{CSS}</style><Centro><b>Falta configurar Supabase.</b> Abre <code>src/config.js</code> y pega tu API URL y tu Publishable key.</Centro></>;
  if(cargando) return <><style>{CSS}</style><Centro>Cargando…</Centro></>;
  if(aviso) return <><style>{CSS}</style><Centro>{aviso} <button className="btn" onClick={()=>setAviso("")} style={{marginLeft:8,background:C.navy,color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer"}}>Volver</button></Centro></>;
  if(!session) return <><style>{CSS}</style><Login/></>;
  if(!profile) return <><style>{CSS}</style><Centro>Cargando tu perfil…</Centro></>;

  return <div style={{fontFamily:F.body,color:C.ink,background:C.paper,minHeight:"100vh"}}>
    <style>{CSS}</style>
    <div className="atlas-shell">
      <nav className="atlas-nav">
        <div className="brandblock" style={{padding:"20px 18px 16px",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,borderRadius:8,background:C.bronze,display:"grid",placeItems:"center"}}>
              <Compass size={20} color={C.navy}/></div>
            <div><div style={{fontFamily:F.disp,fontWeight:700,fontSize:19,letterSpacing:1}}>ATLAS</div>
              <div style={{fontFamily:F.mono,fontSize:7.5,color:"#8FA1BE",lineHeight:1.3,marginTop:1}}>{ACRO}</div></div>
          </div>
        </div>
        <div className="atlas-navlist">
          {NAV.map(n=><button key={n.id} onClick={()=>setView(n.id)} className="atlas-navitem"
            style={{background:activeView===n.id?"rgba(181,132,58,.16)":"transparent",color:activeView===n.id?"#fff":"#B9C6DC",borderLeft:activeView===n.id?"3px solid "+C.bronze:"3px solid transparent"}}>
            <n.ic size={17}/><span>{n.l}</span>
            {n.id==="aprobaciones"&&aprobPend.length>0&&<span style={{marginLeft:"auto",background:C.rojo,color:"#fff",fontSize:10,borderRadius:999,padding:"0 6px"}}>{aprobPend.length}</span>}</button>)}
        </div>
        <div className="brandblock" style={{marginTop:"auto",padding:14,borderTop:"1px solid rgba(255,255,255,.08)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:999,background:C.bronze,display:"grid",placeItems:"center",fontFamily:F.disp,fontWeight:700,color:C.navy,fontSize:12}}>{(profile.nombre||profile.usuario||"?").slice(0,2).toUpperCase()}</div>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:12.5,fontWeight:600,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{profile.nombre||profile.usuario}</div>
              <div style={{fontSize:10,color:"#8FA1BE"}}>@{profile.usuario} · {rolTxt[profile.rol]}</div></div>
            <button className="btn" aria-label="Cambiar contraseña" onClick={()=>setPwOpen(true)} title="Cambiar contraseña" style={{background:"rgba(255,255,255,.12)",border:"none",borderRadius:8,padding:6,cursor:"pointer"}}><Lock size={15} color="#fff"/></button>
            <button className="btn" aria-label="Cerrar sesión" onClick={()=>supabase.auth.signOut()} title="Salir" style={{background:"rgba(255,255,255,.12)",border:"none",borderRadius:8,padding:6,cursor:"pointer"}}><LogOut size={15} color="#fff"/></button>
          </div>
        </div>
      </nav>
      <main className="atlas-main">
        <div style={{maxWidth:1180,margin:"0 auto",padding:"26px clamp(16px,4vw,34px) 60px"}}>
          <div className="view-anim" key={activeView}>
          {activeView==="panel"&&<Panel procs={procs} pends={pends} aprob={aprob} invCat={invCat} invMov={invMov} cumplPers={cumplPers} bitacora={bitacora} nombreDe={nombreDe} onPick={setSel} setView={setView}/>}
          {activeView==="contratos"&&<Contratos procs={misProcs} onPick={setSel} nombreDe={nombreDe} isAdmin={perms.isAdminFull} isSuper={rol==="super_admin"} onCrear={onCrear} onBorrar={onBorrar} profiles={profiles} convenios={convenios} onCarga={onCargaMasiva} usuarioDe={usuarioDe} toast={toast}/>}
          {activeView==="convenios"&&<Convenios procs={misProcs} convenios={convenios} crp={ctrCrp} contratosCtr={ctrContratos} onPick={setSel} canEditFin={canEditFin} onCelda={(id,campo,v)=>onAsignar("procesos",campo,id,v)} onEstadoConv={(id,v)=>onAsignar("convenios","estado",id,v)} isAdmin={perms.isAdminFull} isSuper={rol==="super_admin"} onCrear={onCrear} onBorrar={onBorrar} profiles={profiles} nombreDe={nombreDe} onCarga={onCargaMasiva} usuarioDe={usuarioDe} toast={toast}/>}
          {activeView==="financiero"&&<Financiero finanzas={finanzas} finDet={finDet} canEditFin={canEditFin} onSaveFin={onSaveFin} onSaveFinDet={onSaveFinDet}/>}
          {activeView==="metas"&&<Metas metasPdd={metasPdd} metasAct={metasAct} canEditMetas={canEditMetas} onSaveMeta={onSaveMeta} onSaveActividad={onSaveActividad} nombreDe={nombreDe}/>}
          {activeView==="mapa"&&<Mapa/>}
          {activeView==="pendientes"&&<Pendientes pends={pends} perms={perms} uid={uid} onCompletar={onCompletar} onReabrir={onReabrir} onEditar={(id,campo,v)=>onAsignar("pendientes",campo,id,v)} toast={toast} profiles={profiles} onCrear={onCrear} onBorrar={onBorrar} onCarga={onCargaMasiva} usuarioDe={usuarioDe}/>}
          {activeView==="aprobaciones"&&<Aprobaciones items={aprob} onDecidir={onDecidir} nombreDe={nombreDe} procs={procs} convenios={convenios} profiles={profiles} isAdmin={perms.isAdminFull} onCrear={onCrear} onBorrar={onBorrar} uid={uid} perms={perms} onCampo={(id,campo,v)=>onAsignar("procesos",campo,id,v)} onCampoConv={(id,campo,v)=>onAsignar("convenios",campo,id,v)} onCampoPersonal={(id,campo,v)=>onAsignar("cumplimiento_personal",campo,id,v)} cumplPers={cumplPers} onCargaMasiva={onCargaMasiva} usuarioDe={usuarioDe} toast={toast}/>}
          {activeView==="liquidaciones"&&<Liquidaciones procs={misProcs} convenios={convenios} manuales={liqManual} profiles={profiles} perms={perms} uid={uid} onCampo={(id,campo,v)=>onAsignar("procesos",campo,id,v)} onCampoConv={(id,campo,v)=>onAsignar("convenios",campo,id,v)} onCampoManual={(id,campo,v)=>onAsignar("liq_manual",campo,id,v)} onCrearManual={(o)=>onCrear("liq_manual",{...o,creado_por:uid})} onBorrarManual={(id)=>onBorrar("liq_manual",id)} onEstadoConv={(id,v)=>onAsignar("convenios","estado",id,v)} nombreDe={nombreDe} toast={toast}/>}
          {activeView==="inventario"&&<Inventario cat={invCat} ubi={invUbi} mov={invMov} profiles={profiles} perms={perms} uid={uid} onCrear={onCrear} onBorrar={onBorrar} onCampoCat={onCampoCat} onCarga={onCargaMasiva} usuarioDe={usuarioDe} nombreDe={nombreDe} toast={toast}/>}
          {activeView==="asignaciones"&&<Asignaciones ue={asigUE} veh={asigVeh} prog={progSem} profiles={profiles} puede={canAsignar} puedeProg={canProg} uid={uid} onCrear={onCrear} onBorrar={onBorrar} onCampo={(tabla,id,campo,v)=>onAsignar(tabla,campo,id,v)} onCarga={onCargaMasiva} onSubirProg={onSubirProg} onSubirVeh={onSubirVeh} usuarioDe={usuarioDe} toast={toast}/>}
          {activeView==="guia"&&<Guia rol={rol}/>}
          {activeView==="crp"&&<ControlCRP contratos={ctrContratos} crp={ctrCrp} convenios={convenios} perms={perms} uid={uid} onCampo={(id,campo,v)=>onAsignar("ctr_contratos",campo,id,v)} onCrearCRP={(o)=>onCrear("ctr_crp",{...o,creado_por:uid})} onBorrarCRP={(id)=>onBorrar("ctr_crp",id)} toast={toast}/>}
          {activeView==="roles"&&<RolesView profiles={profiles} convenios={convenios} isSuper={rol==="super_admin"} onCambiarRol={(id,r)=>onAsignar("profiles","rol",id,r)} onAsignarDirector={(cid,pid)=>onAsignar("convenios","director_id",cid,pid)} onActivar={(id,val)=>onAsignar("profiles","activo",id,val)} onRolFuncional={(id,v)=>onAsignar("profiles","rol_funcional",id,v)} onCoordAsig={(id,v)=>onAsignar("profiles","coord_asignaciones",id,v)} modulos={modulos} onToggleModulo={onToggleModulo} onExportTablero={onExportTablero}/>}
          </div>
          <div style={{marginTop:40,textAlign:"center",fontFamily:F.mono,fontSize:10.5,color:C.slate}}>ATLAS · {ACRO} · datos guardados en tiempo real · <b>v1.0.7</b></div>
        </div>
      </main>
    </div>
    {sel&&<Detail p={sel} onClose={()=>setSel(null)} perms={perms} profiles={profiles} onSave={onSaveProc} crp={contratoCrp} onCrearCRP={(o)=>onCrear("contrato_crp",{...o,creado_por:uid})} onBorrarCRP={(id)=>onBorrar("contrato_crp",id)} toast={toast}/>}
    {pwOpen&&<CambiarPass onClose={()=>setPwOpen(false)} toast={toast}/>}
    {toastMsg&&<div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",background:C.navy,color:"#fff",padding:"10px 18px",borderRadius:10,fontSize:13,zIndex:99,boxShadow:"0 4px 16px rgba(0,0,0,.25)"}}>{toastMsg}</div>}
  </div>;
}

function Centro({children}){
  return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#F4F6F9",fontFamily:F.body,padding:24}}>
    <div style={{maxWidth:420,textAlign:"center",color:"#1B2A44",fontSize:14,lineHeight:1.6}}>{children}</div></div>;
}
