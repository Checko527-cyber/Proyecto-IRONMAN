import {test} from 'node:test';
import assert from 'node:assert/strict';
import {crearProveedorIngenieria} from '../lib/agent-engineering-provider.js';
const proyectoId='ironman-qa',t={id:'t1',proyectoId},commit='a'.repeat(40);
const evidencia={repo:'Checko527-cyber/Proyecto-IRONMAN',branch:'qa/ironman-multiagente-fase0',proyectoId,tareaId:'t1',commit,ciCommit:commit,ciConclusion:'success',revisionTecnica:true};
const crear=e=>crearProveedorIngenieria({proyectoId,leerEvidencia:async()=>e});
test('solo devuelve revisión con evidencia correspondiente',async()=>{
 assert.deepEqual(await crear(evidencia).mejoraTecnica(t),{estado:'verificado',devolverRevision:true});
 for(const e of [null,{...evidencia,repo:'otro'},{...evidencia,branch:'main'},{...evidencia,tareaId:'otra'},{...evidencia,ciCommit:'b'.repeat(40)},{...evidencia,ciConclusion:'failure'}]) assert.deepEqual(await crear(e).mejoraTecnica(t),{estado:'insuficiente'});
});
test('rechaza proyecto ajeno antes de leer evidencia',async()=>{
 let n=0;const p=crearProveedorIngenieria({proyectoId,leerEvidencia:async()=>{n++;}});
 await assert.rejects(p.validacionTecnica({...t,proyectoId:'otro'}));assert.equal(n,0);
});
