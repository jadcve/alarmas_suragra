import { cfg } from './config/index.js';
import { logger } from './logging/logger.js';
import { getDb } from './db/factory.js';
import { sendEmail } from './adapters/ses.adapter.js';
import { lastDayPrevMonthISO } from './utils/date.js';

// Módulos de Suragra
import { runIVA } from './modules/suragra/iva/iva.service.js';
import { runNeto } from './modules/suragra/neto/neto.service.js';
import { runRFAC as runResumen } from './modules/suragra/resumen/resumen.service.js';

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

// IVA — mensual (día 15 a las 08:00 CLT)
cron.schedule('0 8 15 * *', async () => {
  await executeJob('IVA', (db)=> runIVA({ db, fechaCorte: lastDayPrevMonthISO(), recipients: cfg.testRecipients }));
}, { timezone: cfg.tz });

// RESUMEN — mensual (día 4 a las 08:00 CLT)
cron.schedule('0 8 4 * *', async () => {
  await executeJob('RESUMEN', (db)=> runResumen({ db, fechaCorte: lastDayPrevMonthISO(), recipients: cfg.testRecipients }));
}, { timezone: cfg.tz });

// NETO — semanal (viernes 07:00 CLT)
cron.schedule('0 7 * * 5', async () => {
  const hoyISO = new Date().toISOString().slice(0,10);
  await executeJob('NETO', (db)=> runNeto({ db, fechaCorte: hoyISO, recipients: cfg.testRecipients }));
}, { timezone: cfg.tz });

// HEARTBEAT — diario (23:55 CLT - PRUEBA) - Notificación de sistema activo
cron.schedule('55 23 * * *', async () => {
  try {
    const now = new Date();
    const dateStr = now.toLocaleString('es-CL', { timeZone: cfg.tz });
    const uptime = process.uptime();
    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMins = Math.floor((uptime % 3600) / 60);
    
    const htmlBody = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px; }
            h2 { color: #28a745; }
            .info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0; }
            .status { color: #28a745; font-weight: bold; }
            .schedule { margin-top: 20px; }
            .schedule ul { list-style: none; padding: 0; }
            .schedule li { padding: 8px 0; border-bottom: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>✅ Sistema de Alarmas Activo</h2>
            <div class="info">
              <p><strong>Estado:</strong> <span class="status">OPERATIVO</span></p>
              <p><strong>Fecha y Hora:</strong> ${dateStr}</p>
              <p><strong>Uptime:</strong> ${uptimeHours}h ${uptimeMins}m</p>
              <p><strong>Zona Horaria:</strong> ${cfg.tz}</p>
            </div>
            
            <div class="schedule">
              <h3>📅 Programación de Alarmas</h3>
              <ul>
                <li><strong>IVA:</strong> Día 15 de cada mes a las 8:00 AM</li>
                <li><strong>RESUMEN:</strong> Día 4 de cada mes a las 8:00 AM</li>
                <li><strong>NETO:</strong> Todos los viernes a las 7:00 AM</li>
                <li><strong>HEARTBEAT:</strong> Todos los días a las 9:00 AM</li>
              </ul>
            </div>
            
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              Este es un mensaje automático para confirmar que el sistema de alarmas está funcionando correctamente.
              Si no recibes este correo durante más de 24 horas, verifica el estado del servidor.
            </p>
          </div>
        </body>
      </html>
    `;
    
    await sendEmail({
      subject: '✅ Sistema de Alarmas Suragra - Status Diario',
      htmlBody,
      to: cfg.testRecipients
    });
    
    logger.info({ job: 'HEARTBEAT' }, 'Daily heartbeat sent');
  } catch (e) {
    logger.error({ job: 'HEARTBEAT', err: e.message }, 'Heartbeat failed');
  }
}, { timezone: cfg.tz });


// Al final de src/index.js, agrega un modo "one-shot" por CLI:
if (process.argv.includes('--run-neto')) {
  const db = getDb();                         // devolverá pool MSSQL por DB_SOURCE
  const { runNeto } = await import('./modules/suragra/neto/neto.service.js');
  const hoyISO = new Date().toISOString().slice(0,10);
  await (async () => {
    try { await runNeto({ db, fechaCorte: hoyISO, recipients: cfg.testRecipients }); }
    finally { db.close?.(); }
  })();
}


console.log('Alarms up. TZ:', cfg.tz);
