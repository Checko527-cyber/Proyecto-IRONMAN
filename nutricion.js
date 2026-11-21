import { CATALOGO_COMPLETO, calcularConsumos } from './lib/catalogo-nutricion.js';
import { DISTANCIAS, generarCronograma } from './lib/planificador-carrera.js';
import { evaluarAbastecimiento } from './lib/evaluacion-abastecimiento.js';
import { compararEscenarios } from './lib/escenarios-carrera.js';
import { productosPreferidos, validarPerfil } from './lib/preferencias-nutricion.js';
import { revisarPreparacion } from './lib/preparacion-carrera.js';
import { revisarInventario } from './lib/inventario-carrera.js';
import { construirFilasPlan, exportarPlanCSV } from './lib/exportacion-plan.js';
import { generarPlanAutomatico } from './lib/cerebro-endurance.js';
import { construirDocumentoCarrera } from './lib/plan-carrera-documento.js';

const root=document.getElementById('nutritionApp');
const LS='ironman_plan_nutricional_v1';
const LSC='ironman_config_carrera_v1';
const LSO='ironman_objetivos_nutricion_v1';
const LSL='ironman_checklist_carrera_v1';
const LSP='ironman_perfil_nutricion_v1';
const LSF='ironman_productos_preferidos_v1';
const LSI='ironman_inventario_nutricion_v1';
const LSA='ironman_motor_automatico_v1';
const LSAD='ironman_plan_automatico_detalle_v1';
const LSCK='ironman_checklist_operativo_v1';
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=0)=>Number(n).toLocaleString('es-CO',{minimumFractionDigits:d,maximumFractionDigits:1});
const tipos=[...new Set(CATALOGO_COMPLETO.map(p=>p.tipo))].sort();
let seleccion=CATALOGO_COMPLETO[0].id;
let filtro='',tipo='';
let mostrarTodos=false;
let selectorModo='todos';
let preferencias={favoritos:[],disponibles:[]};
try {const v=JSON.parse(localStorage.getItem(LSF)||'null');if(v&&typeof v==='object')preferencias={...preferencias,...v};}catch(_e){}
preferencias.favoritos=Array.isArray(preferencias.favoritos)?preferencias.favoritos.filter(x=>typeof x==='string'):[];
preferencias.disponibles=Array.isArray(preferencias.disponibles)?preferencias.disponibles.filter(x=>typeof x==='string'):[];
if(preferencias.disponibles.length)selectorModo='disponibles';
let inventario={};
try {const v=JSON.parse(localStorage.getItem(LSI)||'null');if(v&&typeof v==='object'&&!Array.isArray(v))inventario=v;}catch(_e){}
let perfil=validarPerfil({});
try {const v=JSON.parse(localStorage.getItem(LSP)||'null');if(v&&typeof v==='object')perfil=validarPerfil(v);}catch(_e){}
let consumos=[];
try {const v=JSON.parse(localStorage.getItem(LS)||'[]');if(Array.isArray(v))consumos=v;} catch(_e){}
let carrera={tipo:'703',salida:'07:00',temperaturaC:18,humedadPct:65,
  tiempos:{swim:45,t1:5,bike:195,t2:5,run:140}};
try {const v=JSON.parse(localStorage.getItem(LSC)||'null');if(v&&typeof v==='object')carrera={...carrera,...v,tiempos:{...carrera.tiempos,...v.tiempos}};}catch(_e){}
let objetivos={};
try {const v=JSON.parse(localStorage.getItem(LSO)||'null');if(v&&typeof v==='object')objetivos=v;}catch(_e){}
let planAutomatico=null;
try {const v=JSON.parse(localStorage.getItem(LSAD)||'null');if(v&&Array.isArray(v.resumen))planAutomatico=v;}catch(_e){}
let opcionesAuto={bikeGHora:null,runGHora:null,liquidosMlHora:null,productoId:null};
let vistaDocumento='plan';
let checklistDocumento={};
try {const v=JSON.parse(localStorage.getItem(LSCK)||'null');if(v&&typeof v==='object')checklistDocumento=v;}catch(_e){}
try {const v=JSON.parse(localStorage.getItem(LSA)||'null');if(v&&typeof v==='object')opcionesAuto={...opcionesAuto,...v};}catch(_e){}
const pendientes=[
  'Confirmar itinerario, dorsal y horarios de acceso',
  'Comprobar los puntos de avituallamiento oficiales',
  'Ensayar productos y cantidades en entrenamiento',
  'Verificar composición y presentación de cada producto',
  'Preparar raciones por disciplina y productos de respaldo',
  'Definir comida previa y recuperación con el profesional',
  'Preparar equipamiento y revisar pronóstico de carrera'
];
let listaHecha={};
try {const v=JSON.parse(localStorage.getItem(LSL)||'null');if(v&&typeof v==='object')listaHecha=v;}catch(_e){}
const fechaHora=(min)=>`${Math.floor(min/60)} h ${Math.round(min%60)} min`;

