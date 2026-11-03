/* Performance Command Center — uses existing private recovery endpoint and local activity history. */
(function(){
 const $=id=>document.getElementById(id);
 const num=x=>Number.isFinite(Number(x))?Number(x):null;
 const label=x=>x==null?'—':Number(x).toLocaleString('es-CO',{maximumFractionDigits:1});
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const day=s=>String(s||'').slice(0,10);
 function week(d){const x=new Date(day(d)+'T12:00:00Z');x.setUTCDate(x.getUTCDate()-(x.getUTCDay()+6)%7);return x.toISOString().slice(0,10)}
 function svgLine(data,{min=0,max=null,color='#21adff',fill=false}={}){
  const w=900,h=250,top=25,bottom=207;const lo=min,hi=Math.max(lo+1,max??Math.max(...data.filter(Number.isFinite),1)),dx=(w-60)/Math.max(1,data.length-1);
  const pts=data.map((v,i)=>Number.isFinite(v)?[35+i*dx,bottom-(v-lo)/(hi-lo)*(bottom-top)]:null);
  let paths=[],p=[];pts.forEach(a=>{if(!a){if(p.length)paths.push(p);p=[]}else p.push(a)});if(p.length)paths.push(p);
  return paths.map(p=>'<path d="'+p.map((v,i)=>(i?'L':'M')+v[0].toFixed(1)+','+v[1].toFixed(1)).join(' ')+'" fill="none" stroke="'+color+'" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>').join('');
 }
 function plot(load,ctl,atl,form,dates){
  const extent=Math.max(20,...ctl,...atl),bottom=227,w=900,dx=840/Math.max(1,dates.length-1);
  const bars=form.map((v,i)=>{const size=Math.min(45,Math.abs(v)*2);const x=32+i*dx;return '<rect x="'+x.toFixed(1)+'" y="'+(v<0?183:183-size).toFixed(1)+'" width="'+Math.max(2,dx*.57).toFixed(1)+'" height="'+Math.max(1,size).toFixed(1)+'" rx="2" fill="'+(v<0?'#f85b70':'#eabf3f')+'"/>'}).join('');
  return '<svg viewBox="0 0 900 250" role="img" aria-label="Evolución de carga, CTL, ATL y forma" style="width:100%;height:auto"><path d="M30 183H890" stroke="#648098" opacity=".45"/>'+bars+svgLine(ctl,{max:extent,color:'#328dfa'})+svgLine(atl,{max:extent,color:'#ff4f9e'})+'<text x="35" y="244" fill="#a5bacc" font-size="13">'+escape(dates[0]||'')+'</text><text x="890" y="244" text-anchor="end" fill="#a5bacc" font-size="13">'+escape(dates.at(-1)||'')+'</text></svg>';
 }
 async function render(){
  const el=$('performanceCenter');if(!el)return;
  const wellness=await fetch('/api/recomendacion',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);
  const h=await Store.get('historia'),raw=Array.isArray(h)&&h.length?h:(await Store.get('strava_sessions')||[]);
  const daily=new Map();
  for(const a of raw){const d=day(a.date||a.fecha||a.start_date_local);if(!/^\d{4}-\d{2}-\d{2}$/.test(d))continue;const load=num(a.carga??a.icu_training_load)??0;daily.set(d,(daily.get(d)||0)+load)}
  const dates=Array.from({length:42},(_,i)=>new Date(Date.now()-(41-i)*86400000).toISOString().slice(0,10));
  const loads=dates.map(d=>daily.get(d)||0),ctl=[],atl=[],form=[];
  // This is a clearly labelled approximation from recent history, not official Intervals.icu CTL/ATL.
  let c=0,a=0;for(const load of loads){c+= (load-c)*(1-Math.exp(-1/42));a+=(load-a)*(1-Math.exp(-1/7));ctl.push(c);atl.push(a);form.push(c-a)}
  const e=wellness?.evidencia||{},read=wellness?.estado||'sin_datos';
  const kpis=[['Estado de hoy',read==='mantener'?'Estable':read==='moderar'?'Moderado':read==='reducir'?'Reducir':'Sin datos','Recuperación'],['Fitness (CTL)',label(num(e.ctl)),'Intervals.icu'],['Fatiga (ATL)',label(num(e.atl)),'Intervals.icu'],['Forma',label(num(e.forma)),'CTL − ATL'],['Sueño',e.suenoH!=null?label(num(e.suenoH))+' h':'—','Último registro'],['HRV',label(num(e.hrv)),'Último registro'],['FC reposo',label(num(e.fcReposo)),'ppm'],['Carga 7 días',label(loads.slice(-7).reduce((a,b)=>a+b,0)),'Actividades']];
  const chip=([k,v,sub])=>'<div class="pc-kpi"><div class="pc-label">'+escape(k)+'</div><div class="pc-value">'+escape(v)+'</div><div class="pc-sub">'+escape(sub)+'</div></div>';
  el.innerHTML='<div class="pc-top"><div><p class="eyebrow">◈ Tu centro de rendimiento</p><h2>Performance Command Center</h2><p class="pc-note">Datos observados de Intervals.icu y Garmin · sin inventar potencia ni FTP.</p></div><span class="pc-indicator">'+escape(wellness?.titular||'Actualiza tus actividades')+'</span></div><div class="pc-grid">'+kpis.map(chip).join('')+'</div><div class="pc-panel"><div class="pc-head"><div><h3>Rendimiento y forma</h3><p>Últimos 42 días · tendencia estimada según la carga sincronizada</p></div><span class="pc-pill">PMC</span></div><div class="pc-chart">'+plot(loads,ctl,atl,form,dates)+'</div><div class="pc-legend"><span><i style="background:#328dfa"></i>Fitness estimado</span><span><i style="background:#ff4f9e"></i>Fatiga estimada</span><span><i style="background:#eabf3f"></i>Forma positiva</span><span><i style="background:#f85b70"></i>Forma negativa</span></div><p class="pc-note">Los cálculos de las curvas parten de cero si el historial disponible es insuficiente. Para decisiones de entrenamiento prevalecen los CTL/ATL reales del resumen superior.</p></div>';
 }
 window.addEventListener('load',()=>render().catch(()=>{}));
 document.addEventListener('click',e=>{if(e.target.closest('[data-v="inicio"]'))render().catch(()=>{})});
})();
