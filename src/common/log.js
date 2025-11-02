import { sql } from './dependencies.js';
import { getPool } from './db.js';
import { logger } from '../logging/logger.js';

export async function insertLog(contacto, ctc, codigo, error, codCnp = 'NMOR') {
  const pool = await getPool();
  try {
    const req = pool.request();
    req.input('COD_IDT_SAP', sql.VarChar, contacto.COD_IDT_SAP);
    req.input('COD_IDT_CTC', sql.VarChar, ctc);
    req.input('FLG_EML_ENV', sql.Int, codigo);
    req.input('COD_CNP', sql.VarChar, codCnp);
    req.input('GLS_ERR', sql.VarChar, String(error ?? ''));
    await req.execute('SP_SGR_INS_TRZ_ALT');
  } catch (err) {
    logger.error('Error insertando log:', err);
  }
}
