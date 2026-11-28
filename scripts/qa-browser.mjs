import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
const assets=new Set(['index.html','agent-qa-ui.js','analitica.js','nutricion.js','performance.css','performance.js','premium.css','premium.js','strava.js','temporada2027.css','temporada2027.js','victoria630.css','victoria630.js']);
const stats={pendiente:0,en_progreso:0,validacion:1,completada:0,bloqueada:0};
const testToken='synthetic-browser-only';
let authorized=0;
const server=createServer(async(req,res)=>{
 const p=new URL(req.url,'http://localhost').pathname;
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'");
 if(p==='/api/agent-qa'){
  res.setHeader('Content-Type','application/json');
  if(req.headers.authorization!=='Bearer '+testToken){res.statusCode=401;return res.end(JSON.stringify({error:'no_autorizado'}));}
  authorized++;
  return res.end(JSON.stringify({disponible:true,corte:'2026-11-27T18:00:00Z',agentes:Object.fromEntries(['rendimiento','ingenieria'].map(a=>[a,{estados:stats,leasesVencidos:0,ultimaActividad:'2026-11-27T17:59:00Z',actividad:'reporte_reciente'}]))}));
 }
 if(p.startsWith('/api/')){res.statusCode=503;return res.end('{}');}
 const name=p==='/'?'index.html':p.slice(1);
 if(!assets.has(name)){res.statusCode=404;return res.end('Not found');}
 try{res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(await readFile(new URL('../'+name,import.meta.url)));}catch{res.statusCode=404;res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const profile=await mkdtemp(join(tmpdir(),'ironman-browser-'));
const chrome=spawn('google-chrome',['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--disable-background-networking','--disable-component-update','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ws,seq=0;const pending=new Map();
try{
 let port;
 for(let n=0;n<100;n++){try{port=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break;}catch{await sleep(100);}}
 if(!port)throw Error('Chrome no disponible');
 const tabs=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
 ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const v=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(v.exceptionDetails)throw Error('Browser evaluation failed');return v.result.value;};
 await send('Page.enable');await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'});
 for(let i=0;i<100;i++){if(await evaluate("document.readyState==='complete'&&typeof go==='function'"))break;await sleep(100);}
 await evaluate("go('agentes')");
 assert.equal(await evaluate("document.querySelector('#v-agentes').classList.contains('active')"),true);
 const button="[data-qa-action=status]",input="#agentAccessToken",message="#agentQaMessage";
 const click=async value=>evaluate("document.querySelector("+JSON.stringify(input)+").value="+JSON.stringify(value)+";document.querySelector("+JSON.stringify(button)+").click();true");
 const waitText=async text=>{for(let i=0;i<100;i++){if((await evaluate("document.querySelector("+JSON.stringify(message)+").textContent")).includes(text))return;await sleep(50);}throw Error('Estado esperado no encontrado: '+text);};
 assert.equal(await evaluate("document.querySelector('[data-agent=rendimiento][data-field=validacion]').textContent"),'—');
 await click('invalid');await waitText('Token no autorizado');
 assert.equal(await evaluate("document.querySelector('[data-agent=rendimiento][data-field=validacion]').textContent"),'—');
 await click(testToken);await waitText('Estado consultado en PostgreSQL.');
 assert.equal(await evaluate("document.querySelector('[data-agent=rendimiento][data-field=validacion]').textContent"),'1');
 assert.equal(await evaluate("document.querySelector('#agentAccessToken').value"),'');
 assert.equal(await evaluate("JSON.stringify(localStorage).includes('synthetic-browser-only')||JSON.stringify(sessionStorage).includes('synthetic-browser-only')"),false);
 assert.equal(authorized,1);
 for(const width of [390,1280]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
  const layout=await evaluate("JSON.stringify({viewport:innerWidth,panel:document.querySelector('#v-agentes').getBoundingClientRect().width,buttons:[...document.querySelectorAll('#v-agentes .agent-controls button')].filter(b=>b.offsetWidth).map(b=>({left:b.getBoundingClientRect().left,right:b.getBoundingClientRect().right,height:b.getBoundingClientRect().height}))})");
  const d=JSON.parse(layout);assert.ok(d.panel<=width+2);assert.ok(d.buttons.length>=3);assert.ok(d.buttons.every(b=>b.left>=-2&&b.right<=width+2&&b.height>=38));
  const shot=await send('Page.captureScreenshot',{format:'png'});assert.ok(shot.data.length>5000);
  console.log('PASS browser layout '+width+'px; screenshot rendered, controls within viewport');
 }
 console.log('PASS browser: navigation, unauthorized response, real-state rendering with synthetic fixture, token cleared and not stored');
}finally{ws?.close();chrome.kill();server.close();await sleep(300);await rm(profile,{recursive:true,force:true}).catch(()=>{});}
