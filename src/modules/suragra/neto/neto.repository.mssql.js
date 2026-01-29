// src/modules/suragra/neto/neto.repository.mssql.js
import sql from 'mssql';
import { logger } from '../../../logging/logger.js';

// Campañas (stream → yield)
export async function* getCampanias(pool) {
  try {
    const req = pool.request();
    req.stream = true;
    req.execute('SP_SGR_CNA_ALT_CTB_AMZ');

    const bag = [];
    const iter = new Promise((resolve, reject) => {
      req.on('row', row => bag.push(row));
      req.on('error', reject);
      req.on('done', resolve);
    });

    await iter;
    for (const row of bag) yield row;

  } catch (err) {
    logger.error({ err }, 'Error en getCampanias');
    throw err;
  }
}

// Template + asunto (elige NMOR si existe; si no, usa un fallback seguro)
export async function getTemplate(pool) {
  const r = await pool.request().query('SELECT * FROM TA_SGRA_ALRTA_FLUJO_CNTBL');
  const filaNMOR = r.recordset?.find(x => String(x.COD_CNP).trim() === 'NMOR');
  const row = filaNMOR ?? r.recordset?.[1] ?? r.recordset?.[0] ?? {};
  return { template: row.GLS_DET_ALT ?? '', subject: row.GLS_ALT ?? 'Aviso' };
}

// Clientes con NETO pendiente (stream)
export async function* getClientes(pool) {
  const req = pool.request();
  req.stream = true;
  req.execute('SP_SGR_CNA_CLT_ALT_AMZ_NETP');

  const bag = [];
  const iter = new Promise((resolve, reject) => {
    req.on('row', row => bag.push(row));
    req.on('error', reject);
    req.on('done', resolve);
  });
  await iter;
  for (const row of bag) yield row;
}

// Contactos por cliente
// src/modules/neto/neto.repository.mssql.js
export async function getContactos(pool, codIdtSap) {
  const rs = await pool.request()
    .input('COD_IDT_SAP', sql.VarChar, codIdtSap)
    .output('CAN_CTC', sql.Int)
    .execute('SP_SGR_CNA_CTC_CLT_SAP');

  const contactos = (rs.recordset ?? []).map(x => ({
    ...x,
    COD_CTC: x.COD_CTC ?? x.COD_IDT_CTC ?? 0, // 👈 siempre trae COD_CTC
  }));
  const count = rs.output?.CAN_CTC ?? contactos.length;
  return { contactos, count };
}


// Detalle de documentos (recordsets)
export async function getRegistros(pool, codIdtSap) {
  const rs = await pool.request()
    .input('COD_IDT_SAP', sql.VarChar, codIdtSap)
    .execute('SP_SGR_CNA_STC_CMR_NTO_PND');
  return rs.recordsets ?? [];
}

// src/modules/neto/neto.repository.mssql.js
export async function insertLog(pool, { codIdtSap, codCtc, codigo, error }) {
  try {
    const ctc = (codCtc === null || codCtc === undefined || codCtc === '' ? 0 : Number(codCtc));
    await pool.request()
      .input('COD_IDT_SAP', sql.VarChar, String(codIdtSap ?? ''))
      .input('COD_IDT_CTC', sql.Int, isNaN(ctc) ? 0 : ctc)       // 👈 INT y con fallback 0
      .input('FLG_EML_ENV', sql.Int, Number(codigo ?? 0))
      .input('COD_CNP', sql.VarChar, 'NMOR')
      .input('GLS_ERR', sql.VarChar, String(error ?? ''))
      .execute('SP_SGR_INS_TRZ_ALT');
  } catch (e) {
    logger.warn({ e, codIdtSap, codCtc }, 'Fallo insertLog');
  }
}




