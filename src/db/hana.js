import hana from '@sap/hana-client';
export function createHanaConnection({ host, port, user, pass, ssl }) {
  const conn = hana.createConnection(); let up=false;
  async function connect(){ if(up) return; await new Promise((res,rej)=>conn.connect(
    { serverNode:`${host}:${port}`, uid:user, pwd:pass, sslValidateCertificate:ssl }, e=>e?rej(e):res()
  )); up=true; }
  return {
    async query(sql, params=[]){ await connect(); return await new Promise((res,rej)=>
      conn.exec(sql, params, (e,rows)=>e?rej(e):res(rows??[]))); },
    async call(proc, params=[]){ const ph=params.map(()=>'?').join(','); return this.query(`CALL ${proc}(${ph})`, params); },
    close(){ try{ conn.disconnect(); }catch{} }
  };
}
