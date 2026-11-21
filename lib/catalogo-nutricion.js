// Catálogo semilla transcrito del plan 5150 Cartagena (hoja SUPLEMENTOS).
// Los datos son HISTÓRICOS, no fichas de fabricante verificadas ni una pauta de consumo.
// null significa desconocido; nunca convertir "electrolitos" a sodio sin etiqueta.
import { PRODUCTOS_MERCADO_CO } from './catalogo-colombia.js';
export const PRODUCTOS_CARTAGENA = Object.freeze([
  {id:'226-drink',nombre:'226ERS High Fructose Energy Drink',tipo:'bebida',carbohidratosG:86,sodioMg:500,cafeinaMg:0,estimado:false},
  {id:'226-cherry',nombre:'226ERS Gel CHERRY',tipo:'gel',carbohidratosG:55,sodioMg:250,cafeinaMg:160,estimado:false},
  {id:'226-strawberry',nombre:'226ERS Gel STRAWBERRY',tipo:'gel',carbohidratosG:55,sodioMg:250,cafeinaMg:0,estimado:false},
  {id:'sis-beta',nombre:'SIS Beta Fuel + Nootropics',tipo:'gel',carbohidratosG:40,sodioMg:null,cafeinaMg:null,estimado:true},
  {id:'going-boost',nombre:'GOING BOOST Toronja',tipo:'bebida',carbohidratosG:80,sodioMg:null,cafeinaMg:100,estimado:false},
  {id:'atlhetica-go',nombre:'Atlhetica GO! Recovery Gel',tipo:'gel',carbohidratosG:22.5,sodioMg:85,cafeinaMg:0,estimado:true},
  {id:'precision-cap',nombre:'Precision Hydration cápsula',tipo:'sales',carbohidratosG:0,sodioMg:250,cafeinaMg:0,estimado:false},
  {id:'applied-endurance',nombre:'Applied ENDURANCE tabs',tipo:'sales',carbohidratosG:0,sodioMg:null,cafeinaMg:0,estimado:false},
  {id:'basic-hydration',nombre:'Basic Supplements Hydration stick',tipo:'hidratacion',carbohidratosG:0,sodioMg:null,cafeinaMg:0,estimado:true,
    nota:'El documento registra 1.800 mg de electrolitos totales, no 1.800 mg de sodio.'},
  {id:'applied-hydration',nombre:'Applied HYDRATION+',tipo:'hidratacion',carbohidratosG:null,sodioMg:null,cafeinaMg:0,estimado:false},
  {id:'glycoload',nombre:'Metabolic GlycoLoad',tipo:'recuperacion',carbohidratosG:20,sodioMg:null,cafeinaMg:0,estimado:false},
  {id:'iso-xp',nombre:'Applied ISO-XP Whey Isolate',tipo:'proteina',carbohidratosG:null,sodioMg:null,cafeinaMg:0,estimado:false},
  {id:'zmag',nombre:'GAT ZMAG-T',tipo:'complemento',carbohidratosG:null,sodioMg:null,cafeinaMg:null,estimado:false},
  {id:'creatina',nombre:'Hi-Tech Creatina',tipo:'complemento',carbohidratosG:0,sodioMg:null,cafeinaMg:0,estimado:false},
  {id:'amino-x',nombre:'BSN AMINO X',tipo:'complemento',carbohidratosG:null,sodioMg:null,cafeinaMg:null,estimado:false}
].map(p=>Object.freeze({...p,fuente:'Plan Cartagena 2026 · registro del atleta',verificadoFabricante:false})));

const campos = ['carbohidratosG','sodioMg','cafeinaMg'];
const num = v => typeof v==='number' && Number.isFinite(v) && v>=0;
export const CATALOGO_COMPLETO = Object.freeze([...PRODUCTOS_CARTAGENA,...PRODUCTOS_MERCADO_CO,
  Object.freeze({id:'agua-neutral',nombre:'Agua potable · avituallamiento',tipo:'hidratacion',carbohidratosG:0,sodioMg:0,cafeinaMg:0,
    estimado:false,verificadoFabricante:true,fuente:'Agua simple · no incluye minerales o carbohidratos de otras bebidas',nota:'Volumen orientativo; ajusta según sed, pérdidas medidas y condiciones'})]);

// Cálculo compartido para futuro tablero, PDF y cronograma.
// items: [{productoId, cantidad, fase:'pre'|'durante'|'post', hora, overrides:{...}}]
export function calcularConsumos(items, catalogo = CATALOGO_COMPLETO) {
  const mapa = new Map(catalogo.map(p=>[p.id,p]));
  const fases = {pre:[],durante:[],post:[]};
  const alertas=[];
  for (const item of Array.isArray(items)?items:[]) {
    const producto=mapa.get(item?.productoId);
    if(!producto){alertas.push(`Producto desconocido: ${String(item?.productoId||'sin identificador')}`);continue;}
    const cantidad=Number(item.cantidad);
    if(!Number.isFinite(cantidad)||cantidad<=0){alertas.push(`${producto.nombre}: cantidad inválida`);continue;}
    const fase=Object.hasOwn(fases,item.fase)?item.fase:'durante';
    const valores={};
    for(const campo of campos){
      const dato=Object.hasOwn(item.overrides||{},campo)?item.overrides[campo]:producto[campo];
      valores[campo]=num(dato)?dato*cantidad:null;
      if(valores[campo]===null) alertas.push(`${producto.nombre}: verificar ${campo} antes de cerrar el plan`);
    }
    fases[fase].push({productoId:producto.id,nombre:producto.nombre,cantidad,hora:item.hora||null,valores});
    if(!producto.verificadoFabricante) alertas.push(`${producto.nombre}: composición pendiente de verificar con etiqueta`);
  }
  const sumar = lineas => Object.fromEntries(campos.map(campo=>[
    campo, {total:lineas.reduce((s,x)=>s+(x.valores[campo]||0),0),
      completo:lineas.every(x=>x.valores[campo]!==null)}
  ]));
  const totales=Object.fromEntries(Object.entries(fases).map(([fase,lineas])=>[fase,sumar(lineas)]));
  totales.general=sumar(Object.values(fases).flat());
  return {fases,totales,alertas:[...new Set(alertas)]};
}
