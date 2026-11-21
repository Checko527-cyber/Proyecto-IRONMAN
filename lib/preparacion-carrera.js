// Estado de preparación de datos. No determina hidratación que deba ingerirse.
export function revisarPreparacion(perfil={},cronograma={},consumos=[],productos=[],preferencias={}){
  const avisos=[];
  const esNumero=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
  if(!esNumero(perfil.pesoKg))avisos.push('Actualizar el peso antes de revisar la estrategia individual.');
  if(!esNumero(perfil.sudoracionLh))avisos.push('No hay tasa de sudoración medida; no se estima reposición de líquidos.');
  if(perfil.experienciaNutricion!=='ensayada')avisos.push('Confirmar tolerancia y cantidades en entrenamientos antes de competir.');
  if(perfil.alertaEstomago)avisos.push('Registrar molestias digestivas y revisar el plan con un profesional.');
  if(!consumos.length)avisos.push('Todavía no hay productos asignados a la carrera.');
  const conocidos=new Set(productos.map(p=>p.id));
  const disponibles=new Set(Array.isArray(preferencias.disponibles)?preferencias.disponibles:[]);
  for(const id of new Set(consumos.map(x=>x.productoId))){
    if(!conocidos.has(id))avisos.push(`Un producto del plan ya no está en el catálogo: ${id}.`);
    if(!disponibles.has(id))avisos.push(`Confirmar disponibilidad del producto: ${productos.find(p=>p.id===id)?.nombre||id}.`);
  }
  const horas=esNumero(cronograma.totalMin)?cronograma.totalMin/60:null;
  const perdidaTeoricaLitros=horas!==null&&esNumero(perfil.sudoracionLh)?
    +(horas*perfil.sudoracionLh).toFixed(2):null;
  return {avisos,perdidaTeoricaLitros,horas,esEstimacion:true};
}
