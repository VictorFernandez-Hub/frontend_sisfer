import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { BuscadorComponent } from '../../../shared/components/buscador/buscador.component';
import { extraerMensajeError } from '../../../shared/utils/http-error.util';
import { MovimientoKardex } from '../modelos/kardex.model';
import { KardexService } from '../servicios/kardex.service';

// Filtro de la tabla: todos los movimientos, solo lo que entró o solo lo que salió
type FiltroMovimiento = 'TODOS' | 'ENTRADAS' | 'SALIDAS';

@Component({
  selector: 'app-kardex-lista',
  standalone: true,
  imports: [CommonModule, BuscadorComponent],
  templateUrl: './kardex-lista.component.html',
  styleUrls: ['./kardex-lista.component.css']
})
export class KardexListaComponent implements OnInit {
  private readonly kardexService = inject(KardexService);

  movimientos = signal<MovimientoKardex[]>([]);
  cargando = signal<boolean>(false);
  errorMessage = signal<string>('');
  termino = signal<string>('');
  filtro = signal<FiltroMovimiento>('TODOS');
  desde = signal<string>('');   // fecha en formato AAAA-MM-DD
  hasta = signal<string>('');

  // Tarjetas de resumen de arriba
  resumen = computed(() => {
    const lista = this.movimientos();
    return {
      total: lista.length,
      entradas: lista.filter(m => this.esEntrada(m)).length,
      salidas: lista.filter(m => !this.esEntrada(m)).length
    };
  });

  // Movimientos que se ven en la tabla (según buscador, filtro y fechas)
  movimientosFiltrados = computed(() => {
    const t = this.termino().trim().toLowerCase();
    const f = this.filtro();
    const d = this.desde();
    const h = this.hasta();

    return this.movimientos().filter(m => {
      const coincideTexto = !t ||
        m.codigo.toLowerCase().includes(t) ||
        m.producto.toLowerCase().includes(t) ||
        (m.usuario ?? '').toLowerCase().includes(t);
      const coincideTipo = f === 'TODOS' ||
        (f === 'ENTRADAS' && this.esEntrada(m)) ||
        (f === 'SALIDAS' && !this.esEntrada(m));
      const dia = (m.fecMov ?? '').substring(0, 10);   // AAAA-MM-DD
      const coincideDesde = !d || dia >= d;
      const coincideHasta = !h || dia <= h;
      return coincideTexto && coincideTipo && coincideDesde && coincideHasta;
    });
  });

  ngOnInit(): void {
    this.cargarMovimientos();
  }

  cargarMovimientos(): void {
    this.cargando.set(true);
    this.errorMessage.set('');
    this.kardexService.obtenerMovimientos().subscribe({
      next: (data) => {
        this.movimientos.set(data);
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(extraerMensajeError(err, 'No se pudo cargar el kardex.'));
        this.cargando.set(false);
      }
    });
  }

  filtrarMovimientos(termino: string): void {
    this.termino.set(termino);
  }

  // Si se vuelve a tocar el mismo filtro, se quita y vuelve a "todos"
  elegirFiltro(f: FiltroMovimiento): void {
    this.filtro.set(this.filtro() === f ? 'TODOS' : f);
  }

  cambiarDesde(event: Event): void {
    this.desde.set((event.target as HTMLInputElement).value);
  }

  cambiarHasta(event: Event): void {
    this.hasta.set((event.target as HTMLInputElement).value);
  }

  limpiarFechas(): void {
    this.desde.set('');
    this.hasta.set('');
  }

  // Una entrada es cuando el stock sube; una salida, cuando baja
  esEntrada(m: MovimientoKardex): boolean {
    return Number(m.stockNuevo) > Number(m.stockAnt);
  }

  textoTipo(m: MovimientoKardex): string {
    switch (m.tipoMov) {
      case 'ENTRADA_COMPRA': return 'Entrada por compra';
      case 'SALIDA_VENTA': return 'Salida por venta';
      case 'AJUSTE_ENTRADA': return 'Ajuste de entrada';
      case 'AJUSTE_SALIDA': return 'Ajuste de salida';
      case 'ANULACION_COMPRA': return 'Anulación de compra';
      case 'ANULACION_VENTA': return 'Anulación de venta';
      default: return m.tipoMov;
    }
  }
}
