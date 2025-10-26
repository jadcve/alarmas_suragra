import sql from 'mssql';
export function createMssqlPool({ host, db, user, pass }) {
  const pool = new sql.ConnectionPool({ server:host, database:db, user, password:pass,
    options:{ encrypt:true, trustServerCertificate:true }});
  let up=false;
  return {
    async query(q){ if(!up){ await pool.connect(); up=true; } return (await pool.request().query(q)).recordset; },
    close: async()=>{ try{ await pool.close(); }catch{} }
  };
}
