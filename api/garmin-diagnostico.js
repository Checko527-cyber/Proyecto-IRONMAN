// Diagnóstico temporal en rama Preview protegida; no devuelve secretos ni datos.
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(process.env.VERCEL_ENV!=='preview')return res.status(404).json({error:'Not found'});
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const key=process.env.GARMIN_PERSONAL_API_KEY;
 if(!key)return res.status(503).json({stage:'configuration',configured:false});
 try{
  const r=await fetch('https://personal.connectapi.garmin.com/personalapitoken-service/personal-api/personal-api-key/token',{
   method:'POST',headers:{Authorization:'ApiKey '+key},signal:AbortSignal.timeout(12000)});
  if(!r.ok)return res.status(200).json({stage:'token',authenticated:false,upstreamStatus:r.status});
  const t=(await r.text()).trim();
  if(!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(t))return res.status(502).json({stage:'token',authenticated:false,format:'unexpected',characters:t.length,dotCount:(t.match(/\./g)||[]).length,leadingQuote:t.startsWith('"'),leadingBrace:t.startsWith('{'),leadingE:t.startsWith('eyJ'),contentType:r.headers.get('content-type')?.slice(0,60)||null});
  const a=await fetch('https://personal.connectapi.garmin.com/activitylist-service/activities/search/activities?start=0&limit=20&startDate=2026-11-01&endDate=2026-11-02',{
    headers:{Authorization:'Bearer '+t,Accept:'application/json'},signal:AbortSignal.timeout(15000)});
  if(!a.ok)return res.status(200).json({stage:'activities',authenticated:true,upstreamStatus:a.status});
  const body=await a.json();
  if(!Array.isArray(body))return res.status(200).json({stage:'activities',authenticated:true,validArray:false});
  const activities=body.map(x=>({id:x.activityId??null,sport:x.activityType?.typeKey??null,metros:x.distance??null,segundos:x.duration??null,fcMedia:x.averageHR??null,cadencia:x.averageBikingCadenceInRevPerMinute??x.averageRunningCadenceInStepsPerMinute??null}));
  return res.status(200).json({stage:'activities',authenticated:true,total:activities.length,activities});
 }catch(e){return res.status(502).json({stage:'network_or_decode',authenticated:false,errorName:String(e?.name||'unknown').slice(0,40),causeCode:String(e?.cause?.code||'none').slice(0,40)});}
}