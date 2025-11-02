// src/common/mailer.js
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { cfg } from '../config/index.js';
import { logger } from '../logging/logger.js';

const ses = new SESClient({ region: cfg.ses.region });

/**
 * Construye la lista final de destinatarios según modo:
 *  - ALT_TEST=1 => envía a destinatario real + CC configurado
 *  - ALT_TEST=0 => envía SOLO a SES_TEST_RECIPIENTS (o FALLBACK_RECIPIENT si está definido)
 *  - Si no hay ninguno, lanza error (evita envíos accidentales).
 */
export function buildRecipients(principal) {
  if (cfg.altTest === 1) {
    return [principal, ...(cfg.ses.cc || [])].filter(Boolean);
  }
  if (cfg.ses.testRecipients?.length) {
    return cfg.ses.testRecipients;
  }
  if (cfg.fallbackRecipient) {
    return [cfg.fallbackRecipient];
  }
  throw new Error('Modo test activo (ALT_TEST=0) pero no hay SES_TEST_RECIPIENTS ni FALLBACK_RECIPIENT');
}

/**
 * Envía un correo por SES (HTML).
 * @param {Object} opts
 * @param {string}   opts.subject
 * @param {string}   opts.htmlBody
 * @param {string[]} opts.to                 - destinatarios To (usa buildRecipients())
 * @param {string[]} [opts.cc]               - override CC (si no, usa cfg.ses.cc)
 * @param {string[]} [opts.bcc]              - override BCC (si no, usa cfg.ses.bcc)
 * @param {string}   [opts.replyTo]          - override Reply-To (si no, usa cfg.ses.from)
 */
export async function send({ subject, htmlBody, to, cc, bcc, replyTo }) {
  if (!to?.length) throw new Error('Destinatarios vacíos');
  if (!subject) throw new Error('Asunto vacío');
  if (!htmlBody) throw new Error('Cuerpo HTML vacío');

  const CcAddresses = (cc ?? cfg.ses.cc ?? []).filter(Boolean);
  const BccAddresses = (bcc ?? cfg.ses.bcc ?? []).filter(Boolean);
  const ReplyToAddresses = [replyTo || cfg.ses.from].filter(Boolean);

  const params = {
    Source: cfg.ses.from,
    Destination: {
      ToAddresses: to,
      CcAddresses,
      BccAddresses
    },
    Message: {
      Subject: { Charset: 'UTF-8', Data: subject },
      Body: {
        Html: { Charset: 'UTF-8', Data: htmlBody }
      }
    },
    ReplyToAddresses
  };

  // Modo simulación (no envía, solo loguea)
  if (cfg.dryRun) {
    logger.info({ to, cc: CcAddresses, bcc: BccAddresses, subject }, '🟡 DRY_RUN activo: correo NO enviado');
    return 'dry-run';
  }

  try {
    const res = await ses.send(new SendEmailCommand(params));
    logger.info({ to, cc: CcAddresses, bcc: BccAddresses, subject, id: res?.MessageId }, '✉️ Correo enviado por SES');
    return res?.MessageId;
  } catch (err) {
    logger.error({ err, to, cc: CcAddresses, bcc: BccAddresses, subject }, '❌ Fallo en SES');
    throw err;
  }
}
