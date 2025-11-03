// src/modules/neto/neto.service.js
import { getDb } from '../../db/factory.js';
import {
  getTemplate,
  getCampanias,
  getClientes,
  getContactos,
  getRegistros,
  insertLog
} from './neto.repository.mssql.js';
import { logger } from '../../logging/logger.js';
import { send as sendMail, buildRecipients } from '../../common/mailer.js';

import moment from 'moment';
import 'moment/locale/es.js';
import s from 'underscore.string';
import formatNumber from 'simple-format-number';
import * as html from '../../common/html.js';
import { replaceTokenAll } from '../../common/tokens.js';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.join(__dirname, '../../assets/logo-suragra.png');

// helper para normalizar montos de BD
const asNum = (v) => {
  if (v == null) return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  const s = String(v).trim();
  if (!s) return 0;
  // normaliza: elimina separadores de miles y usa punto decimal
  const norm = s.replace(/\./g, '').replace(',', '.');
  const n = Number(norm);
  return isFinite(n) ? n : 0;
};

export async function runNeto() {
  const pool = await getDb();
  if (!pool || typeof pool.request !== 'function') {
    throw new TypeError('DB pool inválido: no expone request()');
  }

  const { template, subject } = await getTemplate(pool);
  logger.info({ subject }, 'Template cargado');

  // Verifica si hay campaña NMOR
  let hayNMOR = false;
  for await (const camp of getCampanias(pool)) {
    if (String(camp.COD_CNP).trim() === 'NMOR') {
      hayNMOR = true;
      break;
    }
  }
  if (!hayNMOR) {
    logger.warn('No hay campaña NMOR — job finaliza sin acciones.');
    return;
  }

  moment.locale('es');

  for await (const cli of getClientes(pool)) {
    try {
      const codIdtSap = cli.COD_IDT_SAP;
      const nomCliente = s.trim(cli.NOM_CLT_SAP ?? '');

      // contactos
      const { contactos, count } = await getContactos(pool, codIdtSap);
      if (!count) {
        await insertLog(pool, {
          codIdtSap,
          codCtc: 0,
          codigo: 3,
          error: 'NO EXISTEN CONTACTOS PARA NOTIFICAR'
        });
        continue;
      }

      // registros / tablas
      const sets = await getRegistros(pool, codIdtSap);

      const usd = { total: 0, rows: [] };
      const clp = { total: 0, rows: [] };

      for (const set of sets ?? []) {
        for (const r of set ?? []) {
          if (r.FLG_TPO_REG !== 'NP') continue;

          if (r.COD_MON === 'USD') {
            const monto = asNum(r.IMP_SDO_PEN_EML ?? r.IMP_TOT_PEN ?? 0);
            usd.total += monto;
            usd.rows.push(
              html.row([
                r.NUM_FOL ?? '',
                r.FEC_EMI ?? '',
                r.FEC_VEN ?? '',
                r.CAN_DIA_MOR ?? '',
                formatNumber(monto, {
                  fractionDigits: 2,
                  symbols: { decimal: ',', grouping: '.' }
                })
              ])
            );
          }

          if (r.COD_MON === 'CLP') {
            const monto = asNum(r.IMP_TOT_PEN ?? 0);
            clp.total += monto;
            clp.rows.push(
              html.row([
                r.NUM_FOL ?? '',
                r.FEC_EMI ?? '',
                r.FEC_VEN ?? '',
                r.CAN_DIA_MOR ?? '',
                formatNumber(monto, {
                  fractionDigits: 0,
                  symbols: { decimal: ',', grouping: '.' }
                })
              ])
            );
          }
        }
      }

      
      const bloqueUSD = html.table(
        'Facturación Moneda Extranjera',
        [html.header(), ...usd.rows],
        usd.rows.length
          ? `Total: USD ${formatNumber(usd.total, { fractionDigits: 2, symbols: { decimal: ',', grouping: '.' } })}`
          : 'No existen documentos con NETO pendiente asociados a facturas con moneda extranjera'
      );

      const bloqueCLP = html.table(
        'Facturación Moneda Local',
        [html.header(), ...clp.rows],
        clp.rows.length
          ? `Total: CLP ${formatNumber(clp.total, { fractionDigits: 0, symbols: { decimal: '.', grouping: '.' } })}`
          : 'No existen documentos con NETO pendiente asociados a facturas con moneda local'
      );

      // reemplazos en template
      let body = String(template ?? '');
      body = replaceTokenAll(body, '<LOGO>', `<img src="cid:logoSuragra" alt="Suragra" style="max-width:250px;">`);
      body = replaceTokenAll(body, '<<CLIENTE>>', `<b>${nomCliente}</b>`);
      body = replaceTokenAll(
        body,
        '<<MES>>',
        `<b>${moment().subtract(10, 'days').format('MMMM')} ${moment().format(
          'YYYY'
        )}</b>`
      );
      body = replaceTokenAll(body, '<FACTURAS>', `${bloqueUSD}${bloqueCLP}`);
      body = replaceTokenAll(
        body,
        '<TOTALUSD>',
        formatNumber(asNum(usd.total), {
          fractionDigits: 2,
          symbols: { decimal: ',', grouping: '.' }
        })
      );
      body = replaceTokenAll(
        body,
        '<TOTALCLP>',
        formatNumber(asNum(clp.total), {
          fractionDigits: 0,
          symbols: { decimal: ',', grouping: '.' }
        })
      );

      // envío del correo
      const emailCtc = String(contactos[0]?.GLS_EML ?? '').trim();
      const to = buildRecipients(emailCtc);
      logger.info({ to, codIdtSap }, 'Enviando NETO');
      await sendMail({ 
        subject: `${subject} SURAGRA`, 
        htmlBody: body, 
        to,
        attachments: [
          {
            filename: 'logo-suragra.png',
            path: logoPath,
            cid: 'logoSuragra'
          }
        ]
       });

      // bitácora OK
      const codCtc =
        Number(contactos[0]?.COD_CTC ?? contactos[0]?.COD_IDT_CTC ?? 0) || 0;
      await insertLog(pool, {
        codIdtSap,
        codCtc,
        codigo: 0,
        error: 'EJECUTADO EXITOSAMENTE'
      });
    } catch (err) {
      logger.error({ err, cliente: cli }, 'Error procesando cliente');
      await insertLog(pool, {
        codIdtSap: cli?.COD_IDT_SAP ?? '',
        codCtc: 0,
        codigo: 1,
        error: err?.message ?? String(err)
      });
    }
  }
}
