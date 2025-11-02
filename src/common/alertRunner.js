import { getPool } from './db.js';
import { send, buildRecipients } from './mailer.js';
import { insertLog } from './log.js';
import { s, moment, formatNumber } from './dependencies.js';
import { cfg } from '../config/index.js';
import { logger } from '../logging/logger.js';

export async function runAlert({ templateIndex, codCnp, spClientes, spDetalle, subjectSuffix }) {
  const pool = await getPool();

  try {
    const result = await pool.request().query('SELECT * FROM TA_SGRA_ALRTA_FLUJO_CNTBL');
    const template = result.recordset[templateIndex].GLS_DET_ALT;
    const asunto = `${result.recordset[templateIndex].GLS_ALT} ${subjectSuffix ?? ''}`;

    const spCampanias = await pool.request().execute('SP_SGR_CNA_ALT_CTB_AMZ');
    const nmor = spCampanias.recordset.find(r => r.COD_CNP === codCnp);
    if (!nmor) return logger.info(`No hay campaña activa ${codCnp}`);

    const clientesRs = await pool.request().execute(spClientes);
    for (const contacto of clientesRs.recordset) {
      await procesarContactos(pool, contacto, spDetalle, template, asunto, codCnp);
    }
  } catch (err) {
    logger.error({ err }, `Error general en ${codCnp}`);
  }
}

async function procesarContactos(pool, contacto, spDetalle, template, asunto, codCnp) {
  try {
    const req = pool.request();
    req.input('COD_IDT_SAP', contacto.COD_IDT_SAP);
    const contactosRs = await req.execute('SP_SGR_CNA_CTC_CLT_SAP');
    const contactos = contactosRs.recordset || [];

    if (!contactos.length) {
      await insertLog(contacto, 0, 3, 'NO EXISTEN CONTACTOS PARA NOTIFICAR', codCnp);
      return;
    }

    for (const ctc of contactos) {
      if (ctc.GLS_EML === 'NO DEFINIDO') {
        await insertLog(contacto, ctc.COD_CTC, 2, 'EMAIL NO DEFINIDO', codCnp);
        continue;
      }

      const detalles = await pool.request()
        .input('COD_IDT_SAP', contacto.COD_IDT_SAP)
        .execute(spDetalle);

      const html = construirEmailHTML(contacto, template, detalles.recordsets);
      const to = buildRecipients(ctc.GLS_EML);

      if (cfg.dryRun) {
        logger.info({ to, codCnp }, '🟡 Dry-run: correo no enviado');
        continue;
      }

      try {
        await send({ subject: asunto, htmlBody: html, to });
        await insertLog(contacto, ctc.COD_CTC, 0, 'EJECUTADO EXITOSAMENTE', codCnp);
      } catch (err) {
        await insertLog(contacto, ctc.COD_CTC, 1, err.message, codCnp);
      }
    }
  } catch (err) {
    logger.error({ err }, `Error procesando contacto ${contacto.COD_IDT_SAP}`);
  }
}

function construirEmailHTML(contacto, template, recordsets) {
  let temp = template;
  temp = temp.replace("&lt;&lt;CLIENTE&gt;&gt;", `<b>${s.trim(contacto.NOM_CLT_SAP ?? '')}</b>`);
  temp = temp.replace("&lt;&lt;MES&gt;&gt;", `<b>${moment().subtract(10, 'days').format('MMMM')} ${moment().format('YYYY')}</b>`);
  temp = temp.replace('&lt;FACTURAS&gt;', '<p>Detalle de facturas pendiente...</p>');
  temp = temp.replace('&lt;TOTALUSD&gt;', formatNumber(0));
  temp = temp.replace('&lt;TOTALCLP&gt;', formatNumber(0));
  return temp;
}
