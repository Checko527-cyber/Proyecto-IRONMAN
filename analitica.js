/* Panel analítico de rendimiento. Datos del historial ya sincronizado por la app. */
(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Number.isFinite(v)?v.toLocaleString('es-CO',{maximumFractionDigits:1}):'—';
const day=s=>String(s||'').slice(0,10);
const type=s=>/swim|nat/i.test(s)?'Natación':/run|corr/i.test(s)?'Carrera':/ride|bik|cycl|cicl/i.test(s)?'Bicicleta':/weight|strength|fuerza/i.test(s)?'Fuerza':'Otros';
const week=s=>{const d=new Date(day(s)+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10)};
const n=(v,fallback=0)=>Number.isFinite(+v)?+v:fallback;
const metric=(e,k)=>n(e[k]??e[{min:'moving_time',carga:'icu_training_load',km:'distance'}[k]]);
function plot(values,labels){
 const max=Math.max(1,...values),w=650,h=175,g=8,bw=Math.max(8,(w-44)/values.length-g);
 return '<svg viewBox="0 0 700 205" role="img" aria-label="Volumen semanal por horas" style="width:100%;height:auto"><line x1="35" y1="171" x2="688" y2="171" stroke="currentColor" opacity=".23"/>'+
 values.map((v,i)=>{const x=38+i*(w/values.length),bh=Math.max(2,Math.round(v/max*146));return '<rect x="'+x+'" y="'+(171-bh)+'" width="'+bw+'" height="'+bh+'" rx="4" fill="#39b6c6"/><text x="'+(x+bw/2)+'" y="190" font-size="9" fill="currentColor" text-anchor="middle">'+esc(labels[i].slice(5))+'</text><text x="'+(x+bw/2)+'" y="'+(165-bh)+'" font-size="10" fill="currentColor" text-anchor="middle">'+fmt(v)+'</text>'}).join('')+'</svg>';
}
async function draw(){
 const root=$('atlasAnalytics');if(!root)return;
 const raw=await Store.get('historia')||await Store.get('strava_sessions')||[];
 const data=raw.map(x=>({fecha:day(x.date||x.start_date_local||x.fecha),deporte:type(x.sport||x.type||x.deporte),
 horas:n(x.min??(x.moving_time?x.moving_time/60:null)??(x.duration?x.duration/60:null))/60,
 km:n(x.km??(x.distance?x.distance/1000:null)),
 carga:n(x.carga??x.icu_training_load??x.icu_training_load),
 fc:n(x.fc_media??x.avgHr??x.average_hr),
 cadence:n(x.cadencia??x.cadence)})).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.fecha));
 const weeks=new Map(), sports=new Map();
 for(const a of data){const k=week(a.fecha);weeks.set(k,(weeks.get(k)||0)+a.horas);
  const s=sports.get(a.deporte)||{ses:0,horas:0,km:0,carga:0};s.ses++;s.horas+=a.horas;s.km+=a.km;s.carga+=a.carga;sports.set(a.deporte,s);}
 const keys=[...weeks.keys()].sort().slice(-12),weekly=keys.map(k=>+(weeks.get(k)||0).toFixed(1));
 const plan=(await Store.get('planned_workouts'))||[];
 const today=new Date().toISOString().slice(0,10);
 const dates=Array.from({length:7},(_,i)=>new Date(Date.parse(today+'T12:00:00Z')+i*86400000).toISOString().slice(0,10));
 const proposals=dates.filter(d=>[4,6].includes(new Date(d+'T12:00:00Z').getUTCDay())).map(d=>{
   const own=plan.filter(x=>day(x.date||x.fecha)===d),busy=own.some(x=>type(x.sport||x.deporte)==='Bicicleta');
   const hard=own.some(x=>['Carrera','Fuerza'].includes(type(x.sport||x.deporte)) && /tempo|interval|serie|umbral|largo|long/i.test((x.name||x.nombre||'')+' '+(x.description||'')));
   return {date:d,busy,hard,minutes:new Date(d+'T12:00:00Z').getUTCDay()===6?90:45};
 });
 const card=(body)=>'<div class="atlas-panel">'+body+'</div>';
 root.innerHTML='<p class="eyebrow">◈ Analítica multidisciplinaria</p><h2>Tu evolución con datos de entrenamiento</h2><p class="atlas-muted">Historial sincronizado · cifras observadas, no estimaciones de potencia.</p>'+
 '<div class="atlas-kpis">'+[['Sesiones',data.length],['Horas registradas',fmt(data.reduce((a,b)=>a+b.horas,0))],['Semanas con datos',weeks.size],['Carga registrada',fmt(data.reduce((a,b)=>a+b.carga,0))]].map(([k,v])=>card('<small>'+k+'</small><strong>'+v+'</strong>')).join('')+'</div>'+
 card('<h3>Horas por semana · últimas 12 semanas con datos</h3>'+(keys.length?plot(weekly,keys):'<p>No hay historial sincronizado.</p>'))+
 card('<h3>Distribución por deporte</h3><div class="atlas-scroll"><table><thead><tr><th>Deporte</th><th>Sesiones</th><th>Horas</th><th>Km</th><th>Carga</th></tr></thead><tbody>'+
 [...sports.entries()].map(([k,v])=>'<tr><td>'+esc(k)+'</td><td>'+v.ses+'</td><td>'+fmt(v.horas)+'</td><td>'+fmt(v.km)+'</td><td>'+fmt(v.carga)+'</td></tr>').join('')+'</tbody></table></div>')+
 card('<h3>Bicicleta complementaria · próximos 7 días</h3><p class="atlas-muted">Propuestas, nunca alteraciones del plan original. El calendario de TrainingPeaks no está conectado directamente.</p>'+
 (!plan.length?'<p>Sin plan importado: no se prescribirá intensidad hasta conocer las sesiones de carrera y fuerza.</p>':
 proposals.map(p=>'<div class="atlas-suggestion"><b>'+p.date+'</b><span>'+(p.busy?'Ya existe bicicleta':p.hard?'Omitir: entrenamiento intenso del entrenador':p.minutes+' min Z1–Z2 sugeridos · pendiente de confirmar')+'</span></div>').join(''))+
 '<p class="atlas-muted">Aprendizaje: se conserva el historial para análisis de carga y cumplimiento. No hay entrenamiento automático de modelos con estos datos.</p>');
}
document.addEventListener('click',e=>{if(e.target.closest('[data-v="analitica"]'))draw()});
window.addEventListener('load',()=>{if($('v-analitica')?.classList.contains('active'))draw()});
})();
