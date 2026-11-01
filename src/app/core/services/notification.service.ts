import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  mensaje = signal<string>('');
  tipo = signal<'error' | 'success' | 'delete'>('success');
  visible = signal<boolean>(false);
  
  private timeoutId: any = null;

  mostrar(mensaje: string, tipo: 'error' | 'success' | 'delete' = 'success') {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.mensaje.set(mensaje);
    this.tipo.set(tipo);
    this.visible.set(true);

    this.timeoutId = setTimeout(() => {
      this.visible.set(false);
    }, 3500);
  }
}