function pintarPerfil(){
  const box=document.getElementById('nutritionProfile');if(!box)return;
  box.innerHTML=`<div class="card pad"><p class="eyebrow">01 · DATOS DEL ATLETA · MODIFICABLES</p>
    <form id="nutritionProfileForm" class="nutrition-form">
      <label>Peso actual (kg)<input type="number" name="pesoKg" min="25" max="250" step="0.1" placeholder="Por confirmar" value="${perfil.pesoKg??''}"></label>
      <label>Edad (años)<input type="number" name="edad" min="16" max="100" step="1" placeholder="Por confirmar" value="${perfil.edad??''}"></label>
      <label>Sudoración medida (L/h)<input type="number" name="sudoracionLh" min="0" max="4" step="0.1" placeholder="Sin medir" value="${perfil.sudoracionLh??''}"></label>
      <label>Productos y cantidades ensayados<select name="experienciaNutricion">${[['sin_ensayar','No confirmados'],['parcial','Parcialmente'],['ensayada','Ensayados en entrenamiento']].map(([id,n])=>`<option value="${id}" ${id===perfil.experienciaNutricion?'selected':''}>${n}</option>`).join('')}</select></label>
      <label class="nutrition-check-label"><input name="alertaEstomago" type="checkbox" ${perfil.alertaEstomago?'checked':''}> Antecedentes de molestias digestivas en competencia</label>
      <button class="btn primary" type="submit">Guardar perfil</button>
    </form>
    <p class="vsub">Estos datos son opcionales y se guardan solo en este navegador. La tasa de sudor debe medirse; el sistema no la deduce del clima ni del peso.</p>
  </div>`;
  box.querySelector('form').onsubmit=e=>{
    e.preventDefault();const f=new FormData(e.target);
    perfil=validarPerfil({pesoKg:f.get('pesoKg'),edad:f.get('edad'),sudoracionLh:f.get('sudoracionLh'),
      experienciaNutricion:f.get('experienciaNutricion'),alertaEstomago:f.has('alertaEstomago')});
    try{localStorage.setItem(LSP,JSON.stringify(perfil));}catch(_e){}
    if(planAutomatico)recalcularAutomatico();pintarPerfil();pintarMotor();pintarDocumento();pintarPlan();
  };
}

function pintarCompetencia(){
  const box=document.getElementById('nutritionRace');if(!box)return;
  box.innerHTML=`<div class="card pad"><p class="eyebrow">02 · COMPETENCIA Y ESCENARIO</p>
    <form id="raceConfig" class="nutrition-form">
      <label>Tipo de carrera<select name="tipo">${Object.entries(DISTANCIAS).map(([id,d])=>`<option value="${id}" ${id===carrera.tipo?'selected':''}>${safe(d.nombre)}</option>`).join('')}</select></label>
      <label>Hora de salida<input type="time" name="salida" value="${safe(carrera.salida)}" required></label>
      <label>Temperatura (°C)<input type="number" name="temperaturaC" min="-20" max="55" step="1" value="${carrera.temperaturaC??''}"></label>
      <label>Humedad (%)<input type="number" name="humedadPct" min="0" max="100" step="1" value="${carrera.humedadPct??''}"></label>
      ${['swim','t1','bike','t2','run'].map(s=>`<label>${{swim:'Natación',t1:'T1',bike:'Ciclismo',t2:'T2',run:'Carrera'}[s]} (min)<input type="number" name="${s}" min="0" step="1" value="${carrera.tiempos[s]??''}"></label>`).join('')}
      <button class="btn primary" type="submit">Recalcular carrera</button>
    </form>
    <p class="vsub">Las duraciones son objetivos editables, no predicciones clínicas ni tiempos garantizados. Los tramos no aplicables se omiten del cronograma.</p>
  </div>`;
  box.querySelector('form').onsubmit=e=>{
    e.preventDefault();const f=new FormData(e.target);
    const t={};for(const s of ['swim','t1','bike','t2','run']){const v=String(f.get(s)||'').trim();t[s]=v===''?null:Number(v);}
    const opcional=clave=>{const valor=String(f.get(clave)??'').trim();return valor===''?null:Number(valor);};
    carrera={tipo:String(f.get('tipo')),salida:String(f.get('salida')),
      temperaturaC:opcional('temperaturaC'),humedadPct:opcional('humedadPct'),tiempos:t};
    try{localStorage.setItem(LSC,JSON.stringify(carrera));}catch(_e){}
    if(planAutomatico)recalcularAutomatico();pintarCompetencia();pintarDocumento();pintarPlan();
  };
}

function pintarCatalogo(){
  const lista=document.getElementById('nutritionCatalog');if(!lista)return;
  const encontrados=CATALOGO_COMPLETO.filter(p=>(!filtro||p.nombre.toLowerCase().includes(filtro))&&(!tipo||p.tipo===tipo));
  const visibles=mostrarTodos||filtro||tipo?encontrados:encontrados.slice(0,8);
  lista.innerHTML=visibles.length?visibles.map(p=>`<button type="button" class="nutrition-product ${p.id===seleccion?'selected':''}" data-producto="${safe(p.id)}" aria-pressed="${p.id===seleccion}">
    <small>${safe(p.tipo.toUpperCase())} · ${p.verificadoFabricante?'FABRICANTE':'REFERENCIA HISTÓRICA / PARCIAL'}</small>
    <strong>${safe(p.nombre)}</strong>
    <small>${p.carbohidratosG==null?'CH por confirmar':fmt(p.carbohidratosG,1)+' g CH'} · ${p.sodioMg==null?'Na por confirmar':fmt(p.sodioMg)+' mg Na'} · ${p.cafeinaMg==null?'cafeína por confirmar':fmt(p.cafeinaMg)+' mg cafeína'}</small>
  </button>`).join(''):'<p class="vsub">No hay productos con estos filtros.</p>';
  if(!mostrarTodos&&!filtro&&!tipo&&encontrados.length>8)lista.insertAdjacentHTML('beforeend',`<button class="btn" id="nutritionMore" type="button">Ver catálogo completo · ${encontrados.length} referencias</button>`);
  lista.querySelectorAll('[data-producto]').forEach(b=>b.onclick=()=>{seleccion=b.dataset.producto;pintarCatalogo();pintarSeleccion();});
  const mas=lista.querySelector('#nutritionMore');if(mas)mas.onclick=()=>{mostrarTodos=true;pintarCatalogo();};
}

