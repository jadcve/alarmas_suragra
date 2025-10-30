import { cfg } from './config/index.js';
import { logger } from './logging/logger.js';
import { getDb } from './db/factory.js';
import { sendEmail } from './adapters/ses.adapter.js';
import { lastDayPrevMonthISO } from './utils/date.js';

import { runIva } from './modules/iva/iva.service.js';
// importa cuando estén listos:
import { runNeto } from './modules/neto/neto.service.js';
import { runResumen } from './modules/resumen/resumen.service.js';

import cron from 'node-cron';

async function executeJob(name, fn) {
  const db = getDb();
  try {
    const res = await fn(db);
    if (res.to?.length) await sendEmail({ subject: res.subject, htmlBody: res.html, to: res.to });
    logger.info({ job:name, sent: res.to?.length ?? 0 }, 'job done');
  } catch (e) {
    logger.error({ job:name, err:e.message }, 'job failed');
  } finally { db.close?.(); }
}

// IVA — mensual (día 1 a las 09:00 CLT)
cron.schedule('0 9 1 * *', async () => {
  await executeJob('IVA', (db)=> runIva({ db, fechaCorte: lastDayPrevMonthISO(), recipients: cfg.testRecipients }));
}, { timezone: cfg.tz });

// RESUMEN — mensual (día 1 a las 09:10 CLT)
cron.schedule('10 9 1 * *', async () => {
  await executeJob('RESUMEN', (db)=> runResumen({ db, fechaCorte: lastDayPrevMonthISO(), recipients: cfg.testRecipients }));
}, { timezone: cfg.tz });

// NETO — semanal (lunes 09:00 CLT)
cron.schedule('0 9 * * 1', async () => {
  const hoyISO = new Date().toISOString().slice(0,10);
  await executeJob('NETO', (db)=> runNeto({ db, fechaCorte: hoyISO, recipients: cfg.testRecipients }));
}, { timezone: cfg.tz });


// Al final de src/index.js, agrega un modo “one-shot” por CLI:
if (process.argv.includes('--run-neto')) {
  const db = getDb();                         // devolverá pool MSSQL por DB_SOURCE
  const { runNeto } = await import('./modules/neto/neto.service.js');
  const hoyISO = new Date().toISOString().slice(0,10);
  await (async () => {
    try { await runNeto({ db, fechaCorte: hoyISO, recipients: cfg.testRecipients }); }
    finally { db.close?.(); }
  })();
}


console.log('Alarms up. TZ:', cfg.tz);
