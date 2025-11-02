export const td = (v) => `<td><span style='font-size:11px'><span style='font-family:tahoma,geneva,sans-serif'>${v ?? ''}</span></span></td>`;

export function header() {
  return [
    '<tr>',
    td('Documento'), td('Fecha Emision'), td('Fecha Vencimiento'), td('Dias de Mora'),
    "<td width='200' nowrap='nowrap'><span style='font-size:11px'><span style='font-family:tahoma,geneva,sans-serif'>NETO Pendiente</span></span></td>",
    '</tr>'
  ].join('');
}

export const row = (cells=[]) => `<tr>${cells.map(td).join('')}</tr>`;

export function table(titulo, rowsHtml=[], footerOrMessage='') {
  let h = `<p><br><b>${titulo}</b></p><table width='100%' cellspacing='0' cellpadding='0'>`;
  h += header();
  h += (Array.isArray(rowsHtml) ? rowsHtml.join('') : rowsHtml) || '';
  if (Array.isArray(rowsHtml) && rowsHtml.length) {
    h += `<tr><td width='79'>&nbsp;</td><td width='80'>&nbsp;</td><td width='80'>&nbsp;</td><td width='70'><b>Total:</b></td><td width='200'><b>${footerOrMessage}</b></td></tr>`;
  }
  h += '</table>';
  if (!Array.isArray(rowsHtml) || rowsHtml.length === 0) {
    h += `<p>${footerOrMessage}</p>`;
  }
  h += '<p><br></p>';
  return h;
}
