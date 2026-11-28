import {mkdir,copyFile} from 'node:fs/promises';
// Solo recursos estáticos existentes; excluir scripts internos, SQL, documentación y servidor.
const files=['index.html','agent-qa-ui.js','analitica.js','nutricion.js','performance.css','performance.js','premium.css','premium.js','strava.js','temporada2027.css','temporada2027.js','victoria630.css','victoria630.js'];
await mkdir('public',{recursive:true});
for(const f of files)await copyFile(f,'public/'+f);
console.log('[IRONMAN-QA] static assets ready');
