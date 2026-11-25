import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_URL } from '../../core/constants/api.constants';
import { CajaActual, CajaDetalle, CajaFila, EntregadorFondo, TipoMovimiento } from './caja.model';

@Injectable({ providedIn: 'root' })
export class CajaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_URL}/caja`;

  // Lo último que se supo de la caja del usuario: el menú y Ventas lo usan para avisar
  readonly cajaAbierta = signal<CajaDetalle | null>(null);

  actual(): Observable<CajaActual> {
    return this.http.get<CajaActual>(`${this.apiUrl}/actual`, { withCredentials: true })
      .pipe(tap(r => this.cajaAbierta.set(r.abierta ? r.caja : null)));
  }

  obtener(id: number): Observable<CajaDetalle> {
    return this.http.get<CajaDetalle>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  listar(desde?: string, hasta?: string, estado?: string): Observable<CajaFila[]> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    if (estado) params = params.set('estado', estado);
    return this.http.get<CajaFila[]>(this.apiUrl, { params, withCredentials: true });
  }

  entregadores(): Observable<EntregadorFondo[]> {
    return this.http.get<EntregadorFondo[]>(`${this.apiUrl}/entregadores`, { withCredentials: true });
  }

  abrir(montoApertura: number, idEntregadoPor: number | null, observacion: string): Observable<CajaDetalle> {
    return this.http.post<CajaDetalle>(`${this.apiUrl}/abrir`, { montoApertura, idEntregadoPor, observacion },
      { withCredentials: true })
      .pipe(tap(c => this.cajaAbierta.set(c)));
  }

  registrarMovimiento(tipo: TipoMovimiento, monto: number, motivo: string): Observable<CajaDetalle> {
    return this.http.post<CajaDetalle>(`${this.apiUrl}/movimientos`, { tipo, monto, motivo }, { withCredentials: true })
      .pipe(tap(c => this.cajaAbierta.set(c)));
  }

  cerrar(id: number, efectivoContado: number, observacion: string): Observable<CajaDetalle> {
    return this.http.post<CajaDetalle>(`${this.apiUrl}/${id}/cerrar`, { efectivoContado, observacion }, { withCredentials: true })
      .pipe(tap(c => {
        // Si cerró la suya, ya no tiene caja abierta; si un administrador cerró la de otro, no cambia la suya
        if (this.cajaAbierta()?.idCaja === c.idCaja) this.cajaAbierta.set(null);
      }));
  }
}