function pintarSeleccion(){
  const p=CATALOGO_COMPLETO.find(p=>p.id===seleccion);const box=document.getElementById('nutritionSelected');
  if(!p||!box)return;
  const opciones=productosPreferidos(CATALOGO_COMPLETO,preferencias,selectorModo);
  const lista=opciones.some(x=>x.id===seleccion)?opciones:[p,...opciones];
  const campo=(nombre,titulo,valor,unidad)=>`<label>${titulo} (${unidad})<input type="number" min="0" step="0.1" name="${nombre}" placeholder="Sin verificar" value="${valor??''}"></label>`;
  box.innerHTML=`<div class="card pad"><p class="eyebrow">ELEGIR PRODUCTO · FAVORITOS Y DISPONIBLES</p>
    <div class="nutrition-controls"><select id="nutritionProductMode" aria-label="Mostrar productos">${[['todos','Todos los productos'],['favoritos','Mis favoritos'],['disponibles','Productos que tengo']].map(([id,n])=>`<option value="${id}" ${selectorModo===id?'selected':''}>${n}</option>`).join('')}</select>
    <select id="nutritionProductSelect" aria-label="Seleccionar producto">${lista.map(x=>`<option value="${safe(x.id)}" ${x.id===seleccion?'selected':''}>${safe(x.nombre)}</option>`).join('')}</select></div>
    ${selectorModo!=='todos'&&!opciones.some(x=>x.id===seleccion)?'<p class="vsub">El producto actual todavía no está marcado en esta lista. Puedes marcarlo abajo o elegir otro.</p>':''}
    <div class="nutrition-product-flags"><label><input type="checkbox" id="nutritionFavorite" ${preferencias.favoritos.includes(p.id)?'checked':''}> ★ Mi favorito</label>
    <label><input type="checkbox" id="nutritionAvailable" ${preferencias.disponibles.includes(p.id)?'checked':''}> Lo tengo disponible</label></div>
    <label class="nutrition-stock-input">Porciones que tengo <input id="nutritionStock" type="number" min="0" step="0.1" placeholder="Sin confirmar" value="${Number.isFinite(inventario[p.id])&&inventario[p.id]>=0?inventario[p.id]:''}"></label>
    <p class="eyebrow">AGREGAR AL PLAN · DATOS EDITABLES</p><h3 style="font-size:17px;margin-bottom:10px">${safe(p.nombre)}</h3>
    <form id="nutritionAdd" class="nutrition-form">
      <label>Etapa<select name="en"><option value="pre">Antes de salida</option><option value="swim">Natación</option><option value="t1">T1</option><option value="bike" selected>Bici</option><option value="t2">T2</option><option value="run">Carrera</option><option value="post">Después de meta</option></select></label>
      <label>Minuto dentro de etapa<input type="number" name="offsetMin" step="1" value="0" title="En la etapa pre, usar valores negativos para minutos antes de salida"><small>Antes de salir: usa -30 para 30 minutos antes</small></label>
      <label>Porciones<input type="number" name="cantidad" min="0.1" step="0.1" value="1" required></label>
      ${campo('carbohidratosG','Carbohidratos',p.carbohidratosG,'g')}
      ${campo('sodioMg','Sodio',p.sodioMg,'mg')}
      ${campo('cafeinaMg','Cafeína',p.cafeinaMg,'mg')}
      ${campo('liquidoMl','Volumen de líquido de esta porción',null,'ml')}
      <button class="btn primary" type="submit" style="grid-column:1/-1">+ Añadir y recalcular</button>
    </form>
    <p class="vsub" style="margin-top:9px">${p.fuenteFabricante?`<a href="${safe(p.fuenteFabricante)}" target="_blank" rel="noopener noreferrer">Ficha del fabricante</a> · `:''}${safe(p.nota||p.fuente||'')} · La composición puede variar por sabor, versión y tamaño.</p>
  </div>`;
  box.querySelector('#nutritionProductMode').onchange=e=>{selectorModo=e.target.value;pintarSeleccion();};
  box.querySelector('#nutritionProductSelect').onchange=e=>{seleccion=e.target.value;pintarSeleccion();pintarCatalogo();};
  for(const [id,clave] of [['nutritionFavorite','favoritos'],['nutritionAvailable','disponibles']]){
    box.querySelector('#'+id).onchange=e=>{
      const set=new Set(preferencias[clave]);if(e.target.checked)set.add(p.id);else set.delete(p.id);
      preferencias[clave]=[...set];
      try{localStorage.setItem(LSF,JSON.stringify(preferencias));}catch(_e){}
      pintarSeleccion();pintarMotor();pintarDocumento();pintarPlan();
    };
  }
  const actualizarStock=e=>{
    const v=e.target.value.trim();
    if(v==='')delete inventario[p.id];else if(Number.isFinite(Number(v))&&Number(v)>=0)inventario[p.id]=Number(v);
    try{localStorage.setItem(LSI,JSON.stringify(inventario));}catch(_e){}
    pintarDocumento();pintarPlan();
  };
  box.querySelector('#nutritionStock').oninput=actualizarStock;
  box.querySelector('#nutritionStock').onchange=actualizarStock;
  box.querySelector('form').onsubmit=e=>{
    e.preventDefault();const f=new FormData(e.target);
    const overrides={};
    for(const campo of ['carbohidratosG','sodioMg','cafeinaMg','liquidoMl']){
      const str=String(f.get(campo)||'').trim();
      overrides[campo]=str===''?null:Number(str);
    }
    const en=String(f.get('en'));
    consumos.push({productoId:p.id,cantidad:Number(f.get('cantidad')),fase:en==='pre'?'pre':en==='post'?'post':'durante',
      en,offsetMin:Number(f.get('offsetMin')),overrides});
    guardar();pintarDocumento();pintarPlan();
  };
}

