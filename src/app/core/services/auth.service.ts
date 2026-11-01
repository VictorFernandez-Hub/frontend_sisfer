import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = 'http://localhost:8080/api/auth';

  readonly usuarioActual = signal<string | null>(this.obtenerUsuarioStorage());
  readonly rolesActuales = signal<string[]>(this.obtenerRolesStorage());

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login(credentials: { cuenta: string; clave: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials, { withCredentials: true }).pipe(
      tap((res) => {
        if (res.cuenta) {
          localStorage.setItem('usuario', res.cuenta);
          this.usuarioActual.set(res.cuenta);
        }

        if (res.roles) {
          const rolesArray = Array.isArray(res.roles) ? res.roles : [res.roles];
          localStorage.setItem('roles', JSON.stringify(rolesArray));
          this.rolesActuales.set(rolesArray);
        }

        if (res.token) {
          localStorage.setItem('token', res.token);
        }
      })
    );
  }

  //recuperacion de clave
  recuperar(cuenta: string, email: string, claveNueva: string): Observable<string> {
    return this.http.post(`${this.apiUrl}/recuperar`,
      { cuenta, email, claveNueva },
      { responseType: 'text' });
  }

  //solicitar codigo
  solicitarCodigo(email: string) {
  return this.http.post(`${this.apiUrl}/solicitar-codigo`,
    { email },
    { responseType: 'text' });
}

validarCodigo(email: string, codigo: string) {
  return this.http.post(`${this.apiUrl}/validar-codigo`,
    { email, codigo },
    { responseType: 'text' });
}

cambiarClave(email: string, codigo: string, claveNueva: string) {
  return this.http.post(`${this.apiUrl}/cambiar-clave`,
    { email, codigo, claveNueva },
    { responseType: 'text' });
}

  tieneRol(rolesPermitidos: string[]): boolean {
    const misRoles = this.rolesActuales();
    if (!misRoles || misRoles.length === 0) return false;
    return rolesPermitidos.some(rolPermitido => misRoles.includes(rolPermitido));
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {}, {
      withCredentials: true,
      responseType: 'text'
    }).pipe(
      tap(() => {
        this.limpiarEstadoLocal();
      }),
      catchError((error) => {
        console.error('Error al cerrar sesión:', error);
        this.limpiarEstadoLocal();
        return of(null);
      })
    );
  }

  public limpiarEstadoLocal(): void {
    localStorage.clear();
    sessionStorage.clear();
    this.usuarioActual.set(null);
    this.rolesActuales.set([]);
  }

  estaAutenticado(): boolean {
    const usuario = localStorage.getItem('usuario');
    const token = localStorage.getItem('token');
    return !!usuario || !!token;
  }

  private obtenerUsuarioStorage(): string | null {
    return localStorage.getItem('usuario');
  }

  private obtenerRolesStorage(): string[] {
    const rolesStr = localStorage.getItem('roles');
    if (!rolesStr) return [];
    try {
      return JSON.parse(rolesStr);
    } catch {
      return [rolesStr];
    }
  }
}