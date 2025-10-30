import sql from 'mssql';
import 'dotenv/config';

let pool;

export async function getPool() {
  if (!pool) {
    pool = await sql.connect({
      server: process.env.MSSQL_HOST,
      user: process.env.MSSQL_USER,
      password: process.env.MSSQL_PASS,
      database: process.env.MSSQL_DB,
      options: { encrypt: true, trustServerCertificate: true },
    });
  }
  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.close();
    pool = null;
  }
}
