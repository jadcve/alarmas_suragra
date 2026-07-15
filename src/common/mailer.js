// src/common/mailer.js
import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { cfg } from '../config/index.js';
import { logger } from '../logging/logger.js';
import fs from 'fs';
import path from 'path';

const ses = new SESClient({ region: cfg.ses.region });

function normalizeEmail(value) {
  if (!value) return '';
  let email = String(value).trim();
  email = email.replace(/^mailto:/i, '');
  const bracketMatch = email.match(/<([^>]+)>/);
  if (bracketMatch?.[1]) email = bracketMatch[1].trim();
  return email.replace(/\s+/g, '');
}

function sanitizeAddressList(list = []) {
  const emails = list
    .flatMap((value) => String(value ?? '').split(/[;,]/))
    .map(normalizeEmail)
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

  return [...new Set(emails)];
}

export function buildRecipients(principal) {
  if (cfg.altTest === 1) {
    return sanitizeAddressList([principal, ...(cfg.ses.cc || [])]);
  }
  if (cfg.ses.testRecipients?.length) return sanitizeAddressList(cfg.ses.testRecipients);
  if (cfg.fallbackRecipient) return sanitizeAddressList([cfg.fallbackRecipient]);
  throw new Error('Modo test activo (ALT_TEST=0) pero no hay SES_TEST_RECIPIENTS ni FALLBACK_RECIPIENT');
}

/**
 * Envía correo por SES (HTML o RAW con inline attachments)
 * @param {object} opts
 */
export async function send({ subject, htmlBody, to, cc, bcc, replyTo, attachments = [] }) {
  const ToAddresses = sanitizeAddressList(to ?? []);
  const CcAddresses = sanitizeAddressList(cc ?? cfg.ses.cc ?? []);
  const BccAddresses = sanitizeAddressList(bcc ?? cfg.ses.bcc ?? []);
  const ReplyToAddresses = sanitizeAddressList([replyTo || cfg.ses.from]);

  if (!ToAddresses.length) throw new Error('Destinatarios vacíos o inválidos');
  if (!subject) throw new Error('Asunto vacío');
  if (!htmlBody) throw new Error('Cuerpo HTML vacío');

  // Si hay attachments (inline logo)
 if (attachments.length) {
  const boundary = `----=_Part_${Date.now()}`;
  const logo = attachments[0];
  const logoData = fs.readFileSync(logo.path).toString('base64');

  const rawEmail = [
    `From: ${cfg.ses.from}`,
    `To: ${ToAddresses.join(', ')}`,
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
    Destinations: [...ToAddresses, ...CcAddresses, ...BccAddresses]
  };

  if (cfg.dryRun) {
    logger.info({ to: ToAddresses, cc: CcAddresses, subject }, '🟡 DRY_RUN activo: correo NO enviado');
    return 'dry-run';
  }

  const res = await ses.send(new SendRawEmailCommand(params));
  logger.info({ to: ToAddresses, cc: CcAddresses, subject, id: res?.MessageId }, '📎 Correo con logo inline enviado por SES');
  return res?.MessageId;
}


  // Si no hay attachments → envío normal (tu flujo actual)
  const params = {
    Source: cfg.ses.from,
    Destination: { ToAddresses, CcAddresses, BccAddresses },
    Message: {
      Subject: { Charset: 'UTF-8', Data: subject },
      Body: { Html: { Charset: 'UTF-8', Data: htmlBody } }
    },
    ReplyToAddresses
  };

  if (cfg.dryRun) {
    logger.info({ to: ToAddresses, cc: CcAddresses, subject }, '🟡 DRY_RUN activo: correo NO enviado');
    return 'dry-run';
  }

  const res = await ses.send(new SendEmailCommand(params));
  logger.info({ to: ToAddresses, cc: CcAddresses, subject, id: res?.MessageId }, '✉️ Correo enviado por SES');
  return res?.MessageId;
}
