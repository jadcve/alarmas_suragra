import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { cfg } from '../config/index.js';
const ses = new SESClient({ region: cfg.ses.region });
export async function sendEmail({ subject, htmlBody, to }) {
  for (const recipient of to) {
    await ses.send(new SendEmailCommand({
      Destination: { ToAddresses: [recipient] },
      Source: cfg.ses.from,
      Message: { Subject: { Data: subject }, Body: { Html: { Data: htmlBody } } }
    }));
  }
}
