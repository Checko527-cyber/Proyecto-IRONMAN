import {TARGET,WEEKS,ZONES,NUTRITION,weekOf,weekStatus,bikeSession,raceSplit} from './lib/victoria-plan.js';
const $=id=>document.getElementById(id);
const state={week:1,activities:[],wellness:[],loaded:false,tab:'plan',filter:'all'};
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const day=d=>new Date(d+'T12:00:00Z').toLocaleDateString('es-CO',{day:'numeric',month:'short',timeZone:'UTC'});
const hours=n=>Number.isFinite(n)?n.toLocaleString('es-CO',{maximumFractionDigits:1})+' h':'—';
const colors={swim:'#45c1e8',bike:'#e1b551',run:'#ef6d8c',strength:'#a18af1'};
const texts={swim:'Natación',bike:'Bicicleta',run:'Carrera',strength:'Fuerza'};
const phases={recuperacion:'RECUPERACIÓN',base:'BASE',descarga:'DESCARGA',especifico:'ESPECÍFICO',pico:'PICO',taper:'AFINAMIENTO',competencia:'CARRERA'};
function panel(body){return '<div class="v7-panel">'+body+'</div>';}
function bar(key,hours,total){return '<div title="'+safe(texts[key])+': '+hours+' horas" style="width:'+Math.max(0,hours/Math.max(total,.01)*100)+'%;background:'+colors[key]+'"></div>';}
function phaseDiagram(){
 return '<div class="v7-phases">'+[['Base','Nov–feb','#45c1e8'],['Específico','Mar–abr','#e1b551'],['Pico','May','#ef6d8c'],['Victoria','30 may','#13d6b2']].map(([a,b,c])=>'<div class="v7-phase"><span style="background:'+c+'"></span><strong>'+a+'</strong><small>'+b+'</small></div>').join('')+'</div>';
}
function volumeChart(){
 const barWidth=100/29;
 const height=190,base=161,max=13;
 const lines=[0,4,8,12].map(v=>'<line x1="0" x2="1000" y1="'+(base-v/max*150)+'" y2="'+(base-v/max*150)+'" stroke="#55748c" opacity=".25"/><text x="7" y="'+(base-v/max*150-4)+'" fill="#95b0c6" font-size="12">'+v+' h</text>').join('');
 const bars=WEEKS.map((w,i)=>{
   const x=33+i*33;
   let y=base;
   const display=['swim','bike','run','strength'].map(k=>{
    const h=w[k]/max*150;
    y-=h;
    return '<rect x="'+x+'" y="'+y.toFixed(1)+'" width="22" height="'+h.toFixed(1)+'" rx="1" fill="'+colors[k]+'"/>';
   }).join('');
   const selected=i+1===state.week?'<rect x="'+(x-3)+'" y="5" width="28" height="160" fill="none" stroke="#e9f9f7" stroke-width="1.7" rx="4"/>':'';
   return display+selected+'<text x="'+(x+11)+'" y="184" text-anchor="middle" font-size="11" fill="#aac1d0">'+(i+1)+'</text>';
 }).join('');
 return '<div class="v7-chart-scroll"><svg role="img" aria-label="Plan de volumen de 29 semanas por deporte" viewBox="0 0 1000 200" style="min-width:680px;width:100%">'+lines+bars+'</svg></div>';
}
function weeklyTable(){
 return '<div class="v7-scroll"><table class="v7-table"><thead><tr><th>Sem.</th><th>Fechas</th><th>Fase</th><th>N</th><th>B</th><th>C</th><th>F</th><th>Total</th></tr></thead><tbody>'+WEEKS.map(w=>'<tr data-week-row="'+w.number+'" class="'+(state.week===w.number?'selected':'')+'"><td><button class="v7-week-link" data-select-week="'+w.number+'">'+w.number+'</button></td><td>'+day(w.start)+' – '+day(w.end)+'</td><td><span class="v7-phase-badge '+w.phase+'">'+phases[w.phase]+'</span></td><td>'+w.swim+'</td><td>'+w.bike+'</td><td>'+w.run+'</td><td>'+w.strength+'</td><td><b>'+w.total+'</b></td></tr>').join('')+'</tbody></table></div>';
}
function lineSVG(series){
 const w=850,h=170,base=140,max=Math.max(70,...series.filter(Number.isFinite))*1.15;
 const points=series.map((v,i)=>[22+i*(810/Math.max(1,series.length-1)),base-Math.min(max,Math.max(0,v))/max*112]);
 return '<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Tendencia de carga semanal observada" style="width:100%"><path d="M22 140H840" stroke="#64819c" opacity=".3"/><path d="'+points.map((p,i)=>(i?'L':'M')+p.map(n=>n.toFixed(1)).join(',')).join(' ')+'" stroke="#17d5b4" stroke-width="3" fill="none"/>'+points.map((p,i)=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="2.2" fill="#42d3e6"/>').join('')+'</svg>';
}
function weekCard(){
 const w=WEEKS[state.week-1],stat=weekStatus(w,state.activities);
 const pieces=['swim','bike','run','strength'].map(k=>'<div class="v7-measure"><span style="--v7-color:'+colors[k]+'">'+texts[k]+'</span><div class="v7-comparison"><strong>'+hours(w[k])+'</strong><small>previsto</small><strong>'+hours(stat[k].hours)+'</strong><small>registrado</small></div><div class="v7-mini-bar"><i style="width:'+Math.min(100,w[k]/Math.max(5.4,w.total)*100)+'%;background:'+colors[k]+'"></i></div></div>').join('');
 const steps=bikeSession(w);
 const blocks=steps.map(x=>'<div class="v7-step"><b>'+safe(x.minutes+' min')+'</b><div><strong>'+safe(x.name)+'</strong><small>'+safe(x.zone)+' · '+safe(x.hr)+'</small></div></div>').join('');
 return panel('<div class="v7-card-head"><div><span class="v7-phase-badge '+w.phase+'">'+phases[w.phase]+'</span><h3>Semana '+w.number+' <small>'+day(w.start)+' – '+day(w.end)+'</small></h3></div><div class="v7-total"><strong>'+hours(w.total)+'</strong><small>objetivo orientativo</small></div></div>'+
 '<div class="v7-split-bar">'+['swim','bike','run','strength'].map(k=>bar(k,w[k],w.total)).join('')+'</div><div class="v7-measures">'+pieces+'</div>'+
 '<div class="v7-card-head v7-subhead"><h4>Bicicleta protagonista</h4><span>Sesión propuesta · no publicada</span></div><div class="v7-steps">'+blocks+'</div>'+
 (w.focus?'<div class="v7-focus"><b>Foco de la semana</b><span>'+safe(w.focus)+'</span></div>':'')+
 '<div class="v7-note">Las sesiones de natación, carrera y fuerza son objetivos de volumen para coordinar con tu entrenador. No se ha verificado el calendario de TrainingPeaks y ninguna sesión se marca como cumplida sin registro.</div>');
}
function overview(){
 const w=WEEKS[state.week-1],st=weekStatus(w,state.activities),hasPast=w.start<=new Date().toISOString().slice(0,10);
 return '<div class="v7-kpis">'+[
 ['Objetivo de tiempo','6:30:00','Victoria 30 mayo 2027'],
 ['Semana seleccionada',String(w.number)+' / 29',phases[w.phase]],
 ['Carga prevista',hours(w.total),'N+B+C+F'],
 ['Horas realizadas',hasPast?hours(st.totalHours):'—',hasPast?'Actividades conectadas':'Semana futura'],
 ].map(([label,value,note])=>'<div class="v7-kpi"><small>'+label+'</small><strong>'+value+'</strong><span>'+safe(note)+'</span></div>').join('')+'</div>';
}
function nutritionPanel(){
 return panel('<div class="v7-card-head"><h3>Entrenamiento gastrointestinal</h3><span>Registro y ensayo, no dosis fijas</span></div>'+
 '<div class="v7-nutri-grid"><div><b>60–90 g/h</b><small>Carbohidratos tolerados previamente en bicicleta</small></div><div><b>40–60 g/h</b><small>Rango progresivo para practicar en carrera</small></div><div><b>Hidratación</b><small>Ajustar por sed, clima, sudoración y tolerancia</small></div></div>'+
 '<div class="v7-scroll"><table class="v7-table"><thead><tr><th>Fase</th><th>Bicicleta</th><th>Carrera</th></tr></thead><tbody>'+
 NUTRITION.map(x=>'<tr><td>'+safe(x.phase)+'</td><td>'+safe(x.bike)+'</td><td>'+safe(x.run)+'</td></tr>').join('')+'</tbody></table></div>'+
 '<div class="v7-note"><b>Lección de Cajicá:</b> había malestar gastrointestinal desde el día anterior. No atribuir el dolor solo a geles o sodio. Evitar pruebas de productos nuevos el día de carrera y registrar molestias.</div>');
}
function zonesPanel(){
 return panel('<div class="v7-card-head"><h3>Zonas prácticas</h3><span>Frecuencia cardíaca · no vatios inventados</span></div>'+
 '<div class="v7-zone-grid">'+['bike','run'].map(k=>'<div><h4>'+texts[k]+'</h4>'+ZONES[k].map((z,i)=>'<div class="v7-zone"><span class="v7-zone-dot" style="background:'+['#83b1ce','#17d4b2','#f5be51','#f18c5c','#ef5979'][i]+'">'+z.name+'</span><b>'+z.min+(z.max?'–'+z.max:'+')+' ppm</b></div>').join('')+'</div>').join('')+'</div>'+
 '<div class="v7-note">LTHR carrera 165 ppm y bicicleta 157 ppm en el proyecto. FTP 250 W no validado; no prescribir vatios hasta una medición fiable. Ritmo de natación objetivo 2:16/100 m.</div>');
}
function splitPanel(){
 const ss=raceSplit();
 return panel('<div class="v7-card-head"><h3>Desglose del 6h30</h3><span>Objetivo competitivo, sujeto a pruebas</span></div>'+
 '<div class="v7-race-split">'+ss.map((s,i)=>'<div style="width:'+s.minutes/390*100+'%;background:'+['#43c0e7','#7f97aa','#e1b651','#7f97aa','#ef6d8c'][i]+'" title="'+safe(s.details)+'"></div>').join('')+'</div>'+
 ss.map((s,i)=>'<div class="v7-race-row"><i style="background:'+['#43c0e7','#7f97aa','#e1b651','#7f97aa','#ef6d8c'][i]+'"></i><b>'+safe(s.name)+'</b><span>'+safe(s.details)+'</span><strong>'+Math.floor(s.minutes/60)+':'+String(s.minutes%60).padStart(2,'0')+'</strong></div>').join(''));
}
function historicalTrend(){
 const today=new Date(),monday=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate()));
 monday.setUTCDate(monday.getUTCDate()-((monday.getUTCDay()+6)%7));
 const completed=Array.from({length:12},(_,i)=>{
  const start=new Date(monday.getTime()-(12-i)*7*86400000);
  const end=new Date(start.getTime()+6*86400000);
  const iso=x=>x.toISOString().slice(0,10);
  const arr=state.activities.filter(a=>a.date>=iso(start)&&a.date<=iso(end));
  return {start:iso(start),end:iso(end),hours:Math.round(arr.reduce((n,a)=>n+(typeof a.min==='number'?a.min:0),0)/6)/10,
   load:Math.round(arr.reduce((n,a)=>n+(typeof a.carga==='number'?a.carga:0),0)),
   sessions:arr.length,missingLoad:arr.filter(a=>a.carga==null).length};
 });
 const h=completed.reduce((n,w)=>n+w.hours,0),l=completed.reduce((n,w)=>n+w.load,0);
 return panel('<div class="v7-card-head"><h3>12 semanas reales antes del plan</h3><span>Comparación histórica · no son proyecciones</span></div>'+
 '<div class="v7-data-kpis"><b>'+h.toFixed(1)+' h registradas</b><b>'+l+' de carga total</b><b>'+state.activities.length+' actividades disponibles</b></div>'+
 '<h4>Volumen semanal · horas</h4><div class="v7-chart-scroll">'+lineSVG(completed.map(w=>w.hours))+'</div>'+
 '<h4>Carga semanal · unidades de Intervals.icu</h4><div class="v7-chart-scroll">'+lineSVG(completed.map(w=>w.load))+'</div>'+
 '<div class="v7-scroll"><table class="v7-table"><thead><tr><th>Semana</th><th>Sesiones</th><th>Horas</th><th>Carga</th><th>Sin carga</th></tr></thead><tbody>'+
 completed.map(w=>'<tr><td>'+day(w.start)+'</td><td>'+w.sessions+'</td><td>'+w.hours.toFixed(1)+'</td><td>'+w.load+'</td><td>'+w.missingLoad+'</td></tr>').join('')+
 '</tbody></table></div><div class="v7-note">Las semanas sin registros aparecen en cero únicamente si realmente no hay actividades en los datos recuperados. La carga puede estar subestimada cuando el proveedor no devuelve ese campo.</div>');
}
function recentWellness(){
 const w=state.wellness.filter(x=>x.date>='2026-11-03').slice(0,7);
 const vals=state.wellness.slice(0,60);const mean=k=>{const a=vals.map(x=>x[k]).filter(Number.isFinite);return a.length?a.reduce((x,y)=>x+y,0)/a.length:null};
 const current=state.wellness[0]||{};
 const fc=(x)=>Number.isFinite(x)?x.toFixed(1):'—';
 return panel('<div class="v7-card-head"><h3>Recuperación · últimas mediciones</h3><span>Datos de Intervals.icu</span></div><div class="v7-health-grid">'+[
 ['Sueño',Number.isFinite(current.sleep)?current.sleep.toFixed(1)+' h':'—',fc(mean('sleep'))+' h · media 60 días'],
 ['VFC',fc(current.hrv),fc(mean('hrv'))+' · media 60 días'],
 ['FC reposo',fc(current.restingHR),fc(mean('restingHR'))+' · media 60 días'],
 ['CTL / ATL',(fc(current.ctl)+' / '+fc(current.atl)),'Estado calculado por la plataforma']
 ].map(([title,value,sub])=>'<div><small>'+title+'</small><b>'+value+'</b><span>'+sub+'</span></div>').join('')+'</div><div class="v7-note">No sustituye el seguimiento de síntomas. Si hay molestias musculares o gastrointestinales persistentes, suspender intensidad y valorar profesionalmente.</div>');
}
async function load(){
 try{
  const [a,w]=await Promise.all([fetch('/api/actividades?dias=367',{cache:'no-store'}),fetch('/api/wellness?days=90',{cache:'no-store'})]);
  if(a.ok){const d=await a.json();state.activities=Array.isArray(d.actividades)?d.actividades:[];}
  if(w.ok){const d=await w.json();state.wellness=Array.isArray(d.wellness)?d.wellness:[];}
 }catch(e){/* UI states that sources may be unavailable */}state.loaded=true;render();
}
function render(){
 const root=$('victoria630');if(!root)return;
 const tab=state.tab;
 root.innerHTML='<header class="v7-hero"><div><p class="eyebrow">PLAN MAESTRO · TEMPORADA 2027</p><h2>Victoria <em>70.3</em></h2><p>29 semanas medibles · ajustes según recuperación · entrenador prioritario</p></div><div class="v7-target"><small>OBJETIVO</small><strong>6:30:00</strong><span>30 MAY 2027</span></div></header>'+
 overview()+phaseDiagram()+
 '<nav class="v7-tabs" aria-label="Plan 70.3"><button data-v7-tab="plan" class="'+(tab==='plan'?'active':'')+'">Plan semanal</button><button data-v7-tab="datos" class="'+(tab==='datos'?'active':'')+'">Datos y evolución</button><button data-v7-tab="zonas" class="'+(tab==='zonas'?'active':'')+'">Zonas y nutrición</button><button data-v7-tab="carrera" class="'+(tab==='carrera'?'active':'')+'">Día de carrera</button></nav>'+
 (tab==='plan'?panel('<div class="v7-card-head"><h3>Volumen planificado por semana</h3><span>Semanas 4, 8, 12, 16, 20, 24: descarga</span></div>'+volumeChart()+'<div class="v7-legend">'+Object.keys(colors).map(k=>'<span><i style="background:'+colors[k]+'"></i>'+texts[k]+'</span>').join('')+'</div><label class="v7-week-select">Inspeccionar semana <select id="v7-week">'+WEEKS.map(w=>'<option value="'+w.number+'" '+(state.week===w.number?'selected':'')+'>Semana '+w.number+' · '+day(w.start)+' · '+phases[w.phase]+'</option>').join('')+'</select></label>')+weekCard()+panel('<div class="v7-card-head"><h3>29 semanas · tabla completa</h3><span>Horas por disciplina · selección interactiva</span></div>'+weeklyTable()):'')+
 (tab==='datos'?((state.activities.length?historicalTrend():panel('<h3>Historial no disponible</h3><p>El plan de 29 semanas está listo, pero no se pudieron recuperar datos reales ahora.</p>'))+recentWellness()+weekCard()):'')+
 (tab==='zonas'?zonesPanel()+nutritionPanel():'')+
 (tab==='carrera'?splitPanel()+panel('<div class="v7-card-head"><h3>Ritmo de carrera</h3><span>Objetivos provisionales</span></div><div class="v7-pace-list">'+[['Km 0–5','6:55/km','Salida conservadora'],['Km 5–15','6:40/km','Ritmo estable'],['Km 15–21,1','6:40/km','Solo si hay reservas']].map(x=>'<div><b>'+x[0]+'</b><strong>'+x[1]+'</strong><span>'+x[2]+'</span></div>').join('')+'</div><div class="v7-note">Bicicleta: primer tercio Z2 (133–139 ppm); tramo medio Z2–Z3 baja; últimos 20 km preservar piernas. Se ajustará a recorrido y meteorología. No hay potencia medida fiable.</div>')+nutritionPanel():'')+
 '<footer class="v7-footer">Plan orientativo. No escribe en TrainingPeaks, Garmin ni Google Calendar. Antes de programar cualquier sesión estructurada se requiere tu aprobación.</footer>';
 root.querySelectorAll('[data-v7-tab]').forEach(b=>b.addEventListener('click',()=>{state.tab=b.dataset.v7Tab;render()}));
 root.querySelectorAll('[data-select-week]').forEach(b=>b.addEventListener('click',()=>{state.week=+b.dataset.selectWeek;render();root.scrollIntoView({behavior:'smooth',block:'start'})}));
 root.querySelector('#v7-week')?.addEventListener('change',e=>{state.week=+e.target.value;render()});
}
const current=weekOf(new Date().toISOString().slice(0,10));if(current)state.week=current.number;
render();load();
