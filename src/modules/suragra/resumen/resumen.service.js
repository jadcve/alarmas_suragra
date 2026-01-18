// src/modules/suragra/resumen/resumen.service.js
import moment from 'moment';
import 'moment/locale/es.js';

import { getDb } from '../../../db/factory.js';
import { logger } from '../../../logging/logger.js';
import { buildRecipients, send as sendMail } from '../../../common/mailer.js';
import { table, row, headerRFAC, fmtUSD, fmtCLP, injectPlaceholders } from '../../../common/html.js';

import {
  getTemplate,
  getCampanias,
  getClientes,
  getContactos,
  getRegistros,
  insertLog
} from './resumen.repository.mssql.js';

// Fila común para RFAC (Documento, Fecha Emisión, IVA, NETO)
function filaRFAC(r, isUSD) {
  // En el legado, en USD mostraban IVA en CLP (0 decimales) y NETO en USD (2 decimales).
  // En CLP, ambos CLP (0 decimales).
  const iva = isUSD ? `CLP ${fmtCLP(r.IMP_IVA_DOC)}` : `CLP ${fmtCLP(r.IMP_IVA_DOC)}`;
  const neto = isUSD ? `USD ${fmtUSD(r.IMP_TOT_NTO)}` : `CLP ${fmtCLP(r.IMP_TOT_NTO)}`;
  return row([r.NUM_FOL, r.FEC_EMI, iva, neto]);
}

function seccionRFAC(titulo, rows, totIvaCLP, totNeto, esUSD) {
  const footer = rows.length
    ? `Totales: ${esUSD ? `CLP ${fmtCLP(totIvaCLP)} | USD ${fmtUSD(totNeto)}` 
                       : `CLP ${fmtCLP(totIvaCLP)} | CLP ${fmtCLP(totNeto)}`}`
    : '';

  const rowsHtml = rows.length
    ? [headerRFAC(), ...rows, row(['', '<b>Totales:</b>', esUSD ? `CLP ${fmtCLP(totIvaCLP)}` : `CLP ${fmtCLP(totIvaCLP)}`, esUSD ? `USD ${fmtUSD(totNeto)}` : `CLP ${fmtCLP(totNeto)}`])]
    : [];

  return table(
    titulo,
    rowsHtml,
    rows.length ? '' : `No existen ${titulo.toLowerCase()}`
  );
}

function buildRFACSections(recordsets) {
  const all = (recordsets ?? []).flat();

  // Grupos por tipo de doc y moneda
  const pick = (tipo, mon) => all.filter(x => x.FLG_TPO_DOC_CTB === tipo && x.COD_MON === mon);

  const grp = {
    FAC_USD: pick('FAC', 'USD'),
    FAC_CLP: pick('FAC', 'CLP'),
    NCR_USD: pick('NCR', 'USD'),
    NCR_CLP: pick('NCR', 'CLP'),
    NDB_USD: pick('NDB', 'USD'),
    NDB_CLP: pick('NDB', 'CLP'),
  };

  // Totales por grupo
  const sum = (arr, k) => arr.reduce((a, r) => a + Number(r[k] || 0), 0);

  const totals = {
    FAC_USD_IVA: sum(grp.FAC_USD, 'IMP_IVA_DOC'),
    FAC_USD_NET: sum(grp.FAC_USD, 'IMP_TOT_NTO'),
    FAC_CLP_IVA: sum(grp.FAC_CLP, 'IMP_IVA_DOC'),
    FAC_CLP_NET: sum(grp.FAC_CLP, 'IMP_TOT_NTO'),

    NCR_USD_IVA: sum(grp.NCR_USD, 'IMP_IVA_DOC'),
    NCR_USD_NET: sum(grp.NCR_USD, 'IMP_TOT_NTO'),
    NCR_CLP_IVA: sum(grp.NCR_CLP, 'IMP_IVA_DOC'),
    NCR_CLP_NET: sum(grp.NCR_CLP, 'IMP_TOT_NTO'),

    NDB_USD_IVA: sum(grp.NDB_USD, 'IMP_IVA_DOC'),
    NDB_USD_NET: sum(grp.NDB_USD, 'IMP_TOT_NTO'),
    NDB_CLP_IVA: sum(grp.NDB_CLP, 'IMP_IVA_DOC'),
    NDB_CLP_NET: sum(grp.NDB_CLP, 'IMP_TOT_NTO'),
  };

  // Tablas
  const html = [];

  html.push(
    seccionRFAC(
      'Facturas Moneda Extranjera',
      grp.FAC_USD.map(r => filaRFAC(r, true)),
      totals.FAC_USD_IVA,
      totals.FAC_USD_NET,
      true
    )
  );

  html.push(
    seccionRFAC(
      'Facturación Moneda Local',
      grp.FAC_CLP.map(r => filaRFAC(r, false)),
      totals.FAC_CLP_IVA,
      totals.FAC_CLP_NET,
      false
    )
  );

  html.push(
    seccionRFAC(
      'Notas de Crédito Moneda Extranjera',
      grp.NCR_USD.map(r => filaRFAC(r, true)),
      totals.NCR_USD_IVA,
      totals.NCR_USD_NET,
      true
    )
  );

  html.push(
    seccionRFAC(
      'Notas de Crédito Moneda Local',
      grp.NCR_CLP.map(r => filaRFAC(r, false)),
      totals.NCR_CLP_IVA,
      totals.NCR_CLP_NET,
      false
    )
  );

  html.push(
    seccionRFAC(
      'Notas de Débito Moneda Extranjera',
      grp.NDB_USD.map(r => filaRFAC(r, true)),
      totals.NDB_USD_IVA,
      totals.NDB_USD_NET,
      true
    )
  );

  html.push(
    seccionRFAC(
      'Notas de Débito Moneda Local',
      grp.NDB_CLP.map(r => filaRFAC(r, false)),
      totals.NDB_CLP_IVA,
      totals.NDB_CLP_NET,
      false
    )
  );

  // Totales globales (replican los del legado)
  const totalIVAfinal =
    totals.FAC_USD_IVA + totals.FAC_CLP_IVA +
    totals.NCR_USD_IVA + totals.NCR_CLP_IVA +
    totals.NDB_USD_IVA + totals.NDB_CLP_IVA;

  const totalNetoUSD =
    totals.FAC_USD_NET + totals.NCR_USD_NET + totals.NDB_USD_NET;

  const totalNetoCLP =
    totals.FAC_CLP_NET + totals.NCR_CLP_NET + totals.NDB_CLP_NET;

  return {
    htmlSecciones: html.join(''),
    totalIVAfinal,
    totalNetoUSD,
    totalNetoCLP
  };
}

