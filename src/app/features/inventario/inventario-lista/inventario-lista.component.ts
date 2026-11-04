import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { BuscadorComponent } from '../../../shared/components/buscador/buscador.component';
import { extraerMensajeError } from '../../../shared/utils/http-error.util';
import { Producto, NivelStock } from '../../productos/modelos/producto.model';
import { ProductoService } from '../../productos/servicios/producto.service';

// Filtro de la tabla: ver todos o solo un nivel de stock
type FiltroNivel = 'TODOS' | NivelStock;

// Orden en que se muestran: primero lo más urgente (agotados)
const PRIORIDAD: Record<NivelStock, number> = {
  AGOTADO: 0,
  STOCK_MINIMO: 1,
  OK: 2
};

@Component({
  selector: 'app-inventario-lista',
  standalone: true,
  imports: [CommonModule, BuscadorComponent],
  templateUrl: './inventario-lista.component.html',
  styleUrls: ['./inventario-lista.component.css']
})
export class InventarioListaComponent implements OnInit {
  private readonly productoService = inject(ProductoService);

  productos = signal<Producto[]>([]);
  cargando = signal<boolean>(false);
  errorMessage = signal<string>('');
  termino = signal<string>('');
  filtroNivel = signal<FiltroNivel>('TODOS');

  // Tarjetas de resumen de arriba
  resumen = computed(() => {
    const lista = this.productos();
    return {
      total: lista.length,
      ok: lista.filter(p => this.nivelDe(p) === 'OK').length,
      minimo: lista.filter(p => this.nivelDe(p) === 'STOCK_MINIMO').length,
      agotado: lista.filter(p => this.nivelDe(p) === 'AGOTADO').length,
      valorTotal: lista.reduce((suma, p) => suma + this.valorDe(p), 0)
    };
  });

  // Productos que se ven en la tabla (según buscador y filtro)
  productosFiltrados = computed(() => {
    const t = this.termino().trim().toLowerCase();
    const nivel = this.filtroNivel();

    return this.productos()
      .filter(p => {
        const coincideTexto = !t ||
          p.codigo.toLowerCase().includes(t) ||
          p.nombre.toLowerCase().includes(t) ||
          (p.categoria ?? '').toLowerCase().includes(t) ||
          (p.marca ?? '').toLowerCase().includes(t);
        const coincideNivel = nivel === 'TODOS' || this.nivelDe(p) === nivel;
        return coincideTexto && coincideNivel;
      })
      .sort((a, b) =>
        PRIORIDAD[this.nivelDe(a)] - PRIORIDAD[this.nivelDe(b)] ||
        String(a.codigo).localeCompare(String(b.codigo))
      );
  });

  ngOnInit(): void {
    this.cargarInventario();
  }

  cargarInventario(): void {
    this.cargando.set(true);
    this.errorMessage.set('');
    // Solo productos activos: son los que cuentan para el inventario
    this.productoService.obtenerProductosActivos().subscribe({
      next: (data) => {
        this.productos.set(data);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(extraerMensajeError(err, 'No se pudo cargar el inventario.'));
        this.cargando.set(false);
      }
    });
  }

  filtrarProductos(termino: string): void {
    this.termino.set(termino);
  }

  // Si se vuelve a tocar el mismo filtro, se quita y vuelve a "todos"
  elegirFiltro(nivel: FiltroNivel): void {
    this.filtroNivel.set(this.filtroNivel() === nivel ? 'TODOS' : nivel);
  }

  nivelDe(p: Producto): NivelStock {
    return p.nivel_stock ?? 'OK';
  }

  textoNivel(p: Producto): string {
    switch (this.nivelDe(p)) {
      case 'AGOTADO': return 'Agotado';
      case 'STOCK_MINIMO': return 'Stock mínimo';
      default: return 'Disponible';
    }
  }

  // Cuánto falta para llegar al stock mínimo (0 si ya está por encima)
  faltanteDe(p: Producto): number {
    const falta = Number(p.stock_minimo ?? 0) - Number(p.stock_actual ?? 0);
    return falta > 0 ? falta : 0;
  }

  // Valor de lo que hay en almacén, al precio de compra
  valorDe(p: Producto): number {
    return Number(p.stock_actual ?? 0) * Number(p.precio_compra ?? 0);
  }
}
