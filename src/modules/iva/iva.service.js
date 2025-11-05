// src/modules/iva/iva.service.js
import moment from 'moment';
import 'moment/locale/es.js';

import { getDb } from '../../db/factory.js';
import { logger } from '../../logging/logger.js';
import { buildRecipients, send as sendMail } from '../../common/mailer.js';
import { table, row, headerIVA, fmtUSD, fmtCLP, injectPlaceholders } from '../../common/html.js';



import {
  getTemplate,
  getCampanias,
  getClientes,
  getContactos,
  getRegistros,
  insertLog,
} from './iva.repository.mssql.js';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Formatea una fecha de SQL/Texto con tolerancia.
 * Acepta Date, 'YYYY-MM-DD', 'DD/MM/YYYY', timestamps, etc.
 */
const fmtDate = (d) => {
  if (!d) return '';
  // Si ya viene como Date
  if (d instanceof Date) return moment(d).format('DD/MM/YYYY');

  // Si viene numérico (timestamp)
  if (typeof d === 'number') {
    return moment(new Date(d)).format('DD/MM/YYYY');
  }

  const s = String(d).trim();
  // ISO / 'YYYY-MM-DD'
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const m = moment(s);
    return m.isValid() ? m.format('DD/MM/YYYY') : '';
  }
  // 'DD/MM/YYYY'
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const m = moment(s, 'DD/MM/YYYY', true);
    return m.isValid() ? m.format('DD/MM/YYYY') : '';
  }
  // Último intento “a lo que caiga”
  const m = moment(s);
  return m.isValid() ? m.format('DD/MM/YYYY') : s;
};

/**
 * Reemplazo robusto de placeholders en el HTML de plantilla.
 * Soporta <<KEY>> con espacios opcionales: <<  KEY  >>.
 */
function replacePlaceholders(tpl, map) {
  let out = String(tpl ?? '');
  for (const [key, val] of Object.entries(map)) {
    const re = new RegExp(`<<\\s*${key}\\s*>>`, 'g');
    out = out.replace(re, val ?? '');
  }
  return out;
}

/**
 * Construye filas para una sección (USD o CLP)
 */
function filasIVA(regs, currency) {
  return regs.map((r) =>
    row([
      r.NUM_FOL ?? r.NUM_DOC ?? '',
      fmtDate(r.FEC_EMI ?? r.FECHA_EMI),
      currency === 'USD'
        ? `USD ${fmtUSD(r.IMP_TOT_NTO)}`
        : `CLP ${fmtCLP(r.IMP_TOT_NTO)}`,
      `CLP ${fmtCLP(r.IMP_IVA_DOC)}`,
      String(r.CAN_DIA_MOR ?? r.DIAS_MORA ?? ''),
    ])
  );
}

/**
 * Arma tablas USD/CLP y el total de IVA a mostrar en el encabezado.
 */
function buildIVASections(recordsets) {
  const all = (recordsets ?? []).flat();

  const usd = all.filter(
    (r) => String(r.FLG_TPO_REG).trim() === 'IP' && String(r.COD_MON).toUpperCase() === 'USD'
  );
  const clp = all.filter(
    (r) => String(r.FLG_TPO_REG).trim() === 'IP' && String(r.COD_MON).toUpperCase() === 'CLP'
  );

  const totUSD = usd.reduce(
    (a, r) => ({
      neto: a.neto + (Number(r.IMP_TOT_NTO) || 0),
      iva: a.iva + (Number(r.IMP_IVA_DOC) || 0),
    }),
    { neto: 0, iva: 0 }
  );

  const totCLP = clp.reduce(
    (a, r) => ({
      neto: a.neto + (Number(r.IMP_TOT_NTO) || 0),
      iva: a.iva + (Number(r.IMP_IVA_DOC) || 0),
    }),
    { neto: 0, iva: 0 }
  );

  const totalIVAFinal = (totUSD.iva || 0) + (totCLP.iva || 0);

  const tblUSD = table(
    'Facturación Moneda Extranjera',
    usd.length
      ? [
          headerIVA(),
          ...filasIVA(usd, 'USD'),
          row(['', 'Totales:', `USD ${fmtUSD(totUSD.neto)}`, `CLP ${fmtCLP(totUSD.iva)}`, '']),
        ]
      : [],
    usd.length
      ? ''
      : 'No existen documentos con IVA pendiente asociados a facturas con moneda extranjera'
  );

  const tblCLP = table(
    'Facturación Moneda Local',
    clp.length
      ? [
          headerIVA(),
          ...filasIVA(clp, 'CLP'),
          row(['', 'Totales:', `CLP ${fmtCLP(totCLP.neto)}`, `CLP ${fmtCLP(totCLP.iva)}`, '']),
        ]
      : [],
    clp.length
      ? ''
      : 'No existen documentos con IVA pendiente asociados a facturas con moneda local'
  );

  return { htmlSecciones: `${tblUSD}${tblCLP}`, totalIVAFinal };
}

