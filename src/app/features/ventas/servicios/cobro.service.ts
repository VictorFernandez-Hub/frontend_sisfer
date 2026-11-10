import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../../../core/constants/api.constants';

export interface CuentaBanco {
  banco: string;
  numeroCuenta: string;
  cci: string;
  estado?: 'ACTIVO' | 'INACTIVO';
}

export interface MetodoCobro {
  id: number;
  codigo: string;
  nombre: string;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface DatosCobro {
  celular: string;
  cuentas: CuentaBanco[];
}

export interface ConfigCobro extends DatosCobro {
  metodos: MetodoCobro[];
}

@Injectable({ providedIn: 'root' })
export class CobroService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_URL}/cobros`;

  datos(): Observable<DatosCobro> {
    return this.http.get<DatosCobro>(`${this.apiUrl}/datos`, { withCredentials: true });
  }

  configuracion(): Observable<ConfigCobro> {
    return this.http.get<ConfigCobro>(this.apiUrl, { withCredentials: true });
  }

  guardarCelular(celular: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/celular`, { celular }, { withCredentials: true });
  }

  guardarCuenta(cuenta: CuentaBanco): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/cuentas/${cuenta.banco}`, {
      numeroCuenta: cuenta.numeroCuenta,
      cci: cuenta.cci,
      estado: cuenta.estado ?? 'ACTIVO'
    }, { withCredentials: true });
  }

  cambiarMetodo(id: number, estado: 'ACTIVO' | 'INACTIVO'): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/metodos/${id}/estado`, null, {
      params: { estado }, withCredentials: true
    });
  }
}
