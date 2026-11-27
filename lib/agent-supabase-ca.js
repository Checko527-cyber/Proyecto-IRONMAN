import {X509Certificate} from 'node:crypto';
// URL de descarga usada por el dashboard oficial de Supabase (custom-content.json).
// La huella se verificará contra la raíz publicada; no se confía en certificados del socket.
export const SUPABASE_CA_URL='https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt';
export const SUPABASE_CA_SHA256='807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa';
export function validarRaizSupabaseQA(pem){
 try{
  if(typeof pem!=='string'||pem.length>16384||!/^-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----\s*$/.test(pem.trim())) throw Error();
  const cert=new X509Certificate(pem);
  if(!cert.ca||cert.fingerprint256.replaceAll(':','').toLowerCase()!==SUPABASE_CA_SHA256||cert.subject!==cert.issuer||!cert.verify(cert.publicKey)) throw Error();
  return cert.toString();
 }catch{throw Object.assign(new Error('Raíz Supabase no verificada'),{code:'QA_CA_INVALIDA'});}
}
let cache;
export function cargarRaizSupabaseQA(){
 if(!cache)cache=(async()=>{
  const r=await fetch(SUPABASE_CA_URL,{method:'GET',redirect:'error',signal:AbortSignal.timeout(7000)});
  if(!r.ok)throw Object.assign(new Error('Raíz Supabase no disponible'),{code:'QA_CA_DESCARGA'});
  return validarRaizSupabaseQA(await r.text());
 })().catch(e=>{cache=null;throw e;});
 return cache;
}
