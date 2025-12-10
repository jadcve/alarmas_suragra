// scripts/test-db.js
import 'dotenv/config';
import sql from 'mssql';
import { cfg } from '../src/config/index.js';

console.log('MSSQL CONFIG =>', cfg.mssql);

try {
  // Usa el objeto cfg.mssql TAL CUAL está definido en config/index.js
  const pool = await sql.connect(cfg.mssql);

  const r1 = await pool.request().query(
    'SELECT DB_NAME() AS db, COUNT(*) AS rowsTemplates FROM TA_SGRA_ALRTA_FLUJO_CNTBL'
  );
  console.log('r1:', r1.recordset);

  const r2 = await pool.request().execute('SP_SGR_CNA_ALT_CTB_AMZ');
  console.log('SP_SGR_CNA_ALT_CTB_AMZ ok, filas:', r2.recordset?.length);

  await pool.close();
  process.exit(0);
} catch (err) {
  console.error('ERROR CONEXIÓN:', err);
  process.exit(1);
}
