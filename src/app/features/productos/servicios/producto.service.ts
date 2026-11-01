import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Producto } from '../modelos/producto.model';
import { Catalogo } from '../modelos/catalogo.model';
import { ENDPOINTS } from '../../../core/constants/api.constants';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private http = inject(HttpClient);
  private apiUrl = ENDPOINTS.PRODUCTOS;

  // ----- Productos -----
  obtenerProductos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.apiUrl, { withCredentials: true });
  }

  obtenerProductosActivos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.apiUrl}/activos`, { withCredentials: true });
  }

  obtenerProductoPorId(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  crearProducto(producto: Producto): Observable<Producto> {
    return this.http.post<Producto>(this.apiUrl, producto, { withCredentials: true });
  }

  actualizarProducto(id: number, producto: Producto): Observable<Producto> {
    return this.http.put<Producto>(`${this.apiUrl}/${id}`, producto, { withCredentials: true });
  }


  eliminarProducto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  // ----- Catálogos para los combos -----
  obtenerCategorias(): Observable<Catalogo[]> {
    return this.http.get<Catalogo[]>(`${this.apiUrl}/categorias`, { withCredentials: true });
  }

  obtenerMarcas(): Observable<Catalogo[]> {
    return this.http.get<Catalogo[]>(`${this.apiUrl}/marcas`, { withCredentials: true });
  }

  obtenerUnidades(): Observable<Catalogo[]> {
    return this.http.get<Catalogo[]>(`${this.apiUrl}/unidades`, { withCredentials: true });
  }
}
