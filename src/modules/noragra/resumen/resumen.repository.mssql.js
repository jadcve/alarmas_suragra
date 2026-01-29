// src/modules/noragra/resumen/resumen.repository.mssql.js
import sql from 'mssql';
import { logger } from '../../../logging/logger.js';

// SPs de Noragra con prefijo _NOR
const PROC_CAMPANIAS = 'SP_SGR_CNA_ALT_CTB_AMZ_NOR';
const PROC_CLIENTES  = 'SP_SGR_CNA_CLT_ALT_AMZ_NOR';
const PROC_CONTACTOS = 'SP_SGR_CNA_CTC_CLT_SAP_NOR';
const PROC_DETALLE   = 'SP_SGR_CNA_STC_CMR_RSM_FAC_NOR';
const COD_CNP        = 'RFAC';

// Campañas: reusa el SP transversal y filtra RFAC en el service
export async function* getCampanias(pool) {
  try {
    const req = pool.request();
    req.stream = true;
    req.execute(PROC_CAMPANIAS);

    const bag = [];
    await new Promise((resolve, reject) => {
      req.on('row', row => bag.push(row));
      req.on('error', reject);
      req.on('done', resolve);
    });

    for (const r of bag) yield r;
  } catch (err) {
    logger.error({ err }, 'RFAC NORAGRA:getCampanias');
    throw err;
  }
}

// Toma template/asunto de la tabla y selecciona RFAC;
// si no existiera, usa un fallback seguro.
export async function getTemplate(pool) {
  const rs = await pool.request().query('SELECT * FROM TA_SGRA_ALRTA_FLUJO_CNTBL');
  const filaRFAC = rs.recordset?.find(x => String(x.COD_CNP).trim() === COD_CNP);
  const row = filaRFAC ?? rs.recordset?.[0] ?? {};
  return {
    template: row.GLS_DET_ALT ?? '',
    subject: row.GLS_ALT ?? 'Resumen de Facturación'
  };
}

// Clientes para RFAC (mismo universo que NETO/IVA)
export async function* getClientes(pool) {
  const req = pool.request();
  req.stream = true;
  req.execute(PROC_CLIENTES);

  const bag = [];
  await new Promise((resolve, reject) => {
    req.on('row', row => bag.push(row));
    req.on('error', reject);
    req.on('done', resolve);
  });

  for (const r of bag) yield r;
}

// Contactos de cliente
export async function getContactos(pool, codIdtSap) {
  const rs = await pool.request()
    .input('COD_IDT_SAP', sql.VarChar, codIdtSap)
    .output('CAN_CTC', sql.Int)
    .execute(PROC_CONTACTOS);

  const contactos = (rs.recordset ?? []).map(x => ({
    ...x,
    COD_CTC: x.COD_CTC ?? x.COD_IDT_CTC ?? 0,
  }));
  const count = rs.output?.CAN_CTC ?? contactos.length;
  return { contactos, count };
}

// Recordsets para Resumen de Facturación
export async function getRegistros(pool, codIdtSap) {
  const rs = await pool.request()
    .input('COD_IDT_SAP', sql.VarChar, codIdtSap)
    .execute(PROC_DETALLE);

  return rs.recordsets ?? [];
}

// Trazas
export async function insertLog(pool, { codIdtSap, codCtc, codigo, error }) {
  try {
    const ctc = (codCtc === null || codCtc === undefined || codCtc === '' ? 0 : Number(codCtc));
    await pool.request()
      .input('COD_IDT_SAP', sql.VarChar, String(codIdtSap ?? ''))
      .input('COD_IDT_CTC', sql.Int, Number.isFinite(ctc) ? ctc : 0)
      .input('FLG_EML_ENV', sql.Int, Number(codigo ?? 0))
      .input('COD_CNP', sql.VarChar, COD_CNP)
      .input('GLS_ERR', sql.VarChar, String(error ?? ''))
      .execute('SP_SGR_INS_TRZ_ALT_NOR');
  } catch (e) {
    logger.warn({ e, codIdtSap, codCtc }, 'RFAC NORAGRA:insertLog warn');
  }
}
