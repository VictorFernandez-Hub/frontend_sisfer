// Utilidades para sacar la información que se ve en pantalla (ya filtrada)
// a Excel (archivo CSV que abre Excel) o a PDF (se imprime la tabla).

export type Celda = string | number | null | undefined;

// Fecha local en formato AAAA-MM-DD (el que usan los campos de fecha)
export function aIso(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function hoyIso(): string {
  return aIso(new Date());
}

// Desde el lunes de esta semana hasta hoy
export function rangoSemana(): { desde: string; hasta: string } {
  const hoy = new Date();
  const lunes = new Date(hoy);
  const dia = hoy.getDay();                 // 0 = domingo
  lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1));
  return { desde: aIso(lunes), hasta: aIso(hoy) };
}

// Desde el día 1 de este mes hasta hoy
export function rangoMes(): { desde: string; hasta: string } {
  const hoy = new Date();
  return { desde: aIso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: aIso(hoy) };
}

// Baja un archivo .csv; Excel lo abre directo (lleva BOM para las tildes)
export function descargarExcel(nombre: string, encabezados: string[], filas: Celda[][]): void {
  const celda = (v: Celda) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lineas = [encabezados, ...filas].map(fila => fila.map(celda).join(','));
  const blob = new Blob(['﻿' + lineas.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombre}_${hoyIso()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Abre una hoja limpia con la tabla y el cuadro de imprimir (ahí se elige "Guardar como PDF").
// Devuelve false si el navegador bloqueó la ventana.
export function imprimirPdf(titulo: string, subtitulo: string, encabezados: string[], filas: Celda[][]): boolean {
  const esc = (v: Celda) => String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const cabeza = encabezados.map(h => `<th>${esc(h)}</th>`).join('');
  const cuerpo = filas.length
    ? filas.map(f => `<tr>${f.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${encabezados.length}">No hay datos con los filtros elegidos.</td></tr>`;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #222; margin: 24px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p { margin: 0 0 12px; color: #555; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #bbb; padding: 4px 6px; text-align: left; }
  th { background: #eee; }
  @page { size: A4 landscape; margin: 12mm; }
</style></head><body>
<h1>La Solución Ferretera — ${esc(titulo)}</h1>
<p>${esc(subtitulo)}</p>
<table><thead><tr>${cabeza}</tr></thead><tbody>${cuerpo}</tbody></table>
</body></html>`;
  const ventana = window.open('', '_blank');
  if (!ventana) { return false; }
  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();
  ventana.focus();
  setTimeout(() => ventana.print(), 300);
  return true;
}
