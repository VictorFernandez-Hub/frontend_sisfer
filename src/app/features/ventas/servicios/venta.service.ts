import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_URL } from '../../../core/constants/api.constants';
import { OpcionVenta, VentaDetalle, VentaRequest, VentaResumen } from '../modelos/venta.model';

@Injectable({
  providedIn: 'root'
})
export class VentaService {
  private http = inject(HttpClient);
  private apiUrl = `${API_URL}/ventas`;

  // Las fechas son opcionales (formato yyyy-MM-dd)
  listar(desde?: string, hasta?: string): Observable<VentaResumen[]> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<VentaResumen[]>(this.apiUrl, { params, withCredentials: true });
  }

  obtener(id: number): Observable<VentaDetalle> {
    return this.http.get<VentaDetalle>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  metodos(): Observable<OpcionVenta[]> {
    return this.http.get<OpcionVenta[]>(`${this.apiUrl}/metodos`, { withCredentials: true });
  }

  tiposComprobante(): Observable<OpcionVenta[]> {
    return this.http.get<OpcionVenta[]>(`${this.apiUrl}/comprobantes`, { withCredentials: true });
  }

  // Guarda la venta en BORRADOR (todavía no mueve el stock)
  registrar(venta: VentaRequest): Observable<VentaDetalle> {
    return this.http.post<VentaDetalle>(this.apiUrl, venta, { withCredentials: true });
  }

  // Solo se edita una venta en BORRADOR
  actualizar(id: number, venta: VentaRequest): Observable<VentaDetalle> {
    return this.http.put<VentaDetalle>(`${this.apiUrl}/${id}`, venta, { withCredentials: true });
  }

  // Confirma: baja el stock, escribe el kardex y emite la boleta o factura
  confirmar(id: number, idTipoComp: number): Observable<VentaDetalle> {
    return this.http.post<VentaDetalle>(`${this.apiUrl}/${id}/confirmar`, { idTipoComp }, { withCredentials: true });
  }

  // Venta de mostrador: registra y confirma en un solo paso (si falla no deja borrador)
  cobrar(venta: VentaRequest, idTipoComp: number): Observable<VentaDetalle> {
    return this.http.post<VentaDetalle>(`${this.apiUrl}/cobrar`, { venta, idTipoComp }, { withCredentials: true });
  }

  // Voucher en PDF: el comprobante o, si sigue en borrador, la proforma
  descargarComprobante(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/comprobante.pdf`, { responseType: 'blob', withCredentials: true });
  }

  // Baja el voucher a la carpeta de descargas del navegador
  guardarPdf(id: number, numeroComprobante: string | null | undefined, numeroVenta: string): Observable<void> {
    return this.descargarComprobante(id).pipe(map((pdf) => {
      const url = URL.createObjectURL(pdf);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `${numeroComprobante || 'Proforma-' + numeroVenta}.pdf`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      // Se libera después: si se libera al instante, algunos navegadores cancelan la descarga
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }));
  }

  // Si la venta ya estaba confirmada, el motivo es obligatorio y se devuelve el stock
  anular(id: number, motivo: string): Observable<VentaDetalle> {
    return this.http.post<VentaDetalle>(`${this.apiUrl}/${id}/anular`, { motivo }, { withCredentials: true });
  }
}
