// Servidor exclusivamente QA. No usa credenciales ni configura conexiones.
const REF = 'hifnimutdifkuchxdkrj';
const ROLES = Object.freeze({worker:'ironman_qa_worker',approver:'ironman_qa_approver',reader:'ironman_qa_reader'});
export function validarDestinoQA(config) {
  if(config?.proyectoId !== 'ironman-qa' || config.supabaseRef !== REF || config.entorno !== 'qa' || config.infraestructura !== 'independiente')
    throw new Error('Destino QA IRONMAN no autorizado');
}
export async function verificarPermisosQA({config,bd,funcion}) {
  validarDestinoQA(config);
  const rol = ROLES[funcion];
  if(!rol || typeof bd?.query !== 'function' || bd.supabaseRef !== REF || bd.proyectoId !== config.proyectoId)
    throw new Error('Conexión QA incompatible');
  const sql = `SELECT current_user AS rol, session_user AS sesion,
    r.rolsuper OR r.rolbypassrls OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication AS privilegiado,
    pg_has_role(current_user, $1::name, 'USAGE') AS autorizado,
    pg_has_role(current_user, 'ironman_qa_worker', 'USAGE') AS worker,
    pg_has_role(current_user, 'ironman_qa_approver', 'USAGE') AS approver,
    has_schema_privilege(current_user,'ironman_agents','CREATE') AS crear,
    EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='ironman_agents' AND c.relkind='r' AND
       (NOT c.relrowsecurity OR pg_has_role(current_user,c.relowner,'USAGE')
        OR has_table_privilege(current_user,c.oid,'DELETE')
        OR has_table_privilege(current_user,c.oid,'TRUNCATE'))) AS inseguro
    FROM pg_roles r WHERE r.rolname=current_user`;
  const rows=(await bd.query(sql,[rol]))?.rows;
  const v=rows?.[0];
  if(rows?.length!==1 || !v || v.rol!==rol+'_login' || v.sesion!==v.rol ||
     v.privilegiado!==false || v.autorizado!==true || v.crear!==false || v.inseguro!==false ||
     v.worker!==(funcion==='worker') || v.approver!==(funcion==='approver'))
    throw new Error('Permisos efectivos QA no autorizados');
  return true;
}
// El proveedor físico debe verificar el hostname/TLS antes de abrir la conexión.
// Esta capa bloquea un destino incorrecto antes de llamar al proveedor.
export function protegerConexionQA({conectar,funcion}) {
  if(typeof conectar!=='function' || !Object.hasOwn(ROLES,funcion)) throw new TypeError('Proveedor QA inválido');
  return async config=>{
    validarDestinoQA(config);
    let bd;
    try{
      bd=await conectar(config);
      await verificarPermisosQA({config,bd,funcion});
      return bd;
    }catch{
      if(typeof bd?.cerrar==='function') await bd.cerrar();
      throw new Error('Conexión QA rechazada');
    }
  };
}
