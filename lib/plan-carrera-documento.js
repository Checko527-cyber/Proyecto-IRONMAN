// Convierte el motor determinista a las cuatro hojas operativas del plan Cartagena.
const hora=(total)=>{
  const v=((Math.round(total)%1440)+1440)%1440;
  return `${String(Math.floor(v/60)).padStart(2,'0')}:${String(v%60).padStart(2,'0')}`;
};
const inicio=h=>{const [a,b]=String(h||'07:00').split(':').map(Number);return a*60+b;};
const redondear=n=>Math.round(n*10)/10;
const duracion=min=>`${Math.floor(min/60)}h ${String(min%60).padStart(2,'0')}m`;
const recetas={
  avena:'Avena cocida con banano y miel + pan blanco con mermelada',
  pan:'Pan blanco con mermelada y banano maduro',
  arroz:'Arroz blanco cocido + banano y miel',
  personal:'Desayuno habitual registrado por el atleta (ajustar sus alimentos y cantidades)'
};

function crearSecciones({carrera,perfil,plan,consumos,mapa,salida}){
  const peso=Number(perfil.pesoKg)>0?Number(perfil.pesoKg):null;
  const calor=Number(carrera.temperaturaC)>=28;
  const comida=recetas[plan.desayuno]||recetas.avena;
  const previoG=peso?Math.round(peso*1.5):null;
  const fila=(hora,accion,porque)=>({hora,accion,porque});
  const pre={id:'pre',nombre:'ANTES DE LA CARRERA',subtitulo:`Desde ${hora(salida-210)} · preparación y alimentación`,duracion:'3 h 30 min previas',filas:[
    fila(hora(salida-210)+' · Despertar','Preparar ropa, revisar sensaciones e iniciar con sorbos de agua según sed.','Dejar tiempo para traslados y digestión; no forzar grandes volúmenes.'),
    fila(hora(salida-180)+' · Desayuno',`${comida}. ${previoG?`Referencia orientativa: ~${previoG} g de carbohidratos totales`:'Porción según prueba previa; registrar peso para estimar carbohidratos'}. Ajustar cantidades a una receta ensayada.`,'Comida familiar, con baja carga de grasa/fibra si hay sensibilidad digestiva; no estrenar el día del evento.'),
    fila(hora(salida-150)+' · Bebida','Si fue ensayada, completar el desayuno con una bebida habitual sin cafeína; contar su aporte dentro del total de carbohidratos.','La bebida es un complemento, no una segunda carga obligatoria. Evitar duplicar energía sin contabilizarla.'),
    fila(`${hora(salida-90)}–${hora(salida-45)} · Montaje`,'Rotular bidones, separar geles por tramo, revisar casco, dorsal, avituallamientos y cierres de transición.','Organizar los productos por orden de consumo evita improvisaciones.'),
    fila(hora(salida-20)+' · Última revisión','Pequeños sorbos si tienes sed; calentamiento permitido. Confirmar si el reglamento autoriza neopreno y revisar temperatura del agua.','No introducir cafeína, nitratos o cápsulas nuevas de forma automática.'),
    fila('Resumen previo',`${previoG?`Desayuno de referencia ~${previoG} g CH`:'Carbohidratos del desayuno sin cuantificar'} · bebidas y agua según sed · sin suplementación estimulante automática.`,'Las cantidades de la comida son orientativas; se personalizan con receta real y ensayo digestivo.')
  ]};
  const secciones=[pre];
  const nombres={swim:'NATACIÓN',t1:'TRANSICIÓN 1 · nado → bicicleta',bike:'CICLISMO',t2:'TRANSICIÓN 2 · bicicleta → carrera',run:'ATLETISMO'};
  for(const etapa of plan.cronograma.etapas){
    const cEtapa=consumos.filter(c=>c.en===etapa.id).sort((a,b)=>(a.offsetMin||0)-(b.offsetMin||0));
    const productos=cEtapa.filter(x=>x.productoId!=='agua-neutral');
    const agua=cEtapa.filter(x=>x.productoId==='agua-neutral');
    const g=productos.reduce((n,x)=>n+((mapa.get(x.productoId)?.carbohidratosG||0)*x.cantidad),0);
    const sodio=productos.reduce((n,x)=>n+((mapa.get(x.productoId)?.sodioMg||0)*x.cantidad),0);
    const ml=agua.reduce((n,x)=>n+(x.overrides?.liquidoMl||0),0)+productos.reduce((n,x)=>n+(x.overrides?.liquidoMl||0),0);
    const ritmo=etapa.km?etapa.id==='swim'?`${Math.round(etapa.duracionMin*60/etapa.km/10)/10} seg / 100 m aprox.`:etapa.id==='bike'?`${redondear(etapa.km/(etapa.duracionMin/60))} km/h`:`${Math.floor(etapa.duracionMin/etapa.km)}:${String(Math.round(etapa.duracionMin%etapa.km/etapa.km*60)).padStart(2,'0')} min/km`:'';
    const filas=[fila(`${etapa.inicio}–${etapa.fin} · Objetivo`,`${duracion(etapa.duracionMin)}${etapa.km?` · ${etapa.km} km · ritmo/velocidad de referencia ${ritmo}`:''}`,'Tiempo introducido por el atleta o entrenador; no es una predicción de rendimiento.')];
    if(etapa.id==='swim')filas.push(
      fila('Alimentación','No se programa ingesta durante la natación. La comida previa debe estar terminada con margen.','Evita la necesidad de ingerir productos en el agua.'),
      fila('Estrategia','Salida controlada; orientarte en las boyas, mantener técnica y cuidar las primeras brazadas.','El plan exacto de intensidad y ritmo corresponde al entrenador.'),
      fila('Condición acuática','Verificar temperatura oficial del agua, oleaje y reglas de neopreno el día de carrera.','No asumir que el neopreno está permitido o prohibido sin reglamento vigente.')
    );
    if(etapa.id==='t1')filas.push(
      fila('Secuencia','1. Salir del agua y ubicar tu puesto. 2. Retirar gafas/gorro. 3. Colocar casco antes de tocar la bicicleta. 4. Tomar equipo y caminar hasta línea de montaje.','Ensayar la secuencia y seguir las normas oficiales.'),
      fila('Hidratación','Si tienes sed, unos sorbos al llegar a la bici. La bebida principal ya está preparada en los bidones.','Evita ingerir un gel a prisa durante el cambio.')
    );
    if(etapa.id==='t2')filas.push(
      fila('Secuencia','1. Desmontar en la línea. 2. Llevar bici al puesto. 3. Soltar casco tras dejar la bicicleta. 4. Cambiar zapatillas. 5. Tomar nutrición de carrera y salir progresivamente.','Ensayar el cambio; respetar la circulación de la zona de transición.'),
      fila('Reserva','Llevar una ración de reserva tolerada; no ingerirla si ya se cumplió el objetivo y no es necesaria.','Previene quedar sin opción ante pérdida de un gel o retraso inesperado.')
    );
    if(['bike','run'].includes(etapa.id)){
      const bebidas=productos.filter(x=>mapa.get(x.productoId)?.tipo==='bebida');
      const geles=productos.filter(x=>mapa.get(x.productoId)?.tipo!=='bebida');
      filas.push(fila('Estrategia combinada',`${bebidas.length?'Bebida energética en bidón + ':''}${geles.length?'geles programados + ':''}agua disponible según sed. ~${redondear(g)} g CH durante el tramo (~${redondear(g/(etapa.duracionMin/60))} g/h).`,'Se suma el aporte de todos los productos; la bebida no debe contarse dos veces como agua y energía.'));
      for(const x of productos){
        const p=mapa.get(x.productoId);if(!p)continue;
        filas.push(fila(`${hora(etapa.inicioMin+(x.offsetMin||0))} · ${p.tipo==='bebida'?'Bidón':'Toma'}`,`${redondear(x.cantidad)} porción(es) de ${p.nombre} · ${redondear(x.cantidad*(p.carbohidratosG||0))} g CH${x.overrides?.liquidoMl?` · preparados en ${Math.round(x.overrides.liquidoMl)} ml`:''}. ${x.indicacion||''}`,'Dosis programada según duración y objetivo editable; verificar etiqueta, concentración, ensayo y formato físico.'));
      }
      filas.push(fila('Hidratación',`~${Math.round(ml)} ml de líquidos totales en el tramo: ${Math.round(ml-(plan.resumen.find(x=>x.etapa===etapa.id)?.bebidaMl||0))} ml de agua + ${Math.round(plan.resumen.find(x=>x.etapa===etapa.id)?.bebidaMl||0)} ml de bebida.`,
        'Volumen inicial para logística, NO cuota obligatoria: ajustar según sed, sudoración medida y puntos de avituallamiento.'));
      filas.push(fila('Sodio registrado',`${redondear(sodio)} mg de sodio provenientes de productos cuantificados${productos.some(x=>mapa.get(x.productoId)?.sodioMg===null)?' (subtotal parcial)':''}.`,'No se recomiendan cápsulas de sal automáticamente; no confundir electrolitos totales con sodio.'));
      filas.push(fila('Estrategia de esfuerzo',etapa.id==='bike'?'Iniciar controlado y revisar cadencia/sensaciones; evitar perseguir velocidad si hay viento. Reservar energía para la carrera.':'Partir conservador y evaluar ritmo, temperatura y tolerancia digestiva; usar puestos previstos.',
        'Los ritmos de intensidad los fija el entrenador; el motor organiza la logística nutricional.'));
      if(calor)filas.push(fila('Calor · control','Priorizar enfriamiento, sombra cuando sea posible y atención a síntomas. Si hay confusión, colapso o deterioro significativo, detenerse y pedir asistencia médica.','El calor puede modificar tolerancia y seguridad; no compensarlo forzando agua ni sal.'));
    }
    filas.push(fila('Consejo operativo',etapa.id==='bike'?'Comer y beber en tramos seguros; confirmar normas del evento.':etapa.id==='run'?'Dejar margen para avituallamientos y no estrenar productos.':'Ensayar la secuencia antes del evento.', 'El objetivo es ejecutar sin improvisar.'));
    secciones.push({id:etapa.id,nombre:nombres[etapa.id],subtitulo:`${etapa.inicio}–${etapa.fin}${etapa.km?` · ${etapa.km} km`:''}`,duracion:duracion(etapa.duracionMin),filas});
  }
  const fin=plan.cronograma.etapas.at(-1)?.finMin??salida;
  secciones.push({id:'post',nombre:'DESPUÉS DE META',subtitulo:`Desde ${hora(fin)} · recuperación`,duracion:'Primeras 4 h',filas:[
    fila(hora(fin)+' · Finalizar','Caminar hacia zona segura, confirmar estado general, obtener agua/comida tolerada y avisar al acompañante.','La recuperación inicia evaluando seguridad, temperatura y tolerancia.'),
    fila(hora(fin+30)+' · Primera comida',`Comida habitual con carbohidratos y ${peso?`aprox. ${Math.round(peso*.3)} g de proteína como referencia`:'una fuente de proteína (cantidad a definir con peso actualizado)'}.`,'Adaptar al apetito y plan profesional; no duplicar suplementos si la comida ya cubre necesidades.'),
    fila(`${hora(fin+120)}–${hora(fin+240)} · Continuidad`,'Comida completa y líquidos según sed/pérdidas evaluadas; registrar qué productos toleraste.','Aprender del evento para próximas estrategias.')
  ]});
  return secciones;
}

