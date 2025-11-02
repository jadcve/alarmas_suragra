// src/common/mailer.js
import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { cfg } from '../config/index.js';
import { logger } from '../logging/logger.js';
import fs from 'fs';
import path from 'path';

const ses = new SESClient({ region: cfg.ses.region });

export function buildRecipients(principal) {
  if (cfg.altTest === 1) {
    return [principal, ...(cfg.ses.cc || [])].filter(Boolean);
  }
  if (cfg.ses.testRecipients?.length) return cfg.ses.testRecipients;
  if (cfg.fallbackRecipient) return [cfg.fallbackRecipient];
  throw new Error('Modo test activo (ALT_TEST=0) pero no hay SES_TEST_RECIPIENTS ni FALLBACK_RECIPIENT');
}

/**
 * Envía correo por SES (HTML o RAW con inline attachments)
 * @param {object} opts
 */
export async function send({ subject, htmlBody, to, cc, bcc, replyTo, attachments = [] }) {
  if (!to?.length) throw new Error('Destinatarios vacíos');
  if (!subject) throw new Error('Asunto vacío');
  if (!htmlBody) throw new Error('Cuerpo HTML vacío');

  const CcAddresses = (cc ?? cfg.ses.cc ?? []).filter(Boolean);
  const BccAddresses = (bcc ?? cfg.ses.bcc ?? []).filter(Boolean);
  const ReplyToAddresses = [replyTo || cfg.ses.from].filter(Boolean);

  // Si hay attachments (inline logo)
 if (attachments.length) {
  const boundary = `----=_Part_${Date.now()}`;
  const logo = attachments[0];
  const logoData = fs.readFileSync(logo.path).toString('base64');

  const rawEmail = [
    `From: ${cfg.ses.from}`,
    `To: ${to.join(', ')}`,
    CcAddresses.length ? `Cc: ${CcAddresses.join(', ')}` : '',
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/related; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlBody,
    '',
    `--${boundary}`,
    // Imagen inline, no adjunta
    `Content-Type: image/png`,
    `Content-Transfer-Encoding: base64`,
    `Content-ID: <${logo.cid}>`,
    'Content-Disposition: inline',   // 👈 esto evita que aparezca como adjunto
    '',
    logoData,
    '',
    `--${boundary}--`
  ].join('\r\n');

  const params = {
    RawMessage: { Data: Buffer.from(rawEmail) },
    Source: cfg.ses.from,
    Destinations: [...to, ...CcAddresses, ...BccAddresses]
  };

  if (cfg.dryRun) {
    logger.info({ to, cc: CcAddresses, subject }, '🟡 DRY_RUN activo: correo NO enviado');
    return 'dry-run';
  }

  const res = await ses.send(new SendRawEmailCommand(params));
  logger.info({ to, cc: CcAddresses, subject, id: res?.MessageId }, '📎 Correo con logo inline enviado por SES');
  return res?.MessageId;
}


  // Si no hay attachments → envío normal (tu flujo actual)
  const params = {
    Source: cfg.ses.from,
    Destination: { ToAddresses: to, CcAddresses, BccAddresses },
    Message: {
      Subject: { Charset: 'UTF-8', Data: subject },
      Body: { Html: { Charset: 'UTF-8', Data: htmlBody } }
    },
    ReplyToAddresses
  };

  if (cfg.dryRun) {
    logger.info({ to, cc: CcAddresses, subject }, '🟡 DRY_RUN activo: correo NO enviado');
    return 'dry-run';
  }

  const res = await ses.send(new SendEmailCommand(params));
  logger.info({ to, cc: CcAddresses, subject, id: res?.MessageId }, '✉️ Correo enviado por SES');
  return res?.MessageId;
}
