import { getPool, closePool } from '../db/pool.js';

async function main() {
  const pool = await getPool();

  // Ejecutamos el SP que lista campañas
  const rs = await pool.request().execute('SP_SGR_CNA_ALT_CTB_AMZ');

  console.log('👉 Recordset (campañas):');
  console.table(rs.recordset);

  // Validamos si NMOR está presente
  const activa = rs.recordset.some(r => String(r.COD_CNP).trim() === 'NMOR');
  console.log('\nNMOR activa?', activa);

  await closePool();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
