import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BuscadorComponent } from '../../../shared/components/buscador/buscador.component';
import { extraerMensajeError } from '../../../shared/utils/http-error.util';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { Producto, NivelStock } from '../../productos/modelos/producto.model';
import { ProductoService } from '../../productos/servicios/producto.service';
import { AjusteService } from '../servicios/ajuste.service';

// Filtro de la tabla: ver todos o solo un nivel de stock
type FiltroNivel = 'TODOS' | NivelStock;
type MotivoAjuste = 'MERMA' | 'HALLAZGO' | 'CORRECCION';

// Orden en que se muestran: primero lo más urgente (agotados)
const PRIORIDAD: Record<NivelStock, number> = {
  AGOTADO: 0,
  STOCK_MINIMO: 1,
  OK: 2
};

@Component({
  selector: 'app-inventario-lista',
  standalone: true,
  imports: [CommonModule, FormsModule, BuscadorComponent],
  templateUrl: './inventario-lista.component.html',
  styleUrls: ['./inventario-lista.component.css']
})
export class InventarioListaComponent implements OnInit {
  private readonly productoService = inject(ProductoService);
  private readonly ajusteService = inject(AjusteService);
  private readonly authService = inject(AuthService);
  private readonly notificacion = inject(NotificationService);

  readonly puedeAjustar = this.authService.tieneRol([
    'ADMIN_SISTEMA', 'ROLE_ADMIN_SISTEMA', 'ADMIN_NEGOCIO', 'ROLE_ADMIN_NEGOCIO', 'ALMACENERO', 'ROLE_ALMACENERO'
  ]);

  productos = signal<Producto[]>([]);
  cargando = signal<boolean>(false);
  guardando = signal<boolean>(false);
  errorMessage = signal<string>('');
  termino = signal<string>('');
  filtroNivel = signal<FiltroNivel>('TODOS');

  productoAjuste: Producto | null = null;
  motivoAjuste: MotivoAjuste = 'MERMA';
  sentidoCorreccion: 'SALIDA' | 'ENTRADA' = 'SALIDA';
  cantidadAjuste = 1;
  costoAjuste = 0;
  observacionAjuste = '';
  errorAjuste = '';

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

  // Valor al costo promedio: lo actualizan la compra y el ajuste de entrada
  valorDe(p: Producto): number {
    return Number(p.stock_actual ?? 0) * Number(p.precio_compra ?? 0);
  }

  abrirAjuste(p: Producto): void {
    this.productoAjuste = p;
    this.motivoAjuste = 'MERMA';
    this.sentidoCorreccion = 'SALIDA';
    this.cantidadAjuste = 1;
    this.costoAjuste = Number(p.precio_compra ?? 0);
    this.observacionAjuste = '';
    this.errorAjuste = '';
  }

  cerrarAjuste(): void {
    if (this.guardando()) return;
    this.productoAjuste = null;
  }

  esEntrada(): boolean {
    if (this.motivoAjuste === 'HALLAZGO') return true;
    if (this.motivoAjuste === 'CORRECCION') return this.sentidoCorreccion === 'ENTRADA';
    return false;
  }

  confirmarAjuste(): void {
    const p = this.productoAjuste;
    if (!p?.id_producto) return;
    this.errorAjuste = '';
    if (!(Number(this.cantidadAjuste) > 0)) {
      this.errorAjuste = 'La cantidad debe ser mayor a 0.';
      return;
    }
    if (!this.observacionAjuste.trim()) {
      this.errorAjuste = 'Explique por qué se hace el ajuste.';
      return;
    }
    if (this.esEntrada() && !(Number(this.costoAjuste) > 0)) {
      this.errorAjuste = 'La entrada necesita el costo de esas unidades.';
      return;
    }
    if (!this.esEntrada() && Number(this.cantidadAjuste) > Number(p.stock_actual ?? 0)) {
      this.errorAjuste = `Solo hay ${p.stock_actual} unidades para dar de baja.`;
      return;
    }

    this.guardando.set(true);
    this.ajusteService.registrar({
      idProducto: p.id_producto,
      tipo: this.esEntrada() ? 'ENTRADA' : 'SALIDA',
      cantidad: Number(this.cantidadAjuste),
      motivo: this.motivoAjuste,
      observacion: this.observacionAjuste.trim(),
      costoUnit: this.esEntrada() ? Number(this.costoAjuste) : null
    }).subscribe({
      next: (r) => {
        this.guardando.set(false);
        this.productoAjuste = null;
        this.notificacion.mostrar(`Ajuste ${r.numero} confirmado. El inventario y el kardex ya quedaron actualizados.`, 'success');
        this.cargarInventario();
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.errorAjuste = extraerMensajeError(err, 'No se pudo confirmar el ajuste.');
      }
    });
  }
}
