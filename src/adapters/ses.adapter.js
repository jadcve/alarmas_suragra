import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { cfg } from '../config/index.js';
import { logger } from '../logging/logger.js';

// Inicializa el cliente una sola vez
const ses = new SESClient({ region: cfg.ses.region });

/**
 * Envía un correo (HTML) a una o más direcciones usando AWS SES.
 * @param {Object} opts
 * @param {string} opts.subject
 * @param {string} opts.htmlBody
 * @param {string[]} opts.to - Lista de destinatarios
 */
export async function sendEmail({ subject, htmlBody, to }) {
  if (!Array.isArray(to) || !to.length) {
    throw new Error('sendEmail: lista "to" vacía o inválida');
  }

  // SES permite múltiples destinatarios en un solo envío (mejor performance)
  const params = {
    Destination: { ToAddresses: to },
    Source: cfg.ses.from,
    Message: {
      Subject: { Charset: 'UTF-8', Data: subject },
      Body: { Html: { Charset: 'UTF-8', Data: htmlBody } }
    },
    ReplyToAddresses: [cfg.ses.from]
  };

  try {
    const command = new SendEmailCommand(params);
    const response = await ses.send(command);
    logger.info({ to, messageId: response.MessageId }, 'Correo enviado con éxito');
    return response.MessageId;
  } catch (error) {
    logger.error({ error, to }, 'Error enviando correo SES');
    throw error;
  }
}
