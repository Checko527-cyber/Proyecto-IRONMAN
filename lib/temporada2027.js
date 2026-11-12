export const RACES_2027=Object.freeze({
 victoria:{id:'victoria',date:'2027-05-30',name:'IRONMAN 70.3 Victoria',priority:'A',status:'objetivo',discipline:'triathlon'},
 mmb:{id:'mmb',date:'2027-07-25',name:'Media Maratón de Bogotá 21K',priority:'B',status:'fecha_confirmada_cupo_no_verificado',discipline:'run'},
 cartagena:{id:'cartagena',date:'2027-09-05',name:'5150 Cartagena',priority:'C',status:'fecha_no_confirmada',discipline:'triathlon'},
 berlin:{id:'berlin',date:'2027-09-26',name:'Generali Berlin Marathon',priority:'A+',status:'sorteo',discipline:'run'},
 chicago:{id:'chicago',date:'2027-10-10',name:'Chicago Marathon',priority:'A+',status:'sorteo',discipline:'run'}
});
export const PHASES_2027=[
 {from:'2026-11-09',to:'2026-12-20',title:'Transición y recuperación',main:'Recuperar la carrera larga del 8 de noviembre; sueño y reinicio gradual',focus:'recuperacion'},
 {from:'2026-12-21',to:'2027-02-28',title:'Base multideportiva',main:'Natación, bicicleta y carrera fácil; fuerza y consistencia',focus:'base'},
 {from:'2027-03-01',to:'2027-05-09',title:'Específico Victoria 70.3',main:'Eficiencia de bicicleta, bricks, nutrición y pacing',focus:'70.3'},
 {from:'2027-05-10',to:'2027-05-30',title:'Afinamiento y Victoria',main:'Bajar fatiga y competir en 70.3',focus:'competencia'},
 {from:'2027-05-31',to:'2027-06-20',title:'Recuperación de Victoria',main:'Retorno según síntomas, fatiga y recuperación',focus:'recuperacion'},
 {from:'2027-06-21',to:'2027-07-11',title:'Construcción de maratón',main:'Aumentar progresivamente frecuencia de carrera y fuerza; bici/natación complementarias',focus:'maraton'},
 {from:'2027-07-12',to:'2027-07-25',title:'Afinamiento y MMB 21K',main:'Media Maratón de Bogotá el 25 de julio: test de ritmo, pulso y nutrición; objetivo B sin buscar agotamiento máximo',focus:'mmb'},
 {from:'2027-07-26',to:'2027-08-22',title:'Recuperación MMB y construcción de maratón',main:'2–5 días de recuperación según síntomas y retorno al bloque específico de la maratón elegida',focus:'maraton'},
 {from:'2027-08-23',to:'2027-09-12',title:'Fondos y tolerancia gastrointestinal',main:'Practicar energía, líquidos y progresión; Cartagena condicionada',focus:'maraton'},
 {from:'2027-09-13',to:'2027-09-26',title:'Afinamiento Berlín / último específico Chicago',main:'Se adapta al sorteo y a la maratón elegida',focus:'bifurcacion'},
 {from:'2027-09-27',to:'2027-10-10',title:'Chicago / recuperación Berlín',main:'Taper Chicago o recuperación tras Berlín; nunca ambas maratones',focus:'bifurcacion'},
 {from:'2027-10-11',to:'2027-11-14',title:'Recuperación postmaratón',main:'Reintroducción gradual de entrenamientos, sin sobrecarga',focus:'recuperacion'}
];
export function resolveMarathon(selection){
 if(selection==='berlin'||selection==='chicago')return RACES_2027[selection];
 return null;
}
export function plan2027(selection='pendiente'){
 const chosen=resolveMarathon(selection);
 const cartagena=selection==='berlin'
 ? {decision:'desaconsejada',message:'Tres semanas antes de Berlín: evita competir el 51.50; la maratón es prioritaria.'}
 :selection==='chicago'
 ? {decision:'condicionada',message:'Cinco semanas antes de Chicago: solo a intensidad controlada si no hay molestias y no interfiere con fondos.'}
 : {decision:'sin_decidir',message:'Con Berlín, desaconsejada; con Chicago, participación opcional y suave. No comprometer el pico de maratón.'};
 return {marathon:chosen,cartagena,mmb:{decision:'objetivo_B',date:RACES_2027.mmb.date,message:'21,097 km el 25 de julio, ocho semanas después de Victoria. Ensayo de ritmo, hidratación, combustible y FC para la maratón del segundo semestre, sin desatender recuperación.'},phases:PHASES_2027,races:RACES_2027};
}
export function daysUntil(date,now=new Date()){
 const target=new Date(date+'T12:00:00Z');
 const today=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate(),12));
 return Math.ceil((target-today)/86400000);
}
