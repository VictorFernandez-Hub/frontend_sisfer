import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../../../core/constants/api.constants';

export interface AjusteRequest {
  idProducto: number;
  tipo: 'ENTRADA' | 'SALIDA';
  cantidad: number;
  motivo: 'MERMA' | 'HALLAZGO' | 'CORRECCION';
  observacion: string;
  costoUnit: number | null;
}

export interface AjusteResultado {
  idAjuste: number;
  numero: string;
  estado: string;
}

@Injectable({ providedIn: 'root' })
export class AjusteService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_URL}/ajustes`;

  registrar(datos: AjusteRequest): Observable<AjusteResultado> {
    return this.http.post<AjusteResultado>(this.apiUrl, datos, { withCredentials: true });
  }
}
