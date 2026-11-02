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
  const body=await r.json(),t=body.access_token??body.accessToken;
  return res.status(200).json({stage:'token',authenticated:typeof t==='string'&&t.length>10});
 }catch{return res.status(502).json({stage:'network',authenticated:false});}
}