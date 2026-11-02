// Temporary read-only diagnostic for protected preview only.
// Reports only HTTP status, never tokens or athlete data.
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(process.env.VERCEL_ENV !== 'preview')return res.status(404).json({error:'Not found'});
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const key=process.env.GARMIN_PERSONAL_API_KEY;
  if(!key)return res.status(503).json({stage:'configuration',configured:false});
  try{
    const response=await fetch('https://personal.connectapi.garmin.com/personalapitoken-service/personal-api/personal-api-key/token',{
      method:'POST',headers:{Authorization:'ApiKey '+key},signal:AbortSignal.timeout(12000)});
    if(!response.ok)return res.status(200).json({stage:'token',authenticated:false,upstreamStatus:response.status});
    const body=await response.json();
    const bearer=body.access_token??body.accessToken;
    return res.status(200).json({stage:'token',authenticated:typeof bearer==='string'&&bearer.length>10});
  }catch{return res.status(502).json({stage:'network',authenticated:false});}
}
