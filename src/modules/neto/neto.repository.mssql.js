// src/modules/neto/neto.repository.mssql.js
import sql from 'mssql';
import { logger } from '../../logging/logger.js';

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
export async function getContactos(pool, codIdtSap) {
  const req = pool.request();
  req.input('COD_IDT_SAP', sql.VarChar, codIdtSap);
  req.output('CAN_CTC', sql.Int);
  const rs = await req.execute('SP_SGR_CNA_CTC_CLT_SAP');
  return {
    contactos: rs.recordset ?? [],
    count: req.parameters.CAN_CTC.value ?? rs.recordset?.length ?? 0
  };
}

// Detalle de documentos (recordsets)
export async function getRegistros(pool, codIdtSap) {
  const rs = await pool.request()
    .input('COD_IDT_SAP', sql.VarChar, codIdtSap)
    .execute('SP_SGR_CNA_STC_CMR_NTO_PND');
  return rs.recordsets ?? [];
}

// Bitácora de envío
export async function insertLog(pool, { codIdtSap, codCtc, codigo, error }) {
  try {
    await pool.request()
      .input('COD_IDT_SAP', sql.VarChar, codIdtSap)
      .input('COD_IDT_CTC', sql.VarChar, codCtc)
      .input('FLG_EML_ENV', sql.Int, codigo)
      .input('COD_CNP', sql.VarChar, 'NMOR')
      .input('GLS_ERR', sql.VarChar, String(error ?? ''))
      .execute('SP_SGR_INS_TRZ_ALT');
  } catch (e) {
    // no romper el job por fallar la bitácora
    logger.warn({ e, codIdtSap, codCtc }, 'Fallo insertLog');
  }
}
