// server.js - Servidor HTTP para ejecutar jobs manualmente
import express from 'express';
import { cfg } from './config/index.js';
import { logger } from './logging/logger.js';
import { getDb } from './db/factory.js';
import { sendEmail } from './adapters/ses.adapter.js';
import { lastDayPrevMonthISO } from './utils/date.js';

import { runIVA } from './modules/iva/iva.service.js';
import { runNeto } from './modules/neto/neto.service.js';
import { runRFAC } from './modules/resumen/resumen.service.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para logs
app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url, ip: req.ip }, 'HTTP request');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    timezone: cfg.tz
  });
});

// Ejecutar IVA
app.post('/jobs/iva', async (req, res) => {
  const db = getDb();
  try {
    logger.info('Ejecutando job IVA por petición HTTP');
    const result = await runIVA({ 
      db, 
      fechaCorte: lastDayPrevMonthISO(), 
      recipients: cfg.testRecipients 
    });
    
    if (result.to?.length) {
      await sendEmail({ 
        subject: result.subject, 
        htmlBody: result.html, 
        to: result.to 
      });
    }
    
    logger.info({ sent: result.to?.length ?? 0 }, 'Job IVA completado');
    res.json({ 
      success: true, 
      job: 'IVA', 
      emailsSent: result.to?.length ?? 0,
      recipients: result.to
    });
  } catch (error) {
    logger.error({ err: error.message }, 'Error en job IVA');
    res.status(500).json({ 
      success: false, 
      job: 'IVA', 
      error: error.message 
    });
  } finally {
    db.close?.();
  }
});

// Ejecutar RESUMEN
app.post('/jobs/resumen', async (req, res) => {
  const db = getDb();
  try {
    logger.info('Ejecutando job RESUMEN por petición HTTP');
    const result = await runRFAC({ 
      db, 
      fechaCorte: lastDayPrevMonthISO(), 
      recipients: cfg.testRecipients 
    });
    
    if (result.to?.length) {
      await sendEmail({ 
        subject: result.subject, 
        htmlBody: result.html, 
        to: result.to 
      });
    }
    
    logger.info({ sent: result.to?.length ?? 0 }, 'Job RESUMEN completado');
    res.json({ 
      success: true, 
      job: 'RESUMEN', 
      emailsSent: result.to?.length ?? 0,
      recipients: result.to
    });
  } catch (error) {
    logger.error({ err: error.message }, 'Error en job RESUMEN');
    res.status(500).json({ 
      success: false, 
      job: 'RESUMEN', 
      error: error.message 
    });
  } finally {
    db.close?.();
  }
});

// Ejecutar NETO
app.post('/jobs/neto', async (req, res) => {
  const db = getDb();
  try {
    logger.info('Ejecutando job NETO por petición HTTP');
    const hoyISO = new Date().toISOString().slice(0,10);
    const result = await runNeto({ 
      db, 
      fechaCorte: hoyISO, 
      recipients: cfg.testRecipients 
    });
    
    if (result.to?.length) {
      await sendEmail({ 
        subject: result.subject, 
        htmlBody: result.html, 
        to: result.to 
      });
    }
    
    logger.info({ sent: result.to?.length ?? 0 }, 'Job NETO completado');
    res.json({ 
      success: true, 
      job: 'NETO', 
      emailsSent: result.to?.length ?? 0,
      recipients: result.to
    });
  } catch (error) {
    logger.error({ err: error.message }, 'Error en job NETO');
    res.status(500).json({ 
      success: false, 
      job: 'NETO', 
      error: error.message 
    });
  } finally {
    db.close?.();
  }
});

// Heartbeat manual
app.post('/jobs/heartbeat', async (req, res) => {
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
          </style>
        </head>
        <body>
          <div class="container">
            <h2>✅ Sistema de Alarmas Activo</h2>
            <div class="info">
              <p><strong>Estado:</strong> <span class="status">OPERATIVO</span></p>
              <p><strong>Fecha y Hora:</strong> ${dateStr}</p>
              <p><strong>Uptime:</strong> ${uptimeHours}h ${uptimeMins}m</p>
              <p><strong>Método:</strong> Ejecución manual vía HTTP</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    await sendEmail({
      subject: '✅ Sistema de Alarmas Suragra - Heartbeat Manual',
      htmlBody,
      to: cfg.testRecipients
    });
    
    logger.info('Heartbeat manual enviado');
    res.json({ success: true, job: 'HEARTBEAT', sent: true });
  } catch (error) {
    logger.error({ err: error.message }, 'Error en heartbeat');
    res.status(500).json({ success: false, job: 'HEARTBEAT', error: error.message });
  }
});

// Lista de jobs disponibles
app.get('/jobs', (req, res) => {
  res.json({
    jobs: [
      { name: 'IVA', endpoint: 'POST /jobs/iva', description: 'Alarma mensual IVA' },
      { name: 'RESUMEN', endpoint: 'POST /jobs/resumen', description: 'Alarma mensual RESUMEN' },
      { name: 'NETO', endpoint: 'POST /jobs/neto', description: 'Alarma semanal NETO' },
      { name: 'HEARTBEAT', endpoint: 'POST /jobs/heartbeat', description: 'Verificación del sistema' }
    ]
  });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info({ port: PORT }, 'Servidor HTTP iniciado');
  console.log(`🚀 Servidor corriendo en http://0.0.0.0:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Lista de jobs: http://localhost:${PORT}/jobs`);
});
