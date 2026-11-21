// Intervals.icu stores left_right_balance as percentage contributed by RIGHT.
// Never interpret missing, coasting or implausible samples as 50/50.
export function summarizeBalance(streams, sport='') {
  const t=String(sport).toLowerCase();
  if(!/(ride|bike|cycl)/.test(t))return {disponible:false,razon:'El análisis bilateral se aplica a ciclismo.'};
  const b=streams.left_right_balance, watts=streams.watts, times=streams.time;
  if(!Array.isArray(b)||!Array.isArray(times)||b.length!==times.length)
    return {disponible:false,razon:'Intervals.icu no entregó la serie bilateral completa.'};
  const samples=[];
  for(let i=0;i<b.length;i++){
    const right=Number(b[i]),seconds=Number(times[i]),power=Array.isArray(watts)?Number(watts[i]):null;
    if(b[i]==null||!Number.isFinite(right)||right<0||right>100||!Number.isFinite(seconds))continue;
    if(Array.isArray(watts) && (watts[i]==null||!Number.isFinite(power)||power<=0))continue;
    samples.push({seconds,right,power});
  }
  if(!samples.length)return {disponible:false,razon:'No hay muestras válidas de potencia bilateral.'};
  const mean=x=>x.length?Math.round(x.reduce((a,s)=>a+s.right,0)/x.length*10)/10:null;
  const min=samples[0].seconds,max=samples[samples.length-1].seconds,mid=(min+max)/2;
  const first=mean(samples.filter(x=>x.seconds<mid)),last=mean(samples.filter(x=>x.seconds>=mid));
  const right=mean(samples);
  const buckets=new Map();
  for(const s of samples){
    const minute=Math.floor(s.seconds/300)*5;
    const bin=buckets.get(minute)||{minuto:minute,sumRight:0,sumPower:0,n:0,np:0};
    bin.sumRight+=s.right;bin.n++;
    if(s.power!=null){bin.sumPower+=s.power;bin.np++;}
    buckets.set(minute,bin);
  }
  const curva=[...buckets.values()].sort((a,b)=>a.minuto-b.minuto).map(x=>({
    minuto:x.minuto,izquierdaPct:Math.round((100-x.sumRight/x.n)*10)/10,
    derechaPct:Math.round(x.sumRight/x.n*10)/10,
    watts:x.np?Math.round(x.sumPower/x.np):null
  }));
  return {disponible:true,muestras:samples.length,
    izquierdaPct:Math.round((100-right)*10)/10,derechaPct:right,
    primeraMitadIzquierdaPct:first==null?null:Math.round((100-first)*10)/10,
    segundaMitadIzquierdaPct:last==null?null:Math.round((100-last)*10)/10,
    cambioIzquierdaPuntos:first==null||last==null?null:Math.round((first-last)*10)/10,
    curva,nota:'Balance descriptivo: interpreta diferencias solo entre esfuerzos similares y a lo largo de varias sesiones.'};
}
