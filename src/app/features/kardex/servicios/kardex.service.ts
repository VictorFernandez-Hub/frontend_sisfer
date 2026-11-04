import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../../../core/constants/api.constants';
import { MovimientoKardex } from '../modelos/kardex.model';

@Injectable({
  providedIn: 'root'
})
export class KardexService {
  private http = inject(HttpClient);
  private apiUrl = `${API_URL}/kardex`;

  // Últimos movimientos de todos los productos
  obtenerMovimientos(): Observable<MovimientoKardex[]> {
    return this.http.get<MovimientoKardex[]>(this.apiUrl, { withCredentials: true });
  }

  // Historial de un solo producto, por su código (ej. HER-001)
  obtenerMovimientosPorProducto(codigo: string): Observable<MovimientoKardex[]> {
    return this.http.get<MovimientoKardex[]>(this.apiUrl, {
      params: { codigo },
      withCredentials: true
    });
  }
}
