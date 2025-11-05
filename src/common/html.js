// src/common/html.js
import formatNumber from 'simple-format-number';
import { replaceTokenAll } from './tokens.js';

/**
 * Reemplaza placeholders en varias variantes:
 *  - <<KEY>>   (doble ángulo)
 *  - <KEY>     (ángulo simple)
 *  - ${KEY}    (template clásico)
 * También cubre versiones en minúscula y entidades HTML (&lt; &gt;).
 */
export function injectPlaceholders(html, map) {
  if (!html) return '';
  let out = String(html);

  for (const [k, v] of Object.entries(map || {})) {
    const key = String(k).trim();
    const val = v ?? '';

    // variantes en mayúsculas como en las plantillas…
    for (const token of [`<<${key}>>`, `<${key}>`, `\${${key}}`]) {
      out = replaceTokenAll(out, token, val);
    }
    // …y por si quedaron en mayúsculas/minúsculas mezcladas
    const upper = key.toUpperCase();
    if (upper !== key) {
      for (const token of [`<<${upper}>>`, `<${upper}>`, `\${${upper}}`]) {
        out = replaceTokenAll(out, token, val);
      }
    }
  }
  return out;
}

/* ---------- Helpers HTML ---------- */

export const td = (v) =>
  `<td><span style="font-size:11px"><span style="font-family:tahoma,geneva,sans-serif">${v ?? ''}</span></span></td>`;

export function headerNeto() {
  return `
  <tr style="background-color:#f2f2f2;font-weight:bold">
    ${td('Documento')}
    ${td('Fecha Emisión')}
    ${td('Fecha Vencimiento')}
    ${td('Días de Mora')}
    <td width="200" nowrap="nowrap">
      <span style="font-size:11px;font-family:tahoma,geneva,sans-serif">NETO Pendiente</span>
    </td>
  </tr>`;
}

/** Encabezado correcto para IVA (5 columnas) */
export function headerIVA() {
  return `
  <tr style="background-color:#f2f2f2;font-weight:bold">
    ${td('Documento')}
    ${td('Fecha Emisión')}
    ${td('Neto del Documento')}
    ${td('IVA del Documento (CLP)')}
    ${td('Días de Mora')}
  </tr>`;
}

export const row = (cells) =>
  `<tr>${cells.map((c) => `<td style="padding:6px 8px;border-bottom:1px solid #eee">${c ?? ''}</td>`).join('')}</tr>`;

export const table = (title, rows, footer = '') => `
  <div style="margin:16px 0">
    <h3 style="margin:0 0 8px 0">${title}</h3>
    ${
      rows?.length
        ? `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${rows.join('')}</table>${
            footer ? `<p style="font-weight:bold;margin-top:8px">${footer}</p>` : ''
          }`
        : `<p style="color:#666">${footer || 'Sin registros'}</p>`
    }
  </div>`;

/* ---------- Formateadores homogéneos ---------- */
export const fmtUSD = (v) =>
  formatNumber(Number(v || 0), { fractionDigits: 2, symbols: { decimal: ',', grouping: '.' } });

export const fmtCLP = (v) =>
  formatNumber(Number(v || 0), { fractionDigits: 0, symbols: { grouping: '.', decimal: ',' } });
