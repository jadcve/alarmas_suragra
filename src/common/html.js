export const td = (v) => `<td><span style='font-size:11px'><span style='font-family:tahoma,geneva,sans-serif'>${v ?? ''}</span></span></td>`;

export function header() {
  return [
    '<tr>',
    td('Documento'), td('Fecha Emision'), td('Fecha Vencimiento'), td('Dias de Mora'),
    "<td width='200' nowrap='nowrap'><span style='font-size:11px'><span style='font-family:tahoma,geneva,sans-serif'>NETO Pendiente</span></span></td>",
    '</tr>'
  ].join('');
}

export const row = cells => `<tr>${cells.map(c => `<td style="padding:6px 8px;border-bottom:1px solid #eee;">${c ?? ''}</td>`).join('')}</tr>`;
export const table = (title, rows, footer='') => `
  <div style="margin:16px 0;">
    <h3 style="margin:0 0 8px 0;">${title}</h3>
    ${rows?.length
      ? `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows.join('')}</table>${footer ? `<p style="font-weight:bold;margin-top:8px;">${footer}</p>` : ''}`
      : `<p style="color:#666;">${footer || 'Sin registros'}</p>`}
  </div>`;
