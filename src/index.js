import cron from 'node-cron';

import { cfg } from './config/index.js';
import { logger } from './logging/logger.js';
import { send as sendEmail } from './common/mailer.js';
import { lastDayPrevMonthISO } from './utils/date.js';

import { runIVA } from './modules/suragra/iva/iva.service.js';
import { runNeto } from './modules/suragra/neto/neto.service.js';
import { runRFAC as runResumen } from './modules/suragra/resumen/resumen.service.js';

async function executeJob(name, fn) {
  try {
    await fn();
    logger.info({ job: name }, 'job done');
  } catch (err) {
    logger.error({ job: name, err: err?.message ?? String(err) }, 'job failed');
  }
}

async function checkHttpHealth() {
  const url = process.env.HEALTH_URL || `http://127.0.0.1:${process.env.PORT || 3000}/health`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await response.json();
    return {
      ok: response.ok,
      url,
      status: response.status,
      data
    };
  } catch (err) {
    return {
      ok: false,
      url,
      error: err?.message ?? String(err)
    };
  }
}

async function sendDailyHealthReport() {
  const now = new Date();
  const dateStr = now.toLocaleString('es-CL', { timeZone: cfg.tz });
  const uptime = process.uptime();
  const uptimeHours = Math.floor(uptime / 3600);
  const uptimeMins = Math.floor((uptime % 3600) / 60);
  const httpHealth = await checkHttpHealth();

  const recipients = [cfg.healthReportRecipient].filter(Boolean);
  if (!recipients.length) {
    throw new Error('No hay destinatario configurado para el reporte de salud');
  }

  const schedulerStatus = 'OPERATIVO';
  const httpStatus = httpHealth.ok ? 'OPERATIVO' : 'NO RESPONDE';
  const httpDetail = httpHealth.ok
    ? `HTTP ${httpHealth.status} - ${httpHealth.data?.status ?? 'OK'}`
    : httpHealth.error;

  const htmlBody = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; background: #f7f7f7; }
          .container { max-width: 700px; margin: 0 auto; background: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 10px; }
          h2 { color: #1f6feb; }
          .info { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 10px 0; }
          .grid { display: grid; grid-template-columns: 160px 1fr; gap: 8px 12px; }
          .label { font-weight: bold; }
          .ok { color: #198754; font-weight: bold; }
          .bad { color: #dc3545; font-weight: bold; }
          .small { color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Reporte diario de salud</h2>
          <div class="info">
            <div class="grid">
              <div class="label">Fecha y hora</div><div>${dateStr}</div>
              <div class="label">Zona horaria</div><div>${cfg.tz}</div>
              <div class="label">Scheduler</div><div class="ok">${schedulerStatus}</div>
              <div class="label">Uptime</div><div>${uptimeHours}h ${uptimeMins}m</div>
              <div class="label">Servicio HTTP</div><div class="${httpHealth.ok ? 'ok' : 'bad'}">${httpStatus}</div>
              <div class="label">Detalle HTTP</div><div>${httpDetail}</div>
            </div>
          </div>
          <p class="small">
            Este correo confirma que el proceso de alarmas está activo y, si aplica, que el endpoint de salud responde.
          </p>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    subject: 'Reporte diario de salud - Alarmas Suragra',
    htmlBody,
    to: recipients,
    cc: [],
    bcc: []
  });

  logger.info({ job: 'HEALTH', http: httpHealth.ok ? 'ok' : 'down' }, 'Daily health report sent');
}

logger.info(
  {
    altTest: cfg.altTest,
    dryRun: cfg.dryRun,
    testRecipients: cfg.ses.testRecipients,
    cc: cfg.ses.cc,
    tz: cfg.tz
  },
  'Scheduler started'
);

cron.schedule(
  '0 8 15 * *',
  async () => {
    await executeJob('IVA', () => runIVA({ fechaCorte: lastDayPrevMonthISO() }));
  },
  { timezone: cfg.tz }
);

cron.schedule(
  '0 8 4 * *',
  async () => {
    await executeJob('RESUMEN', () => runResumen({ fechaCorte: lastDayPrevMonthISO() }));
  },
  { timezone: cfg.tz }
);

cron.schedule(
  '0 7 * * 5',
  async () => {
    const hoyISO = new Date().toISOString().slice(0, 10);
    await executeJob('NETO', () => runNeto({ fechaCorte: hoyISO }));
  },
  { timezone: cfg.tz }
);

cron.schedule(
  '0 7 * * *',
  async () => {
    try {
      await sendDailyHealthReport();
    } catch (err) {
      logger.error({ job: 'HEALTH', err: err?.message ?? String(err) }, 'Health report failed');
    }
  },
  { timezone: cfg.tz }
);

process.on('SIGINT', () => {
  logger.info('Scheduler stopped by SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Scheduler stopped by SIGTERM');
  process.exit(0);
});

console.log('Alarms up. TZ:', cfg.tz);
