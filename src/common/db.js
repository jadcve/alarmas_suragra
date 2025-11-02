import sql from 'mssql';
import { cfg } from '../config/index.js';
import { logger } from '../logging/logger.js';
import { getPool } from '../../common/db.js';
const db = await getPool();

let pool;
export async function getPool() {
  if (!pool) {
    try {
      pool = await sql.connect({
        user: cfg.mssql.user,
        password: cfg.mssql.pass,
        server: cfg.mssql.host,
        database: cfg.mssql.db,
        options: cfg.mssql.options,
        pool: cfg.mssql.pool
      });
      logger.info('✅ MSSQL pool conectado correctamente');
    } catch (err) {
      logger.error('❌ Error al conectar MSSQL', err);
      throw err;
    }
  }
  return pool;
}
