import sql from 'mssql';
import { cfg } from '../src/config/index.js';

const pool = await sql.connect({
  user: cfg.mssql.user,
  password: cfg.mssql.pass,
  server: cfg.mssql.host,
  database: cfg.mssql.db,       // ← debe ser bd_sgra
  options: cfg.mssql.options,
  pool: cfg.mssql.pool
});

const r1 = await pool.request().query('SELECT DB_NAME() AS db, COUNT(*) AS rowsTemplates FROM TA_SGRA_ALRTA_FLUJO_CNTBL');
console.log(r1.recordset);

const r2 = await pool.request().execute('SP_SGR_CNA_ALT_CTB_AMZ');
console.log('SP_SGR_CNA_ALT_CTB_AMZ ok, filas:', r2.recordset?.length);

await pool.close();
