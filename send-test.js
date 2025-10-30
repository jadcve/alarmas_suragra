// send-test.js
import 'dotenv/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: process.env.AWS_REGION });

async function main() {
  const to = (process.env.TEST_RECIPIENTS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const subject = 'Prueba SES local ✔';
  const htmlBody = `
    <h3>Hola, esta es una prueba de SES desde local</h3>
    <p>Fecha: ${new Date().toLocaleString('es-CL')}</p>
  `;

  try {
    const params = {
      Source: process.env.SES_FROM,
      Destination: { ToAddresses: to },
      Message: {
        Subject: { Charset: 'UTF-8', Data: subject },
        Body: { Html: { Charset: 'UTF-8', Data: htmlBody } }
      },
      ReplyToAddresses: [process.env.SES_FROM]
    };

    const res = await ses.send(new SendEmailCommand(params));
    console.log('✅ Correo enviado correctamente');
    console.log('SES MessageId:', res.MessageId);
  } catch (err) {
    console.error('❌ Error al enviar correo:', err);
  }
}

main();
