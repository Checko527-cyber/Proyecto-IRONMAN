import {RACES_2027,PHASES_2027,plan2027,daysUntil} from './lib/temporada2027.js';
const root=document.getElementById('season2027');
const LS='ironman_temporada_2027_seleccion';
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatted=d=>new Date(d+'T12:00:00Z').toLocaleDateString('es-CO',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const choice=()=>{const x=localStorage.getItem(LS)||'pendiente';return ['pendiente','berlin','chicago','ninguna'].includes(x)?x:'pendiente'};
function render(){
 if(!root)return;
 const selected=choice(),p=plan2027(selected),d=new Date(),chosen=p.marathon;
 const compact=(event,subtitle)=>`<div class="s27-race"><div class="s27-race-date"><b>${formatted(event.date).split(' ')[0]}</b><span>${formatted(event.date).split(' ')[1]}</span></div><div><b>${safe(event.name)}</b><small>${safe(subtitle)}</small></div><span class="s27-chip">${safe(event.priority)}</span></div>`;
 const scenarios=`<div class="s27-selection"><label for="s27-draw">Estado de los sorteos y maratón objetivo</label><select id="s27-draw"><option value="pendiente" ${selected==='pendiente'?'selected':''}>Pendiente de resultados</option><option value="berlin" ${selected==='berlin'?'selected':''}>Berlín confirmada como objetivo</option><option value="chicago" ${selected==='chicago'?'selected':''}>Chicago confirmada como objetivo</option><option value="ninguna" ${selected==='ninguna'?'selected':''}>Sin cupo confirmado</option></select><p>${selected==='berlin'?'Maratón A+: Berlín. Chicago no se planifica como segunda maratón.':selected==='chicago'?'Maratón A+: Chicago. Berlín no se planifica como segunda maratón.':selected==='ninguna'?'Seguimos con base aeróbica y evaluaremos un objetivo alternativo antes de reservar viajes.':'Decidir después de los sorteos: Berlín 3 dic., Chicago 8 dic. de 2026.'}</p></div>`;
 const today=Date.now();
 const stage=PHASES_2027.find(x=>Date.parse(x.from+'T00:00:00Z')<=today&&Date.parse(x.to+'T23:59:59Z')>=today);
 const phases=PHASES_2027.map((x,i)=>`<div class="s27-phase ${stage===x?'current':''}"><div class="s27-count">${String(i+1).padStart(2,'0')}</div><div class="s27-phase-content"><strong>${safe(x.title)}</strong><small>${formatted(x.from)} – ${formatted(x.to)}</small><p>${safe(x.main)}</p></div></div>`).join('');
 root.innerHTML=`<div class="s27-title"><div><p class="eyebrow">Temporada 2027 · Plan maestro</p><h2>Victoria + una World Marathon Major</h2><p>Dos picos de rendimiento. Carrera a pie protagonista del segundo semestre.</p></div><span class="s27-state">Sorteos pendientes / selección editable</span></div>
 <div class="s27-stats"><article><small>IRONMAN 70.3 Victoria</small><strong>30 MAY</strong><span>Objetivo A · ${Math.max(0,daysUntil('2027-05-30',d))} días</span></article><article><small>Maratón de Berlín</small><strong>26 SEP</strong><span>Resultado del sorteo · 3 dic 2026</span></article><article><small>Maratón de Chicago</small><strong>10 OCT</strong><span>Resultado del sorteo · 8 dic 2026</span></article></div>
 <section class="s27-card"><div class="s27-heading"><h3>Competencias y decisiones</h3><span>Una sola maratón</span></div>
 ${compact(RACES_2027.victoria,'Principal del primer semestre')}
 ${compact(RACES_2027.mmb,'25 julio 2027 · 21,097 km · objetivo B de evaluación')}
 ${compact(RACES_2027.cartagena,'Equipo · fecha orientativa, no confirmada')}
 ${compact(RACES_2027.berlin,'Sorteo solicitado · sin cupo confirmado')}
 ${compact(RACES_2027.chicago,'Sorteo solicitado · sin cupo confirmado')}
 ${scenarios}<div class="s27-warning"><b>MMB · 25 de julio:</b> ${safe(p.mmb.message)}</div><div class="s27-warning"><b>Cartagena:</b> ${safe(p.cartagena.message)}</div></section>
 <div class="s27-columns"><section class="s27-card"><div class="s27-heading"><h3>Periodización</h3><span>Nov 2026 – Nov 2027</span></div><div class="s27-phases">${phases}</div></section>
 <section class="s27-card"><div class="s27-heading"><h3>Lecciones de 27,4 km en Cajicá</h3><span>8 nov 2026</span></div>
 <div class="s27-event"><strong>KM 14</strong><p>Inicio del cansancio: revisar ritmo de salida, reserva muscular y carga acumulada.</p></div>
 <div class="s27-event"><strong>KM 21</strong><p>Dolor de estómago y piernas: evaluar alimentación, hidratación y tolerancia digestiva. No asumir que fue falta de sodio.</p></div>
 <div class="s27-event"><strong>KM 24–27</strong><p>Caminatas de aproximadamente 70–90 m por km y sensación de calambres cerca del final.</p></div>
 <div class="s27-warning"><b>Regla del nuevo plan:</b> no avanzar a fondos prolongados a ritmo exigente sin practicar nutrición y verificar recuperación de piernas y sistema gastrointestinal.</div>
 <details class="s27-details" open><summary>Semana guía del bloque maratón (julio–septiembre)</summary><div><b>Lunes:</b> descanso. <b>Martes:</b> carrera suave + fuerza. <b>Miércoles:</b> sesión de calidad de carrera (según entrenador). <b>Jueves:</b> carrera fácil + bicicleta suave opcional. <b>Viernes:</b> natación técnica o recuperación. <b>Sábado:</b> fondo progresivo con práctica de nutrición. <b>Domingo:</b> carrera regenerativa o bicicleta Z1–Z2. Incrementar kilometraje solo según adaptación y molestias; evitar intensidad extra después de los fondos.</div></details>
 <details class="s27-details"><summary>Principios para decidir los fondos</summary><div>Junio: retorno gradual tras Victoria. Julio: recuperar consistencia en 3–4 sesiones de carrera. Agosto: 4–5 sesiones y fondos que progresen, sin saltos bruscos. Septiembre: uno o dos ensayos específicos, seguidos de reducción de carga para la maratón elegida. No hay objetivos semanales obligatorios mientras la fatiga y la tolerancia digestiva sean inciertas.</div></details>
 <details class="s27-details"><summary>Protocolo de seguimiento para fondos</summary><div>Registrar hora, duración, ritmo, esfuerzo percibido, carbohidratos por hora, bebida y volumen, síntomas abdominales, dolor muscular y caminatas. Probar cambios en entrenamiento, nunca estrenarlos el día de carrera. Para fondos prolongados, individualizar una ingesta aproximada de 30–60 g de carbohidratos/h, empezando por cantidades tolerables y sin forzar ingestas que causen molestias.</div></details>
 <details class="s27-details"><summary>Señales de alerta</summary><div>Si el dolor abdominal persiste o es intenso, si hay vómitos repetidos, confusión, desmayo, dolor muscular desproporcionado o orina oscura, suspender ejercicio y solicitar valoración médica. El retorno a correr depende de recuperación y ausencia de síntomas.</div></details>
 </section></div>
 <p class="s27-foot">El calendario no modifica las sesiones prescritas por tu entrenador. Las fechas del 51.50 son tentativas hasta confirmación oficial. Esta selección se almacena en tu dispositivo.</p>`;
 root.querySelector('#s27-draw')?.addEventListener('change',e=>{localStorage.setItem(LS,e.target.value);render()});
}
render();
document.querySelectorAll('.navbtn[data-v="temporada"]').forEach(b=>b.addEventListener('click',render));
