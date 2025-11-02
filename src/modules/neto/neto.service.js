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

export async function runNeto() {
  const pool = await getDb();

  if (!pool || typeof pool.request !== 'function') {
    throw new TypeError('DB pool inválido: no expone request()');
  }

  const { template, subject } = await getTemplate(pool);
  logger.info({ subject }, 'Template cargado');

  // Si solo te interesa NMOR, evita recorrer/duplicar trabajo:
  let hayNMOR = false;
  for await (const camp of getCampanias(pool)) {
    logger.debug({ camp }, 'Campaña');
    if (String(camp.COD_CNP).trim() === 'NMOR') {
      hayNMOR = true;
      break;
    }
  }
  if (!hayNMOR) {
    logger.warn('No hay campaña NMOR — job finaliza sin acciones.');
    return;
  }

  for await (const cli of getClientes(pool)) {
    try {
      const codIdtSap = cli.COD_IDT_SAP;

      const { contactos, count } = await getContactos(pool, codIdtSap);
      if (!count) {
        await insertLog(pool, {
          codIdtSap,
          codCtc: 0,
          codigo: 3, // sin contactos
          error: 'NO EXISTEN CONTACTOS PARA NOTIFICAR'
        });
        continue;
      }

      const registros = await getRegistros(pool, codIdtSap);
      // TODO: aquí va tu armado de correo usando `template` y `registros`
      // y el envío con tu mailer (si corresponde en este job).

      await insertLog(pool, {
        codIdtSap,
        codCtc: contactos[0]?.COD_IDT_CTC ?? null,
        codigo: 0, // 0 = OK (ajusta si tu convención es otra)
        error: 'EJECUTADO EXITOSAMENTE'
      });

    } catch (err) {
      logger.error({ err, cli }, 'Error procesando cliente');
      // registra como error pero sigue con el resto
      await insertLog(pool, {
        codIdtSap: cli?.COD_IDT_SAP ?? null,
        codCtc: null,
        codigo: 1, // 1 = error
        error: err?.message ?? String(err)
      });
    }
  }
}
