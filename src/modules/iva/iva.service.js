import fs from 'node:fs/promises';
import { findDebtors } from './iva.repository.js';
const tplPath = new URL('./iva.template.html', import.meta.url);
export async function runIva({ db, fechaCorte, recipients }) {
  const data = await findDebtors(db, { fechaCorte, minimo:10 });
  if (!data.length) return { subject:'Alerta IVA', html:'<p>Sin deudores.</p>', to:[] };
  let html = await fs.readFile(tplPath, 'utf8');
  html = html.replace('<<CANTIDAD>>', String(data.length));
  return { subject:'Alerta IVA pendiente', html, to:recipients };
}
