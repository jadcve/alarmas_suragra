import { getPool, closePool } from '../db/pool.js';
import { getClientesNetoList } from '../modules/suragra/neto/neto.repository.mssql.js';

async function main() {
  const pool = await getPool();

  const clientes = await getClientesNetoList(pool);
  console.log('Total clientes con NETO pendiente:', clientes.length);
  console.table(clientes.slice(0, 10)); // muestra los primeros 10

  await closePool();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