// -----------------------------------------------------------------------------
// Job runner
// -----------------------------------------------------------------------------
export async function runIVA() {
  const pool = await getDb();
  if (!pool?.request) throw new TypeError('DB pool inválido');

  const { template, subject } = await getTemplate(pool);
  logger.info({ subject }, 'Template IMOR cargado');

  // Verifica campaña IMOR
  let hayIMOR = false;
  for await (const c of getCampanias(pool)) {
    if (String(c.COD_CNP).trim() === 'IMOR') {
      hayIMOR = true;
      break;
    }
  }
  if (!hayIMOR) {
    logger.warn('No hay campaña IMOR — módulo IVA termina.');
    return;
  }

  // Procesa clientes
  for await (const cli of getClientes(pool)) {
    const codIdtSap = cli.COD_IDT_SAP;
    try {
      const { contactos, count } = await getContactos(pool, codIdtSap);
      if (!count) {
        await insertLog(pool, {
          codIdtSap,
          codCtc: 0,
          codigo: 3,
          error: 'NO EXISTEN CONTACTOS PARA NOTIFICAR',
        });
        continue;
      }

      const recordsets = await getRegistros(pool, codIdtSap);
      const { htmlSecciones, totalIVAFinal } = buildIVASections(recordsets);

      const mesTexto = `${moment()
        .subtract(10, 'days')
        .locale('es')
        .format('MMMM')} ${moment().locale('es').format('YYYY')}`;

      // Reemplazo seguro y global de placeholders
      const finalHtml = injectPlaceholders(template, {
        CLIENTE: `<b>${String(cli.NOM_CLT_SAP ?? '').trim()}</b>`,
        MES: `<b>${mesTexto}</b>`,
        TOTAL: `${fmtCLP(totalIVAFinal)}`,
        FACTURAS: htmlSecciones
      });


      const emailCtc = String(contactos[0]?.GLS_EML ?? '').trim();
      if (!emailCtc || emailCtc.toUpperCase() === 'NO DEFINIDO') {
        await insertLog(pool, {
          codIdtSap,
          codCtc: contactos[0]?.COD_CTC ?? 0,
          codigo: 2,
          error: 'EMAIL NO DEFINIDO',
        });
        continue;
      }

      const to = buildRecipients(emailCtc);
      logger.info({ to, codIdtSap }, 'Enviando IMOR');
      await sendMail({ subject: `${subject} SURAGRA`, htmlBody: finalHtml, to });

      await insertLog(pool, {
        codIdtSap,
        codCtc: contactos[0]?.COD_CTC ?? 0,
        codigo: 0,
        error: 'EJECUTADO EXITOSAMENTE',
      });
    } catch (err) {
      logger.error({ err, cliente: cli }, 'Error procesando cliente IMOR');
      await insertLog(pool, {
        codIdtSap,
        codCtc: 0,
        codigo: 1,
        error: err?.message ?? String(err),
      });
    }
  }
}
