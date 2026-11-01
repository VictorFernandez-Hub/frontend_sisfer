import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../../core/constants/api.constants';

@Injectable({ providedIn: 'root' })
export class RolService {
  private http = inject(HttpClient);
  private url = `${API_URL}/roles`;

  listar() {
    return this.http.get<any[]>(this.url, { withCredentials: true });
  }

  crear(datos: any) {
    return this.http.post(this.url, datos, { withCredentials: true, responseType: 'json' });
  }

  actualizar(id: number, datos: any) {
  return this.http.put(`${this.url}/${id}`, datos, { withCredentials: true });
  }

  eliminar(id: number) {
  return this.http.delete(`${this.url}/${id}`, { withCredentials: true, responseType: 'text' });
  }
}