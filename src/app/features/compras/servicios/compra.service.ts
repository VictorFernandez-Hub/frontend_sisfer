import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../../../core/constants/api.constants';
import { CompraDetalle, CompraRequest, CompraResumen } from '../modelos/compra.model';

@Injectable({
  providedIn: 'root'
})
export class CompraService {
  private http = inject(HttpClient);
  private apiUrl = `${API_URL}/compras`;

  listar(): Observable<CompraResumen[]> {
    return this.http.get<CompraResumen[]>(this.apiUrl, { withCredentials: true });
  }

  obtener(id: number): Observable<CompraDetalle> {
    return this.http.get<CompraDetalle>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  // Guarda la compra en BORRADOR (todavía no mueve el stock)
  registrar(compra: CompraRequest): Observable<CompraDetalle> {
    return this.http.post<CompraDetalle>(this.apiUrl, compra, { withCredentials: true });
  }

  // Confirma: sube el stock y escribe el kardex
  confirmar(id: number): Observable<CompraDetalle> {
    return this.http.post<CompraDetalle>(`${this.apiUrl}/${id}/confirmar`, {}, { withCredentials: true });
  }

  anular(id: number): Observable<CompraDetalle> {
    return this.http.post<CompraDetalle>(`${this.apiUrl}/${id}/anular`, {}, { withCredentials: true });
  }
}
