export function productosPreferidos(catalogo, preferencias={},modo='todos'){
  const favoritos=new Set(Array.isArray(preferencias.favoritos)?preferencias.favoritos:[]);
  const disponibles=new Set(Array.isArray(preferencias.disponibles)?preferencias.disponibles:[]);
  return catalogo.filter(p=>modo==='favoritos'?favoritos.has(p.id):modo==='disponibles'?disponibles.has(p.id):true);
}

export function validarPerfil(datos={}){
  const rango=(clave,min,max)=>{
    const valor=datos[clave];
    if(valor==null||valor==='')return null;
    const n=Number(valor);return Number.isFinite(n)&&n>=min&&n<=max?n:null;
  };
  return {
    pesoKg:rango('pesoKg',25,250),
    edad:rango('edad',16,100),
    sudoracionLh:rango('sudoracionLh',0,4),
    experienciaNutricion:['sin_ensayar','parcial','ensayada'].includes(datos.experienciaNutricion)?datos.experienciaNutricion:'sin_ensayar',
    alertaEstomago:Boolean(datos.alertaEstomago)
  };
}
