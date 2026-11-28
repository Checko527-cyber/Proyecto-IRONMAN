const AGENTES=['rendimiento','ingenieria'];
const ESTADOS=['pendiente','en_progreso','validacion','completada','bloqueada'];
const etiquetas={sin_evidencia:'Sin evidencia',sin_reporte_reciente:'Sin reporte reciente',suspendido:'Suspendido',requiere_revision:'Requiere revisión',reporte_reciente:'Reporte reciente'};
export function validarEstadoQA(data){
 if(data?.disponible!==true||!Number.isFinite(Date.parse(data.corte))) throw new Error('Estado no disponible');
 const out={};
 for(const a of AGENTES){
  const x=data.agentes?.[a];
  if(!x||!Object.hasOwn(etiquetas,x.actividad)||!Number.isSafeInteger(x.leasesVencidos)||x.leasesVencidos<0||ESTADOS.some(e=>!Number.isSafeInteger(x.estados?.[e])||x.estados[e]<0)) throw new Error('Estado incompleto');
  out[a]={...Object.fromEntries(ESTADOS.map(e=>[e,x.estados[e]])),leasesVencidos:x.leasesVencidos,actividad:etiquetas[x.actividad],ultimaActividad:x.ultimaActividad==null?'—':new Intl.DateTimeFormat('es-CO',{dateStyle:'short',timeStyle:'short',timeZone:'America/Bogota'}).format(new Date(x.ultimaActividad))};
 }
 return out;
}
export async function ejecutarCicloPanelQA({pedir,mensaje=()=>{},render=()=>{}}){
 mensaje('Preparando tareas idempotentes…');
 const seed=await pedir('seed');
 if(typeof seed?.semillas?.rendimiento!=='boolean'||typeof seed?.semillas?.ingenieria!=='boolean')throw Error('Preparación no verificada');
 const previo=await pedir('status');const estado=validarEstadoQA(previo);render(previo);
 const rPend=estado.rendimiento.pendiente>0,iPend=estado.ingenieria.pendiente>0;
 if(!rPend&&!iPend)return {mensaje:'No hay tareas pendientes. Se muestran los registros reales.'};
 // La concurrencia es diagnóstico independiente; no repetirla si alguna semilla ya existía.
 let simultanea=false;
 if(seed.semillas.rendimiento&&seed.semillas.ingenieria&&rPend&&iPend){
  mensaje('Verificando dos sesiones concurrentes…');
  const c=await pedir('concurrencia');if(c.concurrente!==true)throw Error('Concurrencia no comprobada');simultanea=true;
 }
 let r={procesadas:0},i={procesadas:0};
 if(rPend){mensaje('Ejecutando rendimiento…');r=await pedir('rendimiento');}
 if(iPend){mensaje('Ejecutando ingeniería…');i=await pedir('ingenieria');}
 for(const x of [r,i])if(!Number.isSafeInteger(x.procesadas)||x.procesadas<0||x.procesadas>1)throw Error('Resultado de ciclo inválido');
 render(await pedir('status'));
 return {mensaje:(simultanea?'Concurrencia comprobada. ':'')+'Rendimiento: '+r.procesadas+'; ingeniería: '+i.procesadas+'. Verifica los estados y los registros.'};
}
function iniciar(root){
 const input=root.querySelector('#agentAccessToken'),msg=root.querySelector('#agentQaMessage'),botones=[...root.querySelectorAll('[data-qa-action]')];
 const mensaje=t=>{msg.textContent=t;};
 const limpiar=()=>root.querySelectorAll('[data-agent][data-field]').forEach(el=>el.textContent=el.dataset.field==='actividad'?'Sin conexión verificada':'—');
 const render=d=>{const v=validarEstadoQA(d);root.querySelectorAll('[data-agent][data-field]').forEach(el=>{el.textContent=String(v[el.dataset.agent][el.dataset.field]??'—');});};
 const pedir=async(token,accion)=>{
  const lectura=['status','intervals'].includes(accion),url=lectura?'/api/agent-qa?check='+accion:'/api/agent-run-qa';
  const r=await fetch(url,{method:lectura?'GET':'POST',headers:{Authorization:'Bearer '+token,...(lectura?{}:{'Content-Type':'application/json'})},...(lectura?{}:{body:JSON.stringify({action:accion})}),cache:'no-store',credentials:'same-origin',redirect:'error',signal:AbortSignal.timeout(25000)});
  let d;try{d=await r.json();}catch{throw new Error('Respuesta privada no disponible');}
  if(!r.ok){
   const m={no_autorizado:'Token no autorizado',ejecucion_suspendida:'Ejecución suspendida hasta validar credenciales',integracion_no_verificada:'Conexión o fuente aún no verificada',ejecucion_no_verificada:'Prueba o ejecución no verificada',no_disponible:'Disponible únicamente en preview QA'};
   throw new Error(m[d.error]||'Solicitud no disponible');
  }
  return d;
 };
 for(const btn of botones)btn.addEventListener('click',async()=>{
  const token=input.value;input.value='';if(!token){mensaje('Ingresa el token privado QA.');return;}
  const accion=btn.dataset.qaAction;botones.forEach(b=>b.disabled=true);
  try{
   if(accion==='cycle'){
    const resultado=await ejecutarCicloPanelQA({pedir:a=>pedir(token,a),mensaje,render});
    mensaje(resultado.mensaje);
   }else{
    mensaje('Comprobando '+accion+'…');const d=await pedir(token,accion);
    if(accion==='status'){render(d);mensaje('Estado consultado en PostgreSQL.');}
    else if(accion==='intervals'){mensaje(d.disponible===true?'Intervals.icu respondió. No se muestran datos personales.':'Fuente no verificada.');}
    else if(accion==='concurrencia'){mensaje(d.concurrente===true?'PASS: dos sesiones, sin modificar tareas.':'Concurrencia no verificada.');}
    else {render(await pedir(token,'status'));mensaje(accion==='seed'?'Tareas preparadas; no se duplican.':'Ciclo procesó '+d.procesadas+' tarea(s). Registro: '+(d.registro==='guardado'?'guardado':'no verificado')+'.');}
   }
  }catch(e){limpiar();mensaje(typeof e?.message==='string'?e.message:'No se verificó la acción.');}
  finally{botones.forEach(b=>b.disabled=false);}
 });
}
if(typeof document!=='undefined'){const root=document.getElementById('v-agentes');if(root)iniciar(root);}
