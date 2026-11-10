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

  obtenerSiguienteCodigo(): Observable<{ codigo: string }> {
    return this.http.get<{ codigo: string }>(`${this.apiUrl}/siguiente-codigo`, { withCredentials: true });
  }

  crearProducto(producto: Producto): Observable<Producto> {
    return this.http.post<Producto>(this.apiUrl, producto, { withCredentials: true });
  }

  actualizarProducto(id: number, producto: Producto): Observable<Producto> {
    return this.http.put<Producto>(`${this.apiUrl}/${id}`, producto, { withCredentials: true });
  }

  cambiarEstado(id: number, estado: 'ACTIVO' | 'INACTIVO'): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/estado`, null,
      { params: { estado }, withCredentials: true });
  }

  eliminarProducto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  // ----- Catálogos para los combos (solo activos) y para la lista completa -----
  obtenerCategorias(todas = false): Observable<Catalogo[]> {
    return this.http.get<Catalogo[]>(`${this.apiUrl}/categorias`, { params: { todas }, withCredentials: true });
  }

  obtenerMarcas(todas = false): Observable<Catalogo[]> {
    return this.http.get<Catalogo[]>(`${this.apiUrl}/marcas`, { params: { todas }, withCredentials: true });
  }

  obtenerUnidades(todas = false): Observable<Catalogo[]> {
    return this.http.get<Catalogo[]>(`${this.apiUrl}/unidades`, { params: { todas }, withCredentials: true });
  }

  crearCategoria(nombre: string): Observable<Catalogo> {
    return this.http.post<Catalogo>(`${this.apiUrl}/categorias`, { nombre }, { withCredentials: true });
  }

  crearMarca(nombre: string): Observable<Catalogo> {
    return this.http.post<Catalogo>(`${this.apiUrl}/marcas`, { nombre }, { withCredentials: true });
  }

  crearUnidad(codigo: string, nombre: string, entera: boolean): Observable<Catalogo> {
    return this.http.post<Catalogo>(`${this.apiUrl}/unidades`, { codigo, nombre, entera }, { withCredentials: true });
  }

  cambiarEstadoCatalogo(tipo: 'categorias' | 'marcas' | 'unidades', id: number, estado: 'ACTIVO' | 'INACTIVO'): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${tipo}/${id}/estado`, null,
      { params: { estado }, withCredentials: true });
  }
}
