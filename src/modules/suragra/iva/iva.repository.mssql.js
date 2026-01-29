// src/modules/suragra/iva/iva.repository.mssql.js
import sql from 'mssql';
import { logger } from '../../../logging/logger.js';
import { streamProc } from '../../../db/stream.js';

// ⚠️ Ajusta estos nombres si tus SPs tienen otro nombre:
const PROC_CAMPANIAS = 'SP_SGR_CNA_ALT_CTB_AMZ';            // mismo de NETO (activa campañas)
const PROC_CLIENTES  = 'SP_SGR_CNA_CLT_ALT_AMZ_IVAP';       // <- EJEMPLO: clientes con IVA pendiente
const PROC_CONTACTOS = 'SP_SGR_CNA_CTC_CLT_SAP';            // contactos (compartido)
const PROC_DETALLE   = 'SP_SGR_CNA_STC_CMR_IVA_PND';        // <- EJEMPLO: detalle IVA pendiente
const COD_CNP        = 'IMOR';                               // campaña IVA (usa tu código real)

// Campañas (stream)
export async function* getCampanias(pool) {
  try {
    yield* streamProc(pool, PROC_CAMPANIAS);
  } catch (err) {
    logger.error({ err }, 'Error en IVA.getCampanias');
    throw err;
  }
}

// Template IMOR (elige IMOR si existe; fallback seguro)
export async function getTemplate(pool) {
  const r = await pool.request().query('SELECT * FROM TA_SGRA_ALRTA_FLUJO_CNTBL');
  const fila = r.recordset?.find(x => String(x.COD_CNP).trim() === COD_CNP)
            ?? r.recordset?.[0] ?? {};
  return { template: fila.GLS_DET_ALT ?? '', subject: fila.GLS_ALT ?? 'Aviso IVA' };
}

// Clientes con IVA pendiente (stream)
// Si tu SP requiere parámetros de fecha/periodo, agrégalos en `inputs`.
export async function* getClientes(pool) {
  try {
    yield* streamProc(pool, PROC_CLIENTES);
  } catch (err) {
    logger.error({ err }, 'Error en IVA.getClientes');
    throw err;
  }
}

// Contactos por cliente
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

// Detalle (recordsets)
export async function getRegistros(pool, codIdtSap) {
  const rs = await pool.request()
    .input('COD_IDT_SAP', sql.VarChar, codIdtSap)
    .execute(PROC_DETALLE);
  return rs.recordsets ?? [];
}

// Bitácora
export async function insertLog(pool, { codIdtSap, codCtc, codigo, error }) {
  try {
    const ctc = (codCtc == null || codCtc === '' ? 0 : Number(codCtc));
    await pool.request()
      .input('COD_IDT_SAP', sql.VarChar, String(codIdtSap ?? ''))
      .input('COD_IDT_CTC', sql.Int, isNaN(ctc) ? 0 : ctc)
      .input('FLG_EML_ENV', sql.Int, Number(codigo ?? 0))
      .input('COD_CNP', sql.VarChar, COD_CNP) // 'IMOR' para IVA
      .input('GLS_ERR', sql.VarChar, String(error ?? ''))
      .execute('SP_SGR_INS_TRZ_ALT');
  } catch (e) {
    logger.warn({ e, codIdtSap, codCtc }, 'IVA: Fallo insertLog');
  }
}