export async function runRFAC() {
  const pool = await getDb();
  if (!pool?.request) throw new TypeError('DB pool inválido');

  const { template, subject } = await getTemplate(pool);
  logger.info({ subject }, 'Template RFAC cargado');

  // Verifica que la campaña RFAC esté activa
  let hayRFAC = false;
  for await (const c of getCampanias(pool)) {
    if (String(c.COD_CNP).trim() === 'RFAC') { hayRFAC = true; break; }
  }
  if (!hayRFAC) { logger.warn('No hay campaña RFAC — módulo Resumen finaliza.'); return; }

  for await (const cli of getClientes(pool)) {
    const codIdtSap = cli.COD_IDT_SAP;
    try {
      const { contactos, count } = await getContactos(pool, codIdtSap);
      if (!count) {
        await insertLog(pool, { codIdtSap, codCtc: 0, codigo: 3, error: 'NO EXISTEN CONTACTOS PARA NOTIFICAR' });
        continue;
      }

      const recordsets = await getRegistros(pool, codIdtSap);
      const { htmlSecciones, totalIVAfinal, totalNetoUSD, totalNetoCLP } = buildRFACSections(recordsets);

      const mesTexto = `${moment().subtract(10, 'days').locale('es').format('MMMM')} ${moment().locale('es').format('YYYY')}`;

      const finalHtml = injectPlaceholders(template, {
        CLIENTE: `<b>${String(cli.NOM_CLT_SAP ?? '').trim()}</b>`,
        MES: `<b>${mesTexto}</b>`,
        TOTALIVA: fmtCLP(totalIVAfinal),
        TOTALNETO: fmtUSD(totalNetoUSD),       // USD total
        TOTALNETOCLP: fmtCLP(totalNetoCLP),    // CLP total
        FACTURAS: htmlSecciones
      });

      const emailCtc = String(contactos[0]?.GLS_EML ?? '').trim();
      if (!emailCtc || emailCtc.toUpperCase() === 'NO DEFINIDO') {
        await insertLog(pool, { codIdtSap, codCtc: contactos[0]?.COD_CTC ?? 0, codigo: 2, error: 'EMAIL NO DEFINIDO' });
        continue;
      }

      const to = buildRecipients(emailCtc);
      logger.info({ to, codIdtSap }, 'Enviando RFAC');
      await sendMail({ subject: `${subject} SURAGRA`, htmlBody: finalHtml, to });

      await insertLog(pool, { codIdtSap, codCtc: contactos[0]?.COD_CTC ?? 0, codigo: 0, error: 'EJECUTADO EXITOSAMENTE' });
    } catch (err) {
      logger.error({ err, cliente: cli }, 'Error procesando cliente RFAC');
      await insertLog(pool, { codIdtSap, codCtc: 0, codigo: 1, error: err?.message ?? String(err) });
    }
  }
}