function guardar(){try{localStorage.setItem(LS,JSON.stringify(consumos));}catch(_e){}}
function recalcularAutomatico(){
  planAutomatico=generarPlanAutomatico({carrera,perfil,catalogo:CATALOGO_COMPLETO,preferencias,inventario,opciones:opcionesAuto});
  consumos=planAutomatico.consumos;
  try{localStorage.setItem(LSAD,JSON.stringify(planAutomatico));}catch(_e){}
  guardar();
}
function pintarDocumento(){
  const box=document.getElementById('nutritionDocument');if(!box||!planAutomatico)return;
  const doc=construirDocumentoCarrera({carrera,perfil,plan:planAutomatico,consumos,catalogo:CATALOGO_COMPLETO});
  const labels={plan:'Plan de carrera',cronograma:'Cronograma',suplementos:'Suplementos',checklist:'Checklist'};
  const total=planAutomatico.cronograma.totalMin;
  const pesos=calcularConsumos(consumos).totales.general;
  const sport=planAutomatico.resumen.map(r=>`<div class="race-discipline"><span class="race-discipline-icon">${r.etapa==='bike'?'🚴':'🏃'}</span><div><strong>${r.etapa==='bike'?'Ciclismo':'Carrera'}</strong><small>${r.duracionMin} min estimados</small></div><div class="race-discipline-value">${fmt(r.objetivoGHora)}<small> g CH/h</small></div></div>`).join('');
  const detalles=doc.eventos.filter(e=>e.dia==='Carrera'&&!e.accion.startsWith('Fin ·')).slice(0,10);
  const filas=items=>`<div class="race-table"><div class="race-table-head"><span>Hora / Día</span><span>Etapa</span><span>Actividad o producto</span><span>Referencia</span></div>${items.map(e=>`<div class="race-table-row"><strong>${safe(e.hora)}</strong><span>${safe(e.etapa)}</span><span>${safe(e.accion)}</span><small>${safe(e.detalle)}</small></div>`).join('')}</div>`;
  const planVista=`<div class="race-metrics"><div><small>Salida</small><strong>${safe(doc.inicio)}</strong></div><div><small>Meta estimada</small><strong>${safe(doc.meta)}</strong></div><div><small>Duración</small><strong>${Math.floor(total/60)} h ${total%60} min</strong></div><div><small>Carbohidratos programados</small><strong>${fmt(pesos.carbohidratosG.total)} g</strong></div></div>
    <div class="race-overview"><section><h3>Tu estrategia por disciplina</h3>${sport}<p class="race-footnote">Natación y transiciones: organización de material y horarios; el motor no programa ingestiones en el agua.</p></section><section><h3>Antes y después</h3>${planAutomatico.previo.concat(planAutomatico.post).map(x=>`<div class="race-minirow"><strong>${safe(x.cuando)}</strong><span>${safe(x.accion)}</span></div>`).join('')}</section></div>
    <h3>Vista rápida del día de carrera</h3>${filas(detalles)}<button class="btn" type="button" data-ir="cronograma">Ver cronograma completo</button>`;
  const cronogramaVista=`<h3>Desde dos días antes hasta la meta</h3><p class="vsub">Horarios anclados a la salida ${safe(doc.inicio)}. Ajusta las duraciones para recalcular todas las tomas.</p>${filas(doc.eventos)}`;
  const elegibles=CATALOGO_COMPLETO.filter(p=>p.carbohidratosG>0&&p.cafeinaMg===0&&['gel','bebida'].includes(p.tipo));
  const suplementoVista=`<h3>Productos y cantidades para empacar</h3><p class="vsub">Prioriza lo que tienes y has ensayado. El selector modifica el producto principal y vuelve a calcular toda la estrategia.</p>
    <label class="race-product-label">Combustible principal<select id="raceProductChange"><option value="">Selección automática</option>${elegibles.map(p=>`<option value="${safe(p.id)}" ${planAutomatico.productoElegido===p.id?'selected':''}>${safe(p.nombre)} · ${fmt(p.carbohidratosG)} g CH</option>`).join('')}</select></label>
    <div class="race-product-stack">${doc.productos.map(p=>`<article><div><strong>${safe(p.nombre||p.id)}</strong><small>${p.carbohidratosG===null?'Etiqueta incompleta':fmt(p.carbohidratosG)+' g CH por porción'} · ${p.cafeinaMg??'—'} mg cafeína</small></div><strong>${fmt(p.cantidad,1)} <small>porciones</small></strong><span>${inventario[p.id]===undefined?'Stock por confirmar':inventario[p.id]>=p.cantidad?'Disponible':`Faltan ${fmt(p.cantidad-inventario[p.id],1)}`}</span></article>`).join('')}</div>
    <div class="race-product-stack"><article><div><strong>Agua para bicicleta y carrera</strong><small>Volumen orientativo, sujeto a sed, clima y avituallamientos</small></div><strong>${fmt(planAutomatico.resumen.reduce((n,r)=>n+r.liquidosMl,0))} <small>ml</small></strong></article></div>
    <p class="race-footnote">Cantidades fraccionadas indican equivalentes nutricionales; deben ajustarse a los formatos físicos de los envases. No se agregan estimulantes automáticamente.</p>`;
  const checks=doc.materiales.flatMap(([grupo,items])=>items.map((item,i)=>({grupo,item,id:`${grupo}-${i}`})));
  const marcados=checks.filter(i=>checklistDocumento[i.id]).length;
  const checklistVista=`<div class="race-check-head"><h3>Maleta, transición y nutrición</h3><strong>${marcados}/${checks.length}</strong></div><div class="race-check-progress"><span style="width:${Math.round(marcados/Math.max(1,checks.length)*100)}%"></span></div>
    ${doc.materiales.map(([grupo,items])=>`<section class="race-check-group"><h4>${safe(grupo)}</h4>${items.map((item,i)=>`<label><input type="checkbox" data-operativo="${safe(grupo+'-'+i)}" ${checklistDocumento[grupo+'-'+i]?'checked':''}><span>${safe(item)}</span></label>`).join('')}</section>`).join('')}`;
  box.innerHTML=`<div class="race-document"><div class="race-document-heading"><div><p class="eyebrow">PLAN DE COMPETENCIA · FORMATO CARTAGENA</p><h2>Tu hoja de ruta para competir</h2><p>Una sola estrategia con horarios, nutrición, inventario y equipo. Personalizable para cualquier distancia.</p></div><button type="button" class="btn primary" id="raceEditData">Editar datos y recalcular</button></div>
    <nav class="race-tabs" aria-label="Vistas del plan">${Object.entries(labels).map(([id,label])=>`<button type="button" data-vista="${id}" class="${vistaDocumento===id?'active':''}" aria-pressed="${vistaDocumento===id}">${label}</button>`).join('')}</nav>
    <div class="race-document-body">${{plan:planVista,cronograma:cronogramaVista,suplementos:suplementoVista,checklist:checklistVista}[vistaDocumento]}</div>
    <div class="race-document-footer"><button class="btn" id="racePrint" type="button">Imprimir / PDF</button><small>Estimación sujeta a condiciones reales y tolerancia individual.</small></div></div>`;
  box.querySelectorAll('[data-vista],[data-ir]').forEach(b=>b.onclick=()=>{vistaDocumento=b.dataset.vista||b.dataset.ir;pintarDocumento();});
  box.querySelector('#raceEditData').onclick=()=>{const config=document.getElementById('nutritionConfig');config.open=true;config.scrollIntoView({behavior:'smooth',block:'start'});};
  box.querySelector('#racePrint').onclick=()=>window.print();
  box.querySelectorAll('[data-operativo]').forEach(x=>x.onchange=()=>{checklistDocumento[x.dataset.operativo]=x.checked;try{localStorage.setItem(LSCK,JSON.stringify(checklistDocumento));}catch(_e){}pintarDocumento();});
  box.querySelector('#raceProductChange')?.addEventListener('change',e=>{opcionesAuto.productoId=e.target.value||null;try{localStorage.setItem(LSA,JSON.stringify(opcionesAuto));}catch(_e){}recalcularAutomatico();pintarMotor();pintarDocumento();pintarPlan();});
}
function pintarMotor(){
  const box=document.getElementById('nutritionMotor');if(!box)return;
  box.innerHTML=`<div class="card pad nutrition-motor"><p class="eyebrow">03 · CEREBRO ENDURANCE · GENERACIÓN AUTOMÁTICA</p>
    <h3>Un plan completo a partir de tus datos</h3><p class="vsub">Primero confirma peso, tipo de carrera, tiempo estimado, clima y los productos disponibles. El motor construye horarios, alimentación previa, avituallamientos, recuperación e inventario. Puedes cambiar cualquier dato y recalcular.</p>
    <form id="nutritionAutoForm" class="nutrition-form">
      <label>Producto que tengo o prefiero<select name="productoId"><option value="">Elegir automáticamente por favoritos y stock</option>${CATALOGO_COMPLETO.filter(p=>p.carbohidratosG>0&&p.cafeinaMg===0&&['gel','bebida'].includes(p.tipo)).sort((a,b)=>Number(preferencias.disponibles.includes(b.id))-Number(preferencias.disponibles.includes(a.id))||Number(preferencias.favoritos.includes(b.id))-Number(preferencias.favoritos.includes(a.id))).map(p=>`<option value="${safe(p.id)}" ${opcionesAuto.productoId===p.id?'selected':''}>${preferencias.disponibles.includes(p.id)?'✓ Disponible · ':preferencias.favoritos.includes(p.id)?'★ Favorito · ':''}${safe(p.nombre)} · ${fmt(p.carbohidratosG)} g CH</option>`).join('')}</select></label>
      <label>Carbohidratos bici (g/h)<input name="bikeGHora" type="number" min="20" max="100" placeholder="Automático" value="${opcionesAuto.bikeGHora??''}"></label>
      <label>Carbohidratos carrera (g/h)<input name="runGHora" type="number" min="15" max="90" placeholder="Automático" value="${opcionesAuto.runGHora??''}"></label>
      <label>Agua orientativa (ml/h)<input name="liquidosMlHora" type="number" min="250" max="900" step="50" placeholder="Según clima" value="${opcionesAuto.liquidosMlHora??''}"></label>
      <button class="btn primary" type="submit">⚡ Generar plan de carrera completo</button>
    </form><p class="vsub">Los tres objetivos son opcionales. Si quedan vacíos, se calculan según duración, tolerancia y clima. El motor no incorpora cafeína ni sales de forma automática.</p>
    ${planAutomatico?`<div class="nutrition-auto-result"><strong>Plan generado · ${planAutomatico.consumos.length} tomas programadas</strong><span>Es editable: cambiar productos, cantidades o duración y volver a generar. La generación reemplaza solo los consumos del plan activo; no elimina el catálogo, tus favoritos ni el historial externo.</span></div>`:''}
  </div>`;
  box.querySelector('form').onsubmit=e=>{
    e.preventDefault();const f=new FormData(e.target);
    const numero=k=>{const raw=String(f.get(k)??'').trim();return raw===''?null:Number(raw);};
    opcionesAuto={bikeGHora:numero('bikeGHora'),runGHora:numero('runGHora'),liquidosMlHora:numero('liquidosMlHora'),productoId:String(f.get('productoId')||'')||null};
    try{localStorage.setItem(LSA,JSON.stringify(opcionesAuto));}catch(_e){}
    recalcularAutomatico();pintarMotor();pintarDocumento();pintarPlan();
  };
}
function pintarPlan(){
  const el=document.getElementById('nutritionPlan');if(!el)return;
  const resultado=calcularConsumos(consumos);
  const eventos=consumos.map((c,i)=>({...c,nombre:CATALOGO_COMPLETO.find(p=>p.id===c.productoId)?.nombre||'Producto'}));
  const cronograma=generarCronograma(carrera,eventos);
  const filasExportacion=construirFilasPlan(cronograma,consumos,CATALOGO_COMPLETO,inventario);
  const preparacion=revisarPreparacion(perfil,cronograma,consumos,CATALOGO_COMPLETO,preferencias);
  const abastecimiento=revisarInventario(consumos,inventario,CATALOGO_COMPLETO);
  const escenarios=compararEscenarios(carrera,eventos);
  const evaluacion=evaluarAbastecimiento(cronograma,consumos,CATALOGO_COMPLETO,objetivos);
  const totalEtapas=Math.max(1,cronograma.totalMin);
  const colores={swim:'var(--swim)',t1:'#8F9AAE',bike:'var(--bike)',t2:'#8F9AAE',run:'var(--run)'};
  const grafica=`<div class="nutrition-stages" role="img" aria-label="Duración de las etapas de la competencia">${cronograma.etapas.map(e=>`<div class="nutrition-stage" style="flex:${Math.max(0.4,e.duracionMin/totalEtapas*100)};--stage-color:${colores[e.id]}"><span>${safe(e.nombre)}</span><strong>${fmt(e.duracionMin)} min</strong></div>`).join('')}</div>`;
  const alimentacion=cronograma.hitos.filter(h=>h.id.startsWith('consumo-'));
  const k=resultado.totales.general;
  const metrica=(c,u)=>`<div><small>${c==='carbohidratosG'?'Carbohidratos':c==='sodioMg'?'Sodio':'Cafeína'}</small><strong>${fmt(k[c].total,1)} <small>${u}</small></strong><small>${k[c].completo?'Calculado':'Parcial · faltan etiquetas'}</small></div>`;
  const filas=consumos.map((item,i)=>{
    const p=CATALOGO_COMPLETO.find(x=>x.id===item.productoId);
    return `<div class="nutrition-plan-row"><div><strong>${safe(p?.nombre||'Producto retirado')}</strong><div class="vsub">${safe(item.en||item.fase)} · minuto ${fmt(item.offsetMin||0)} · ${fmt(item.cantidad,1)} porción(es)</div></div><button type="button" class="btn nutrition-remove" data-index="${i}" aria-label="Retirar producto">×</button></div>`;
  }).join('');
  const planDetalle=planAutomatico?`<div class="card pad nutrition-race-document"><p class="eyebrow">PLAN DE CARRERA · ESTRUCTURA CARTAGENA</p><h3>Antes, durante y después · listo para preparar</h3>
    <div class="nutrition-report-grid"><section><h4>48 h y mañana de carrera</h4>${planAutomatico.previo.map(x=>`<div class="nutrition-report-line"><strong>${safe(x.cuando)}</strong><span>${safe(x.accion)}</span></div>`).join('')}</section>
    <section><h4>Al cruzar la meta</h4>${planAutomatico.post.map(x=>`<div class="nutrition-report-line"><strong>${safe(x.cuando)}</strong><span>${safe(x.accion)}</span></div>`).join('')}</section></div>
    <h4>Objetivos operativos por etapa</h4><div class="nutrition-stock-table">${planAutomatico.resumen.map(x=>`<div><span>${x.etapa==='bike'?'Ciclismo':'Carrera'} · ${fmt(x.duracionMin)} min</span><strong>${fmt(x.objetivoGHora)} g CH/h</strong><small>${fmt(x.liquidosMl)} ml orientativos · tomas cada ~${x.intervaloMin} min</small></div>`).join('')}</div>
    <details open><summary>Comprobaciones de seguridad y logística (${planAutomatico.avisos.length})</summary><ul class="vsub">${planAutomatico.avisos.map(a=>`<li>${safe(a)}</li>`).join('')}</ul></details>
    <p class="vsub">Plan orientativo basado en nutrición deportiva, no diagnóstico ni prescripción individual. Si tienes enfermedades, medicación o síntomas, valida con medicina del deporte/nutrición clínica.</p></div>`:'';
  el.innerHTML=`${planDetalle}<div class="card pad"><p class="eyebrow">04 · ESTRATEGIA NUTRICIONAL · TOTAL</p>
    <p class="vsub">Perfil: ${perfil.pesoKg===null?'peso sin confirmar':fmt(perfil.pesoKg,1)+' kg'} · ${perfil.sudoracionLh===null?'sudoración sin medir':fmt(perfil.sudoracionLh,1)+' L/h medidos'} · ${perfil.experienciaNutricion==='ensayada'?'productos ensayados':perfil.experienciaNutricion==='parcial'?'ensayo parcial':'tolerancia no confirmada'}</p>
    <div class="nutrition-readiness"><div><small>Preparación de datos</small><strong>${preparacion.avisos.length?'Por completar':'Datos básicos completos'}</strong><small>${preparacion.avisos.length} comprobaciones pendientes</small></div>
    <div><small>Pérdida por sudor · referencia</small><strong>${preparacion.perdidaTeoricaLitros===null?'Sin medir':fmt(preparacion.perdidaTeoricaLitros,1)+' L'}</strong><small>No equivale a líquidos que debas beber</small></div></div>
    ${preparacion.avisos.length?`<details><summary>Información a confirmar (${preparacion.avisos.length})</summary><ul class="vsub">${preparacion.avisos.map(a=>`<li>${safe(a)}</li>`).join('')}</ul></details>`:''}
    <div class="nutrition-kpis">${metrica('carbohidratosG','g')}${metrica('sodioMg','mg')}${metrica('cafeinaMg','mg')}</div>
    ${consumos.length?filas:'<p class="vsub">Pulsa «Generar plan de carrera completo» para calcular horarios y cantidades. También puedes añadir productos manualmente.</p>'}
    <h3 class="nutrition-section-title">Inventario para esta carrera</h3>
    ${abastecimiento.items.length?`<div class="nutrition-stock-table">${abastecimiento.items.map(i=>`<div><span>${safe(i.nombre)}</span><strong>${fmt(i.requerido,1)} porciones</strong><small>${i.disponible===null?'Stock sin confirmar':i.faltante>0?`Faltan ${fmt(i.faltante,1)}`:`Disponibles ${fmt(i.disponible,1)} · suficientes`}</small></div>`).join('')}</div>`:'<p class="vsub">El inventario aparecerá al agregar productos.</p>'}
    <p class="vsub">Líquido programado: ${abastecimiento.liquidoCompleto?fmt(abastecimiento.liquidoMl)+' ml':'parcial · '+fmt(abastecimiento.liquidoMl)+' ml declarados'}. No se asume que un gel equivale a una bebida.</p>
    ${resultado.alertas.length?`<details><summary>Datos por verificar (${resultado.alertas.length})</summary><ul class="vsub">${resultado.alertas.map(x=>`<li>${safe(x)}</li>`).join('')}</ul></details>`:''}
    <p class="vsub">Valores acumulados, no indicación clínica. La estrategia definitiva requiere duración, clima, tolerancia individual y revisión de etiquetas.</p>
  </div><div class="card pad" style="margin-top:12px"><p class="eyebrow">04 · CRONOGRAMA RECALCULADO</p>
    <div class="nutrition-kpis"><div><small>Tiempo total</small><strong>${fechaHora(cronograma.totalMin)}</strong></div>
      <div><small>Salida</small><strong>${safe(cronograma.salida||'—')}</strong></div>
      <div><small>Meta prevista</small><strong>${safe(cronograma.llegada)}</strong></div></div>
    ${grafica}
    <div class="nutrition-stage-legend">${cronograma.etapas.map(e=>`<span><i style="background:${colores[e.id]}"></i>${safe(e.nombre)} · ${safe(e.inicio)}–${safe(e.fin)}</span>`).join('')}</div>
    <h3 class="nutrition-section-title">Abastecimiento programado · ${alimentacion.length} eventos</h3>
    <div class="nutrition-timeline">${filasExportacion.length?filasExportacion.map(f=>`<div class="nutrition-supply-row"><span class="num">${safe(f.hora)}</span><span>${safe(f.etapa)} · <strong>${safe(f.producto)}</strong></span><span>${fmt(f.porciones,1)} porciones</span><small>${f.carbohidratosG===null?'CH sin dato':fmt(f.carbohidratosG,1)+' g CH'} · ${f.liquidoMl===null?'líquido sin dato':fmt(f.liquidoMl)+' ml'}</small></div>`).join(''):'<p class="vsub">Añade productos para ver sus horarios de consumo.</p>'}</div>
    <details><summary>Ver todos los hitos de la carrera (${cronograma.hitos.length})</summary>${cronograma.hitos.map(h=>`<div class="nutrition-plan-row"><span class="num" style="min-width:56px">${safe(h.hora)}</span><span>${safe(h.nombre)}</span></div>`).join('')}</details>
    ${cronograma.alertas.length?`<details><summary>Revisiones de cronograma (${cronograma.alertas.length})</summary><ul class="vsub">${cronograma.alertas.map(x=>`<li>${safe(x)}</li>`).join('')}</ul></details>`:''}
    <p class="vsub">Los horarios cambian al modificar la salida o la duración de cada etapa. La hidratación y los objetivos de consumo requieren individualización.</p>
    <h3 class="nutrition-section-title">Escenarios de duración</h3>
    <div class="nutrition-scenarios">${escenarios.map(s=>`<div><small>${safe(s.nombre)}</small><strong>${fechaHora(s.totalMin)}</strong><small>Meta ${safe(s.llegada)}</small></div>`).join('')}</div>
    <p class="vsub">Los escenarios de +5 % y +10 % alargan únicamente las etapas deportivas. Son simulaciones matemáticas, no pronósticos de rendimiento.</p>
  </div><div class="card pad" style="margin-top:12px"><p class="eyebrow">05 · CONTROL DE ABASTECIMIENTO POR DEPORTE</p>
    <div class="nutrition-audit">${evaluacion.detalle.map(t=>`<div class="nutrition-audit-card"><strong>${safe(t.nombre)}</strong><small>${fmt(t.duracionMin)} min · ${t.items} productos</small>
      <div class="nutrition-audit-value">${t.totales.carbohidratosG.completo&&t.totales.carbohidratosG.porHora!==null?fmt(t.totales.carbohidratosG.porHora,1):'—'} <small>g CH/h</small></div>
      <label class="nutrition-audit-target">Objetivo personal (g CH/h)<input type="number" data-objetivo="${t.id}" min="0" max="200" step="1" placeholder="Sin definir" value="${objetivos[t.id]??''}"></label>
      <small>${t.diferenciaCarbohidratosHora===null?'Pendiente de objetivo o etiqueta':Math.abs(t.diferenciaCarbohidratosHora)<=0.5?'Coincide con tu objetivo':`Diferencia ${fmt(t.diferenciaCarbohidratosHora,1)} g/h`}</small>
    </div>`).join('')}</div>
    ${evaluacion.alertas.length?`<details><summary>Comprobaciones pendientes (${evaluacion.alertas.length})</summary><ul class="vsub">${evaluacion.alertas.map(x=>`<li>${safe(x)}</li>`).join('')}</ul></details>`:''}
    <p class="vsub">Los objetivos son tuyos: esta herramienta compara cantidades, no determina dosis seguras ni reemplaza la estrategia de tu nutricionista o entrenador.</p>
    ${perfil.alertaEstomago?'<p class="vsub">⚠️ Registraste molestias digestivas previas: ensaya cada producto y revisa la estrategia con tu profesional antes de competir.</p>':''}
    <details open><summary>Preparación y recuperación · ${pendientes.filter((_,i)=>listaHecha[i]).length}/${pendientes.length}</summary><div class="nutrition-checklist">${pendientes.map((p,i)=>`<label><input type="checkbox" data-check="${i}" ${listaHecha[i]?'checked':''}> <span>${safe(p)}</span></label>`).join('')}</div></details>
    <button class="btn" id="nutritionPrint" type="button" style="margin-top:12px">Imprimir / guardar plan como PDF</button>
    <button class="btn" id="nutritionCsv" type="button" style="margin-top:12px">Descargar abastecimiento (.csv)</button>
  </div>`;
  el.querySelectorAll('.nutrition-remove').forEach(b=>b.onclick=()=>{consumos.splice(Number(b.dataset.index),1);guardar();pintarPlan();});
  el.querySelectorAll('[data-objetivo]').forEach(c=>c.onchange=()=>{
    const valor=c.value.trim();objetivos[c.dataset.objetivo]=valor===''?null:Number(valor);
    try{localStorage.setItem(LSO,JSON.stringify(objetivos));}catch(_e){}
    pintarPlan();
  });
  el.querySelectorAll('[data-check]').forEach(c=>c.onchange=()=>{
    listaHecha[c.dataset.check]=c.checked;
    try{localStorage.setItem(LSL,JSON.stringify(listaHecha));}catch(_e){}
    pintarPlan();
  });
  el.querySelector('#nutritionPrint').onclick=()=>window.print();
  el.querySelector('#nutritionCsv').onclick=()=>{
    const contenido=exportarPlanCSV(cronograma,consumos,CATALOGO_COMPLETO,inventario);
    const archivo=new Blob([contenido],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(archivo);
    const a=document.createElement('a');a.href=url;a.download='IRONMAN_plan_abastecimiento.csv';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
}

function iniciar(){
  if(!root)return;
  root.innerHTML=`<section id="nutritionDocument"></section>
    <details id="nutritionConfig" class="nutrition-config"><summary>Datos del atleta, competencia y generación del plan <span>Editar / recalcular</span></summary><section id="nutritionProfile"></section><section id="nutritionRace"></section><section id="nutritionMotor"></section></details>
    <details class="nutrition-legacy"><summary>Auditoría técnica y edición manual avanzada</summary><section id="nutritionPlan"></section></details>
    <details class="nutrition-legacy"><summary>Catálogo completo y productos personalizados</summary><p class="eyebrow" style="margin-top:22px">CATÁLOGO · SELECCIÓN AVANZADA</p>
    <div class="nutrition-controls"><input id="nutritionSearch" type="search" placeholder="Buscar por marca o producto…" aria-label="Buscar productos">
    <select id="nutritionType" aria-label="Filtrar tipo"><option value="">Todos los tipos</option>${tipos.map(x=>`<option value="${safe(x)}">${safe(x)}</option>`).join('')}</select></div>
    <div class="vsub" style="margin-bottom:8px">${CATALOGO_COMPLETO.length} referencias · Colombia y plan histórico de Cartagena · inventario comercial no confirmado en tiempo real</div>
    <div id="nutritionCatalog" class="nutrition-grid"></div>
    <div id="nutritionSelected"></div></details>`;
  root.querySelector('#nutritionSearch').oninput=e=>{filtro=e.target.value.trim().toLowerCase();pintarCatalogo();};
  root.querySelector('#nutritionType').onchange=e=>{tipo=e.target.value;pintarCatalogo();};
  if(!planAutomatico&&consumos.length===0)recalcularAutomatico();
  pintarPerfil();pintarCompetencia();pintarCatalogo();pintarSeleccion();pintarMotor();pintarDocumento();pintarPlan();
}
iniciar();
