import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UsuarioResponseDTO } from '../modelos/usuario.model';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/usuarios';

  listarUsuarios(): Observable<UsuarioResponseDTO[]> {
    return this.http.get<UsuarioResponseDTO[]>(this.apiUrl, { withCredentials: true });
  }

  crearUsuario(usuario: any): Observable<UsuarioResponseDTO> {
    return this.http.post<UsuarioResponseDTO>(this.apiUrl, usuario, { withCredentials: true });
  }

  actualizarUsuario(id: number, usuario: any): Observable<UsuarioResponseDTO> {
    return this.http.put<UsuarioResponseDTO>(`${this.apiUrl}/${id}`, usuario, { withCredentials: true });
  }

  eliminarUsuario(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }
}