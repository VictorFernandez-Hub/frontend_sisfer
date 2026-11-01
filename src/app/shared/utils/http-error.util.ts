import { HttpErrorResponse } from '@angular/common/http';

export function extraerMensajeError(err: HttpErrorResponse, porDefecto: string): string {
  if (err.status === 0) {
    return 'El servidor no responde. Verifique que el backend esté encendido.';
  }
  if (err.status === 403) {
    return 'No tiene permisos para realizar esta acción.';
  }

  const cuerpo = err.error;
  if (cuerpo && typeof cuerpo === 'object') {
    if (typeof cuerpo.mensaje === 'string') {
      return cuerpo.mensaje;
    }
    const mensajes = Object.values(cuerpo).filter((v): v is string => typeof v === 'string');
    if (mensajes.length > 0) {
      return mensajes.join(' ');
    }
  }
  return porDefecto;
}