export function construirDocumentoCarrera({carrera,perfil={},plan,consumos=[],catalogo=[]}){
  const salida=inicio(carrera.salida),peso=Number(perfil.pesoKg)>0?Number(perfil.pesoKg):null;
  const mapa=new Map(catalogo.map(x=>[x.id,x]));
  const eventos=[
    {dia:'D-2',hora:'Durante el día',etapa:'Preparación',accion:'Confirmar avituallamientos, ropa y bicicleta; priorizar comidas habituales y descanso',detalle:'Evitar experimentar con comidas o suplementos nuevos'},
    {dia:'D-1',hora:'Mañana',etapa:'Preparación',accion:'Revisar circuito, horarios, material y realizar ensayo de logística',detalle:'Ajustar a las reglas oficiales del evento'},
    {dia:'D-1',hora:'Tarde',etapa:'Preparación',accion:'Preparar y rotular cada ración, bidón y bolsa de transición',detalle:'Hacer inventario físico y comprobar caducidades'},
    {dia:'Carrera',hora:hora(salida-210),etapa:'Previa',accion:'Despertar y revisar estado general',detalle:'Dejar margen para higiene, traslado y digestión'},
    {dia:'Carrera',hora:hora(salida-180),etapa:'Previa',accion:'Desayuno familiar y tolerado',detalle:peso?`Referencia inicial: ${Math.round(peso*1.5)} g CH (1,5 g/kg); adaptar según experiencia y tolerancia`:'Confirmar peso y tolerancia antes de determinar cantidad'},
    {dia:'Carrera',hora:hora(salida-75),etapa:'Logística',accion:'Revisar transición, casco, dorsal, bidones y material',detalle:'Comprobar horario oficial de cierre de transición'},
    {dia:'Carrera',hora:hora(salida-20),etapa:'Previa',accion:'Comprobar hidratación y calentamiento autorizado',detalle:'No introducir productos o dosis nuevas'}
  ];
  for(const e of plan.cronograma.etapas){
    eventos.push({dia:'Carrera',hora:e.inicio,etapa:e.nombre,accion:`Inicio · ${e.nombre}`,detalle:e.km?`${e.km} km · ${e.duracionMin} min previstos`:`${e.duracionMin} min previstos`});
    for(const c of consumos.filter(c=>c.en===e.id)){
      const p=mapa.get(c.productoId);
      eventos.push({dia:'Carrera',hora:hora(e.inicioMin+c.offsetMin),etapa:e.nombre,
        accion:`${c.productoId==='agua-neutral'?'Agua orientativa':p?.nombre||'Producto'} · ${c.productoId==='agua-neutral'?`${Math.round(c.overrides?.liquidoMl||0)} ml`:`${c.cantidad} porción(es)`}`,
        detalle:c.productoId==='agua-neutral'?'Volumen de planificación; ajustar a sed y avituallamiento disponible':`${Math.round((p?.carbohidratosG||0)*c.cantidad)} g CH · comprobar formato de transporte`});
    }
    eventos.push({dia:'Carrera',hora:e.fin,etapa:e.nombre,accion:`Fin · ${e.nombre}`,detalle:'Transición o siguiente tramo'});
  }
  const ultimo=plan.cronograma.etapas.at(-1)?.finMin??salida;
  eventos.push({dia:'Carrera',hora:hora(ultimo+20),etapa:'Recuperación',accion:'Alimentación e hidratación post-meta',detalle:peso?`Referencia: ~${Math.round(peso*.3)} g de proteína, carbohidratos y líquidos según tolerancia`:'Comida con proteínas y carbohidratos; personalizar según peso y tolerancia'});
  const grupos=['D-2','D-1','Carrera'];
  const relativo=h=>{let d=inicio(h)-salida;if(d>720)d-=1440;if(d< -720)d+=1440;return d;};
  eventos.sort((a,b)=>grupos.indexOf(a.dia)-grupos.indexOf(b.dia)||(a.dia==='Carrera'?relativo(a.hora)-relativo(b.hora):0));
  const materiales=[
    ['Natación',['Gafas principales y repuesto','Gorro oficial y trisuit probado','Antivaho y material autorizado']],
    ['Bicicleta',['Bicicleta revisada y fotografías del ajuste','Casco, zapatillas y gafas','Bidones rotulados y herramientas','Kit antipinchazos y repuestos']],
    ['Carrera',['Zapatillas probadas','Dorsal y cinturón','Gorra, calcetines y protección solar']],
    ['Nutrición',['Geles o alimento dosificados','Bebidas y agua según puntos de abastecimiento','Plan impreso o guardado sin conexión','Ración de reserva tolerada']],
    ['Logística',['Documento y registro','Horarios y mapa de transiciones','Bolsa de ropa posterior','Cargadores y dispositivos deportivos']]
  ];
  const cantidades=new Map();for(const c of consumos){if(c.productoId==='agua-neutral')continue;cantidades.set(c.productoId,(cantidades.get(c.productoId)||0)+c.cantidad);}
  return {eventos,materiales,secciones:crearSecciones({carrera,perfil,plan,consumos,mapa,salida}),productos:[...cantidades].map(([id,cantidad])=>({...mapa.get(id),id,cantidad:Math.ceil(cantidad*10)/10})),
    inicio:hora(salida),meta:plan.cronograma.llegada,distancia:plan.cronograma.distancia,
    puntosPendientes:[...new Set(plan.avisos||[])]};
}
