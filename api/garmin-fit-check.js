import {extractFitFromZip,decodeFit,timeSeries} from '../lib/garmin-fit.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(process.env.VERCEL_ENV!=='preview')return res.status(404).json({error:'not found'});
 const key=process.env.GARMIN_PERSONAL_API_KEY;
 if(!key)return res.status(503).json({stage:'key'});
 try{
 const t=await fetch('https://personal.connectapi.garmin.com/personalapitoken-service/personal-api/personal-api-key/token',{method:'POST',headers:{Authorization:'ApiKey '+key},signal:AbortSignal.timeout(12000)});
 if(!t.ok)return res.status(502).json({stage:'auth',status:t.status});
 const token=(await t.text()).trim();
 const a=await fetch('https://personal.connectapi.garmin.com/download-service/files/activity/24929713327',{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(18000)});
 if(!a.ok)return res.status(502).json({stage:'download',status:a.status});
 const bytes=Buffer.from(await a.arrayBuffer());
 const rows=decodeFit(extractFitFromZip(bytes));
 const s=timeSeries(rows,{windowSeconds:60,threshold:148});
 return res.status(200).json({stage:'decoded',bytes:bytes.length,samples:rows.length,minutes:s.samples.length,blocks:s.blocks.length,firstMinute:s.samples[0]?.minute,lastMinute:s.samples.at(-1)?.minute,blocks:s.blocks,preview:s.samples.slice(0,3)});
 }catch(e){return res.status(502).json({stage:'parse',errorName:e?.name||'unknown'});}
}