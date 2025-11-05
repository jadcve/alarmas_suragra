import { send, buildRecipients } from '../src/common/mailer.js';


const to = buildRecipients('jadcve@gmail.com'); // o usa SES_TEST_RECIPIENTS del .env
await send({
  subject: 'Smoke Test SES ✅',
  htmlBody: '<p>Hola, este es un smoke test de SES desde Alarmas Suragra.</p>',
  to
});

console.log('✅ Smoke test disparado');
