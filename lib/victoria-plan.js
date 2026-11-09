// Victoria 70.3 · objetivo 06:30:00 · planes propuestos; no modifica calendario del entrenador.
export const TARGET={date:'2027-05-30',seconds:23400,swim:43,bike:190,run:142,transitions:15};
const rows=[
[.7,.4,0,0,'recuperacion'],[1.2,1,.4,.4,'recuperacion'],
[2,2,1.2,.7,'base'],[1.5,1.5,.9,.6,'descarga'],
[2.2,2.3,1.5,.8,'base'],[2.4,2.7,1.6,.8,'base'],[2.5,3.1,1.8,.8,'base'],[1.9,2,1.3,.6,'descarga'],
[2.5,3.2,2,.8,'base'],[2.6,3.5,2.1,.8,'base'],[2.6,3.8,2.2,.8,'base'],[2,2.5,1.6,.6,'descarga'],
[2.7,3.8,2.3,.8,'base'],[2.8,4,2.3,.8,'base'],[2.9,4.2,2.4,.8,'base'],[2.2,2.8,1.7,.6,'descarga'],
[2.8,4.2,2.5,.7,'especifico'],[2.9,4.4,2.5,.7,'especifico'],[3,4.6,2.5,.7,'especifico'],[2.3,3,1.7,.6,'descarga'],
[3,4.7,2.6,.7,'especifico'],[3,5,2.6,.7,'especifico'],[3,5.2,2.7,.7,'especifico'],[2.3,3.5,1.8,.5,'descarga'],
[3,5.4,2.7,.6,'pico'],[3,5,2.5,.6,'pico'],[2.5,3.8,1.9,.4,'taper'],[2,2.5,1.4,.3,'taper'],[.5,.8,.4,0,'competencia']];
const bikeMins=[25,50,70,50,85,100,115,75,125,140,150,95,155,165,175,105,180,190,200,120,205,215,225,145,210,190,130,90,20];
const efforts=[null,null,null,null,null,null,null,null,null,'3×8 min Z3','2×12 min Z3',null,'3×10 min Z3','2×15 min Z3','3×12 min Z3',null,'Brick 15 min Z2','2×20 min Z3 + brick 20 min','3×15 min Z3 + brick 20 min',null,'2×25 min Z3 + brick 25 min','3×20 min Z3 + brick 30 min','2×30 min Z3 + brick 30 min',null,'Simulación 85–95 km + brick 30–40 min','75–85 km + ensayo de nutrición','3×10 min Z3','2×8 min Z3','Activación'];
export const WEEKS=rows.map(([swim,bike,run,strength,phase],i)=>{
 const start=new Date(Date.UTC(2026,10,9)+i*7*86400000);
 const end=new Date(start.getTime()+6*86400000);
 const iso=x=>x.toISOString().slice(0,10);
 const number=i+1;
 return {number,start:iso(start),end:iso(end),phase,swim,bike,run,strength,
  total:Math.round((swim+bike+run+strength)*10)/10,
  mainBikeMinutes:bikeMins[i],focus:efforts[i],
  isDeload:phase==='descarga',isRace:phase==='competencia'};
});
export const ZONES={
 run:[{name:'Z1',min:0,max:139},{name:'Z2',min:140,max:147},{name:'Z3',min:148,max:155},{name:'Z4',min:156,max:164},{name:'Z5',min:165,max:null}],
 bike:[{name:'Z1',min:0,max:132},{name:'Z2',min:133,max:139},{name:'Z3',min:140,max:147},{name:'Z4',min:148,max:156},{name:'Z5',min:157,max:null}]
};
export const NUTRITION=[
 {phase:'Nov–ene',bike:'40–60 g/h en sesiones de prueba; subir hacia 60–75 si se tolera',run:'No forzar ingesta; introducir 40–50 g/h gradualmente'},
 {phase:'Feb–mar',bike:'60–75 g/h con líquidos medidos',run:'40–50 g/h en fondos sin síntomas'},
 {phase:'Abr',bike:'70–80 g/h si los ensayos fueron buenos',run:'45–60 g/h si es tolerable'},
 {phase:'May',bike:'Solo productos y dosis ya probados',run:'Solo productos y dosis ya probados'}
];
export function weekOf(date){return WEEKS.find(w=>w.start<=date&&date<=w.end)||null;}
export function sportTotals(activities,start,end){
 const sportMap={swim:'swim',bike:'bike',run:'run',other:'strength'};
 const totals={swim:{hours:0,km:0,sessions:0,load:0},bike:{hours:0,km:0,sessions:0,load:0},run:{hours:0,km:0,sessions:0,load:0},strength:{hours:0,km:0,sessions:0,load:0}};
 for(const a of activities||[]){
  if(!a.date||a.date<start||a.date>end)continue;
  const key=sportMap[a.sport];if(!key)continue;const x=totals[key];
  x.hours+=typeof a.min==='number'?a.min/60:0;
  x.km+=typeof a.km==='number'?a.km:0;
  x.load+=typeof a.carga==='number'?a.carga:0;
  x.sessions++;
 }
 for(const s of Object.values(totals)){s.hours=Math.round(s.hours*10)/10;s.km=Math.round(s.km*10)/10;s.load=Math.round(s.load);}
 return totals;
}
export function weekStatus(week,activities){const actual=sportTotals(activities,week.start,week.end),actualHours=Object.values(actual).reduce((a,b)=>a+b.hours,0);
 return {...actual,totalHours:Math.round(actualHours*10)/10,plannedHours:week.total,ratio:week.total>0?Math.round(actualHours/week.total*100):null};
}
export function bikeSession(week){
 const minutes=week.mainBikeMinutes;
 const easy=week.isDeload||week.phase==='recuperacion'||week.phase==='taper'||week.phase==='competencia';
 if(minutes<=35)return [{name:'Activación o recuperación opcional',minutes,zone:'Z1',hr:'<133 ppm'}];
 const warm=Math.min(15,Math.round(minutes*.12)),cool=10,main=Math.max(0,minutes-warm-cool);
 return [{name:'Calentamiento',minutes:warm,zone:'Z1',hr:'<133 ppm'},
 {name:easy?'Rodaje suave':'Base aeróbica + bloques indicados',minutes:main,zone:easy?'Z1–Z2':'Z2, con Z3 solo si figura en el foco',hr:easy?'≤139 ppm':'133–139 ppm; bloques 140–147 ppm'},
 {name:'Enfriamiento',minutes:cool,zone:'Z1',hr:'<133 ppm'}];
}
export function raceSplit(){return [{name:'Natación',minutes:43,details:'1.900 m · 2:16/100 m'},{name:'T1',minutes:7,details:'Transición'},{name:'Bicicleta',minutes:190,details:'90 km · 28,4 km/h (objetivo, no predicción)'},{name:'T2',minutes:8,details:'Transición'},{name:'Carrera',minutes:142,details:'21,1 km · ~6:44/km'}];}
