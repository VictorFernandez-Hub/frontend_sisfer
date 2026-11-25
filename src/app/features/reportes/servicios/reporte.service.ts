import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../../../core/constants/api.constants';
import {
  AlertaStock, ProductoVendido, ResumenReporte, VentaPorMetodo, VentaPorVendedor
} from '../modelos/reporte.model';

@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  private http = inject(HttpClient);
  private apiUrl = `${API_URL}/reportes`;

  // Las fechas van en formato yyyy-MM-dd. Sin fechas, el backend usa el mes actual
  private rango(desde: string, hasta: string): HttpParams {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return params;
  }

  // ---------------------------------------------------------- ventas

  resumen(desde: string, hasta: string): Observable<ResumenReporte> {
    return this.http.get<ResumenReporte>(`${this.apiUrl}/resumen`,
      { params: this.rango(desde, hasta), withCredentials: true });
  }

  porMetodo(desde: string, hasta: string): Observable<VentaPorMetodo[]> {
    return this.http.get<VentaPorMetodo[]>(`${this.apiUrl}/por-metodo`,
      { params: this.rango(desde, hasta), withCredentials: true });
  }

  topProductos(desde: string, hasta: string, limite = 10): Observable<ProductoVendido[]> {
    return this.http.get<ProductoVendido[]>(`${this.apiUrl}/top-productos`,
      { params: this.rango(desde, hasta).set('limite', limite), withCredentials: true });
  }

  porVendedor(desde: string, hasta: string): Observable<VentaPorVendedor[]> {
    return this.http.get<VentaPorVendedor[]>(`${this.apiUrl}/por-vendedor`,
      { params: this.rango(desde, hasta), withCredentials: true });
  }

  // Reporte de ventas en PDF (resumen, medios de pago, más vendidos y vendedores)
  pdf(desde: string, hasta: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/pdf`,
      { params: this.rango(desde, hasta), responseType: 'blob', withCredentials: true });
  }

  // ---------------------------------------------------------- stock

  // El stock de ahora: no depende de fechas
  alertasStock(): Observable<AlertaStock[]> {
    return this.http.get<AlertaStock[]>(`${this.apiUrl}/alertas-stock`, { withCredentials: true });
  }
}
