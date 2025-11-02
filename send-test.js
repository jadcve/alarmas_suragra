// send-test.js
import 'dotenv/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

function getList(envKey) {
  return (process.env[envKey] || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

const region = process.env.AWS_REGION || 'us-west-2';
const from   = process.env.SES_FROM;                     // Debe estar verificado en SES
const to     = getList('SES_TEST_RECIPIENTS');           // En sandbox, estos también deben estar verificados

if (!from) {
  console.error('❌ Falta SES_FROM en .env');
  process.exit(1);
}
if (!to.length) {
  console.error('❌ Falta SES_TEST_RECIPIENTS en .env (separados por coma)');
  process.exit(1);
}

const ses = new SESClient({ region });

const params = {
  Source: from,
  Destination: { ToAddresses: to },                      // 👈 requerido
  Message: {
    Subject: { Data: 'Prueba SES', Charset: 'UTF-8' },
    Body: {
      Html: { Data: '<h1>Hola</h1><p>Prueba SES.</p>', Charset: 'UTF-8' },
      // Text: { Data: 'Hola - Prueba SES.', Charset: 'UTF-8' } // opcional
    }
  },
  // ReplyToAddresses: ['tu-reply@dominio.com'],          // opcional
};

console.log('→ Enviando', { region, from, to });
try {
  const out = await ses.send(new SendEmailCommand(params));
  console.log('✅ OK MessageId:', out.MessageId);
} catch (e) {
  console.error('❌ Error SES:', e);
  process.exit(1);
}
